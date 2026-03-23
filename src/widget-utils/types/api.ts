import type { CategoryInfo, WidgetInfo } from './base';
import type { InstanceWidgetDescription } from './common';

export type WmResponseItems = {
    categories: CategoryInfo[];
    widgets: WidgetInfo[];
    adapterWidgets?: Record<string, InstanceWidgetDescription>;
};
