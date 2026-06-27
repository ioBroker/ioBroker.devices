import type { CategoryInfo, WidgetInfo } from '@iobroker/dm-widgets';

export type WmResponseItems = {
    categories: CategoryInfo[];
    widgets: WidgetInfo[];
    adapterWidgets?: Record<string, ioBroker.DevicesWidgets>;
};
