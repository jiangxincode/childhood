import { describe, it, expect } from 'vitest';
import {
    COLORS, COLOR_NAMES, TYPE_NAMES, WIN_COUNT,
    COORD, INIT_COORDS, START_COORD, FINISH_CHANNEL,
    initRedCoord, initBlueCoord, initYellowCoord, initGreenCoord,
    selectCoordValue, createDefaultUserList, userState, getNextColor,
    hasRelayMarker, getSuperTarget, countSixTime, calcFinishChannelEntry,
    isInFinishChannel, isWinCell, checkVictory, getInitCoord, obtainRandomNum
} from './game.js';

describe('constants', () => {
    it('COLORS has 4 colors in order', () => {
        expect(COLORS).toEqual(['red', 'blue', 'yellow', 'green']);
    });

    it('COLOR_NAMES maps all colors', () => {
        expect(COLOR_NAMES.red).toBe('红');
        expect(COLOR_NAMES.blue).toBe('蓝');
        expect(COLOR_NAMES.yellow).toBe('黄');
        expect(COLOR_NAMES.green).toBe('绿');
    });

    it('TYPE_NAMES maps all types', () => {
        expect(TYPE_NAMES.normal).toBe('玩家');
        expect(TYPE_NAMES.computer).toBe('电脑');
        expect(TYPE_NAMES.close).toBe('无');
    });

    it('WIN_COUNT is 4', () => {
        expect(WIN_COUNT).toBe(4);
    });

    it('START_COORD has correct entry points', () => {
        expect(START_COORD.red).toBe(0);
        expect(START_COORD.blue).toBe(13);
        expect(START_COORD.yellow).toBe(26);
        expect(START_COORD.green).toBe(39);
    });

    it('FINISH_CHANNEL has correct ranges', () => {
        expect(FINISH_CHANNEL.red).toEqual({ min: 61, max: 66 });
        expect(FINISH_CHANNEL.blue).toEqual({ min: 71, max: 76 });
        expect(FINISH_CHANNEL.yellow).toEqual({ min: 81, max: 86 });
        expect(FINISH_CHANNEL.green).toEqual({ min: 91, max: 96 });
    });
});

describe('COORD data', () => {
    it('has 76 cells total (52 main + 24 finish)', () => {
        expect(COORD.length).toBe(76);
    });

    it('main path has 52 cells with ids 1-52', () => {
        var mainCells = COORD.filter(function (c) { return c.id <= 52; });
        expect(mainCells.length).toBe(52);
        expect(mainCells[0].id).toBe(1);
        expect(mainCells[51].id).toBe(52);
    });

    it('each main path cell has id, top, left, and color', () => {
        var mainCells = COORD.filter(function (c) { return c.id <= 52; });
        mainCells.forEach(function (c) {
            expect(c.id).toBeDefined();
            expect(c.top).toBeDefined();
            expect(c.left).toBeDefined();
            expect(c.color).toBeDefined();
            expect(['red', 'blue', 'yellow', 'green']).toContain(c.color);
        });
    });

    it('finish channel cells have no color property', () => {
        var finishCells = COORD.filter(function (c) { return c.id > 52; });
        finishCells.forEach(function (c) {
            expect(c.color).toBeUndefined();
        });
    });

    it('win cells are the last cell of each finish channel', () => {
        var winCells = COORD.filter(function (c) { return c.state === 'win'; });
        expect(winCells.length).toBe(4);
        var winIds = winCells.map(function (c) { return c.id; }).sort();
        expect(winIds).toEqual([66, 76, 86, 96]);
    });

    it('super cells have valid target ids', () => {
        var superCells = COORD.filter(function (c) { return c.super; });
        superCells.forEach(function (c) {
            var targetExists = COORD.some(function (tc) { return tc.id == c.super; });
            expect(targetExists).toBe(true);
        });
    });

    it('relay (r) cells exist on the main path', () => {
        var relayCells = COORD.filter(function (c) { return c.r === 'yes'; });
        expect(relayCells.length).toBeGreaterThan(0);
        relayCells.forEach(function (c) {
            expect(c.id).toBeLessThanOrEqual(52);
        });
    });

    it('colors are evenly distributed on main path', () => {
        var mainCells = COORD.filter(function (c) { return c.id <= 52; });
        var counts = { red: 0, blue: 0, yellow: 0, green: 0 };
        mainCells.forEach(function (c) { counts[c.color]++; });
        expect(counts.red).toBe(13);
        expect(counts.blue).toBe(13);
        expect(counts.yellow).toBe(13);
        expect(counts.green).toBe(13);
    });
});

describe('init coordinates', () => {
    it('each color has 4 starting positions', () => {
        expect(initRedCoord.length).toBe(4);
        expect(initBlueCoord.length).toBe(4);
        expect(initYellowCoord.length).toBe(4);
        expect(initGreenCoord.length).toBe(4);
    });

    it('INIT_COORDS contains all 4 colors', () => {
        expect(INIT_COORDS.red).toBe(initRedCoord);
        expect(INIT_COORDS.blue).toBe(initBlueCoord);
        expect(INIT_COORDS.yellow).toBe(initYellowCoord);
        expect(INIT_COORDS.green).toBe(initGreenCoord);
    });

    it('each starting position has id, top, left', () => {
        Object.values(INIT_COORDS).forEach(function (coords) {
            coords.forEach(function (c) {
                expect(c.id).toBeDefined();
                expect(c.top).toBeDefined();
                expect(c.left).toBeDefined();
            });
        });
    });
});

describe('selectCoordValue', () => {
    it('returns null for falsy coordId', () => {
        expect(selectCoordValue(0)).toBeNull();
        expect(selectCoordValue(null)).toBeNull();
        expect(selectCoordValue(undefined)).toBeNull();
    });

    it('returns correct data for main path cell', () => {
        var coord = selectCoordValue(1);
        expect(coord.id).toBe(1);
        expect(coord.top).toBe('90px');
        expect(coord.left).toBe('630px');
        expect(coord.coordColor).toBe('green');
        expect(coord.superCoord).toBeUndefined();
        expect(coord.r).toBeUndefined();
        expect(coord.state).toBeUndefined();
    });

    it('returns super coord for super cells', () => {
        var coord = selectCoordValue(5);
        expect(coord.superCoord).toBe('17');
        expect(coord.coordColor).toBe('green');
    });

    it('returns r marker for relay cells', () => {
        var coord = selectCoordValue(11);
        expect(coord.r).toBe('yes');
        expect(coord.coordColor).toBe('blue');
    });

    it('returns win state for finish cells', () => {
        expect(selectCoordValue(66).state).toBe('win');
        expect(selectCoordValue(76).state).toBe('win');
        expect(selectCoordValue(86).state).toBe('win');
        expect(selectCoordValue(96).state).toBe('win');
    });

    it('finish channel cells have no coordColor', () => {
        var coord = selectCoordValue(61);
        expect(coord.coordColor).toBeUndefined();
    });

    it('returns data for all valid coord ids', () => {
        var allIds = [1, 13, 26, 39, 52, 61, 66, 71, 76, 81, 86, 91, 96];
        allIds.forEach(function (id) {
            var coord = selectCoordValue(id);
            expect(coord).not.toBeNull();
            expect(coord.id).toBe(id);
        });
    });
});

describe('createDefaultUserList', () => {
    it('creates 4 users', () => {
        var list = createDefaultUserList();
        expect(list.length).toBe(4);
    });

    it('red is normal, others are computer', () => {
        var list = createDefaultUserList();
        expect(list[0]).toEqual({ color: 'red', state: 'normal' });
        expect(list[1]).toEqual({ color: 'blue', state: 'computer' });
        expect(list[2]).toEqual({ color: 'yellow', state: 'computer' });
        expect(list[3]).toEqual({ color: 'green', state: 'computer' });
    });

    it('covers all 4 colors', () => {
        var list = createDefaultUserList();
        var colors = list.map(function (u) { return u.color; });
        expect(colors).toEqual(['red', 'blue', 'yellow', 'green']);
    });
});

describe('userState', () => {
    var list = createDefaultUserList();

    it('returns state for existing user', () => {
        expect(userState('red', list)).toBe('normal');
        expect(userState('blue', list)).toBe('computer');
    });

    it('returns undefined for unknown color', () => {
        expect(userState('purple', list)).toBeUndefined();
    });

    it('works with custom user list', () => {
        var custom = [
            { color: 'red', state: 'close' },
            { color: 'blue', state: 'win' }
        ];
        expect(userState('red', custom)).toBe('close');
        expect(userState('blue', custom)).toBe('win');
    });
});

describe('getNextColor', () => {
    it('cycles through all colors', () => {
        expect(getNextColor('red')).toBe('blue');
        expect(getNextColor('blue')).toBe('yellow');
        expect(getNextColor('yellow')).toBe('green');
        expect(getNextColor('green')).toBe('red');
    });

    it('wraps around from green to red', () => {
        expect(getNextColor('green')).toBe('red');
    });

    it('defaults to red for unknown color', () => {
        expect(getNextColor('purple')).toBe('red');
    });
});

describe('hasRelayMarker', () => {
    it('returns true for relay cells', () => {
        expect(hasRelayMarker(11)).toBe(true);
        expect(hasRelayMarker(24)).toBe(true);
        expect(hasRelayMarker(37)).toBe(true);
        expect(hasRelayMarker(50)).toBe(true);
    });

    it('returns false for non-relay cells', () => {
        expect(hasRelayMarker(1)).toBe(false);
        expect(hasRelayMarker(5)).toBe(false);
        expect(hasRelayMarker(52)).toBe(false);
    });

    it('returns false for finish channel cells', () => {
        expect(hasRelayMarker(61)).toBe(false);
        expect(hasRelayMarker(76)).toBe(false);
    });
});

describe('getSuperTarget', () => {
    it('returns target for super cells', () => {
        expect(getSuperTarget(5)).toBe('17');
        expect(getSuperTarget(18)).toBe('30');
        expect(getSuperTarget(31)).toBe('43');
        expect(getSuperTarget(44)).toBe('4');
    });

    it('returns null for non-super cells', () => {
        expect(getSuperTarget(1)).toBeNull();
        expect(getSuperTarget(11)).toBeNull();
        expect(getSuperTarget(52)).toBeNull();
    });

    it('returns null for finish channel cells', () => {
        expect(getSuperTarget(61)).toBeNull();
        expect(getSuperTarget(96)).toBeNull();
    });
});

describe('countSixTime', () => {
    it('increments count on rolling 6', () => {
        var tracker = { count: 0 };
        countSixTime(6, tracker);
        expect(tracker.count).toBe(1);
    });

    it('does not increment on non-6 roll', () => {
        var tracker = { count: 0 };
        countSixTime(3, tracker);
        expect(tracker.count).toBe(0);
    });

    it('returns false for first and second six', () => {
        var tracker = { count: 0 };
        expect(countSixTime(6, tracker)).toBe(false);
        expect(countSixTime(6, tracker)).toBe(false);
    });

    it('returns true on third consecutive six', () => {
        var tracker = { count: 0 };
        countSixTime(6, tracker);
        countSixTime(6, tracker);
        expect(countSixTime(6, tracker)).toBe(true);
    });

    it('count continues across non-6 rolls (only resets externally)', () => {
        var tracker = { count: 2 };
        countSixTime(3, tracker);
        expect(tracker.count).toBe(2); // not reset by non-6
        expect(countSixTime(6, tracker)).toBe(true);
    });
});

describe('isInFinishChannel', () => {
    it('returns true for all finish channel ids', () => {
        [61, 62, 63, 64, 65, 66, 71, 72, 73, 74, 75, 76,
         81, 82, 83, 84, 85, 86, 91, 92, 93, 94, 95, 96].forEach(function (id) {
            expect(isInFinishChannel(id)).toBe(true);
        });
    });

    it('returns false for main path cells', () => {
        expect(isInFinishChannel(1)).toBe(false);
        expect(isInFinishChannel(52)).toBe(false);
        expect(isInFinishChannel(0)).toBe(false);
    });
});

describe('isWinCell', () => {
    it('returns true for win cells', () => {
        expect(isWinCell(66)).toBe(true);
        expect(isWinCell(76)).toBe(true);
        expect(isWinCell(86)).toBe(true);
        expect(isWinCell(96)).toBe(true);
    });

    it('returns false for non-win finish channel cells', () => {
        expect(isWinCell(61)).toBe(false);
        expect(isWinCell(71)).toBe(false);
        expect(isWinCell(81)).toBe(false);
        expect(isWinCell(91)).toBe(false);
    });

    it('returns false for main path cells', () => {
        expect(isWinCell(1)).toBe(false);
        expect(isWinCell(52)).toBe(false);
    });
});

describe('checkVictory', () => {
    it('returns false when no planes have won', () => {
        var planes = [
            { type: 'red', state: 'running' },
            { type: 'red', state: 'running' },
            { type: 'red', state: 'ready' },
            { type: 'red', state: 'unready' }
        ];
        expect(checkVictory(planes, 'red')).toBe(false);
    });

    it('returns false with 3 wins', () => {
        var planes = [
            { type: 'red', state: 'win' },
            { type: 'red', state: 'win' },
            { type: 'red', state: 'win' },
            { type: 'red', state: 'running' }
        ];
        expect(checkVictory(planes, 'red')).toBe(false);
    });

    it('returns true with all 4 wins', () => {
        var planes = [
            { type: 'red', state: 'win' },
            { type: 'red', state: 'win' },
            { type: 'red', state: 'win' },
            { type: 'red', state: 'win' }
        ];
        expect(checkVictory(planes, 'red')).toBe(true);
    });

    it('ignores other colors', () => {
        var planes = [
            { type: 'red', state: 'win' },
            { type: 'red', state: 'win' },
            { type: 'red', state: 'win' },
            { type: 'red', state: 'win' },
            { type: 'blue', state: 'running' }
        ];
        expect(checkVictory(planes, 'red')).toBe(true);
        expect(checkVictory(planes, 'blue')).toBe(false);
    });

    it('returns false for empty planes', () => {
        expect(checkVictory([], 'red')).toBe(false);
    });
});

describe('getInitCoord', () => {
    it('returns correct coords for each plane', () => {
        var c1 = getInitCoord('red', 1);
        expect(c1).toEqual({ top: '73', left: '770' });
        var c4 = getInitCoord('red', 4);
        expect(c4).toEqual({ top: '165', left: '865' });
    });

    it('returns coords for all colors', () => {
        COLORS.forEach(function (color) {
            for (var n = 1; n <= 4; n++) {
                var coord = getInitCoord(color, n);
                expect(coord).not.toBeNull();
                expect(coord.top).toBeDefined();
                expect(coord.left).toBeDefined();
            }
        });
    });

    it('returns null for unknown color', () => {
        expect(getInitCoord('purple', 1)).toBeNull();
    });

    it('returns null for invalid plane number', () => {
        expect(getInitCoord('red', 0)).toBeNull();
        expect(getInitCoord('red', 5)).toBeNull();
    });
});

describe('obtainRandomNum', () => {
    it('returns 0 for length 1', () => {
        expect(obtainRandomNum(1)).toBe(0);
    });

    it('returns value in range [0, length)', () => {
        for (var i = 0; i < 100; i++) {
            var n = obtainRandomNum(4);
            expect(n).toBeGreaterThanOrEqual(0);
            expect(n).toBeLessThan(4);
        }
    });

    it('returns integer', () => {
        for (var i = 0; i < 50; i++) {
            var n = obtainRandomNum(6);
            expect(Number.isInteger(n)).toBe(true);
        }
    });

    it('returns 0 for length <= 0', () => {
        expect(obtainRandomNum(0)).toBe(0);
        expect(obtainRandomNum(-1)).toBe(0);
    });
});

describe('calcFinishChannelEntry', () => {
    it('enters red finish channel with correct offset', () => {
        var result = calcFinishChannelEntry(50, 3, 'red');
        expect(result.coordId).toBe(63);
        expect(result.backStep).toBe(false);
    });

    it('enters blue finish channel', () => {
        var result = calcFinishChannelEntry(50, 2, 'blue');
        expect(result.coordId).toBe(72);
        expect(result.backStep).toBe(false);
    });

    it('enters yellow finish channel', () => {
        var result = calcFinishChannelEntry(50, 4, 'yellow');
        expect(result.coordId).toBe(84);
        expect(result.backStep).toBe(false);
    });

    it('enters green finish channel', () => {
        var result = calcFinishChannelEntry(50, 1, 'green');
        expect(result.coordId).toBe(91);
        expect(result.backStep).toBe(false);
    });

    it('bounces back when exceeding finish channel', () => {
        var result = calcFinishChannelEntry(50, 8, 'red');
        expect(result.backStep).toBe(true);
        // 60 + 8 = 68, overshoot 66 by 2, bounce to 64
        expect(result.coordId).toBe(64);
    });

    it('lands exactly on win cell', () => {
        var result = calcFinishChannelEntry(50, 6, 'red');
        expect(result.coordId).toBe(66);
        expect(result.backStep).toBe(false);
    });
});
