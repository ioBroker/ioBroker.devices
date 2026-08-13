const { expect } = require('chai');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

/**
 * `src-admin/src/WidgetsManager/Widgets/commonStates.ts` is pure logic, so it can be transpiled and
 * loaded here without pulling in React or the bundler.
 */
function loadCommonStates() {
    const file = join(__dirname, '..', 'src-admin', 'src', 'WidgetsManager', 'Widgets', 'commonStates.ts');
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        fileName: file,
    });
    const mod = new Module(file);
    mod.filename = file;
    mod._compile(outputText, file);
    return mod.exports;
}

const { parseCommonStates, stateKeyToValue } = loadCommonStates();

describe('WidgetsManager common.states', () => {
    describe('parseCommonStates', () => {
        it('reads the object form', () => {
            expect(parseCommonStates({ 0: 'Idle', 1: 'Heat' })).to.deep.equal({ 0: 'Idle', 1: 'Heat' });
        });

        it('reads the "0:Idle;1:Heat" string form', () => {
            expect(parseCommonStates('0:Idle;1:Heat;2:Cool')).to.deep.equal({ 0: 'Idle', 1: 'Heat', 2: 'Cool' });
        });

        it('trims around the separators of the string form', () => {
            expect(parseCommonStates(' 0 : Idle ; 1 : Heat ')).to.deep.equal({ 0: 'Idle', 1: 'Heat' });
        });

        it('reads the array form, where the value is the index', () => {
            expect(parseCommonStates(['Idle', 'Heat'])).to.deep.equal({ 0: 'Idle', 1: 'Heat' });
        });

        it('keeps string keys as they are', () => {
            expect(parseCommonStates({ AUTO: 'Automatic', COOL: 'Cooling' })).to.deep.equal({
                AUTO: 'Automatic',
                COOL: 'Cooling',
            });
        });

        it('renders every label as a string', () => {
            expect(parseCommonStates({ 0: 0, 1: true })).to.deep.equal({ 0: '0', 1: 'true' });
        });

        it('reports nothing for a datapoint that declares no list', () => {
            expect(parseCommonStates(undefined)).to.deep.equal({});
            expect(parseCommonStates(null)).to.deep.equal({});
            expect(parseCommonStates('')).to.deep.equal({});
            expect(parseCommonStates(42)).to.deep.equal({});
        });

        it('skips a malformed pair rather than inventing an empty key', () => {
            expect(parseCommonStates('0:Idle;garbage;:Heat')).to.deep.equal({ 0: 'Idle' });
        });
    });

    describe('stateKeyToValue', () => {
        it('writes a numeric key as a number', () => {
            expect(stateKeyToValue('7')).to.equal(7);
            expect(stateKeyToValue('0')).to.equal(0);
            expect(stateKeyToValue('-2.5')).to.equal(-2.5);
        });

        it('writes a string key as a string', () => {
            // Number('SWING') is NaN, and a NaN write drops the value the device expects
            expect(stateKeyToValue('SWING')).to.equal('SWING');
            expect(stateKeyToValue('AUTO')).to.equal('AUTO');
        });

        it('leaves a blank key as a string', () => {
            expect(stateKeyToValue(' ')).to.equal(' ');
        });
    });
});
