import type { ConfigItemAny } from '@iobroker/json-config';

/** Extract a default value from a json-config item definition */
export function getConfigDefault(item: ConfigItemAny): unknown {
    switch (item.type) {
        case 'select':
            return item.default ?? (item.options?.[0] as { value?: unknown })?.value ?? '';
        case 'checkbox':
            return item.default ?? true;
        case 'color':
            return item.default ?? '';
        case 'instance':
            return item.default ?? '';
        case 'text':
            return item.default ?? '';
        case 'number':
            return item.default ?? 0;
        case 'objectId':
            return item.default ?? '';
        case 'custom':
            return item.default ?? '';
        default:
            return item.default ?? '';
    }
}

const SIZE_ICON_1x1 = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><rect x="1" y="1" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>')}`;
const SIZE_ICON_2x1 = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="18" viewBox="0 0 32 18"><rect x="1" y="1" width="30" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>')}`;
const SIZE_ICON_2xHalf = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="12" viewBox="0 0 32 12"><rect x="1" y="1" width="30" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>')}`;
const SIZE_ICON_2x2 = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect x="1" y="1" width="30" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>')}`;

export const SIZE_OPTIONS: { value: string; label: string; icon?: string }[] = [
    { value: '1x1', label: '1\u00D71', icon: SIZE_ICON_1x1 },
    { value: '2x1', label: '2\u00D71', icon: SIZE_ICON_2x1 },
    { value: '2x0.5', label: '2\u00D7\u00BD', icon: SIZE_ICON_2xHalf },
];

/** Extended size options for widgets that also support a 2\u00D72 (square, double) tile (iFrame, EnergyFlow). */
export const SIZE_OPTIONS_WITH_2X2: { value: string; label: string; icon?: string }[] = [
    ...SIZE_OPTIONS,
    { value: '2x2', label: '2\u00D72', icon: SIZE_ICON_2x2 },
];

/** Base config items (size + colors) automatically prepended to every custom widget schema */
export const BASE_WIDGET_ITEMS: Record<string, ConfigItemAny> = {
    size: {
        type: 'select',
        label: 'wm_Size',
        options: SIZE_OPTIONS,
        default: '1x1',
        format: 'radio',
        horizontal: true,
        noTranslation: true,
    } as ConfigItemAny,
    colorActive: { type: 'color', label: 'wm_Active color', sm: 6 } as ConfigItemAny,
    color: { type: 'color', label: 'wm_Color inactive', sm: 6 } as ConfigItemAny,
};
