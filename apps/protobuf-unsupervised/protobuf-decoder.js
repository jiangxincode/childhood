// ========== Protobuf Decoder (ported from Java unsupervised package) ==========
// Wire format constants (matches com.google.protobuf.WireFormat)
const WIRETYPE_VARINT = 0;
const WIRETYPE_FIXED64 = 1;
const WIRETYPE_LENGTH_DELIMITED = 2;
const WIRETYPE_FIXED32 = 5;

// ========== ByteUtil ==========
function hex2bytes(hexString) {
    let fixed = hexString.replace(/\s/g, '');
    if (fixed.length % 2 !== 0) fixed += '0';
    const bytes = new Uint8Array(fixed.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(fixed.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
}

function bytesToIntLE(bytes, start) {
    return (bytes[start] & 0xFF)
        | ((bytes[start + 1] & 0xFF) << 8)
        | ((bytes[start + 2] & 0xFF) << 16)
        | ((bytes[start + 3] & 0xFF) << 24);
}

function bytesToIntBE(bytes, start) {
    return ((bytes[start] & 0xFF) << 24)
        | ((bytes[start + 1] & 0xFF) << 16)
        | ((bytes[start + 2] & 0xFF) << 8)
        | (bytes[start + 3] & 0xFF);
}

function bytesToFloatLE(bytes) {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    for (let i = 0; i < 4; i++) view.setUint8(i, bytes[i]);
    return view.getFloat32(0, true);
}

function bytesToDoubleLE(bytes) {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    for (let i = 0; i < 8; i++) view.setUint8(i, bytes[i]);
    return view.getFloat64(0, true);
}

// ========== VarintUtils ==========
function decodeVarint(buffer, offset) {
    let res = BigInt(0);
    let shift = 0;
    let count = 0;
    let b;
    do {
        if (offset >= buffer.length) throw new Error('Index out of bound decoding varint');
        count++;
        b = buffer[offset++];
        const thisByteValue = BigInt(b & 0x7f) * (BigInt(1) << BigInt(shift));
        shift += 7;
        res += thisByteValue;
    } while ((b & 0xff) >= 128 && count < 8);
    return { value: res, length: Math.floor(shift / 7) };
}

function interpretAsSignedType(bigint) {
    if ((bigint & BigInt(1)) === BigInt(0)) {
        return bigint / BigInt(2);
    }
    return BigInt(-1) * ((bigint + BigInt(1)) / BigInt(2));
}

// ========== BufferReader ==========
class BufferReader {
    constructor(buffer) {
        this.buffer = buffer;
        this.offset = 0;
        this.savedOffset = 0;
    }
    getOffset() { return this.offset; }
    readVarInt() {
        const result = decodeVarint(this.buffer, this.offset);
        this.offset += result.length;
        return result.value;
    }
    readBuffer(length) {
        this.checkByte(length);
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
    }
    trySkipGrpcHeader() {
        const backup = this.offset;
        if (this.buffer.length > 0 && this.buffer[this.offset] === 0 && this.leftBytes() >= 5) {
            this.offset++;
            const length = bytesToIntBE(this.buffer, this.offset);
            this.offset += 4;
            if (length > this.leftBytes()) this.offset = backup;
        }
    }
    leftBytes() { return this.buffer.length - this.offset; }
    checkByte(length) {
        if (length > this.leftBytes()) throw new Error('Not enough bytes left. Requested: ' + length + ' left: ' + this.leftBytes());
        if (length < 0) throw new Error('The length should be greater than 0');
    }
    checkpoint() { this.savedOffset = this.offset; }
    resetToCheckpoint() { this.offset = this.savedOffset; }
}

// ========== ProtobufDecoder ==========
function decodeProto(buffer) {
    const reader = new BufferReader(buffer);
    const parts = [];
    reader.trySkipGrpcHeader();
    try {
        while (reader.leftBytes() > 0) {
            reader.checkpoint();
            const byteRange = [reader.getOffset()];
            const indexType = Number(reader.readVarInt());
            const type = indexType & 0b111;
            const fieldNumber = indexType >> 3;
            let value;
            if (type === WIRETYPE_VARINT) {
                value = reader.readVarInt();
            } else if (type === WIRETYPE_LENGTH_DELIMITED) {
                const length = Number(reader.readVarInt());
                value = reader.readBuffer(length);
            } else if (type === WIRETYPE_FIXED32) {
                value = reader.readBuffer(4);
            } else if (type === WIRETYPE_FIXED64) {
                value = reader.readBuffer(8);
            } else {
                throw new Error('Unknown type: ' + type);
            }
            byteRange.push(reader.getOffset());
            parts.push({ byteRange, fieldNumber, type, value });
        }
    } catch (e) {
        reader.resetToCheckpoint();
    }
    return {
        valid_data: parts,
        left_over_data: bytesToHex(reader.readBuffer(reader.leftBytes()))
    };
}

function typeToString(type, hasSubResults) {
    switch (type) {
        case WIRETYPE_VARINT: return 'varint';
        case WIRETYPE_LENGTH_DELIMITED: return hasSubResults ? 'protobuf' : 'string';
        case WIRETYPE_FIXED32: return 'fixed32';
        case WIRETYPE_FIXED64: return 'fixed64';
        default: return 'unknown';
    }
}

function hexStrToStr(hexStr) {
    const bytes = new Uint8Array(hexStr.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hexStr.substring(i * 2, i * 2 + 2), 16);
    }
    return new TextDecoder('utf-8').decode(bytes);
}

function decodeStringOrBytes(bytes) {
    if (!bytes || bytes.length === 0) return { type: 'string|bytes', value: '' };
    try {
        const str = hexStrToStr(bytesToHex(bytes));
        // Check if it's valid printable text
        if (/[\x00-\x08\x0E-\x1F]/.test(str)) throw new Error('binary');
        return { type: 'string', value: str };
    } catch (e) {
        return { type: 'bytes', value: bytesToHex(bytes) };
    }
}

function decodeVarintParts(valueStr) {
    const intVal = BigInt(valueStr);
    let sb = '[as uint:' + intVal + ']';
    const signedIntVal = interpretAsSignedType(intVal);
    if (signedIntVal !== intVal) {
        sb += '[as sint:' + signedIntVal + ']';
    }
    return sb;
}

function decodeFixed32(bytes) {
    const floatValue = bytesToFloatLE(bytes);
    const intValue = bytesToIntLE(bytes, 0);
    const result = [{ type: 'Int', value: intValue }];
    result.push({ type: 'Float', value: floatValue });
    return result;
}

function decodeFixed64(bytes) {
    const doubleValue = bytesToDoubleLE(bytes);
    const hex = bytesToHex(bytes);
    // Reverse for big-endian interpretation
    let beHex = '';
    for (let i = bytes.length - 1; i >= 0; i--) beHex += bytes[i].toString(16).padStart(2, '0');
    const intValue = BigInt('0x' + beHex);
    const result = [{ type: 'Int', value: intValue.toString() }];
    if (intValue > BigInt('0x7fffffffffffffff')) {
        const uintValue = intValue - BigInt('0x10000000000000000');
        result.push({ type: 'Unsigned Int', value: uintValue.toString() });
    }
    result.push({ type: 'Double', value: doubleValue });
    return result;
}

function getProtobufPart(part) {
    const result = {
        byteRange: part.byteRange,
        fieldNumber: part.fieldNumber,
        type: null,
        content: null,
        subResults: null
    };
    const type = part.type;
    const value = part.value;

    switch (type) {
        case WIRETYPE_VARINT:
            result.content = decodeVarintParts(value.toString());
            break;
        case WIRETYPE_LENGTH_DELIMITED: {
            const decoded = decodeProto(value);
            const leftOver = decoded.left_over_data;
            if (value && value.length > 0 && leftOver !== null && leftOver.length === 0) {
                result.subResults = decoded.valid_data.map(p => getProtobufPart(p));
            } else {
                const strOrBytes = decodeStringOrBytes(value);
                result.content = strOrBytes.value;
            }
            break;
        }
        case WIRETYPE_FIXED64:
            result.content = JSON.stringify(decodeFixed64(value));
            break;
        case WIRETYPE_FIXED32:
            result.content = JSON.stringify(decodeFixed32(value));
            break;
    }
    result.type = type;
    return result;
}

function toJsonObject(decoderResult) {
    const obj = {
        byteRange: decoderResult.byteRange,
        fieldNumber: decoderResult.fieldNumber
    };
    if (!decoderResult.subResults || decoderResult.subResults.length === 0) {
        obj.type = typeToString(decoderResult.type, false);
        obj.content = decoderResult.content;
    } else {
        obj.type = typeToString(decoderResult.type, true);
        obj.content = decoderResult.subResults.map(sub => toJsonObject(sub));
    }
    return obj;
}

function bytesDecoder(bytes) {
    const map = decodeProto(bytes);
    const validItems = map.valid_data;
    const result = validItems.map(item => {
        const protobufPart = getProtobufPart(item);
        return toJsonObject(protobufPart);
    });
    return JSON.stringify({ valid_data: result, left_over_data: map.left_over_data }, null, 2);
}

// Export for Node.js / test environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { hex2bytes, bytesToHex, bytesDecoder, decodeVarint, interpretAsSignedType };
}
