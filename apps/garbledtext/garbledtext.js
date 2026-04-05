"use strict";

(function () {
    // 浏览器 TextDecoder 支持的编码名称
    var CHARSETS = ["utf-8", "gbk", "iso-8859-1", "big5", "shift_jis", "euc-kr", "windows-1252"];
    var CHARSET_LABELS = {
        "utf-8": "UTF-8",
        "gbk": "GBK",
        "iso-8859-1": "ISO-8859-1",
        "big5": "Big5",
        "shift_jis": "Shift_JIS",
        "euc-kr": "EUC-KR",
        "windows-1252": "Windows-1252"
    };

    // 编码缓存：char -> bytes 映射表
    var encoderCache = {};

    /**
     * 将字符串按指定编码转为字节数组
     * 浏览器只有 TextEncoder(utf-8)，其他编码需要反向查表
     */
    function encodeString(str, charset) {
        if (charset === "utf-8") {
            return new TextEncoder().encode(str);
        }
        // 对于其他编码，使用反向查表
        var map = getEncodeMap(charset);
        if (!map) return null;

        var result = [];
        for (var i = 0; i < str.length; i++) {
            var ch = str[i];
            var bytes = map[ch];
            if (bytes) {
                for (var j = 0; j < bytes.length; j++) {
                    result.push(bytes[j]);
                }
            } else {
                result.push(0x3F); // '?'
            }
        }
        return new Uint8Array(result);
    }

    /**
     * 构建编码的反向映射表（通过 TextDecoder 穷举）
     */
    function getEncodeMap(charset) {
        if (encoderCache[charset]) return encoderCache[charset];

        var decoder;
        try {
            decoder = new TextDecoder(charset);
        } catch (e) {
            return null;
        }

        var map = {};
        // 单字节 0x00-0xFF
        for (var i = 0; i < 256; i++) {
            var bytes = new Uint8Array([i]);
            var ch = decoder.decode(bytes);
            if (ch && ch !== "\uFFFD") {
                map[ch] = [i];
            }
        }

        // 双字节编码范围（GBK, Big5, Shift_JIS, EUC-KR）
        if (charset === "gbk") {
            buildDoubleByteMap(decoder, map, 0x81, 0xFE, 0x40, 0xFE);
        } else if (charset === "big5") {
            buildDoubleByteMap(decoder, map, 0xA1, 0xF9, 0x40, 0xFE);
        } else if (charset === "shift_jis") {
            buildDoubleByteMap(decoder, map, 0x81, 0xFC, 0x40, 0xFC);
        } else if (charset === "euc-kr") {
            buildDoubleByteMap(decoder, map, 0xA1, 0xFE, 0xA1, 0xFE);
        }

        encoderCache[charset] = map;
        return map;
    }

    function buildDoubleByteMap(decoder, map, highStart, highEnd, lowStart, lowEnd) {
        for (var high = highStart; high <= highEnd; high++) {
            for (var low = lowStart; low <= lowEnd; low++) {
                var bytes = new Uint8Array([high, low]);
                var ch = decoder.decode(bytes);
                if (ch && ch !== "\uFFFD" && ch.length === 1 && !map[ch]) {
                    map[ch] = [high, low];
                }
            }
        }
    }

    /**
     * 将字节数组按指定编码解码为字符串
     */
    function decodeBytes(bytes, charset) {
        try {
            var decoder = new TextDecoder(charset, { fatal: false });
            return decoder.decode(bytes);
        } catch (e) {
            return null;
        }
    }

    function recoverAll() {
        var input = document.getElementById("input-area").value.trim();
        var tbody = document.getElementById("result-body");
        tbody.innerHTML = "";

        if (!input) return;

        for (var i = 0; i < CHARSETS.length; i++) {
            var nowCharset = CHARSETS[i];
            var encoded = encodeString(input, nowCharset);
            if (!encoded) continue;

            for (var j = 0; j < CHARSETS.length; j++) {
                var origCharset = CHARSETS[j];
                if (nowCharset === origCharset) continue;

                var recovered = decodeBytes(encoded, origCharset);
                var tr = document.createElement("tr");

                var td1 = document.createElement("td");
                td1.textContent = CHARSET_LABELS[nowCharset];
                tr.appendChild(td1);

                var td2 = document.createElement("td");
                td2.textContent = CHARSET_LABELS[origCharset];
                tr.appendChild(td2);

                var td3 = document.createElement("td");
                td3.textContent = recovered || "Conversion Failed";
                tr.appendChild(td3);

                tbody.appendChild(tr);
            }
        }
    }

    window.onload = function () {
        document.getElementById("btn-recover").addEventListener("click", recoverAll);
    };
})();
