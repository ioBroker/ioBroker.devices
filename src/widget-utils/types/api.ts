import type { CategoryInfo, WidgetInfo } from '../../../packages/dm-widgets/src/index';

export type WmResponseItems = {
    categories: CategoryInfo[];
    widgets: WidgetInfo[];
    adapterWidgets?: Record<string, ioBroker.DevicesWidgets>;
};
