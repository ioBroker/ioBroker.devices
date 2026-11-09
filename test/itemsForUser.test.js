const { expect } = require('chai');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

/** `itemsForUser.ts` has only type imports, so it is transpiled and loaded like `acl.ts` in acl.test.js */
function load() {
    const file = join(__dirname, '..', 'src', 'widget-utils', 'itemsForUser.ts');
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        fileName: file,
    });
    const mod = new Module(file);
    mod.filename = file;
    mod._compile(outputText, file);
    return mod.exports;
}

const { canReadObject, itemsForUser } = load();

const LENA = 'system.user.lena';
const KIDS = 'system.group.kids';
const lena = { user: LENA, groups: [KIDS], mayReadObjects: true };

const objectWith = (object, owner = 'system.user.admin', ownerGroup = 'system.group.administrator') => ({
    common: {},
    acl: { object, owner, ownerGroup },
});

describe('itemsForUser', () => {
    describe('canReadObject', () => {
        it('takes the digit of the owner', () => {
            expect(canReadObject(objectWith(0x400, LENA), lena)).to.be.true;
            expect(canReadObject(objectWith(0x044, LENA), lena)).to.be.false;
        });

        it('takes the digit of the group', () => {
            expect(canReadObject(objectWith(0x040, 'system.user.x', KIDS), lena)).to.be.true;
            expect(canReadObject(objectWith(0x404, 'system.user.x', KIDS), lena)).to.be.false;
        });

        it('takes the digit of the others', () => {
            expect(canReadObject(objectWith(0x004), lena)).to.be.true;
            expect(canReadObject(objectWith(0x440), lena)).to.be.false;
        });

        it('reads the default ACL of an object', () => {
            expect(canReadObject(objectWith(0x664), lena)).to.be.true;
        });

        it('lets nobody read without the permission of the group', () => {
            const reader = { ...lena, mayReadObjects: false };
            expect(canReadObject(objectWith(0x444, LENA, KIDS), reader)).to.be.false;
            expect(canReadObject(undefined, reader)).to.be.false;
        });

        it('has nothing to check on an object without an ACL', () => {
            expect(canReadObject({ common: {} }, lena)).to.be.true;
            expect(canReadObject(undefined, lena)).to.be.true;
        });

        it('never restricts an administrator', () => {
            const closed = objectWith(0x000);
            expect(canReadObject(closed, { user: 'system.user.admin', groups: [], mayReadObjects: false })).to.be.true;
            expect(canReadObject(closed, { user: 'system.user.c', groups: ['system.group.administrator'] })).to.be.true;
        });
    });

    describe('itemsForUser', () => {
        const ROOT = '__root__';
        const state = (id, extra) => ({ id, name: id, ...extra });
        const widget = (id, parent, states = []) => ({
            type: 'widget',
            id,
            name: id,
            parent,
            control: { type: 'light', states },
        });
        const category = (id, parent, custom) => ({ type: 'category', id, name: id, parent, custom });

        // root ─ house ─ secret ─ safe    and a room without anything in it
        const items = () => ({
            categories: [
                category(ROOT),
                category('house', ROOT),
                category('secret', 'house'),
                category('safe', 'secret'),
                category('empty', ROOT, { showEmpty: true }),
            ],
            widgets: [
                widget('lamp', 'house', [state('lamp.on', { required: true }), state('lamp.power')]),
                widget('vault', 'safe', [state('vault.open', { required: true })]),
            ],
            adapterWidgets: { flow: {} },
        });
        const ids = list => list.map(item => item.id);
        const canReadExcept =
            (...denied) =>
            id =>
                !denied.includes(id);

        it('leaves everything in place when all can be read', () => {
            const result = itemsForUser(items(), () => true);
            expect(result).to.deep.equal(items());
        });

        it('takes out a widget that cannot be read', () => {
            const result = itemsForUser(items(), canReadExcept('vault'));
            expect(ids(result.widgets)).to.deep.equal(['lamp']);
        });

        it('takes out the state that cannot be read and keeps the widget', () => {
            const result = itemsForUser(items(), canReadExcept('lamp.power'));
            expect(ids(result.widgets)).to.include('lamp');
            expect(result.widgets[0].control.states.map(s => s.id)).to.deep.equal(['lamp.on']);
        });

        it('takes out a widget without a state it needs', () => {
            const result = itemsForUser(items(), canReadExcept('lamp.on'));
            expect(ids(result.widgets)).to.deep.equal(['vault']);
        });

        it('keeps a widget while one state of a choice remains', () => {
            const choice = [state('a', { requiredOneOf: ['a', 'b'] }), state('b', { requiredOneOf: ['a', 'b'] })];
            const list = { categories: [category(ROOT)], widgets: [widget('w', ROOT, choice)] };
            expect(ids(itemsForUser(list, canReadExcept('a')).widgets)).to.deep.equal(['w']);
            expect(ids(itemsForUser(list, canReadExcept('a', 'b')).widgets)).to.deep.equal([]);
        });

        it('leaves a slot without a state alone', () => {
            const list = { categories: [category(ROOT)], widgets: [widget('w', ROOT, [state('')])] };
            const result = itemsForUser(list, id => id === 'w');
            expect(result.widgets[0].control.states).to.have.length(1);
        });

        it('moves what is in a hidden category up to the next one that can be read', () => {
            const result = itemsForUser(items(), canReadExcept('secret', 'safe'));
            expect(ids(result.categories)).to.not.include('secret');
            expect(ids(result.categories)).to.not.include('safe');
            const vault = result.widgets.find(w => w.id === 'vault');
            expect(vault.parent).to.equal('house');
        });

        it('leaves no ID of a hidden category in the answer', () => {
            const result = itemsForUser(items(), canReadExcept('secret'));
            expect(JSON.stringify(result)).to.not.include('secret');
            expect(result.categories.find(c => c.id === 'safe').parent).to.equal('house');
        });

        it('moves up to the root when no category on the way can be read', () => {
            const result = itemsForUser(items(), canReadExcept('house', 'secret', 'safe'));
            expect(result.widgets.map(w => w.parent)).to.deep.equal([ROOT, ROOT]);
        });

        it('takes out a category that lost all it had, up the tree', () => {
            const result = itemsForUser(items(), canReadExcept('vault'));
            expect(ids(result.categories)).to.not.include('safe');
            expect(ids(result.categories)).to.not.include('secret');
            expect(ids(result.categories)).to.include('house');
        });

        it('keeps a category that is meant to be shown empty or holds custom widgets', () => {
            const list = items();
            list.categories.push(category('own', ROOT, { customWidgets: [{ id: 'clock' }] }));
            list.widgets.push(widget('hidden', 'own'));
            const result = itemsForUser(list, canReadExcept('hidden'));
            expect(ids(result.categories)).to.include.members(['empty', 'own']);
        });

        it('always keeps the root', () => {
            const result = itemsForUser(items(), () => false);
            expect(ids(result.categories)).to.deep.equal([ROOT]);
            expect(result.widgets).to.deep.equal([]);
        });

        it('survives a cyclic parent chain', () => {
            const list = {
                categories: [category(ROOT), category('a', 'b'), category('b', 'a')],
                widgets: [widget('w', 'a')],
            };
            const result = itemsForUser(list, canReadExcept('a', 'b'));
            expect(result.widgets[0].parent).to.equal(ROOT);
        });

        it('does not touch the list of the adapter', () => {
            const list = items();
            itemsForUser(list, canReadExcept('secret', 'lamp.power', 'vault'));
            expect(list).to.deep.equal(items());
        });

        it('hands on what it does not filter', () => {
            expect(itemsForUser(items(), () => true).adapterWidgets).to.deep.equal({ flow: {} });
        });
    });
});
