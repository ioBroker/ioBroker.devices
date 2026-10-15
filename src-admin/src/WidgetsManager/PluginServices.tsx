/**
 * The background services of the plugins (`common.deviceWidgets.services`, see `DmServiceProps`).
 *
 * The app renders only the shown category, so a plugin widget lives only while its category is open. A service lives
 * as long as the app: it is rendered once, next to the category, with the widgets of its adapter in all categories -
 * e.g. to keep a phone registered and to show the dialog of a call over whichever category is open.
 *
 * A service comes out of the same `Components` module as the widgets of its adapter, loaded once by `pluginLoader.ts`,
 * so the two share their module state - the phones of the service are the ones the tiles show.
 */
import React, { Component } from 'react';

import type { CustomWidgetPlugin, DmServiceProps, IStateContext } from '../../../packages/dm-widgets/src/index';
import type { AclResolver } from './acl';
import { describePluginError, loadPluginComponent } from './pluginLoader';
import {
    getPluginServices,
    getServiceWidgets,
    type CustomWidgetsByCategory,
    type PluginDescription,
    type PluginService,
} from './serviceWidgets';

type ServiceComponent = React.ComponentType<DmServiceProps>;

interface ServiceBoundaryProps {
    /** `<adapter>/<service>`, for the console */
    name: string;
    children: React.ReactNode;
}

/** A crashing service must take neither the category nor the other services with it */
class ServiceBoundary extends Component<ServiceBoundaryProps, { failed: boolean }> {
    constructor(props: ServiceBoundaryProps) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError(): { failed: boolean } {
        return { failed: true };
    }

    componentDidCatch(error: Error): void {
        const adapter = this.props.name.split('/')[0];
        console.error(`Background service ${this.props.name} crashed: ${describePluginError(adapter, error)}`);
    }

    render(): React.ReactNode {
        return this.state.failed ? null : this.props.children;
    }
}

interface PluginServicesProps {
    /** `common.deviceWidgets` of the adapters */
    adapterWidgets: Record<string, PluginDescription>;
    categorySettings: CustomWidgetsByCategory;
    /** Categories that only show widgets of others, like the favourites */
    virtualCategories: string[];
    /** The same permissions the categories are shown with */
    acl: AclResolver;
    stateContext: IStateContext;
    editMode: boolean;
    admin: boolean;
    onShowWidget: (widgetId: string) => void;
}

interface PluginServicesState {
    /** The loaded services by `<adapter>/<service>` */
    loaded: Record<string, ServiceComponent>;
}

const serviceKey = (service: PluginService): string => `${service.adapter}/${service.name}`;

export default class PluginServices extends Component<PluginServicesProps, PluginServicesState> {
    private mounted = false;

    /** Asked for once each, whatever came of it */
    private readonly requested = new Set<string>();

    private servicesCache: { key: unknown[]; services: PluginService[] } | null = null;

    /** The widgets of each adapter, so that a service gets the same array while the settings and the user stay */
    private readonly widgetsCache = new Map<string, { key: unknown[]; widgets: CustomWidgetPlugin[] }>();

    constructor(props: PluginServicesProps) {
        super(props);
        this.state = { loaded: {} };
    }

    componentDidMount(): void {
        this.mounted = true;
        this.loadServices();
    }

    componentDidUpdate(): void {
        // a plugin widget added in another category brings the services of its adapter
        this.loadServices();
    }

    componentWillUnmount(): void {
        this.mounted = false;
    }

    private getServices(): PluginService[] {
        const key = [this.props.adapterWidgets, this.props.categorySettings];
        if (!this.servicesCache?.key.every((value, i) => value === key[i])) {
            this.servicesCache = {
                key,
                services: getPluginServices(this.props.adapterWidgets, this.props.categorySettings),
            };
        }
        return this.servicesCache.services;
    }

    private loadServices(): void {
        for (const service of this.getServices()) {
            const key = serviceKey(service);
            if (this.requested.has(key)) {
                continue;
            }
            this.requested.add(key);
            loadPluginComponent(service.url, service.adapter, service.name, this.props.admin)
                .then(Service => {
                    if (this.mounted) {
                        this.setState(prev => ({
                            loaded: { ...prev.loaded, [key]: Service as unknown as ServiceComponent },
                        }));
                    }
                })
                .catch(error =>
                    console.error(
                        `Cannot load background service ${key}: ${describePluginError(service.adapter, error)}`,
                    ),
                );
        }
    }

    private getWidgets(adapter: string): CustomWidgetPlugin[] {
        const { categorySettings, acl, virtualCategories } = this.props;
        const key = [categorySettings, acl];
        const cached = this.widgetsCache.get(adapter);
        if (cached?.key.every((value, i) => value === key[i])) {
            return cached.widgets;
        }
        const widgets = getServiceWidgets(categorySettings, adapter, acl.widgetLevel, virtualCategories);
        this.widgetsCache.set(adapter, { key, widgets });
        return widgets;
    }

    render(): React.JSX.Element {
        return (
            <>
                {this.getServices().map(service => {
                    const key = serviceKey(service);
                    const Service = this.state.loaded[key];
                    if (!Service) {
                        return null;
                    }
                    return (
                        <ServiceBoundary
                            key={key}
                            name={key}
                        >
                            <Service
                                widgets={this.getWidgets(service.adapter)}
                                stateContext={this.props.stateContext}
                                editMode={this.props.editMode}
                                onShowWidget={this.props.onShowWidget}
                            />
                        </ServiceBoundary>
                    );
                })}
            </>
        );
    }
}
