const { expect } = require('chai');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

/**
 * `src-admin/src/WidgetsManager/acl.ts` is pure logic with type-only imports, so it can be
 * transpiled and loaded here without pulling in React or the bundler.
 */
function loadAcl() {
    const file = join(__dirname, '..', 'src-admin', 'src', 'WidgetsManager', 'acl.ts');
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        fileName: file,
    });
    const mod = new Module(file);
    mod.filename = file;
    mod._compile(outputText, file);
    return mod.exports;
}

const { createAclResolver, resolveForSubject, resolveLevel, isEditor, ALLOW_ALL } = loadAcl();

const KIDS = 'system.group.kids';
const USERS = 'system.group.user';
const LENA = 'system.user.lena';

const lena = { userId: LENA, groupIds: [USERS, KIDS] };

describe('WidgetsManager ACL', () => {
    describe('resolveForSubject', () => {
        it('returns undefined when the node has no rules', () => {
            expect(resolveForSubject(undefined, lena)).to.be.undefined;
            expect(resolveForSubject({}, lena)).to.be.undefined;
        });

        it('prefers the user over the groups', () => {
            const acl = { users: { [LENA]: 'control' }, groups: { [KIDS]: 'hidden' }, default: 'hidden' };
            expect(resolveForSubject(acl, lena)).to.equal('control');
        });

        it('takes the most permissive of several matching groups', () => {
            const acl = { groups: { [KIDS]: 'hidden', [USERS]: 'read' } };
            expect(resolveForSubject(acl, lena)).to.equal('read');
        });

        it('falls back to the default when no subject matches', () => {
            expect(resolveForSubject({ groups: { 'system.group.other': 'control' }, default: 'read' }, lena)).to.equal(
                'read',
            );
        });
    });

    describe('resolveLevel', () => {
        it('lets the most specific node win', () => {
            const chain = [{ groups: { [KIDS]: 'control' } }, { groups: { [KIDS]: 'hidden' } }];
            expect(resolveLevel(chain, lena)).to.equal('control');
        });

        it('skips nodes without an opinion', () => {
            expect(resolveLevel([undefined, {}, { default: 'read' }], lena)).to.equal('read');
        });

        it('defaults to control for a silent chain', () => {
            expect(resolveLevel([undefined, undefined], lena)).to.equal('control');
        });
    });

    describe('isEditor', () => {
        it('always allows the admin user', () => {
            expect(isEditor(undefined, { userId: 'system.user.admin', groupIds: [] })).to.be.true;
        });

        it('denies everybody else without configuration', () => {
            expect(isEditor(undefined, lena)).to.be.false;
            expect(isEditor({ groups: [], users: [] }, lena)).to.be.false;
        });

        it('allows a listed user or group', () => {
            expect(isEditor({ users: [LENA] }, lena)).to.be.true;
            expect(isEditor({ groups: [KIDS] }, lena)).to.be.true;
        });
    });

    describe('createAclResolver', () => {
        // root ─ Kinderzimmer
        //      └ Wetter ─ Wetter/Detail
        const categories = [
            { id: '__root__', acl: { groups: { [KIDS]: 'hidden' } } },
            { id: 'alias.0.Kinderzimmer', parent: '__root__', acl: { groups: { [KIDS]: 'control' } } },
            { id: 'alias.0.Weather', parent: '__root__' },
            { id: 'alias.0.Weather.Detail', parent: 'alias.0.Weather' },
        ];

        it('disables itself without a subject', () => {
            const resolver = createAclResolver(categories, null);
            expect(resolver.enabled).to.be.false;
            expect(resolver.categoryLevel('alias.0.Weather')).to.equal('control');
            expect(resolver.widgetLevel({ groups: { [KIDS]: 'hidden' } }, 'alias.0.Weather')).to.equal('control');
        });

        it('inherits the root default down the tree', () => {
            const resolver = createAclResolver(categories, lena);
            expect(resolver.categoryLevel('alias.0.Weather')).to.equal('hidden');
        });

        it('lets a category override the root', () => {
            const resolver = createAclResolver(categories, lena);
            expect(resolver.categoryLevel('alias.0.Kinderzimmer')).to.equal('control');
        });

        it('hides everything below a hidden category', () => {
            const resolver = createAclResolver(categories, lena);
            expect(resolver.categoryLevel('alias.0.Weather.Detail')).to.equal('hidden');
        });

        it('keeps a widget hidden inside a hidden category even when set to control', () => {
            const resolver = createAclResolver(categories, lena);
            expect(resolver.widgetLevel({ groups: { [KIDS]: 'control' } }, 'alias.0.Weather')).to.equal('hidden');
        });

        it('applies the widget rule inside a visible category', () => {
            const resolver = createAclResolver(categories, lena);
            expect(resolver.widgetLevel({ groups: { [KIDS]: 'read' } }, 'alias.0.Kinderzimmer')).to.equal('read');
            expect(resolver.widgetLevel(undefined, 'alias.0.Kinderzimmer')).to.equal('control');
        });

        it('does not cascade read — a widget may be more permissive than its category', () => {
            const cats = [
                { id: '__root__' },
                { id: 'alias.0.Salon', parent: '__root__', acl: { groups: { [KIDS]: 'read' } } },
            ];
            const resolver = createAclResolver(cats, lena);
            expect(resolver.categoryLevel('alias.0.Salon')).to.equal('read');
            expect(resolver.widgetLevel({ groups: { [KIDS]: 'control' } }, 'alias.0.Salon')).to.equal('control');
            expect(resolver.widgetLevel(undefined, 'alias.0.Salon')).to.equal('read');
        });

        it('survives a cyclic parent chain', () => {
            const cats = [
                { id: 'a', parent: 'b' },
                { id: 'b', parent: 'a', acl: { groups: { [KIDS]: 'read' } } },
            ];
            const resolver = createAclResolver(cats, lena);
            expect(resolver.categoryLevel('a')).to.equal('read');
        });

        it('reports unknown categories as control', () => {
            const resolver = createAclResolver(categories, lena);
            expect(resolver.categoryLevel('alias.0.Nope')).to.equal('control');
        });

        it('exposes the edit right', () => {
            expect(createAclResolver(categories, lena).canEdit).to.be.false;
            expect(createAclResolver(categories, lena, { groups: [KIDS] }).canEdit).to.be.true;
            expect(ALLOW_ALL.canEdit).to.be.true;
        });
    });
});
