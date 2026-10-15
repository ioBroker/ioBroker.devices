const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

/**
 * Pure logic with type-only imports, transpiled and loaded here like `acl.ts` in acl.test.js.
 *
 * @param name file in src-admin/src/WidgetsManager, without the extension
 */
function load(name) {
    const file = join(__dirname, '..', 'src-admin', 'src', 'WidgetsManager', `${name}.ts`);
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        fileName: file,
    });
    const mod = new Module(file);
    mod.filename = file;
    mod._compile(outputText, file);
    return mod.exports;
}

const { getPluginServices, getServiceWidgets, findWidgetCategory } = load('serviceWidgets');
const { createAclResolver, ALLOW_ALL } = load('acl');

const ROOT = '__root__';
const FAVORITES = '__favorites__';
const LENA = 'system.user.lena';
const lena = { userId: LENA, groupIds: ['system.group.user'] };

const phone = (id, extra = {}) => ({
    id,
    type: 'plugin',
    pluginAdapter: 'intercom',
    pluginComponent: 'IntercomPhoneComponent',
    pluginUrl: 'customDevices.js',
    size: '1x1',
    ...extra,
});

function categorySettings() {
    return {
        [ROOT]: { customWidgets: [] },
        'alias.0.kitchen': {
            customWidgets: [
                phone('kitchen'),
                { id: 'clock', type: 'clock', size: '1x1' },
                { id: 'alarm', type: 'plugin', pluginAdapter: 'alarm', pluginComponent: 'AlarmPanelComponent' },
            ],
        },
        // the whole category is hidden from Lena
        'alias.0.office': { acl: { users: { [LENA]: 'hidden' } }, customWidgets: [phone('office')] },
        // Lena may only look at this one
        'alias.0.hall': { customWidgets: [phone('hall', { acl: { users: { [LENA]: 'read' } } })] },
        // the favourites only show widgets of other categories
        [FAVORITES]: { customWidgets: [phone('kitchen'), phone('copy')] },
    };
}

function resolverFor(settings) {
    const nodes = Object.entries(settings)
        .filter(([id]) => id !== FAVORITES)
        .map(([id, s]) => ({ id, parent: id === ROOT ? undefined : ROOT, acl: s.acl }));
    return createAclResolver(nodes, lena, undefined, ROOT);
}

describe('getPluginServices', () => {
    const adapterWidgets = {
        intercom: { components: [], services: ['IntercomService'] },
        alarm: { url: 'alarm.js', components: [], services: ['AlarmService', ''] },
        // has services, but no widget in the categories
        sonos: { components: [], services: ['SonosService'] },
        // has widgets, but no services
        cameras: { components: [] },
    };

    it('runs the services of the adapters with widgets in the categories only', () => {
        const settings = categorySettings();
        settings['alias.0.kitchen'].customWidgets.push({ id: 'cam', type: 'plugin', pluginAdapter: 'cameras' });
        assert.deepEqual(getPluginServices(adapterWidgets, settings), [
            { adapter: 'intercom', url: 'customDevices.js', name: 'IntercomService' },
            { adapter: 'alarm', url: 'alarm.js', name: 'AlarmService' },
        ]);
    });

    it('ignores a broken description', () => {
        assert.deepEqual(getPluginServices({ intercom: { services: 'IntercomService' } }, categorySettings()), []);
        assert.deepEqual(getPluginServices({ intercom: undefined }, categorySettings()), []);
    });
});

describe('getServiceWidgets', () => {
    it('gives the widgets of the adapter that the user may control, each once', () => {
        const settings = categorySettings();
        const widgets = getServiceWidgets(settings, 'intercom', resolverFor(settings).widgetLevel, [FAVORITES]);
        assert.deepEqual(
            widgets.map(widget => widget.id),
            ['kitchen'],
        );
        // the settings as the tile gets them
        assert.equal(widgets[0], settings['alias.0.kitchen'].customWidgets[0]);
    });

    it('gives all of them without permissions', () => {
        const ids = getServiceWidgets(categorySettings(), 'intercom', ALLOW_ALL.widgetLevel, [FAVORITES]).map(
            widget => widget.id,
        );
        assert.deepEqual(ids, ['kitchen', 'office', 'hall']);
    });

    it('takes no widget from the favourites', () => {
        const ids = getServiceWidgets(categorySettings(), 'intercom', ALLOW_ALL.widgetLevel).map(widget => widget.id);
        // without the list of virtual categories the copies would count, but still each widget once
        assert.deepEqual(ids, ['kitchen', 'office', 'hall', 'copy']);
    });

    it('gives nothing to another adapter', () => {
        const ids = getServiceWidgets(categorySettings(), 'alarm', ALLOW_ALL.widgetLevel, [FAVORITES]).map(
            widget => widget.id,
        );
        assert.deepEqual(ids, ['alarm']);
        assert.deepEqual(getServiceWidgets(categorySettings(), 'sonos', ALLOW_ALL.widgetLevel, [FAVORITES]), []);
    });
});

describe('findWidgetCategory', () => {
    it('finds the real category, not the favourites', () => {
        assert.equal(findWidgetCategory(categorySettings(), 'kitchen', [FAVORITES]), 'alias.0.kitchen');
        assert.equal(findWidgetCategory(categorySettings(), 'copy', [FAVORITES]), null);
        assert.equal(findWidgetCategory(categorySettings(), 'unknown', [FAVORITES]), null);
    });
});
