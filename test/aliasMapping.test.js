const { expect } = require('chai');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

/**
 * `src-admin/src/Components/helpers/aliasMapping.ts` is pure logic, so it can be transpiled and
 * loaded here without pulling in React or the bundler.
 */
function loadAliasMapping() {
    const file = join(__dirname, '..', 'src-admin', 'src', 'Components', 'helpers', 'aliasMapping.ts');
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        fileName: file,
    });
    const mod = new Module(file);
    mod.filename = file;
    mod._compile(outputText, file);
    return mod.exports;
}

const { isSameAliasSource, isFormulaChanged, isStatesChanged, needsAutoStateName } = loadAliasMapping();

describe('Device editor: changes of an alias mapping', () => {
    describe('isSameAliasSource', () => {
        it('compares one source', () => {
            expect(isSameAliasSource('hm-rpc.0.A.1.STATE', 'hm-rpc.0.A.1.STATE')).to.equal(true);
            expect(isSameAliasSource('hm-rpc.0.A.1.STATE', 'hm-rpc.0.B.1.STATE')).to.equal(false);
        });

        it('takes a missing source as an empty one', () => {
            expect(isSameAliasSource(undefined, '')).to.equal(true);
            expect(isSameAliasSource(null, '')).to.equal(true);
            expect(isSameAliasSource(undefined, 'hm-rpc.0.A.1.STATE')).to.equal(false);
        });

        it('compares separate sources to read and to write by their content', () => {
            expect(isSameAliasSource({ read: 'a.0.r', write: 'a.0.w' }, { read: 'a.0.r', write: 'a.0.w' })).to.equal(
                true,
            );
            expect(isSameAliasSource({ read: 'a.0.r', write: 'a.0.w' }, { read: 'a.0.r', write: 'a.0.x' })).to.equal(
                false,
            );
        });

        it('takes one source and separate sources as different', () => {
            expect(isSameAliasSource('a.0.r', { read: 'a.0.r', write: 'a.0.r' })).to.equal(false);
            expect(isSameAliasSource({ read: 'a.0.r', write: 'a.0.r' }, 'a.0.r')).to.equal(false);
        });
    });

    describe('isFormulaChanged', () => {
        it('takes the empty formulas of the editor as the missing ones of the object (issue #725)', () => {
            expect(isFormulaChanged({ id: 'a.0.b' }, { read: '', write: '' })).to.equal(false);
            expect(isFormulaChanged({ id: 'a.0.b' }, { read: '' })).to.equal(false);
            expect(isFormulaChanged({ id: 'a.0.b' }, {})).to.equal(false);
        });

        it('sees a new, changed or removed formula', () => {
            expect(isFormulaChanged({ id: 'a.0.b' }, { read: '', write: 'Math.round(val)' })).to.equal(true);
            expect(isFormulaChanged({ id: 'a.0.b', read: 'val / 10' }, { read: 'val / 100' })).to.equal(true);
            expect(isFormulaChanged({ id: 'a.0.b', write: 'Math.round(val)' }, { read: '', write: '' })).to.equal(true);
        });
    });

    describe('isStatesChanged', () => {
        it('applies nothing when the editor has no value texts', () => {
            expect(isStatesChanged({ 0: 'off' }, undefined)).to.equal(false);
            expect(isStatesChanged(undefined, undefined)).to.equal(false);
        });

        it('compares the value texts by content, in any order', () => {
            expect(isStatesChanged({ 0: 'off', 1: 'on' }, { 1: 'on', 0: 'off' })).to.equal(false);
            expect(isStatesChanged({ 0: 'off', 1: 'on' }, { 0: 'off', 1: 'an' })).to.equal(true);
            expect(isStatesChanged({ 0: 'off', 1: 'on' }, { 0: 'off' })).to.equal(true);
            expect(isStatesChanged(undefined, { 0: 'off' })).to.equal(true);
        });
    });

    describe('needsAutoStateName', () => {
        it('names a state without a name', () => {
            expect(needsAutoStateName(undefined, 'STOP', false)).to.equal(true);
            expect(needsAutoStateName('', 'STOP', false)).to.equal(true);
        });

        it('keeps the name of the slot when something else is saved (issue #725)', () => {
            expect(needsAutoStateName('STOP', 'STOP', false)).to.equal(false);
        });

        it('gives the full name to a state still named after its slot when its source changes (issue #696)', () => {
            expect(needsAutoStateName('ACTUAL', 'ACTUAL', true)).to.equal(true);
        });

        it('never touches another name', () => {
            expect(needsAutoStateName('Rollladen STOP', 'STOP', true)).to.equal(false);
            expect(needsAutoStateName({ en: 'Stop', de: 'Stopp' }, 'STOP', true)).to.equal(false);
        });
    });
});
