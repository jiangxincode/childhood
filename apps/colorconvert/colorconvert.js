// ========== UI Sync Logic (matches syncToOthersFormat in ColorConvertPanel.java) ==========
// Depends on colorutils.js being loaded first

let isChangedByUser = true;

function syncToOthersFormat(colorMode, r, g, b) {
    const rf = r / 255, gf = g / 255, bf = b / 255;

    document.getElementById('color-box').style.backgroundColor = `rgb(${r},${g},${b})`;

    if (colorMode !== 'RGB') {
        document.getElementById('rgb-r').value = r;
        document.getElementById('rgb-g').value = g;
        document.getElementById('rgb-b').value = b;
    }
    if (colorMode !== 'HEX') {
        document.getElementById('rgb-hex').value = color2Hex(r, g, b);
    }
    if (colorMode !== 'HSB') {
        const hsbF = rgbFloatToHsb(rf, gf, bf);
        const hsb = hsbFloatToInt(hsbF[0], hsbF[1], hsbF[2]);
        document.getElementById('hsv-h').value = hsb[0];
        document.getElementById('hsv-s').value = hsb[1];
        document.getElementById('hsv-v').value = hsb[2];
    }
    if (colorMode !== 'HSL') {
        const hslF = rgbFloatToHsl(rf, gf, bf);
        const hsl = hslFloatToInt(hslF[0], hslF[1], hslF[2]);
        document.getElementById('hsl-h').value = hsl[0];
        document.getElementById('hsl-s').value = hsl[1];
        document.getElementById('hsl-l').value = hsl[2];
    }
    if (colorMode !== 'CMYK') {
        const cmykF = rgbFloatToCmyk(rf, gf, bf);
        const cmyk = cmykFloatToInt(cmykF[0], cmykF[1], cmykF[2], cmykF[3]);
        document.getElementById('cmyk-c').value = cmyk[0];
        document.getElementById('cmyk-m').value = cmyk[1];
        document.getElementById('cmyk-y').value = cmyk[2];
        document.getElementById('cmyk-k').value = cmyk[3];
    }
    if (colorMode !== 'CIELAB') {
        const xyz = rgbFloatToCiexyz(rf, gf, bf);
        const labVal = ciexyzToLab(xyz[0], xyz[1], xyz[2]);
        const lab = cielabFloatToInt(labVal[0], labVal[1], labVal[2]);
        document.getElementById('lab-l').value = lab[0];
        document.getElementById('lab-a').value = lab[1];
        document.getElementById('lab-b').value = lab[2];
    }
}

// ========== Event Listeners ==========

['rgb-r', 'rgb-g', 'rgb-b'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        if (!isChangedByUser) return;
        isChangedByUser = false;
        const r = parseInt(document.getElementById('rgb-r').value) || 0;
        const g = parseInt(document.getElementById('rgb-g').value) || 0;
        const b = parseInt(document.getElementById('rgb-b').value) || 0;
        syncToOthersFormat('RGB', clamp(r,0,255), clamp(g,0,255), clamp(b,0,255));
        isChangedByUser = true;
    });
});

document.getElementById('rgb-hex').addEventListener('input', () => {
    if (!isChangedByUser) return;
    isChangedByUser = false;
    const rgb = hex2Rgb(document.getElementById('rgb-hex').value);
    if (rgb) {
        syncToOthersFormat('HEX', rgb[0], rgb[1], rgb[2]);
    }
    isChangedByUser = true;
});

['hsv-h', 'hsv-s', 'hsv-v'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        if (!isChangedByUser) return;
        isChangedByUser = false;
        const h = parseInt(document.getElementById('hsv-h').value) || 0;
        const s = parseInt(document.getElementById('hsv-s').value) || 0;
        const v = parseInt(document.getElementById('hsv-v').value) || 0;
        const hsbF = hsbIntToFloat(h, s, v);
        const rgbF = hsbToRgbFloat(hsbF[0], hsbF[1], hsbF[2]);
        const rgb = rgbFloatToInt(rgbF[0], rgbF[1], rgbF[2]);
        syncToOthersFormat('HSB', clamp(rgb[0],0,255), clamp(rgb[1],0,255), clamp(rgb[2],0,255));
        isChangedByUser = true;
    });
});

['hsl-h', 'hsl-s', 'hsl-l'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        if (!isChangedByUser) return;
        isChangedByUser = false;
        const h = parseInt(document.getElementById('hsl-h').value) || 0;
        const s = parseInt(document.getElementById('hsl-s').value) || 0;
        const l = parseInt(document.getElementById('hsl-l').value) || 0;
        const hslF = hslIntToFloat(h, s, l);
        const rgbF = hslToRgbFloat(hslF[0], hslF[1], hslF[2]);
        const rgb = rgbFloatToInt(rgbF[0], rgbF[1], rgbF[2]);
        syncToOthersFormat('HSL', clamp(rgb[0],0,255), clamp(rgb[1],0,255), clamp(rgb[2],0,255));
        isChangedByUser = true;
    });
});

['cmyk-c', 'cmyk-m', 'cmyk-y', 'cmyk-k'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        if (!isChangedByUser) return;
        isChangedByUser = false;
        const c = parseInt(document.getElementById('cmyk-c').value) || 0;
        const m = parseInt(document.getElementById('cmyk-m').value) || 0;
        const y = parseInt(document.getElementById('cmyk-y').value) || 0;
        const k = parseInt(document.getElementById('cmyk-k').value) || 0;
        const cmykF = cmykIntToFloat(c, m, y, k);
        const rgbF = cmykToRgbFloat(cmykF[0], cmykF[1], cmykF[2], cmykF[3]);
        const rgb = rgbFloatToInt(rgbF[0], rgbF[1], rgbF[2]);
        syncToOthersFormat('CMYK', clamp(rgb[0],0,255), clamp(rgb[1],0,255), clamp(rgb[2],0,255));
        isChangedByUser = true;
    });
});

['lab-l', 'lab-a', 'lab-b'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        if (!isChangedByUser) return;
        isChangedByUser = false;
        const L = parseInt(document.getElementById('lab-l').value) || 0;
        const a = parseInt(document.getElementById('lab-a').value) || 0;
        const bv = parseInt(document.getElementById('lab-b').value) || 0;
        const xyz = labToCiexyz(L, a, bv);
        const rgbF = ciexyzToRgbFloat(xyz[0], xyz[1], xyz[2]);
        const rgb = rgbFloatToInt(rgbF[0], rgbF[1], rgbF[2]);
        syncToOthersFormat('CIELAB', clamp(rgb[0],0,255), clamp(rgb[1],0,255), clamp(rgb[2],0,255));
        isChangedByUser = true;
    });
});

// ========== Toolset ==========

function setToolsetNewValue(value, from) {
    if (!isChangedByUser) return;
    isChangedByUser = false;
    if (from === 1) {
        const percentage = Math.round((value / 255.0) * 100);
        document.getElementById('val-pct').value = percentage;
        document.getElementById('val-hex').value = '0x' + value.toString(16).padStart(2, '0').toUpperCase();
    } else if (from === 2) {
        document.getElementById('val-dec').value = value;
        document.getElementById('val-hex').value = '0x' + value.toString(16).padStart(2, '0').toUpperCase();
    } else if (from === 3) {
        document.getElementById('val-dec').value = value;
        const percentage = Math.round((value / 255.0) * 100);
        document.getElementById('val-pct').value = percentage;
    }
    isChangedByUser = true;
}

document.getElementById('val-dec').addEventListener('input', () => {
    const value = clamp(parseInt(document.getElementById('val-dec').value) || 0, 0, 255);
    setToolsetNewValue(value, 1);
});

document.getElementById('val-pct').addEventListener('input', () => {
    const percent = clamp(parseInt(document.getElementById('val-pct').value) || 0, 0, 100);
    const value = percent / 100.0 >= 1.0 ? 255 : Math.round((percent / 100.0) * 255);
    setToolsetNewValue(value, 2);
});

document.getElementById('val-hex').addEventListener('input', () => {
    const hex = document.getElementById('val-hex').value;
    const value = parseByteHex(hex);
    if (value === -1) return;
    setToolsetNewValue(value, 3);
});
