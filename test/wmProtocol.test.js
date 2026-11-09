const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

/** `WmProtocol.ts`, transpiled and loaded like `acl.ts` in acl.test.js. It only imports types. */
function load() {
    const file = join(__dirname, '..', 'src-admin', 'src', 'WidgetsManager', 'protocol', 'WmProtocol.ts');
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        fileName: file,
    });
    const mod = new Module(file);
    mod.filename = file;
    mod._compile(outputText, file);
    return mod.exports;
}

const { checkItemsResponse, WmLoadError, WmProtocol } = load();

/** Protocol with a socket that answers `sendTo` with the given value */
function protocolAnswering(answer) {
    return new WmProtocol('devices.0', {
        getState: async () => ({ val: true }),
        sendTo: async () => answer,
    });
}

describe('checkItemsResponse', () => {
    it('hands over a complete list', () => {
        const list = { categories: [], widgets: [] };
        assert.equal(checkItemsResponse(list), list);
    });

    for (const answer of ['permissionError', { error: 'permissionError' }]) {
        it(`reports the missing permission for ${JSON.stringify(answer)}`, () => {
            assert.throws(
                () => checkItemsResponse(answer),
                error => error instanceof WmLoadError && error.reason === 'permission',
            );
        });
    }

    for (const answer of [
        undefined,
        null,
        '',
        'timeout',
        {},
        { error: 'other' },
        { categories: [] },
        { widgets: [] },
    ]) {
        it(`reports an invalid answer for ${JSON.stringify(answer)}`, () => {
            assert.throws(
                () => checkItemsResponse(answer),
                error => error instanceof WmLoadError && error.reason === 'invalid',
            );
        });
    }
});

describe('WmProtocol.loadItems', () => {
    it('does not call back with a denied request', async () => {
        let called = false;
        await assert.rejects(
            protocolAnswering('permissionError').loadItems(() => {
                called = true;
            }),
            error => error instanceof WmLoadError && error.reason === 'permission',
        );
        assert.equal(called, false);
    });

    it('calls back with the list', async () => {
        const list = { categories: [], widgets: [] };
        let received;
        const requested = await protocolAnswering(list).loadItems(result => {
            received = result;
        });
        assert.equal(requested, true);
        assert.equal(received, list);
    });
});
