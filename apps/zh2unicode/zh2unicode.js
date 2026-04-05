"use strict";

(function () {
    function string2Unicode(str) {
        var result = "";
        for (var i = 0; i < str.length; i++) {
            var code = str.charCodeAt(i);
            var hex = code.toString(16);
            while (hex.length < 4) hex = "0" + hex;
            result += "\\u" + hex;
        }
        return result;
    }

    function unicode2String(unicodeStr) {
        var result = "";
        var parts = unicodeStr.split("\\u");
        for (var i = 0; i < parts.length; i++) {
            var s = parts[i].trim();
            if (s === "") continue;
            // 取前4个十六进制字符作为一个码点，剩余部分原样保留
            var hex = s.substring(0, 4);
            var rest = s.substring(4);
            var code = parseInt(hex, 16);
            if (!isNaN(code)) {
                result += String.fromCharCode(code);
            }
            if (rest) result += rest;
        }
        return result;
    }

    window.onload = function () {
        var zhText = document.getElementById("zh-text");
        var unicodeText = document.getElementById("unicode-text");

        document.getElementById("btn-zh2unicode").addEventListener("click", function () {
            unicodeText.value = string2Unicode(zhText.value);
        });

        document.getElementById("btn-unicode2zh").addEventListener("click", function () {
            zhText.value = unicode2String(unicodeText.value);
        });
    };
})();
