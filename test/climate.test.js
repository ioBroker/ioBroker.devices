const { expect } = require('chai');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

/**
 * `src-admin/src/WidgetsManager/Widgets/climate.ts` is pure logic with type-only imports, so it can
 * be transpiled and loaded here without pulling in React or the bundler.
 */
function loadClimate() {
    const file = join(__dirname, '..', 'src-admin', 'src', 'WidgetsManager', 'Widgets', 'climate.ts');
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        fileName: file,
    });
    const mod = new Module(file);
    mod.filename = file;
    mod._compile(outputText, file);
    return mod.exports;
}

const {
    findSetpointIds,
    isDualSetpoint,
    singleSetpointKind,
    valueToFraction,
    fractionToValue,
    clampToRange,
    rangeFromCommon,
    mergeRanges,
    pickDragTarget,
    clampAgainstOther,
    offDialSetpointKinds,
    metaFromCommon,
    clampForWrite,
    pointerToFraction,
    thumbCenter,
    ARC_VIEWBOX,
    ARC_RADIUS,
} = loadClimate();

const RANGE = { min: 5, max: 30, step: 0.5 };

/** Stands in for the arc's DOM node: a 200×200 box whose top-left corner is at the origin */
function arcBox(size = 200) {
    return { getBoundingClientRect: () => ({ left: 0, top: 0, width: size, height: size }) };
}

describe('WidgetsManager climate dial', () => {
    describe('findSetpointIds', () => {
        it('reads one id per setpoint variant', () => {
            const ids = findSetpointIds([
                { name: 'SET', id: 'alias.0.d.SET' },
                { name: 'SET_HEATING', id: 'alias.0.d.HEAT' },
                { name: 'ACTUAL', id: 'alias.0.d.ACTUAL' },
            ]);
            expect(ids).to.deep.equal({ plain: 'alias.0.d.SET', heating: 'alias.0.d.HEAT', cooling: null });
        });

        it('treats a state whose alias was wiped as absent', () => {
            // The detector keeps the name and empties the id, so `??` would not fall through
            const ids = findSetpointIds([
                { name: 'SET', id: '' },
                { name: 'SET_COOLING', id: 'alias.0.d.COOL' },
            ]);
            expect(ids.plain).to.be.null;
            expect(ids.cooling).to.equal('alias.0.d.COOL');
        });

        it('treats the id the detector actually emits for an unmatched state as absent', () => {
            // An unmatched pattern entry arrives with `id: undefined`, not with an empty string
            const ids = findSetpointIds([{ name: 'SET' }, { name: 'SET_HEATING', id: 'alias.0.d.HEAT' }]);
            expect(ids.plain).to.be.null;
            expect(ids.heating).to.equal('alias.0.d.HEAT');
        });

        it('looks past an empty entry to a later one carrying the same name', () => {
            // No pattern declares a setpoint twice today, but `airCondition` does declare `SWING`
            // twice, so a duplicate name is a shape the detector can produce: the guard has to pick
            // the entry that matched rather than the first one bearing the name
            const ids = findSetpointIds([
                { name: 'SET_HEATING', id: '' },
                { name: 'SET_HEATING', id: 'alias.0.d.HEAT' },
            ]);
            expect(ids.heating).to.equal('alias.0.d.HEAT');
        });
    });

    describe('isDualSetpoint / singleSetpointKind', () => {
        it('needs both a heating and a cooling setpoint for two thumbs', () => {
            expect(isDualSetpoint({ plain: null, heating: 'h', cooling: 'c' })).to.be.true;
            expect(isDualSetpoint({ plain: 'p', heating: 'h', cooling: null })).to.be.false;
            expect(isDualSetpoint({ plain: 'p', heating: null, cooling: null })).to.be.false;
        });

        it('falls back to the one alternative a heating- or cooling-only device declares', () => {
            expect(singleSetpointKind({ plain: 'p', heating: 'h', cooling: null })).to.equal('plain');
            expect(singleSetpointKind({ plain: null, heating: 'h', cooling: null })).to.equal('heating');
            expect(singleSetpointKind({ plain: null, heating: null, cooling: 'c' })).to.equal('cooling');
            expect(singleSetpointKind({ plain: null, heating: null, cooling: null })).to.be.null;
        });
    });

    describe('offDialSetpointKinds', () => {
        const kinds = (ids, dual, single) => offDialSetpointKinds(ids, dual, single);

        it('has nothing to add when the dial carries the only setpoint', () => {
            expect(kinds({ plain: 'p', heating: null, cooling: null }, false, 'plain')).to.deep.equal([]);
            expect(kinds({ plain: null, heating: 'h', cooling: 'c' }, true, null)).to.deep.equal([]);
        });

        it('surfaces the plain setpoint a device declares beside the pair', () => {
            expect(kinds({ plain: 'p', heating: 'h', cooling: 'c' }, true, null)).to.deep.equal(['plain']);
        });

        it('surfaces the directional setpoint a device declares beside a plain one', () => {
            // SET + SET_HEATING with no cooling is detectable, and the dial only carries SET
            expect(kinds({ plain: 'p', heating: 'h', cooling: null }, false, 'plain')).to.deep.equal(['heating']);
            expect(kinds({ plain: 'p', heating: null, cooling: 'c' }, false, 'plain')).to.deep.equal(['cooling']);
        });

        it('offers nothing for a device without setpoints', () => {
            expect(kinds({ plain: null, heating: null, cooling: null }, false, null)).to.deep.equal([]);
        });
    });

    describe('metaFromCommon and clampForWrite', () => {
        it('reads a datapoint that cannot be written as read-only', () => {
            expect(metaFromCommon({ min: 5, max: 30, write: false }, RANGE).readOnly).to.be.true;
            expect(metaFromCommon({ min: 5, max: 30, write: true }, RANGE).readOnly).to.be.false;
            // `write` is optional in a common section; absent means writable
            expect(metaFromCommon({ min: 5, max: 30 }, RANGE).readOnly).to.be.false;
            expect(metaFromCommon(undefined, RANGE).readOnly).to.be.false;
        });

        it('writes within the target datapoint, not within the dial it was dragged on', () => {
            // The dial spans both setpoints; the heating datapoint stops at 25
            const metas = {
                heating: { range: { min: 5, max: 25, step: 0.5 }, readOnly: false },
                cooling: { range: { min: 16, max: 32, step: 0.5 }, readOnly: false },
            };
            const dial = { min: 5, max: 32, step: 0.5 };
            expect(clampForWrite(metas, 'heating', 30, dial)).to.equal(25);
            expect(clampForWrite(metas, 'cooling', 12, dial)).to.equal(16);
            expect(clampForWrite(metas, 'heating', 21, dial)).to.equal(21);
        });

        it('falls back to the dial range for a setpoint whose object declared none', () => {
            expect(clampForWrite({}, 'plain', 99, RANGE)).to.equal(30);
            expect(clampForWrite({ plain: { range: null, readOnly: false } }, 'plain', 99, RANGE)).to.equal(30);
        });
    });

    describe('value ↔ fraction', () => {
        it('maps the ends of the range to the ends of the arc', () => {
            expect(valueToFraction(5, RANGE)).to.equal(0);
            expect(valueToFraction(30, RANGE)).to.equal(1);
            expect(valueToFraction(17.5, RANGE)).to.equal(0.5);
        });

        it('clamps a value outside the range instead of running off the arc', () => {
            expect(valueToFraction(-40, RANGE)).to.equal(0);
            expect(valueToFraction(90, RANGE)).to.equal(1);
        });

        it('reports 0 for a degenerate range rather than dividing by zero', () => {
            expect(valueToFraction(10, { min: 10, max: 10, step: 1 })).to.equal(0);
        });

        it('rounds to the declared step', () => {
            expect(fractionToValue(0.5, RANGE)).to.equal(17.5);
            expect(fractionToValue(0.5, { min: 5, max: 30, step: 1 })).to.equal(18);
            expect(fractionToValue(0.123, { min: 0, max: 100, step: 5 })).to.equal(10);
        });

        it('stays on a step multiple inside the range, so a limit that is not one is not reachable', () => {
            // Characterises the rounding: 27 rounds down to 25 rather than being offered as an end stop
            expect(fractionToValue(1, { min: 0, max: 27, step: 5 })).to.equal(25);
            expect(fractionToValue(0, { min: 3, max: 27, step: 5 })).to.equal(5);
        });

        it('never leaves the range', () => {
            expect(fractionToValue(1, { min: 0, max: 27, step: 5 })).to.be.at.most(27);
            expect(fractionToValue(0, { min: 3, max: 27, step: 5 })).to.be.at.least(3);
        });

        it('survives a step of zero', () => {
            expect(fractionToValue(0.5, { min: 0, max: 10, step: 0 })).to.equal(5);
        });
    });

    describe('rangeFromCommon', () => {
        it('takes min, max and step from the datapoint', () => {
            expect(rangeFromCommon({ min: 7, max: 28, step: 0.1 }, RANGE)).to.deep.equal({
                min: 7,
                max: 28,
                step: 0.1,
            });
        });

        it('fills what the datapoint leaves out from the fallback', () => {
            expect(rangeFromCommon({ min: 7 }, RANGE)).to.deep.equal({ min: 7, max: 30, step: 0.5 });
        });

        it('rejects an inverted or empty range', () => {
            expect(rangeFromCommon({ min: 30, max: 10 }, RANGE)).to.be.null;
            expect(rangeFromCommon({ min: 10, max: 10 }, RANGE)).to.be.null;
            expect(rangeFromCommon(undefined, RANGE)).to.be.null;
        });

        it('rejects a non-numeric limit', () => {
            expect(rangeFromCommon({ min: 'warm', max: 30 }, RANGE)).to.be.null;
        });

        it('ignores a step of zero and keeps the fallback', () => {
            expect(rangeFromCommon({ min: 0, max: 10, step: 0 }, RANGE).step).to.equal(0.5);
        });
    });

    describe('mergeRanges', () => {
        it('spans both setpoints and keeps the finer step', () => {
            expect(
                mergeRanges([
                    { min: 5, max: 25, step: 0.5 },
                    { min: 16, max: 32, step: 0.1 },
                ]),
            ).to.deep.equal({ min: 5, max: 32, step: 0.1 });
        });

        it('skips the setpoints whose object could not be read', () => {
            expect(mergeRanges([null, { min: 16, max: 30, step: 1 }, null])).to.deep.equal({
                min: 16,
                max: 30,
                step: 1,
            });
        });

        it('reports nothing usable rather than an empty range', () => {
            expect(mergeRanges([null, null])).to.be.null;
            expect(mergeRanges([])).to.be.null;
        });
    });

    describe('pickDragTarget', () => {
        it('picks the thumb the gesture started nearer to', () => {
            expect(pickDragTarget(18, 20, 26)).to.equal('heating');
            expect(pickDragTarget(25, 20, 26)).to.equal('cooling');
        });

        it('gives a tie to heating, which the crossing rule then separates', () => {
            expect(pickDragTarget(23, 20, 26)).to.equal('heating');
            expect(pickDragTarget(22, 22, 22)).to.equal('heating');
        });

        it('picks the thumb that exists when the other has no value yet', () => {
            expect(pickDragTarget(18, null, 26)).to.equal('cooling');
            expect(pickDragTarget(18, 20, null)).to.equal('heating');
        });

        it('leads with heating when the device has reported neither', () => {
            expect(pickDragTarget(18, null, null)).to.equal('heating');
        });
    });

    describe('clampAgainstOther', () => {
        it('stops a thumb at the other one instead of swapping them', () => {
            expect(clampAgainstOther('heating', 28, 24)).to.equal(24);
            expect(clampAgainstOther('cooling', 20, 24)).to.equal(24);
        });

        it('leaves a value on its own side alone', () => {
            expect(clampAgainstOther('heating', 20, 24)).to.equal(20);
            expect(clampAgainstOther('cooling', 26, 24)).to.equal(26);
        });

        it('does not constrain a thumb whose counterpart has no value', () => {
            expect(clampAgainstOther('heating', 28, null)).to.equal(28);
        });
    });

    describe('pointerToFraction', () => {
        const box = arcBox();

        it('reports nothing while the arc is not mounted', () => {
            expect(pointerToFraction(null, 0, 0)).to.be.null;
        });

        it('puts the start of the scale at the lower left and the end at the lower right', () => {
            // The arc starts 225° clockwise from 12 o'clock and sweeps 270°
            expect(pointerToFraction(box, 0, 200)).to.be.closeTo(0, 1e-9);
            expect(pointerToFraction(box, 200, 200)).to.be.closeTo(1, 1e-9);
        });

        it("puts the middle of the scale at 12 o'clock", () => {
            expect(pointerToFraction(box, 100, 0)).to.be.closeTo(0.5, 1e-9);
        });

        it('snaps a pointer inside the bottom gap to the nearer end', () => {
            // Straight down is the centre of the 90° gap; the left half belongs to the start, the
            // right half to the end
            expect(pointerToFraction(box, 80, 200)).to.equal(0);
            expect(pointerToFraction(box, 120, 200)).to.equal(1);
        });

        it('is independent of the arc size', () => {
            expect(pointerToFraction(arcBox(64), 32, 0)).to.be.closeTo(0.5, 1e-9);
        });
    });

    describe('thumbCenter', () => {
        it('places the ends of the scale where the dash starts and stops', () => {
            const c = ARC_VIEWBOX / 2;
            // Fraction 0 sits at 3 o'clock before the 135° rotation is applied
            expect(thumbCenter(0).x).to.be.closeTo(c + ARC_RADIUS, 1e-9);
            expect(thumbCenter(0).y).to.be.closeTo(c, 1e-9);
            // 270° later, at 12 o'clock unrotated
            expect(thumbCenter(1).x).to.be.closeTo(c, 1e-9);
            expect(thumbCenter(1).y).to.be.closeTo(c - ARC_RADIUS, 1e-9);
        });

        it('stays on the arc for every fraction', () => {
            const c = ARC_VIEWBOX / 2;
            for (const f of [0, 0.17, 0.33, 0.5, 0.75, 1]) {
                const { x, y } = thumbCenter(f);
                expect(Math.hypot(x - c, y - c)).to.be.closeTo(ARC_RADIUS, 1e-9);
            }
        });
    });

    describe('a pointer round trip', () => {
        it('lands back on the value the thumb was drawn at', () => {
            const box = arcBox();
            const value = fractionToValue(pointerToFraction(box, 100, 0), RANGE);
            expect(value).to.equal(17.5);
            expect(clampToRange(value, RANGE)).to.equal(17.5);
        });
    });
});
