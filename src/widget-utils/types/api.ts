import type { CategoryInfo, WidgetInfo } from '@iobroker/dm-widgets';

/**
 * An adapter that brings web components (`common.webComponents` of its io-package.json): the part of its instance
 * object the frontend needs to find them, see `getWebComponentSources` of `@iobroker/web-components`
 */
export type WmWebComponentInstance = {
    /** ID of one instance of the adapter, e.g. `system.adapter.flow.0` */
    _id: string;
    common: {
        version?: string;
        /** Manifest files (.json) of the components, relative to the admin folder of the adapter */
        webComponents: string[];
    };
};

export type WmResponseItems = {
    categories: CategoryInfo[];
    widgets: WidgetInfo[];
    adapterWidgets?: Record<string, ioBroker.DevicesWidgets>;
    /** One instance per adapter that brings web components */
    webComponents?: WmWebComponentInstance[];
};
