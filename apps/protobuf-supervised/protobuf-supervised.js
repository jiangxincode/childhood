// ========== Supervised Protobuf Convert (Have Proto File) ==========
// Uses protobufjs loaded from CDN

let loadedRoot = null;
let loadedFileName = '';

function hex2bytes(hexString) {
    let fixed = hexString.replace(/\s/g, '');
    if (fixed.length % 2 !== 0) fixed += '0';
    const bytes = new Uint8Array(fixed.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(fixed.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

// Load .proto file content
function loadProtoFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const content = reader.result;
                const root = protobuf.parse(content, { keepCase: true }).root;
                root.resolveAll();
                resolve(root);
            } catch (e) {
                reject(new Error('Failed to parse .proto file: ' + e.message));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// Load .desc (compiled descriptor set) file
function loadDescFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const buffer = new Uint8Array(reader.result);
                const root = protobuf.Root.fromDescriptor(
                    protobuf.descriptor.FileDescriptorSet.decode(buffer)
                );
                root.resolveAll();
                resolve(root);
            } catch (e) {
                reject(new Error('Failed to parse .desc file: ' + e.message));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

// Get all message types from root
function getAllMessageTypes(root) {
    const types = [];
    function walk(ns) {
        if (ns.nested) {
            for (const name of Object.keys(ns.nested)) {
                const child = ns.nested[name];
                if (child instanceof protobuf.Type) {
                    types.push(child);
                }
                if (child.nested) walk(child);
            }
        }
    }
    walk(root);
    return types;
}

// Try to decode with best matching descriptor (matches Java parseWithBestMatchingDescriptor)
function decodeWithBestMatch(root, bytes) {
    const types = getAllMessageTypes(root);
    if (types.length === 0) throw new Error('No message types found in proto file');

    let bestMessage = null;
    let bestUnknownCount = Infinity;

    for (const type of types) {
        try {
            const msg = type.decode(bytes);
            // Count fields that are not in the schema (unknown fields indicator)
            const json = type.toObject(msg, { defaults: false, longs: String });
            const knownFields = Object.keys(json).length;
            const totalFields = type.fieldsArray.length;
            // Prefer types where more fields are populated
            const unknownScore = totalFields - knownFields;
            if (unknownScore < bestUnknownCount) {
                bestUnknownCount = unknownScore;
                bestMessage = { type, msg };
            }
        } catch (e) {
            // Skip types that fail to decode
        }
    }

    if (!bestMessage) throw new Error('Unable to find a descriptor matching the given message');
    return bestMessage;
}

// File input handler
document.getElementById('proto-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const statusEl = document.getElementById('file-status');
    if (!file) {
        loadedRoot = null;
        loadedFileName = '';
        statusEl.textContent = '未选择文件';
        return;
    }
    try {
        statusEl.textContent = '加载中...';
        if (file.name.endsWith('.desc') || file.name.endsWith('.bin')) {
            loadedRoot = await loadDescFile(file);
        } else {
            loadedRoot = await loadProtoFile(file);
        }
        loadedFileName = file.name;
        const types = getAllMessageTypes(loadedRoot);
        statusEl.textContent = `已加载: ${file.name} (${types.length} message types)`;
        statusEl.style.color = '#4CAF50';
    } catch (err) {
        loadedRoot = null;
        statusEl.textContent = 'Error: ' + err.message;
        statusEl.style.color = '#F44336';
    }
});

// Convert button handler
document.getElementById('convert-btn').addEventListener('click', () => {
    const outputArea = document.getElementById('output-area');

    if (!loadedRoot) {
        outputArea.value = 'Error: Please load a .proto or .desc file first';
        return;
    }

    const hexString = document.getElementById('input-area').value.trim();
    if (!hexString) {
        outputArea.value = '';
        return;
    }

    try {
        const bytes = hex2bytes(hexString);
        const messageTypeName = document.getElementById('message-type').value.trim();

        let type, msg;
        if (messageTypeName) {
            type = loadedRoot.lookupType(messageTypeName);
            msg = type.decode(bytes);
        } else {
            const result = decodeWithBestMatch(loadedRoot, bytes);
            type = result.type;
            msg = result.msg;
        }

        const jsonObj = type.toObject(msg, {
            longs: String,
            enums: String,
            bytes: String,
            defaults: true
        });
        outputArea.value = JSON.stringify(jsonObj, null, 2);
    } catch (e) {
        outputArea.value = 'Error: ' + e.message;
    }
});
