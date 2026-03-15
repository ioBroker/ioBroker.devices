import React, { Component } from 'react';

import { Box, ButtonBase, IconButton, Tooltip, Typography } from '@mui/material';
import {
    ArrowBack,
    ChevronRight,
    DirectionsRun,
    MeetingRoom,
    SensorDoor,
    SensorWindow,
    Settings,
    Thermostat,
    WaterDrop,
} from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/adapter-react-v5';
import { alpha } from '@mui/material/styles';
import { Types } from '@iobroker/type-detector';

import type { CategoryInfo, WidgetInfo } from '../../../src/widget-utils';
import {
    type WidgetGenericProps,
    type WidgetSettings,
    WidgetSwitch,
    WidgetLight,
    WidgetDimmer,
    WidgetTemperature,
    WidgetMotion,
    WidgetWindow,
    WidgetBlind,
    WidgetLock,
    WidgetDoor,
    WidgetFloodAlarm,
    WidgetFireAlarm,
    WidgetHumidity,
} from './Widgets';
import type StateContext from './StateContext';
import type { CategorySettings } from './CategorySettingsDialog';

interface CategoryProps {
    category: CategoryInfo;
    categories: CategoryInfo[];
    widgets: WidgetInfo[];
    language: ioBroker.Languages;
    stateContext: StateContext;
    onNavigate: (category: CategoryInfo) => void;
    widgetSettings: Record<string, WidgetSettings>;
    onOpenSettings?: (widgetId: string | number) => void;
    categorySettings: Record<string, CategorySettings>;
    onOpenCategorySettings?: (categoryId: string) => void;
}

/** 0 = closed, 1 = open, 2 = tilted */
type OpeningState = 0 | 1 | 2;

interface OpeningSensor {
    stateId: string;
    kind: 'window' | 'door';
    name: string;
    state: OpeningState;
}

interface CategoryStatus {
    temperature: number | null;
    humidity: number | null;
    motionActive: boolean;
    openings: OpeningSensor[];
}

interface CategoryState {
    names: { [categoryId: string]: string };
    icons: { [categoryId: string]: string };
    colors: { [categoryId: string]: string };
    categoryStatus: CategoryStatus;
}

const DEFAULT_CATEGORY_STATUS: CategoryStatus = {
    temperature: null,
    humidity: null,
    motionActive: false,
    openings: [],
};

type StatusRole = 'temperature' | 'humidity' | 'motion' | 'window' | 'door';

interface StatusSubscription {
    stateId: string;
    role: StatusRole;
    /** Widget name for window/door sensors */
    widgetName?: string;
}

export default class Category extends Component<CategoryProps, CategoryState> {
    private internalValues: {
        names: { [categoryId: string]: string };
        icons: { [categoryId: string]: string };
        colors: { [categoryId: string]: string };
    } = {
        names: {},
        icons: {},
        colors: {},
    };

    /** Subscriptions for room status sensors */
    private statusSubs: StatusSubscription[] = [];
    /** Raw values keyed by stateId for recalculation */
    private statusValues: Record<string, ioBroker.StateValue> = {};

    constructor(props: CategoryProps) {
        super(props);
        this.state = {
            names: {},
            icons: {},
            colors: {},
            categoryStatus: { ...DEFAULT_CATEGORY_STATUS },
        };
    }

    private get widgets(): WidgetInfo[] {
        return this.props.widgets.filter(w => w.parent === this.props.category.id);
    }

    private get subCategories(): CategoryInfo[] {
        return this.props.categories.filter(c => c.parent === this.props.category.id);
    }

    readCategorySettings(
        category: CategoryInfo,
        state: {
            names: { [categoryId: string]: string };
            icons: { [categoryId: string]: string };
            colors: { [categoryId: string]: string };
        },
    ): void {
        if (category.name && typeof category.name === 'object') {
            if ((category.name as ioBroker.Translated).en) {
                state.names[category.id] = this.getText(category.name as ioBroker.Translated);
            } else if ((category.name as { objectId: string; property: string }).objectId) {
                this.props.stateContext.getObjectProperty(
                    (category.name as { objectId: string; property: string }).objectId,
                    (category.name as { objectId: string; property: string }).property,
                    this.onNameChange,
                );
            }
        } else {
            state.names[category.id] = category.name || '';
        }

        if (category.icon && typeof category.icon === 'object') {
            if ((category.icon as { stateId: string; mapping?: Record<string | number, string> }).stateId) {
                this.props.stateContext.getState(
                    (category.icon as { stateId: string; mapping?: Record<string | number, string> }).stateId,
                    this.onIconChange,
                );
            }
        } else if (typeof category.icon === 'string') {
            state.icons[category.id] = category.icon;
        }

        if (category.color && typeof category.color === 'object') {
            if ((category.color as { stateId: string; mapping?: Record<string | number, string> }).stateId) {
                this.props.stateContext.getState(
                    (category.color as { stateId: string; mapping?: Record<string | number, string> }).stateId,
                    this.onColorChange,
                );
            }
        } else if (typeof category.color === 'string') {
            state.colors[category.id] = category.color;
        }
    }

    componentDidMount(): void {
        this.internalValues = {
            names: {},
            icons: {},
            colors: {},
        };
        this.readCategorySettings(this.props.category, this.internalValues);
        this.subCategories.forEach(c => this.readCategorySettings(c, this.internalValues));
        this.setState({ ...this.internalValues });

        // Subscribe to room-status sensors
        this.subscribeCategoryStatus();
    }

    componentWillUnmount(): void {
        for (const sub of this.statusSubs) {
            this.props.stateContext.removeState(sub.stateId, this.onStatusChange);
        }
    }

    private getWidgetName(w: WidgetInfo): string {
        if (typeof w.name === 'string') {
            return w.name || '';
        }
        if (w.name && typeof w.name === 'object' && (w.name as ioBroker.Translated).en) {
            return this.getText(w.name as ioBroker.Translated);
        }
        return '';
    }

    private subscribeCategoryStatus(): void {
        const allWidgets = this.props.widgets.filter(w => w.parent === this.props.category.id);
        this.statusSubs = [];
        this.statusValues = {};

        for (const w of allWidgets) {
            const type = w.control?.type;
            if (!type) {
                continue;
            }
            let role: StatusRole | null = null;
            if (type === Types.temperature) {
                role = 'temperature';
            } else if (type === Types.humidity) {
                role = 'humidity';
            } else if (type === Types.motion) {
                role = 'motion';
            } else if (type === Types.window) {
                role = 'window';
            } else if (type === Types.door) {
                role = 'door';
            }
            if (!role) {
                continue;
            }
            const actual = w.control.states.find(s => s.name === 'ACTUAL');
            if (actual?.id) {
                // Avoid duplicate subscriptions for the same state
                if (!this.statusSubs.some(s => s.stateId === actual.id)) {
                    this.statusSubs.push({
                        stateId: actual.id,
                        role,
                        widgetName: (role === 'window' || role === 'door') ? this.getWidgetName(w) : undefined,
                    });
                    this.props.stateContext.getState(actual.id, this.onStatusChange);
                }
            }

            // Temperature sensor may have a SECOND state with humidity
            if (type === Types.temperature) {
                const second = w.control.states.find(s => s.name === 'SECOND');
                if (second?.id && !this.statusSubs.some(s => s.stateId === second.id)) {
                    this.statusSubs.push({ stateId: second.id, role: 'humidity' });
                    this.props.stateContext.getState(second.id, this.onStatusChange);
                }
            }
        }
    }

    private onStatusChange = (id: string, state: ioBroker.State): void => {
        this.statusValues[id] = state.val;
        this.recalcCategoryStatus();
    };

    private static toOpeningState(val: ioBroker.StateValue): OpeningState {
        if (typeof val === 'number') {
            // 0 = closed, 1 = open, 2 = tilted
            if (val === 2) {
                return 2;
            }
            return val ? 1 : 0;
        }
        // boolean: true = open, false = closed
        return val ? 1 : 0;
    }

    private recalcCategoryStatus(): void {
        let temperature: number | null = null;
        let humidity: number | null = null;
        let motionActive = false;
        const openings: OpeningSensor[] = [];

        for (const sub of this.statusSubs) {
            const val = this.statusValues[sub.stateId];
            switch (sub.role) {
                case 'temperature':
                    if (temperature === null && val != null) {
                        const n = Number(val);
                        if (!isNaN(n)) {
                            temperature = n;
                        }
                    }
                    break;
                case 'humidity':
                    if (humidity === null && val != null) {
                        const n = Number(val);
                        if (!isNaN(n)) {
                            humidity = n;
                        }
                    }
                    break;
                case 'motion':
                    if (val) {
                        motionActive = true;
                    }
                    break;
                case 'window':
                case 'door':
                    openings.push({
                        stateId: sub.stateId,
                        kind: sub.role === 'door' ? 'door' : 'window',
                        name: sub.widgetName || '',
                        state: val != null ? Category.toOpeningState(val) : 0,
                    });
                    break;
            }
        }

        this.setState({ categoryStatus: { temperature, humidity, motionActive, openings } });
    }

    onNameChange = (id: string, property: string, value: ioBroker.StringOrTranslated): void => {
        const text = this.getText(value);
        const struct = this.props.category.name as { objectId: string; property: string };
        let changed = false;
        if (this.props.category.name && typeof this.props.category.name === 'object' && struct.objectId) {
            if (
                struct.objectId === id &&
                struct.property === property &&
                text !== this.internalValues.names[this.props.category.id]
            ) {
                this.internalValues.names[this.props.category.id] = text;
                changed = true;
            }
        }

        this.subCategories.forEach(c => {
            if (c.name && typeof c.name === 'object') {
                const struct = c.name as { objectId: string; property: string };
                if (
                    struct.objectId === id &&
                    struct.property === property &&
                    text !== this.internalValues.names[c.id]
                ) {
                    this.internalValues.names[c.id] = text;
                    changed = true;
                }
            }
        });

        if (changed) {
            this.setState({ names: this.internalValues.names });
        }
    };

    onColorChange = (id: string, state: ioBroker.State): void => {
        let changed = false;

        if (this.props.category.color && typeof this.props.category.color === 'object') {
            const struct = this.props.category.color as { stateId?: string; mapping?: Record<string | number, string> };
            if (struct.stateId === id) {
                let color = '';
                if (struct.mapping && struct.mapping[state.val as string]) {
                    color = struct.mapping[state.val as string];
                } else if (state.val !== undefined && state.val !== null) {
                    color = (state.val as string) || '';
                }
                if (color !== this.internalValues.colors[this.props.category.id]) {
                    this.internalValues.colors[this.props.category.id] = color;
                    changed = true;
                }
            }
        }

        this.subCategories.forEach(c => {
            if (c.color && typeof c.color === 'object') {
                const struct = c.color as { stateId?: string; mapping?: Record<string | number, string> };
                if (struct.stateId === id) {
                    let color = '';
                    if (struct.mapping && struct.mapping[state.val as string]) {
                        color = struct.mapping[state.val as string];
                    } else if (state.val !== undefined && state.val !== null) {
                        color = (state.val as string) || '';
                    }
                    if (color !== this.internalValues.colors[c.id]) {
                        this.internalValues.colors[c.id] = color;
                        changed = true;
                    }
                }
            }
        });

        if (changed) {
            this.setState({ colors: this.internalValues.colors });
        }
    };

    onIconChange = (id: string, state: ioBroker.State): void => {
        let changed = false;

        if (this.props.category.icon && typeof this.props.category.icon === 'object') {
            const struct = this.props.category.icon as { stateId?: string; mapping?: Record<string | number, string> };
            if (struct.stateId === id) {
                let iconValue = '';
                if (struct.mapping && struct.mapping[state.val as string]) {
                    iconValue = struct.mapping[state.val as string];
                } else if (state.val !== undefined && state.val !== null) {
                    iconValue = (state.val as string) || '';
                }
                if (iconValue !== this.internalValues.icons[this.props.category.id]) {
                    this.internalValues.icons[this.props.category.id] = iconValue;
                    changed = true;
                }
            }
        }

        this.subCategories.forEach(c => {
            if (c.icon && typeof c.icon === 'object') {
                const struct = c.icon as { stateId?: string; mapping?: Record<string | number, string> };
                if (struct.stateId === id) {
                    let iconValue = '';
                    if (struct.mapping && struct.mapping[state.val as string]) {
                        iconValue = struct.mapping[state.val as string];
                    } else if (state.val !== undefined && state.val !== null) {
                        iconValue = (state.val as string) || '';
                    }
                    if (iconValue !== this.internalValues.icons[c.id]) {
                        this.internalValues.icons[c.id] = iconValue;
                        changed = true;
                    }
                }
            }
        });

        if (changed) {
            this.setState({ icons: this.internalValues.icons });
        }
    };

    getText(text: ioBroker.StringOrTranslated): string {
        if (typeof text === 'object') {
            return text[this.props.language] || text.en;
        }

        return text;
    }

    renderWidget(widget: WidgetInfo): React.JSX.Element {
        let Widget: React.ComponentType<WidgetGenericProps> | undefined;
        if (widget.control && widget.control.type === Types.socket) {
            Widget = WidgetSwitch;
        } else if (widget.control && widget.control.type === Types.light) {
            Widget = WidgetLight;
        } else if (widget.control && widget.control.type === Types.dimmer) {
            Widget = WidgetDimmer;
        } else if (widget.control && widget.control.type === Types.temperature) {
            Widget = WidgetTemperature;
        } else if (widget.control && widget.control.type === Types.motion) {
            Widget = WidgetMotion;
        } else if (widget.control && widget.control.type === Types.window) {
            Widget = WidgetWindow;
        } else if (widget.control && widget.control.type === Types.blind) {
            Widget = WidgetBlind;
        } else if (widget.control && widget.control.type === Types.lock) {
            Widget = WidgetLock;
        } else if (widget.control && widget.control.type === Types.door) {
            Widget = WidgetDoor;
        } else if (widget.control && widget.control.type === Types.floodAlarm) {
            Widget = WidgetFloodAlarm;
        } else if (widget.control && widget.control.type === Types.fireAlarm) {
            Widget = WidgetFireAlarm;
        } else if (widget.control && widget.control.type === Types.humidity) {
            Widget = WidgetHumidity;
        }

        if (!Widget) {
            return (
                <div key={widget.id}>
                    {I18n.t('wm_Unknown type')}: {widget.control?.type || '?'}
                </div>
            );
        }
        const settings = this.props.widgetSettings[String(widget.id)];
        return (
            <Widget
                key={widget.id}
                stateContext={this.props.stateContext}
                widget={widget}
                language={this.props.language}
                settings={settings}
                onOpenSettings={this.props.onOpenSettings}
            />
        );
    }

    renderCategoryTile(category: CategoryInfo): React.JSX.Element {
        const icon = this.state.icons[category.id];
        const name = this.state.names[category.id] ?? '...';
        const deviceCount = this.props.widgets.filter(w => w.parent === category.id).length;

        return (
            <ButtonBase
                key={category.id}
                component="div"
                onClick={() => this.props.onNavigate(category)}
                sx={theme => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                    gridColumn: '1 / -1',
                    textAlign: 'left',
                    overflow: 'hidden',
                    borderRadius: '16px',
                    p: 2,
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderLeft: `3px solid ${theme.palette.primary.main}`,
                    '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                    },
                    '&:active': {
                        transform: 'scale(0.99)',
                    },
                })}
            >
                {icon ? (
                    <Icon
                        src={icon}
                        style={{ width: 28, height: 28, flexShrink: 0 }}
                    />
                ) : (
                    <MeetingRoom
                        sx={theme => ({
                            fontSize: 28,
                            color: theme.palette.primary.main,
                            flexShrink: 0,
                        })}
                    />
                )}

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="body1"
                        sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {name}
                    </Typography>
                    {deviceCount > 0 ? (
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary' }}
                        >
                            {deviceCount === 1
                                ? I18n.t('wm_one_device')
                                : I18n.t('wm_n_devices', deviceCount.toString())}
                        </Typography>
                    ) : null}
                </Box>

                <ChevronRight sx={{ color: 'text.secondary', flexShrink: 0 }} />
            </ButtonBase>
        );
    }

    private static getOpeningTooltip(sensor: OpeningSensor): string {
        const label = sensor.name || (sensor.kind === 'door' ? I18n.t('wm_Door') : I18n.t('wm_Window'));
        if (sensor.state === 0) {
            return `${label}: ${I18n.t('wm_Closed')}`;
        }
        if (sensor.state === 2) {
            return `${label}: ${I18n.t('wm_Tilted')}`;
        }
        return `${label}: ${I18n.t('wm_Open')}`;
    }

    private static getOpeningColor(sensor: OpeningSensor): string {
        if (sensor.state === 0) {
            return 'text.disabled';
        }
        if (sensor.state === 2) {
            return 'info.main';
        }
        return 'warning.main';
    }

    renderCategoryStatus(): React.JSX.Element | null {
        const { temperature, humidity, motionActive, openings } = this.state.categoryStatus;
        const hasAny = temperature !== null || humidity !== null || motionActive || openings.length > 0;
        if (!hasAny) {
            return null;
        }

        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mb: 1.5,
                    px: 0.5,
                    flexWrap: 'wrap',
                }}
            >
                {temperature !== null ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Thermostat sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                            {temperature.toFixed(1)}°
                        </Typography>
                    </Box>
                ) : null}
                {humidity !== null ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WaterDrop sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                            {Math.round(humidity)}%
                        </Typography>
                    </Box>
                ) : null}
                {motionActive ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DirectionsRun sx={{ fontSize: 18, color: 'warning.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'warning.main' }}>
                            {I18n.t('wm_Motion')}
                        </Typography>
                    </Box>
                ) : null}
                {openings.length > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {openings.map(sensor => (
                            <Tooltip key={sensor.stateId} title={Category.getOpeningTooltip(sensor)}>
                                {sensor.kind === 'door' ? (
                                    <SensorDoor
                                        sx={{
                                            fontSize: 20,
                                            color: Category.getOpeningColor(sensor),
                                            transition: 'color 0.25s ease',
                                        }}
                                    />
                                ) : (
                                    <SensorWindow
                                        sx={{
                                            fontSize: 20,
                                            color: Category.getOpeningColor(sensor),
                                            transform: sensor.state === 2 ? 'rotate(15deg)' : undefined,
                                            transition: 'color 0.25s ease, transform 0.25s ease',
                                        }}
                                    />
                                )}
                            </Tooltip>
                        ))}
                    </Box>
                ) : null}
            </Box>
        );
    }

    render(): React.JSX.Element {
        const parentCategory = this.props.category.parent
            ? this.props.categories.find(c => String(c.id) === String(this.props.category.parent))
            : undefined;

        const hasHeader = !!(parentCategory || this.state.names[this.props.category.id]);
        const hasItems = this.subCategories.length > 0 || this.widgets.length > 0;
        const categoryId = String(this.props.category.id);
        const categorySettings = this.props.categorySettings[categoryId];
        const catImage = categorySettings?.image;
        const imageScope = categorySettings?.imageScope || 'header';
        const catColor = categorySettings?.color;
        const displayName = categorySettings?.name || this.state.names[this.props.category.id] || '...';

        const bgImageSx = catImage
            ? {
                  backgroundImage: `url(${catImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
              }
            : {};

        return (
            <Box
                key={this.props.category.id}
                sx={theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden',
                    ...(catImage && imageScope === 'page' ? {
                        ...bgImageSx,
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: alpha(theme.palette.background.default, 0.75),
                            zIndex: 0,
                        },
                    } : {}),
                    position: 'relative',
                })}
            >
                {/* Fixed header — hidden for root category (no parent, no name) */}
                {hasHeader ? (
                    <Box
                        sx={theme => ({
                            flexShrink: 0,
                            p: 1,
                            pb: 0,
                            position: 'relative',
                            zIndex: 1,
                            ...(catImage && imageScope === 'header' ? {
                                ...bgImageSx,
                                borderRadius: '0 0 16px 16px',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundColor: alpha(theme.palette.background.default, 0.7),
                                    borderRadius: 'inherit',
                                },
                            } : {}),
                        })}
                    >
                        {/* Room name */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, px: 0.5, position: 'relative' }}>
                            {parentCategory ? (
                                <IconButton
                                    size="small"
                                    onClick={() => this.props.onNavigate(parentCategory)}
                                    sx={{ ml: -1 }}
                                >
                                    <ArrowBack />
                                </IconButton>
                            ) : null}
                            {this.state.icons[this.props.category.id] ? (
                                <Icon
                                    src={this.state.icons[this.props.category.id]}
                                    style={{ width: 28, height: 28 }}
                                />
                            ) : null}
                            <Typography
                                variant="h5"
                                sx={{
                                    fontWeight: 700,
                                    flex: 1,
                                    color: catColor || undefined,
                                }}
                            >
                                {displayName}
                            </Typography>
                            {this.props.onOpenCategorySettings ? (
                                <Tooltip title={I18n.t('wm_Category settings')}>
                                    <IconButton
                                        size="small"
                                        onClick={() => this.props.onOpenCategorySettings!(categoryId)}
                                        sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                    >
                                        <Settings fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                        </Box>

                        {/* Room status summary */}
                        <Box sx={{ position: 'relative' }}>
                            {this.renderCategoryStatus()}
                        </Box>
                    </Box>
                ) : null}

                {/* Scrollable widgets */}
                {hasItems ? (
                    <Box
                        sx={{
                            flex: 1,
                            overflow: 'auto',
                            p: 1,
                            pt: hasHeader ? 0.5 : 2,
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                gap: 1.5,
                            }}
                        >
                            {this.subCategories.map(c => this.renderCategoryTile(c))}
                            {this.widgets.map(w => this.renderWidget(w))}
                        </Box>
                    </Box>
                ) : null}
            </Box>
        );
    }
}
