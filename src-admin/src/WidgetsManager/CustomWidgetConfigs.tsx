import type { CustomWidgetType } from '@iobroker/dm-widgets';
import type { ConfigItemPanel } from '@iobroker/json-config';

import { WidgetClock } from './Widgets/Clock';
import { WidgetWeather } from './Widgets/Weather';
import { WidgetIframe } from './Widgets/Iframe';
import { WidgetGauge } from './Widgets/Gauge';
import { WidgetWind } from './Widgets/Wind';
import { WidgetUniversal } from './Widgets/Universal';
import { WidgetPresence } from './Widgets/Presence';
import { WidgetPlugin } from './Widgets/WidgetPlugin';

// Re-export utilities from configUtils (no circular dependency)
export { getConfigDefault, SIZE_OPTIONS } from './configUtils';

// --- Aggregated configs (delegated to widget classes) ---

export const CUSTOM_WIDGET_CONFIGS: Record<CustomWidgetType, ConfigItemPanel> = {
    clock: WidgetClock.getConfigSchema(),
    weather: WidgetWeather.getConfigSchema(),
    iframe: WidgetIframe.getConfigSchema(),
    gauge: WidgetGauge.getConfigSchema(),
    wind: WidgetWind.getConfigSchema(),
    universal: WidgetUniversal.getConfigSchema(),
    plugin: WidgetPlugin.getConfigSchema(),
    newline: { type: 'panel', label: 'wm_New line', items: {} },
    presence: WidgetPresence.getConfigSchema(),
};
