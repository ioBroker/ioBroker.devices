const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { dirname, join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

/**
 * `webComponents.ts`, transpiled and loaded like `acl.ts` in acl.test.js. It imports `@iobroker/web-components`,
 * which is installed in src-admin, so the module resolves from there.
 */
function load() {
    const file = join(__dirname, '..', 'src-admin', 'src', 'WidgetsManager', 'webComponents.ts');
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        fileName: file,
    });
    const mod = new Module(file);
    mod.filename = file;
    mod.paths = Module._nodeModulePaths(dirname(file));
    mod._compile(outputText, file);
    return mod.exports;
}

const { getTileSize, getWebComponentConfigItems, getWebComponentValueNames, getElementSettings } = load();

const manifest = (extra = {}) => ({
    manifestVersion: 1,
    tag: 'iob-test-tile',
    name: 'Test',
    settings: {
        type: 'panel',
        items: {
            oid: { type: 'objectId', label: 'State', types: 'state' },
            title: { type: 'text', label: 'Title', default: 'Hello' },
            decimals: { type: 'number', label: 'Decimals', default: 1 },
            dark: { type: 'checkbox', label: 'Dark' },
            hint: { type: 'staticText', text: 'Only a hint' },
            size: { type: 'text', label: 'Clashes with the tile' },
        },
    },
    ...extra,
});

describe('web components as tiles', () => {
    describe('getTileSize', () => {
        it('takes 1x1 without a size', () => {
            assert.equal(getTileSize(manifest()), '1x1');
            assert.equal(getTileSize(manifest({ size: { width: 0, height: 100 } })), '1x1');
        });

        it('rounds to the nearest of the four tile sizes', () => {
            assert.equal(getTileSize(manifest({ size: { width: 160, height: 120 } })), '1x1');
            assert.equal(getTileSize(manifest({ size: { width: 340, height: 80 } })), '2x0.5');
            assert.equal(getTileSize(manifest({ size: { width: 320, height: 170 } })), '2x1');
            // the flow diagram
            assert.equal(getTileSize(manifest({ size: { width: 480, height: 340 } })), '2x2');
        });
    });

    describe('settings', () => {
        it('shows the fields of the component, but none named like a field of the tile', () => {
            const items = getWebComponentConfigItems(manifest(), ['size', 'color', 'colorActive']);
            assert.deepEqual(Object.keys(items), ['oid', 'title', 'decimals', 'dark', 'hint']);
            // the setting goes to JSON-Config as it is, so `types` reaches the object browser
            assert.equal(items.oid.types, 'state');
        });

        it('heads every tab, when there are several', () => {
            const items = getWebComponentConfigItems(
                manifest({
                    settings: {
                        type: 'tabs',
                        items: {
                            main: { type: 'panel', label: 'Main', items: { a: { type: 'text' } } },
                            more: { type: 'panel', label: 'More', items: { b: { type: 'text' } } },
                        },
                    },
                }),
                [],
            );
            assert.deepEqual(Object.keys(items), ['_wcGroup_main', 'a', '_wcGroup_more', 'b']);
            assert.equal(items._wcGroup_more.type, 'header');
        });

        it('knows which settings carry a value', () => {
            assert.deepEqual(getWebComponentValueNames(manifest()), ['oid', 'title', 'decimals', 'dark', 'size']);
        });

        it('hands the element the defaults and what the user set, typed as the manifest says', () => {
            const settings = getElementSettings(manifest(), {
                id: 'custom_wc_1',
                type: 'webComponent',
                wcAdapter: 'test',
                wcTag: 'iob-test-tile',
                wcSettings: { oid: 'test.0.value', decimals: '2', dark: 'true' },
            });
            assert.deepEqual(settings, { oid: 'test.0.value', title: 'Hello', decimals: 2, dark: true });
        });
    });
});
