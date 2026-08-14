const { expect } = require('chai');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

/**
 * `src-admin/src/WidgetsManager/Widgets/airQualityUtils.ts` is pure logic, so it can be transpiled
 * and loaded here without pulling in React or the bundler (mirrors test/commonStates.test.js).
 */
function loadAirQualityUtils() {
    const file = join(__dirname, '..', 'src-admin', 'src', 'WidgetsManager', 'Widgets', 'airQualityUtils.ts');
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        fileName: file,
    });
    const mod = new Module(file);
    mod.filename = file;
    mod._compile(outputText, file);
    return mod.exports;
}

const { rankPollutants, resolveEnumDisplay, knownLabelKey } = loadAirQualityUtils();

function row(name, overrides) {
    return { name, hasValue: false, value: null, hasLevel: false, level: null, ...overrides };
}

describe('WidgetsManager airQualityUtils', () => {
    describe('rankPollutants', () => {
        it('sorts by LEVEL worst-first', () => {
            const rows = [
                row('CO2', { hasLevel: true, level: 1 }),
                row('TVOC', { hasLevel: true, level: 4 }),
                row('PM1', { hasLevel: true, level: 2 }),
            ];
            expect(rankPollutants(rows).map(r => r.name)).to.deep.equal(['TVOC', 'PM1', 'CO2']);
        });

        it('sorts reported UNKNOWN (0) below every reported level, not as if it were good', () => {
            const rows = [row('CO2', { hasLevel: true, level: 0 }), row('TVOC', { hasLevel: true, level: 1 })];
            expect(rankPollutants(rows).map(r => r.name)).to.deep.equal(['TVOC', 'CO2']);
        });

        it('sinks a row with no LEVEL state below every row that has one, keeping pattern order', () => {
            const rows = [
                row('CO2', { hasValue: true, value: 800 }), // value only, no LEVEL pattern match
                row('TVOC', { hasLevel: true, level: 0 }), // reported UNKNOWN
                row('PM1', { hasLevel: true, level: 1 }),
            ];
            expect(rankPollutants(rows).map(r => r.name)).to.deep.equal(['PM1', 'TVOC', 'CO2']);
        });

        it('sinks a LEVEL that has not reported yet (null) together with "no LEVEL at all", tied by pattern order', () => {
            const rows = [
                row('CO2', { hasLevel: true, level: null }), // declared, not arrived yet
                row('TVOC', { hasValue: true, value: 400 }), // no LEVEL pattern match at all
                row('PM1', { hasLevel: true, level: 3 }),
            ];
            const ranked = rankPollutants(rows).map(r => r.name);
            expect(ranked[0]).to.equal('PM1');
            // CO2 was declared before TVOC in the input, and both tie at "no severity signal"
            expect(ranked.slice(1)).to.deep.equal(['CO2', 'TVOC']);
        });

        it('ranks a LEVEL reported as a string the same as the equivalent number', () => {
            const rows = [
                row('CO2', { hasLevel: true, level: '2' }),
                row('TVOC', { hasLevel: true, level: 4 }),
                row('PM1', { hasLevel: true, level: '1' }),
            ];
            expect(rankPollutants(rows).map(r => r.name)).to.deep.equal(['TVOC', 'CO2', 'PM1']);
        });

        it('sinks a LEVEL outside the declared 0-4 enum below every readable severity', () => {
            // Such a value renders as a bare uncoloured number, so ranking it first would put the one
            // row nobody can interpret at the top of a list that means "worst first"
            const ranked = rankPollutants([
                row('CO2', { hasLevel: true, level: 7 }),
                row('PM25', { hasLevel: true, level: 4 }),
                row('CO', { hasLevel: true, level: 1 }),
            ]);
            expect(ranked.map(r => r.name)).to.deep.equal(['PM25', 'CO', 'CO2']);
        });

        it('sinks a negative LEVEL the same way', () => {
            const ranked = rankPollutants([
                row('CO2', { hasLevel: true, level: -1 }),
                row('PM25', { hasLevel: true, level: 0 }),
            ]);
            expect(ranked.map(r => r.name)).to.deep.equal(['PM25', 'CO2']);
        });

        it('keeps CRITICAL at the top when another row reports garbage', () => {
            const ranked = rankPollutants([
                row('CO2', { hasLevel: true, level: 99 }),
                row('PM25', { hasLevel: true, level: 4 }),
            ]);
            expect(ranked[0].name).to.equal('PM25');
        });

        it('does not mutate the input array', () => {
            const rows = [row('CO2', { hasLevel: true, level: 1 }), row('TVOC', { hasLevel: true, level: 4 })];
            const copy = rows.map(r => ({ ...r }));
            rankPollutants(rows);
            expect(rows).to.deep.equal(copy);
        });
    });

    describe('resolveEnumDisplay', () => {
        const patternStates = { 0: 'UNKNOWN', 1: 'GOOD', 2: 'FAIR' };
        /** Stands in for the widget's real formatter, which only ever receives a number */
        const numberOnly = value => {
            if (typeof value !== 'number') {
                throw new TypeError(`numeric formatter received a ${typeof value}`);
            }
            return String(value);
        };

        it('renders a dash for a value that has not arrived yet', () => {
            expect(resolveEnumDisplay(null, {}, patternStates, '', String)).to.deep.equal({ text: '—', band: null });
        });

        it("prefers the datapoint's own common.states over the pattern default", () => {
            const result = resolveEnumDisplay(1, { 1: 'Custom Good' }, patternStates, '', String);
            expect(result).to.deep.equal({ text: 'Custom Good', band: 1 });
        });

        it('falls back to the pattern default when the datapoint declares no label for the value', () => {
            const result = resolveEnumDisplay(2, {}, patternStates, '', String);
            expect(result).to.deep.equal({ text: 'FAIR', band: 2 });
        });

        it("does not splice in the pattern label for a value the datapoint's own list left unlabelled", () => {
            // The device labelled 0 and 1 only; 2 is not a gap to fill from the pattern's FAIR — the
            // device's own list, once non-empty, is the whole story, or a 0-500 index sitting at 2
            // would be shown as "FAIR" purely by coincidence of the pattern's numbering.
            const result = resolveEnumDisplay(2, { 0: 'Clean', 1: 'Dirty' }, patternStates, '', String);
            expect(result).to.deep.equal({ text: '2', band: null });
        });

        it('shows the raw number, never "unknown", when neither source has a label (e.g. a 0-500 EPA-style AQI)', () => {
            const result = resolveEnumDisplay(137, {}, patternStates, '', String);
            expect(result).to.deep.equal({ text: '137', band: null });
        });

        it('appends the unit for the unlabelled numeric fallback', () => {
            const result = resolveEnumDisplay(137, {}, {}, 'AQI', String);
            expect(result).to.deep.equal({ text: '137 AQI', band: null });
        });

        it('does not append the unit when a label was found', () => {
            const result = resolveEnumDisplay(1, {}, patternStates, 'AQI', String);
            expect(result).to.deep.equal({ text: 'GOOD', band: 1 });
        });

        it('falls through to the number rather than showing a declared-but-empty label', () => {
            const result = resolveEnumDisplay(1, { 1: '' }, {}, '', String);
            expect(result).to.deep.equal({ text: '1', band: null });
        });

        it('accepts a value reported as a string, resolving the label and the band the same as a number', () => {
            const result = resolveEnumDisplay('1', {}, patternStates, '', String);
            expect(result).to.deep.equal({ text: 'GOOD', band: 1 });
        });

        it('shows an unlabelled string value as-is instead of handing it to the numeric formatter', () => {
            const result = resolveEnumDisplay('GOOD', {}, {}, '', numberOnly);
            expect(result).to.deep.equal({ text: 'GOOD', band: null });
        });

        it('appends the unit to an unlabelled string value too', () => {
            const result = resolveEnumDisplay('HAZE', {}, {}, 'ppm', numberOnly);
            expect(result).to.deep.equal({ text: 'HAZE ppm', band: null });
        });
    });

    describe('knownLabelKey', () => {
        const map = { GOOD: 'wm_aqi_good', VERY_POOR: 'wm_aqi_very_poor' };

        it('matches regardless of case', () => {
            expect(knownLabelKey('good', map)).to.equal('wm_aqi_good');
        });

        it('matches a space- or hyphen-separated label against an underscore-separated key', () => {
            expect(knownLabelKey('Very Poor', map)).to.equal('wm_aqi_very_poor');
            expect(knownLabelKey('very-poor', map)).to.equal('wm_aqi_very_poor');
        });

        it('returns null for a label the map does not recognise, leaving it to be shown as-is', () => {
            expect(knownLabelKey('Sehr gut', map)).to.equal(null);
        });
    });
});
