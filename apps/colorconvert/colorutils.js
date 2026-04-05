// ========== Color Space Conversions (ported from Java) ==========

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function clampF(v) { return Math.min(1.0, Math.max(0.0, v)); }

// --- HSB/HSV (matches Java Color.HSBtoRGB / RGBtoHSB) ---
function hsbToRgbFloat(h, s, b) {
    let r = 0, g = 0, bl = 0;
    if (s === 0) {
        r = g = bl = b;
    } else {
        const sector = (h - Math.floor(h)) * 6.0;
        const i = Math.floor(sector);
        const f = sector - i;
        const p = b * (1 - s);
        const q = b * (1 - s * f);
        const t = b * (1 - s * (1 - f));
        switch (i) {
            case 0: r = b; g = t; bl = p; break;
            case 1: r = q; g = b; bl = p; break;
            case 2: r = p; g = b; bl = t; break;
            case 3: r = p; g = q; bl = b; break;
            case 4: r = t; g = p; bl = b; break;
            case 5: r = b; g = p; bl = q; break;
        }
    }
    return [r, g, bl];
}

function rgbFloatToHsb(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue, saturation;
    const brightness = max;
    if (max !== 0) {
        saturation = (max - min) / max;
    } else {
        saturation = 0;
    }
    if (saturation === 0) {
        hue = 0;
    } else {
        const delta = max - min;
        if (r === max) {
            hue = (g - b) / delta;
        } else if (g === max) {
            hue = 2 + (b - r) / delta;
        } else {
            hue = 4 + (r - g) / delta;
        }
        hue /= 6;
        if (hue < 0) hue += 1;
    }
    return [hue, saturation, brightness];
}

// --- HSL (matches HslColorSpace.java) ---
function hueToRgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
}

function hslToRgbFloat(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hueToRgb(p, q, h + 1/3);
        g = hueToRgb(p, q, h);
        b = hueToRgb(p, q, h - 1/3);
    }
    return [r, g, b];
}

function rgbFloatToHsl(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const delta = max - min;
        s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
        if (max === r) {
            h = (g - b) / delta + (g < b ? 6 : 0);
        } else if (max === g) {
            h = (b - r) / delta + 2;
        } else {
            h = (r - g) / delta + 4;
        }
        h /= 6;
    }
    return [h, s, l];
}

// --- CMYK (matches CmykColorSpace.java) ---
function cmykToRgbFloat(c, m, y, k) {
    const r = 1 - Math.min(1, c * (1 - k) + k);
    const g = 1 - Math.min(1, m * (1 - k) + k);
    const b = 1 - Math.min(1, y * (1 - k) + k);
    return [r, g, b];
}

function rgbFloatToCmyk(r, g, b) {
    const k = 1 - Math.max(r, Math.max(g, b));
    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);
    return [isNaN(c) ? 0 : c, isNaN(m) ? 0 : m, isNaN(y) ? 0 : y, k];
}

// --- CIELAB (matches CielabColorSpace.java via CIEXYZ) ---
function srgbToLinear(c) {
    return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
}
function linearToSrgb(c) {
    return c > 0.0031308 ? 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055 : 12.92 * c;
}

function rgbFloatToCiexyz(r, g, b) {
    const rl = srgbToLinear(r), gl = srgbToLinear(g), bl = srgbToLinear(b);
    // sRGB to XYZ D50 (matches Java CS_CIEXYZ which uses D50 PCS)
    // Exact ICC sRGB profile matrix values
    const x = rl * 0.4360747 + gl * 0.3850649 + bl * 0.1430804;
    const y = rl * 0.2225045 + gl * 0.7168786 + bl * 0.0606169;
    const z = rl * 0.0139322 + gl * 0.0971045 + bl * 0.7141733;
    return [x, y, z];
}

function ciexyzToRgbFloat(x, y, z) {
    // XYZ D50 -> sRGB (inverse of above)
    const rl =  3.1338561 * x - 1.6168667 * y - 0.4906146 * z;
    const gl = -0.9787684 * x + 1.9161415 * y + 0.0334540 * z;
    const bl =  0.0719453 * x - 0.2289914 * y + 1.4052427 * z;
    return [clampF(linearToSrgb(rl)), clampF(linearToSrgb(gl)), clampF(linearToSrgb(bl))];
}

const N = 4.0 / 29.0;

function labF(x) {
    return x > 216.0 / 24389.0 ? Math.cbrt(x) : 841.0 / 108.0 * x + N;
}

function labFInv(x) {
    return x > 6.0 / 29.0 ? x * x * x : 108.0 / 841.0 * (x - N);
}

function ciexyzToLab(x, y, z) {
    const l = labF(y);
    const L = 116.0 * l - 16.0;
    const a = 500.0 * (labF(x) - l);
    const b = 200.0 * (l - labF(z));
    return [L, a, b];
}

function labToCiexyz(L, a, b) {
    const i = (L + 16.0) / 116.0;
    const x = labFInv(i + a / 500.0);
    const y = labFInv(i);
    const z = labFInv(i - b / 200.0);
    return [x, y, z];
}

// --- High-level int conversions (matches ColorUtils.java) ---
function rgbIntToFloat(r, g, b) { return [r / 255, g / 255, b / 255]; }
function rgbFloatToInt(rf, gf, bf) { return [Math.trunc(rf * 255), Math.trunc(gf * 255), Math.trunc(bf * 255)]; }

function hsbIntToFloat(h, s, b) { return [h / 360, s / 100, b / 100]; }
function hsbFloatToInt(h, s, b) { return [Math.trunc(h * 360), Math.trunc(s * 100), Math.trunc(b * 100)]; }

function hslIntToFloat(h, s, l) { return [h / 360, s / 100, l / 100]; }
function hslFloatToInt(h, s, l) { return [Math.trunc(h * 360), Math.trunc(s * 100), Math.trunc(l * 100)]; }

function cmykIntToFloat(c, m, y, k) { return [c / 100, m / 100, y / 100, k / 100]; }
function cmykFloatToInt(c, m, y, k) { return [Math.trunc(c * 100), Math.trunc(m * 100), Math.trunc(y * 100), Math.trunc(k * 100)]; }

function cielabFloatToInt(L, a, b) { return [Math.trunc(L), Math.trunc(a), Math.trunc(b)]; }

function color2Hex(r, g, b) {
    return '0x' + [r, g, b].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('');
}

function hex2Rgb(hex) {
    if (!hex) return null;
    let s = hex.trim();
    if (s.startsWith('0x') || s.startsWith('0X')) s = '#' + s.substring(2);
    if (!s.startsWith('#')) s = '#' + s;
    if (s.length === 4) s = '#' + s[1]+s[1] + s[2]+s[2] + s[3]+s[3];
    if (s.length !== 7) return null;
    const n = parseInt(s.substring(1), 16);
    if (isNaN(n)) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function parseByteHex(hex) {
    if (!hex) return -1;
    let s = hex.trim();
    if (s.startsWith('0x') || s.startsWith('0X')) s = s.substring(2);
    else if (s.startsWith('#')) s = s.substring(1);
    if (s.length !== 2) return -1;
    if (!/^[0-9a-fA-F]{2}$/.test(s)) return -1;
    return parseInt(s, 16);
}

// Export for Node.js / test environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        clamp, clampF,
        hsbToRgbFloat, rgbFloatToHsb,
        hslToRgbFloat, rgbFloatToHsl,
        cmykToRgbFloat, rgbFloatToCmyk,
        rgbFloatToCiexyz, ciexyzToRgbFloat,
        ciexyzToLab, labToCiexyz,
        rgbIntToFloat, rgbFloatToInt,
        hsbIntToFloat, hsbFloatToInt,
        hslIntToFloat, hslFloatToInt,
        cmykIntToFloat, cmykFloatToInt,
        cielabFloatToInt,
        color2Hex, hex2Rgb, parseByteHex
    };
}
