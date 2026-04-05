import { describe, it, expect } from 'vitest';

const {
    hsbToRgbFloat, rgbFloatToHsb,
    hslToRgbFloat, rgbFloatToHsl,
    cmykToRgbFloat, rgbFloatToCmyk,
    rgbFloatToCiexyz, ciexyzToRgbFloat,
    ciexyzToLab, labToCiexyz,
    color2Hex, hex2Rgb, parseByteHex
} = require('./colorutils.js');

// Helper: Java getRGBColorComponents returns [r/255, g/255, b/255]
function rgbComponents(r, g, b) {
    return [r / 255, g / 255, b / 255];
}

function expectArrayClose(actual, expected, tolerance) {
    expect(actual.length).toBe(expected.length);
    for (let i = 0; i < expected.length; i++) {
        const diff = Math.abs(actual[i] - expected[i]);
        expect(diff, `index ${i}: expected ${expected[i]}, got ${actual[i]}, diff ${diff}`).toBeLessThanOrEqual(tolerance);
    }
}

describe('color2Hex', () => {
    it('should convert RGB(194,175,120) to 0xC2AF78', () => {
        expect(color2Hex(194, 175, 120)).toBe('0xC2AF78');
    });
    it('should convert RGB(158,151,100) to 0x9E9764', () => {
        expect(color2Hex(158, 151, 100)).toBe('0x9E9764');
    });
});

describe('hex2Rgb', () => {
    it('should parse 0xC2AF78 to [194,175,120]', () => {
        expect(hex2Rgb('0xC2AF78')).toEqual([194, 175, 120]);
    });
    it('should parse 0x9E9764 to [158,151,100]', () => {
        expect(hex2Rgb('0x9E9764')).toEqual([158, 151, 100]);
    });
});

describe('HSB/HSV conversions', () => {
    it('hsb(0.125,0.38,0.76) -> rgb(194,175,120)', () => {
        const expected = rgbComponents(194, 175, 120);
        const actual = hsbToRgbFloat(0.125, 0.38, 0.76);
        expectArrayClose(actual, expected, 0.01);
    });
    it('hsb(0.147,0.37,0.62) -> rgb(158,151,100)', () => {
        const expected = rgbComponents(158, 151, 100);
        const actual = hsbToRgbFloat(0.147, 0.37, 0.62);
        expectArrayClose(actual, expected, 0.01);
    });
    it('rgb(194,175,120) -> hsb(0.125,0.38,0.76)', () => {
        const expected = [0.125, 0.38, 0.76];
        const actual = rgbFloatToHsb(...rgbComponents(194, 175, 120));
        expectArrayClose(actual, expected, 0.01);
    });
    it('rgb(158,151,100) -> hsb(0.147,0.37,0.62)', () => {
        const expected = [0.147, 0.37, 0.62];
        const actual = rgbFloatToHsb(...rgbComponents(158, 151, 100));
        expectArrayClose(actual, expected, 0.01);
    });
});

describe('HSL conversions', () => {
    it('hsl(0.125,0.38,0.62) -> rgb(194,175,120)', () => {
        const expected = rgbComponents(194, 175, 120);
        const actual = hslToRgbFloat(0.125, 0.38, 0.62);
        expectArrayClose(actual, expected, 0.01);
    });
    it('hsl(0.147,0.23,0.51) -> rgb(158,151,100)', () => {
        const expected = rgbComponents(158, 151, 100);
        const actual = hslToRgbFloat(0.147, 0.23, 0.51);
        expectArrayClose(actual, expected, 0.01);
    });
    it('rgb(194,175,120) -> hsl(0.125,0.38,0.62)', () => {
        const expected = [0.125, 0.38, 0.62];
        const actual = rgbFloatToHsl(...rgbComponents(194, 175, 120));
        expectArrayClose(actual, expected, 0.01);
    });
    it('rgb(158,151,100) -> hsl(0.147,0.23,0.51)', () => {
        const expected = [0.147, 0.23, 0.51];
        const actual = rgbFloatToHsl(...rgbComponents(158, 151, 100));
        expectArrayClose(actual, expected, 0.01);
    });
});

describe('CMYK conversions', () => {
    it('cmyk(0,0.1,0.38,0.24) -> rgb(194,175,120)', () => {
        const expected = rgbComponents(194, 175, 120);
        const actual = cmykToRgbFloat(0, 0.1, 0.38, 0.24);
        expectArrayClose(actual, expected, 0.01);
    });
    it('cmyk(0,0.04,0.37,0.38) -> rgb(158,151,100)', () => {
        const expected = rgbComponents(158, 151, 100);
        const actual = cmykToRgbFloat(0, 0.04, 0.37, 0.38);
        expectArrayClose(actual, expected, 0.01);
    });
    it('rgb(194,175,120) -> cmyk(0,0.1,0.38,0.24)', () => {
        const expected = [0, 0.1, 0.38, 0.24];
        const actual = rgbFloatToCmyk(...rgbComponents(194, 175, 120));
        expectArrayClose(actual, expected, 0.01);
    });
    it('rgb(158,151,100) -> cmyk(0,0.04,0.37,0.38)', () => {
        const expected = [0, 0.04, 0.37, 0.38];
        const actual = rgbFloatToCmyk(...rgbComponents(158, 151, 100));
        expectArrayClose(actual, expected, 0.01);
    });
});

describe('CIELAB conversions', () => {
    // CIELAB uses CIEXYZ as intermediate, and Java's CS_CIEXYZ uses the ICC sRGB profile
    // internally. Minor floating-point differences in the profile matrix lead to ~0.01-0.02
    // deviation, so we use a slightly relaxed tolerance for the round-trip tests.
    const labTolerance = 0.02;

    it('lab(72.145,-3.368,38.379) -> rgb(194,175,120)', () => {
        const expected = rgbComponents(194, 175, 120);
        const xyz = labToCiexyz(72.145, -3.368, 38.379);
        const actual = ciexyzToRgbFloat(xyz[0], xyz[1], xyz[2]);
        expectArrayClose(actual, expected, 0.01);
    });
    it('lab(62.140,-7.192,34.513) -> rgb(158,151,100)', () => {
        const expected = rgbComponents(158, 151, 100);
        const xyz = labToCiexyz(62.140, -7.192, 34.513);
        const actual = ciexyzToRgbFloat(xyz[0], xyz[1], xyz[2]);
        expectArrayClose(actual, expected, 0.01);
    });
    it('rgb(194,175,120) -> lab(72.145,-3.368,38.379)', () => {
        const expected = [72.145, -3.368, 38.379];
        const xyz = rgbFloatToCiexyz(...rgbComponents(194, 175, 120));
        const actual = ciexyzToLab(xyz[0], xyz[1], xyz[2]);
        expectArrayClose(actual, expected, labTolerance);
    });
    it('rgb(158,151,100) -> lab(62.140,-7.192,34.513)', () => {
        const expected = [62.140, -7.192, 34.513];
        const xyz = rgbFloatToCiexyz(...rgbComponents(158, 151, 100));
        const actual = ciexyzToLab(xyz[0], xyz[1], xyz[2]);
        expectArrayClose(actual, expected, labTolerance);
    });
});

describe('parseByteHex', () => {
    it('should parse 0xC2', () => {
        expect(parseByteHex('0xC2')).toBe(0xC2);
    });
    it('should parse 0xFF', () => {
        expect(parseByteHex('0xFF')).toBe(0xFF);
    });
    it('should parse 0x00', () => {
        expect(parseByteHex('0x00')).toBe(0x00);
    });
    it('should parse #AB', () => {
        expect(parseByteHex('#AB')).toBe(0xAB);
    });
    it('should return -1 for invalid input', () => {
        expect(parseByteHex('invalid')).toBe(-1);
    });
    it('should return -1 for 0xGG', () => {
        expect(parseByteHex('0xGG')).toBe(-1);
    });
    it('should return -1 for null', () => {
        expect(parseByteHex(null)).toBe(-1);
    });
});
