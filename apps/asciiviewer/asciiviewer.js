"use strict";

(function () {
    var CONTROL_NAMES = [
        "NUL","SOH","STX","ETX","EOT","ENQ","ACK","BEL",
        "BS","HT","LF","VT","FF","CR","SO","SI",
        "DLE","DC1","DC2","DC3","DC4","NAK","SYN","ETB",
        "CAN","EM","SUB","ESC","FS","GS","RS","US"
    ];

    function getAsciiName(i) {
        if (i < 32) return CONTROL_NAMES[i];
        if (i === 32) return "SP";
        if (i === 127) return "DEL";
        return String.fromCharCode(i);
    }

    function padHex(n) {
        var s = n.toString(16).toUpperCase();
        return s.length < 2 ? "0" + s : s;
    }

    // UTF-8 编码
    function encodeUtf8(str) {
        return new TextEncoder().encode(str);
    }

    // GB2312 编码：利用 TextDecoder 反向构建查找表太大，
    // 改用 Blob + FileReader 或直接用 encodeURIComponent 的方式不行。
    // 最可靠的浏览器方案：用一个隐藏的 form 提交到 iframe 来获取编码，
    // 但太复杂。这里用一个巧妙的方法：通过 TextDecoder("gb2312") 反向查表。
    // 实际上浏览器支持 TextDecoder("gb2312") 解码，但不支持编码。
    // 我们用穷举法构建一个 char -> bytes 的映射表。

    var gb2312EncodeMap = null;

    function buildGb2312Map() {
        if (gb2312EncodeMap) return;
        gb2312EncodeMap = {};

        // ASCII 部分 (0x00-0x7F) 单字节
        for (var i = 0; i < 128; i++) {
            gb2312EncodeMap[String.fromCharCode(i)] = [i];
        }

        // GB2312 双字节区域: 高字节 0xA1-0xF7, 低字节 0xA1-0xFE
        var decoder;
        try {
            decoder = new TextDecoder("gb2312");
        } catch (e) {
            return; // 浏览器不支持
        }

        for (var high = 0xA1; high <= 0xF7; high++) {
            for (var low = 0xA1; low <= 0xFE; low++) {
                var bytes = new Uint8Array([high, low]);
                var ch = decoder.decode(bytes);
                // 解码失败会返回 replacement character
                if (ch && ch !== "\uFFFD" && ch.length === 1) {
                    gb2312EncodeMap[ch] = [high, low];
                }
            }
        }
    }

    function encodeGb2312(str) {
        buildGb2312Map();
        var result = [];
        for (var i = 0; i < str.length; i++) {
            var ch = str[i];
            var bytes = gb2312EncodeMap[ch];
            if (bytes) {
                for (var j = 0; j < bytes.length; j++) {
                    result.push(bytes[j]);
                }
            } else {
                // 无法编码的字符用 '?' 替代
                result.push(0x3F);
            }
        }
        return new Uint8Array(result);
    }

    function refresh() {
        var txt = document.getElementById("input-field").value;
        var encoding = document.getElementById("encoding-select").value;
        var encodingLabel = encoding === "gb2312" ? "GB2312" : "UTF-8";

        document.getElementById("hex-title").textContent = "16进制表示（" + encodingLabel + " 编码）";
        document.getElementById("dec-title").textContent = "10进制表示（" + encodingLabel + " 编码）";

        var bytes;
        if (encoding === "gb2312") {
            bytes = encodeGb2312(txt);
        } else {
            bytes = encodeUtf8(txt);
        }

        var hex = [];
        var dec = [];
        for (var i = 0; i < bytes.length; i++) {
            hex.push(padHex(bytes[i]));
            dec.push(bytes[i]);
        }
        document.getElementById("hex-area").value = hex.join(" ");
        document.getElementById("dec-area").value = dec.join(" ");
    }

    function buildAsciiTable() {
        var table = document.getElementById("ascii-table");
        for (var i = 0; i < 128; i++) {
            var cell = document.createElement("div");
            cell.className = "ascii-cell" + (i < 32 || i === 127 ? " control" : "");
            cell.textContent = getAsciiName(i);
            cell.title = "Dec=" + i + "  Hex=0x" + padHex(i);
            table.appendChild(cell);
        }
    }

    window.onload = function () {
        buildAsciiTable();
        refresh();
        document.getElementById("input-field").addEventListener("input", refresh);
        document.getElementById("encoding-select").addEventListener("change", refresh);
    };
})();
