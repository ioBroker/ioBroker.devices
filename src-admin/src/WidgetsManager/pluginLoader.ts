/**
 * Dynamic loader for federated widget plugins using \@module-federation/runtime.
 *
 * Each adapter that provides widgets exposes a federation remote entry URL.
 * We use registerRemotes / loadRemote from the MF runtime to load components.
 */
import React from 'react';
import * as ReactDOM from 'react-dom';
import * as IconsMaterial from '@mui/icons-material';
import * as MuiMaterial from '@mui/material';
import moment from 'moment/min/moment-with-locales';
import { registerRemotes, loadRemote, createInstance } from '@module-federation/runtime';

import * as AdapterReact from '@iobroker/gui-components';
import type { ConfigItemPanel, ConfigItemTabs } from '@iobroker/json-config';
import type WidgetGeneric from '../../../packages/dm-widgets/src/index';

import * as DmWidgets from './Widgets/Generic';
import StateContext from './StateContext';
type WidgetComponent = typeof WidgetGeneric<any, any>;

// Expose the real modules on window so plugins can access them
// even if MF shared module resolution fails.
(window as any).__iobrokerDmWidgets__ = { ...DmWidgets, StateContext };
(window as any).__iobrokerShared__ = {
    react: React,
    'react-dom': ReactDOM,
    '@mui/material': MuiMaterial,
    '@mui/icons-material': IconsMaterial,
    '@iobroker/gui-components': AdapterReact,
    moment,
};

// Initialize Module Federation runtime for loading remote plugin widgets.
// Shared modules are provided via window.__iobrokerShared__ (not MF sharing)
// to avoid proxy wrapping issues in production builds.
createInstance({
    name: 'iobroker_devices',
    shared: {},
    remotes: [],
});

// Debug: verify single React instance
console.log(
    '[MF] Host React version:',
    React.version,
    '| React identity:',
    // React 19 renamed __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ? 'OK' : 'MISSING INTERNALS',
);

const HOST_REACT_MAJOR = parseInt(React.version.split('.')[0], 10);

interface FederationInstance {
    name: string;
    shareScopeMap?: Record<string, Record<string, Record<string, unknown>>>;
}

function getFederationInstances(): FederationInstance[] {
    return ((window as any).__FEDERATION__?.__INSTANCES__ as FederationInstance[]) || [];
}

/**
 * Both matter: a react-dom built for another major reads React internals that no longer exist
 * (e.g. "ReactCurrentOwner"), which throws instead of rendering.
 */
const REACT_PACKAGES = ['react', 'react-dom'];

/**
 * Collect `react@19.2.8`-like entries from every share scope of every federation instance.
 *
 * A remote does not necessarily register an instance of its own - depending on how it was built it
 * declares its versions in the share scope of the host instance instead. So all instances and all
 * scopes have to be looked at, and the remote is identified by diffing against a snapshot taken
 * before its entry was executed.
 */
function collectSharedReactVersions(): Set<string> {
    const found = new Set<string>();
    for (const instance of getFederationInstances()) {
        for (const shareScope of Object.values(instance.shareScopeMap || {})) {
            for (const packageName of REACT_PACKAGES) {
                for (const version of Object.keys(shareScope?.[packageName] || {})) {
                    found.add(`${packageName}@${version}`);
                }
            }
        }
    }
    return found;
}

/**
 * Find a react / react-dom version that appeared after `before` was taken and does not match the
 * React major this page runs with.
 *
 * @param before versions that were already known before the remote entry was executed
 * @returns the offending `react-dom@18.3.1`-like entry or null. Null also means "cannot be
 * determined" - a remote that does not share react at all but takes it from
 * `window.__iobrokerShared__` declares nothing here, which is fine.
 */
function findReactMajorMismatch(before: Set<string>): string | null {
    for (const entry of collectSharedReactVersions()) {
        if (before.has(entry)) {
            continue;
        }
        const version = entry.split('@').pop() || '';
        if (parseInt(version.split('.')[0], 10) !== HOST_REACT_MAJOR) {
            return entry;
        }
    }
    return null;
}

/**
 * React keeps its internals under a different name in every major version, so a plugin that
 * bundles the "wrong" react-dom or jsx-runtime crashes while reading them from our React.
 * The share scope only reveals the version if the plugin declares react as shared - plugins that
 * take it from `window.__iobrokerShared__` do not, and for those this crash is the only signal.
 */
const REACT_INTERNALS_SYMPTOMS = [
    'ReactCurrentOwner',
    'ReactCurrentDispatcher',
    'ReactCurrentBatchConfig',
    'ReactCurrentActQueue',
    '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED',
    '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE',
];

function isReactMajorMismatch(error: unknown): boolean {
    const { message, stack } = (error || {}) as Partial<Error>;
    const text = `${message || String(error)} ${stack || ''}`;
    return REACT_INTERNALS_SYMPTOMS.some(symptom => text.includes(symptom));
}

/**
 * Turn a plugin failure into a message that says what the user has to do.
 * A bare "Cannot read properties of undefined (reading 'ReactCurrentOwner')" gives no hint that
 * the plugin adapter is outdated.
 *
 * @param adapterName adapter that provides the plugin
 * @param error whatever the plugin threw while loading or rendering
 * @param detail overrides the technical explanation appended in brackets
 */
export function describePluginError(adapterName: string, error: unknown, detail?: string): string {
    if (detail || isReactMajorMismatch(error)) {
        return (
            `Widget plugin "${adapterName}" was built against another React version than this page ` +
            `(React ${React.version}). Its widgets cannot be rendered. Please update the ` +
            `"${adapterName}" adapter. (${detail || (error as Error)?.message || String(error)})`
        );
    }
    return String((error as Error)?.message || error);
}

/** In-flight load promises keyed by "url!module" for deduplication */
const runningLoads: Record<string, Promise<{ default: Record<string, WidgetComponent> }>> = {};

/** Cache of already-resolved components */
const componentCache = new Map<string, WidgetComponent>();

/**
 * Load a widget component from a remote plugin.
 *
 * @param url        Remote entry URL (e.g. "/adapter/my-adapter/remoteEntry.js")
 * @param adapterName  Unique scope name for the remote (adapter name)
 * @param componentName Component name exported from the remote module
 * @param admin Is called from admin or from web
 */
export async function loadPluginComponent(
    url: string,
    adapterName: string,
    componentName: string,
    admin: boolean,
): Promise<WidgetComponent> {
    const cacheKey = `${adapterName}/${componentName}`;
    const cached = componentCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // adapterName is also the federation scope / unique remote name
    const uniqueName = adapterName.replace(/[^a-zA-Z0-9_]/g, '_');
    // Always load the "Components" module — it's the standard exposed entry point.
    // Individual components are picked from its default export by name.
    const loadKey = `${adapterName}!Components`;

    let setPromise = runningLoads[loadKey];
    if (!(setPromise instanceof Promise)) {
        const knownReactVersions = collectSharedReactVersions();
        try {
            registerRemotes([
                {
                    name: uniqueName,
                    entry: admin
                        ? `../adapter/${adapterName}/dm-widgets/${url}`
                        : `../${adapterName}.admin/dm-widgets/${url}`,
                    type: 'module',
                },
            ]);
            setPromise = // load translations
                (
                    loadRemote(`${uniqueName}/translations`) as Promise<{
                        default: {
                            [lang in ioBroker.Languages]?: Record<string, string>;
                        };
                    }>
                )
                    .then(translations => AdapterReact.I18n.extendTranslations(translations.default))
                    .catch(error => console.error(`Cannot load translations for ${uniqueName}: ${error}`))
                    .then(() => {
                        // The remote entry has been executed by now, so the version it was built
                        // against is known. A plugin built against another React major creates
                        // elements this React refuses to render, which tears down the whole app -
                        // so refuse the plugin instead of the page.
                        const mismatch = findReactMajorMismatch(knownReactVersions);
                        if (mismatch) {
                            throw new Error(describePluginError(adapterName, null, mismatch));
                        }
                        return loadRemote(`${uniqueName}/Components`) as Promise<{
                            default: Record<string, WidgetComponent>;
                        }>;
                    })
                    .catch(error => {
                        // Plugins that do not share react cannot be checked upfront: they only fail
                        // while their own bundled react-dom evaluates against our React
                        throw new Error(describePluginError(adapterName, error));
                    });
            runningLoads[loadKey] = setPromise;
        } catch (error) {
            throw new Error(`Cannot register remote "${adapterName}" from ${url}: ${error}`);
        }
    }

    const module = await setPromise;

    // Debug: check if the plugin received the same React
    try {
        const pluginReact = (module as any)?.__esModule ? undefined : (module as any)?.React;
        if (pluginReact && pluginReact !== React) {
            console.error(
                '[MF] REACT MISMATCH! Plugin has different React instance. Host:',
                React.version,
                'Plugin:',
                pluginReact.version,
            );
        }
    } catch {
        // ignore
    }

    // The exposed "Components" module exports { ComponentName: Class, ... } as default
    const components = module?.default as Record<string, WidgetComponent> | undefined;
    const Component = components?.[componentName];

    if (!Component) {
        const available = components ? Object.keys(components).join(', ') : 'none';
        throw new Error(
            `Plugin component "${componentName}" not found from adapter "${adapterName}" (url: ${url}). Available: ${available}`,
        );
    }

    componentCache.set(cacheKey, Component);
    return Component;
}

/** Check if a plugin component is already loaded (cached) */
export function isPluginLoaded(adapterName: string, componentName: string): boolean {
    return componentCache.has(`${adapterName}/${componentName}`);
}

/**
 * Get the config schema from a loaded plugin component's static getConfigSchema() method.
 * Returns null if the component is not loaded or has no getConfigSchema.
 */
export function getPluginConfigSchema(
    adapterName: string,
    componentName: string,
): { name: string; schema: ConfigItemPanel | ConfigItemTabs } | null {
    const Component = componentCache.get(`${adapterName}/${componentName}`);
    if (!Component) {
        return null;
    }
    const getSchema = (Component as unknown as Record<string, unknown>).getConfigSchema;
    if (typeof getSchema === 'function') {
        return getSchema() as { name: string; schema: ConfigItemPanel | ConfigItemTabs } | null;
    }
    return null;
}
