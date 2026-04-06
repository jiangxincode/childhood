"use strict";

(function () {
    // 常用时区列表
    var timezones = Intl.supportedValuesOf("timeZone");

    // DOM 元素
    var tsInput, tsUnit, timeInput;
    var currentTsEl, currentTimeEl, pauseBtn;
    var fromTimeEl, fromTzEl, toTzEl, toTimeEl;
    var isPaused = false;
    var timer = null;
    var rafId = null;

    function pad(n, len) {
        var s = String(n);
        while (s.length < len) s = "0" + s;
        return s;
    }

    function formatDate(d, showMs) {
        var s = d.getFullYear() + "-" + pad(d.getMonth() + 1, 2) + "-" + pad(d.getDate(), 2)
            + " " + pad(d.getHours(), 2) + ":" + pad(d.getMinutes(), 2) + ":" + pad(d.getSeconds(), 2);
        if (showMs) {
            s += "." + pad(d.getMilliseconds(), 3);
        }
        return s;
    }

    function formatDateTimeLocal(d) {
        return d.getFullYear() + "-" + pad(d.getMonth() + 1, 2) + "-" + pad(d.getDate(), 2)
            + "T" + pad(d.getHours(), 2) + ":" + pad(d.getMinutes(), 2);
    }

    // 解析 "yyyy-MM-dd HH:mm:ss" 或 "yyyy-MM-dd HH:mm:ss.SSS" 格式
    function parseTime(str) {
        str = str.trim();
        var parts = str.split(/[\s]+/);
        if (parts.length < 2) return null;
        var dateParts = parts[0].split("-");
        var timeParts = parts[1].split(":");
        if (dateParts.length < 3 || timeParts.length < 2) return null;
        var sec = 0;
        var ms = 0;
        if (timeParts[2]) {
            var secParts = timeParts[2].split(".");
            sec = parseInt(secParts[0]) || 0;
            if (secParts[1]) {
                ms = parseInt(secParts[1].substring(0, 3)) || 0;
                // 补齐到3位再解析（如 ".12" 应为 120ms）
                while (secParts[1].length < 3) secParts[1] += "0";
                ms = parseInt(secParts[1].substring(0, 3)) || 0;
            }
        }
        var d = new Date(
            parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]),
            parseInt(timeParts[0]), parseInt(timeParts[1]), sec, ms
        );
        return isNaN(d.getTime()) ? null : d;
    }

    function formatInTimeZone(date, tz) {
        try {
            var opts = {
                timeZone: tz,
                year: "numeric", month: "2-digit", day: "2-digit",
                hour: "2-digit", minute: "2-digit", second: "2-digit",
                hour12: false
            };
            var parts = new Intl.DateTimeFormat("en-CA", opts).formatToParts(date);
            var map = {};
            parts.forEach(function (p) { map[p.type] = p.value; });
            return map.year + "-" + map.month + "-" + map.day
                + " " + map.hour + ":" + map.minute + ":" + map.second;
        } catch (e) {
            return "";
        }
    }

    // 获取本地时区在 IANA 列表中的名称
    function getLocalTz() {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (e) {
            return "UTC";
        }
    }

    // 时区转换核心：将 fromTime（本地 Date）视为 fromTz 的时间，转换到 toTz
    function convertTimezone() {
        var val = fromTimeEl.value; // "yyyy-MM-ddTHH:mm"
        if (!val) return;
        var fromTz = fromTzEl.value;
        var toTz = toTzEl.value;

        // 将输入解析为 fromTz 的时间
        // 构造一个 ISO 字符串，用 Intl 反推 UTC
        var parts = val.split("T");
        var dateStr = parts[0] + " " + parts[1] + ":00";

        // 用 fromTz 格式化当前时间来获取 UTC 偏移量
        // 更可靠的方式：构造一个临时 Date，然后调整
        var localDate = new Date(parts[0] + "T" + parts[1] + ":00");
        if (isNaN(localDate.getTime())) {
            toTimeEl.value = "";
            return;
        }

        // 获取本地时区与 fromTz 的偏移差
        var localOffset = localDate.getTimezoneOffset() * 60000;
        var utcTime = localDate.getTime() + localOffset;

        // 获取 fromTz 的偏移
        var fromOffset = getTimezoneOffset(localDate, fromTz);
        var actualUtc = utcTime - fromOffset;

        var resultDate = new Date(actualUtc);
        toTimeEl.value = formatInTimeZone(resultDate, toTz);
    }

    function getTimezoneOffset(date, tz) {
        // 通过格式化获取时区的实际时间，再与 UTC 比较
        var utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
        var tzStr = date.toLocaleString("en-US", { timeZone: tz });
        var utcDate = new Date(utcStr);
        var tzDate = new Date(tzStr);
        return tzDate.getTime() - utcDate.getTime();
    }

    function populateTimezones() {
        var localTz = getLocalTz();
        timezones.forEach(function (tz) {
            var opt1 = document.createElement("option");
            opt1.value = tz;
            opt1.textContent = tz;
            if (tz === localTz) opt1.selected = true;
            fromTzEl.appendChild(opt1);

            var opt2 = document.createElement("option");
            opt2.value = tz;
            opt2.textContent = tz;
            if (tz === "UTC") opt2.selected = true;
            toTzEl.appendChild(opt2);
        });
    }

    function updateCurrent() {
        if (isPaused) return;
        var now = new Date();
        if (tsUnit.value === "ms") {
            currentTsEl.value = now.getTime();
        } else {
            currentTsEl.value = Math.floor(now.getTime() / 1000);
        }
        currentTimeEl.value = formatDate(now, tsUnit.value === "ms");
    }

    function rafLoop() {
        updateCurrent();
        rafId = requestAnimationFrame(rafLoop);
    }

    function startTimer() {
        stopTimer();
        if (tsUnit.value === "ms") {
            rafId = requestAnimationFrame(rafLoop);
        } else {
            timer = setInterval(updateCurrent, 1000);
        }
    }

    function stopTimer() {
        if (timer) { clearInterval(timer); timer = null; }
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    function init() {
        tsInput = document.getElementById("timestamp-input");
        tsUnit = document.getElementById("timestamp-unit");
        timeInput = document.getElementById("time-input");
        currentTsEl = document.getElementById("current-timestamp");
        currentTimeEl = document.getElementById("current-time");
        pauseBtn = document.getElementById("btn-pause");
        fromTimeEl = document.getElementById("from-time");
        fromTzEl = document.getElementById("from-tz");
        toTzEl = document.getElementById("to-tz");
        toTimeEl = document.getElementById("to-time");

        populateTimezones();

        // 设置 from-time 默认值为当前时间
        fromTimeEl.value = formatDateTimeLocal(new Date());

        // Timestamp -> Time
        document.getElementById("btn-ts2time").addEventListener("click", function () {
            var ts = parseInt(tsInput.value) || 0;
            var d;
            if (tsUnit.value === "s") {
                d = new Date(ts * 1000);
            } else {
                d = new Date(ts);
            }
            timeInput.value = formatDate(d, tsUnit.value === "ms");
        });

        // Time -> Timestamp
        document.getElementById("btn-time2ts").addEventListener("click", function () {
            var d = parseTime(timeInput.value);
            if (!d) {
                tsInput.value = 0;
                return;
            }
            if (tsUnit.value === "s") {
                tsInput.value = Math.floor(d.getTime() / 1000);
            } else {
                tsInput.value = d.getTime();
            }
        });

        // Pause / Resume
        pauseBtn.addEventListener("click", function () {
            isPaused = !isPaused;
            pauseBtn.textContent = isPaused ? "Resume" : "Pause";
        });

        // 时区转换
        fromTimeEl.addEventListener("change", convertTimezone);
        fromTzEl.addEventListener("change", convertTimezone);
        toTzEl.addEventListener("change", convertTimezone);

        // 单位切换时立即刷新并切换刷新策略
        tsUnit.addEventListener("change", function () {
            var wasPaused = isPaused;
            isPaused = false;
            updateCurrent();
            isPaused = wasPaused;
            startTimer();
        });

        // Swap
        document.getElementById("btn-swap").addEventListener("click", function () {
            var tmp = fromTzEl.value;
            fromTzEl.value = toTzEl.value;
            toTzEl.value = tmp;
            convertTimezone();
        });

        // 启动实时时钟
        updateCurrent();
        startTimer();

        // 初始执行一次时区转换
        convertTimezone();
    }

    window.onload = init;
})();
