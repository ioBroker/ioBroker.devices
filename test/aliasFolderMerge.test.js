const { expect } = require('chai');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

/** `WidgetsManagement.ts` is transpiled and loaded with stubs for the detector and the base class */
function load() {
    const file = join(__dirname, '..', 'src', 'lib', 'WidgetsManagement.ts');
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
        fileName: file,
    });
    const stubs = {
        '@iobroker/type-detector': { __esModule: true, default: class {} },
        '../widget-utils': {
            WidgetsManagement: class {
                constructor(adapter) {
                    this.adapter = adapter;
                }
            },
        },
    };
    const mod = new Module(file);
    mod.filename = file;
    mod.require = id => stubs[id] || require(id);
    mod._compile(outputText, file);
    return mod.exports.default;
}

const DevicesWidgetsManagement = load();
const ROOT = '__root__';

const folder = (name, color) => ({ type: 'folder', common: { name, color } });
const channel = name => ({ type: 'channel', common: { name } });
const room = name => ({ type: 'enum', common: { name, members: [], color: '#ff0000' } });

function categoriesOf(objects) {
    const wm = new DevicesWidgetsManagement({ namespace: 'devices.0', language: 'en' });
    wm.objects = objects;
    wm.rebuildEnumMemberIds();
    wm.rebuildCategories();
    return wm.categories;
}

describe('WidgetsManagement: alias folders and rooms of the same name', () => {
    it('keeps nested folders in their place', () => {
        const categories = categoriesOf({
            'alias.0.Haus': folder('Haus'),
            'alias.0.Haus.Erdgeschoss': folder('Erdgeschoss', '#00ff00'),
            'alias.0.Haus.Erdgeschoss.Bad': folder('Bad'),
            'alias.0.Haus.Erdgeschoss.Bad.Licht': channel('Licht'),
            'enum.rooms.erdgeschoss': room('Erdgeschoss'),
        });
        expect(categories.get('alias.0.Haus').parent).to.equal(ROOT);
        const floor = categories.get('alias.0.Haus.Erdgeschoss');
        expect(floor.parent).to.equal('alias.0.Haus');
        expect(floor.name).to.equal('Erdgeschoss');
        expect(floor.color).to.equal('#00ff00');
        expect(categories.get('alias.0.Haus.Erdgeschoss.Bad').parent).to.equal('alias.0.Haus.Erdgeschoss');
        expect(categories.has('enum.rooms.erdgeschoss')).to.be.false;
    });

    it('still merges a folder on the top level with the room', () => {
        const categories = categoriesOf({
            'alias.0.Erdgeschoss': folder('Erdgeschoss'),
            'alias.0.Erdgeschoss.Bad': folder('Bad'),
            'alias.0.Erdgeschoss.Bad.Licht': channel('Licht'),
            'enum.rooms.erdgeschoss': room('Erdgeschoss'),
        });
        expect(categories.has('alias.0.Erdgeschoss')).to.be.false;
        expect(categories.get('enum.rooms.erdgeschoss').parent).to.equal(ROOT);
        expect(categories.get('alias.0.Erdgeschoss.Bad').parent).to.equal('enum.rooms.erdgeschoss');
    });
});
