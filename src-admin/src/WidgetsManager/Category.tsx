import React, { Component, useCallback, useMemo, useState } from 'react';

import { Box, ButtonBase, IconButton, Tooltip, Typography } from '@mui/material';
import {
    Add,
    ArrowBack,
    ChevronRight,
    DirectionsRun,
    DragIndicator,
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
import {
    DndContext,
    DragOverlay,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { CategoryInfo, CustomWidgetDef, WidgetInfo } from '../../../src/widget-utils';
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
    WidgetBlindButtons,
    WidgetAirCondition,
    WidgetWarning,
    WidgetLock,
    WidgetDoor,
    WidgetFloodAlarm,
    WidgetFireAlarm,
    WidgetHumidity,
    WidgetIlluminance,
    WidgetThermostat,
    WidgetClock,
    WidgetVolume,
    WidgetColorLight,
    WidgetInfo as WidgetInfoWidget,
    WidgetLocation,
    WidgetSlider,
    WidgetTank,
    WidgetImage,
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
    onAddCustomWidget?: (categoryId: string) => void;
    onRemoveCustomWidget?: (categoryId: string, widgetId: string) => void;
    onOpenCustomWidgetSettings?: (categoryId: string, widgetId: string) => void;
    onWidgetOrderChange?: (categoryId: string, widgetOrder: string[]) => void;
    /** true if running in admin, false if in web */
    admin: boolean;
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

type OrderedItem = {
    type: 'category' | 'widget' | 'custom';
    id: string;
    data: CategoryInfo | WidgetInfo | CustomWidgetDef;
};

function getGridColumn(item: OrderedItem, widgetSettings: Record<string, WidgetSettings>): string | undefined {
    if (item.type === 'category') {
        return '1 / -1';
    }
    let size = '1x1';
    if (item.type === 'widget') {
        size = widgetSettings[item.id]?.size || '1x1';
    } else {
        size = (item.data as CustomWidgetDef).size || '1x1';
    }
    if (size === '2x0.5' || size === '2x1') {
        return 'span 2';
    }
    return undefined;
}

/** Thin wrapper so each grid cell is a valid droppable/draggable for dnd-kit */
function SortableItem(props: {
    id: string;
    gridColumn?: string;
    isDragging: boolean;
    children: React.ReactNode;
}): React.JSX.Element {
    const { id, gridColumn, isDragging, children } = props;
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id });

    const style: React.CSSProperties = {
        position: 'relative',
        gridColumn: gridColumn || undefined,
        opacity: isDragging ? 0.25 : 1,
        transform: CSS.Transform.toString(transform),
        transition: transition || undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
        >
            <Box
                ref={setActivatorNodeRef}
                {...listeners}
                sx={theme => ({
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    p: '2px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    zIndex: 3,
                    color: theme.palette.text.secondary,
                    opacity: 0.5,
                    transition: 'opacity 0.2s, background-color 0.2s',
                    '&:hover': {
                        opacity: 1,
                        backgroundColor: theme.palette.action.hover,
                    },
                })}
            >
                <DragIndicator sx={{ fontSize: 16 }} />
            </Box>
            {children}
        </div>
    );
}

function SortableGrid(props: {
    category: Category;
    canDrag: boolean;
    categoryId: string;
    onOrderChange?: (categoryId: string, widgetOrder: string[]) => void;
    widgetSettings: Record<string, WidgetSettings>;
}): React.JSX.Element {
    const { category, canDrag, categoryId, onOrderChange, widgetSettings } = props;
    const sourceItems = category.getOrderedItems();
    const sourceIds = useMemo(() => sourceItems.map(i => i.id), [sourceItems]);

    // Local order kept in sync with props, but updated live during drag
    const [liveOrder, setLiveOrder] = useState<string[]>(sourceIds);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Sync liveOrder with props when items are added/removed (not just reordered)
    const prevSourceRef = React.useRef(sourceIds);
    if (prevSourceRef.current !== sourceIds) {
        prevSourceRef.current = sourceIds;
        // Only reset if the set of IDs changed (add/remove), not just order
        const liveSet = new Set(liveOrder);
        const sourceSet = new Set(sourceIds);
        if (
            liveOrder.length !== sourceIds.length ||
            sourceIds.some(id => !liveSet.has(id)) ||
            liveOrder.some(id => !sourceSet.has(id))
        ) {
            setLiveOrder(sourceIds);
        }
    }

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(String(event.active.id));
    }, []);

    // Reorder live during drag so the grid reflows naturally
    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            return;
        }
        setLiveOrder(prev => {
            const oldIdx = prev.indexOf(String(active.id));
            const newIdx = prev.indexOf(String(over.id));
            if (oldIdx < 0 || newIdx < 0) {
                return prev;
            }
            return arrayMove(prev, oldIdx, newIdx);
        });
    }, []);

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveId(null);
            if (!over || active.id === over.id) {
                return;
            }
            // Persist the final order
            onOrderChange?.(categoryId, liveOrder);
        },
        [categoryId, onOrderChange, liveOrder],
    );

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
        setLiveOrder(sourceIds);
    }, [sourceIds]);

    // Build item map for fast lookup
    const itemMap = useMemo(() => {
        const map = new Map<string, OrderedItem>();
        for (const item of sourceItems) {
            map.set(item.id, item);
        }
        return map;
    }, [sourceItems]);

    const orderedItems = liveOrder.map(id => itemMap.get(id)).filter(Boolean) as OrderedItem[];
    const activeItem = activeId ? itemMap.get(activeId) : null;

    const renderContent = (item: OrderedItem): React.ReactNode => {
        if (item.type === 'category') {
            return category.renderCategoryTile(item.data as CategoryInfo);
        }
        if (item.type === 'widget') {
            return category.renderWidget(item.data as WidgetInfo);
        }
        return category.renderCustomWidget(item.data as CustomWidgetDef);
    };

    if (!canDrag) {
        return (
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                    gap: 1.5,
                }}
            >
                {orderedItems.map(item => {
                    const gridColumn = getGridColumn(item, widgetSettings);
                    return gridColumn ? (
                        <div
                            key={item.id}
                            style={{ gridColumn }}
                        >
                            {renderContent(item)}
                        </div>
                    ) : (
                        <React.Fragment key={item.id}>{renderContent(item)}</React.Fragment>
                    );
                })}
            </Box>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <SortableContext
                items={liveOrder}
                strategy={rectSortingStrategy}
            >
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                        gap: 1.5,
                    }}
                >
                    {orderedItems.map(item => (
                        <SortableItem
                            key={item.id}
                            id={item.id}
                            gridColumn={getGridColumn(item, widgetSettings)}
                            isDragging={item.id === activeId}
                        >
                            {renderContent(item)}
                        </SortableItem>
                    ))}
                </Box>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
                {activeItem ? (
                    <Box sx={{ opacity: 0.85, pointerEvents: 'none' }}>{renderContent(activeItem)}</Box>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
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
            if ((category.name as { objectId: string; property: string }).objectId) {
                this.props.stateContext.getObjectProperty(
                    (category.name as { objectId: string; property: string }).objectId,
                    (category.name as { objectId: string; property: string }).property,
                    this.onNameChange,
                );
            } else {
                state.names[category.id] = this.getText(category.name as ioBroker.Translated);
            }
        } else if (typeof typeof category.name === 'string') {
            state.names[category.id] = category.name;
        }
        state.names[category.id] ||= category.id.toString().split('.').pop() || '';

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
                        widgetName: role === 'window' || role === 'door' ? this.getWidgetName(w) : undefined,
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

    // --- Ordered items for grid ---

    // eslint-disable-next-line react/no-unused-class-component-methods
    getOrderedItems(): Array<{
        type: 'category' | 'widget' | 'custom';
        id: string;
        data: CategoryInfo | WidgetInfo | CustomWidgetDef;
    }> {
        const categoryId = String(this.props.category.id);
        const catSettings = this.props.categorySettings[categoryId];
        const customWidgets = catSettings?.customWidgets || [];
        const order = catSettings?.widgetOrder;

        const items: Array<{
            type: 'category' | 'widget' | 'custom';
            id: string;
            data: CategoryInfo | WidgetInfo | CustomWidgetDef;
        }> = [
            ...this.subCategories.map(c => ({ type: 'category' as const, id: String(c.id), data: c })),
            ...this.widgets.map(w => ({ type: 'widget' as const, id: String(w.id), data: w })),
            ...customWidgets.map(cw => ({ type: 'custom' as const, id: cw.id, data: cw })),
        ];

        if (!order?.length) {
            return items;
        }

        const orderMap = new Map(order.map((id, idx) => [id, idx]));
        const ordered = items.filter(i => orderMap.has(i.id)).sort((a, b) => orderMap.get(a.id)! - orderMap.get(b.id)!);
        const unordered = items.filter(i => !orderMap.has(i.id));
        return [...ordered, ...unordered];
    }

    getText(text: ioBroker.StringOrTranslated): string {
        if (typeof text === 'object') {
            return text[this.props.language] || text.en;
        }

        return text;
    }

    // eslint-disable-next-line react/no-unused-class-component-methods
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
        } else if (widget.control && widget.control.type === Types.blindButtons) {
            Widget = WidgetBlindButtons;
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
        } else if (widget.control && widget.control.type === Types.illuminance) {
            Widget = WidgetIlluminance;
        } else if (widget.control && widget.control.type === Types.thermostat) {
            Widget = WidgetThermostat;
        } else if (widget.control && widget.control.type === Types.airCondition) {
            Widget = WidgetAirCondition;
        } else if (widget.control && widget.control.type === Types.warning) {
            Widget = WidgetWarning;
        } else if (
            widget.control &&
            (widget.control.type === Types.volume || widget.control.type === Types.volumeGroup)
        ) {
            Widget = WidgetVolume;
        } else if (
            widget.control &&
            (widget.control.type === Types.slider || widget.control.type === Types.percentage)
        ) {
            Widget = WidgetSlider;
        } else if (
            widget.control?.type === Types.info &&
            widget.control.states.some(
                s => s.name === 'ACTUAL' && /value\.fill|level\.tank|tank/i.test(s.stateRole || ''),
            )
        ) {
            Widget = WidgetTank;
        } else if (widget.control && widget.control.type === Types.image) {
            Widget = WidgetImage;
        } else if (widget.control && widget.control.type === Types.info) {
            Widget = WidgetInfoWidget;
        } else if (
            widget.control &&
            (widget.control.type === Types.location || widget.control.type === Types.locationOne)
        ) {
            Widget = WidgetLocation;
        } else if (
            widget.control &&
            (widget.control.type === Types.rgbSingle ||
                widget.control.type === Types.rgbwSingle ||
                widget.control.type === Types.rgb ||
                widget.control.type === Types.hue ||
                widget.control.type === Types.cie ||
                widget.control.type === Types.ct)
        ) {
            Widget = WidgetColorLight;
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

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderCustomWidget(def: CustomWidgetDef): React.JSX.Element | null {
        const categoryId = String(this.props.category.id);
        const settingsCb = this.props.onOpenCustomWidgetSettings
            ? () => this.props.onOpenCustomWidgetSettings!(categoryId, def.id)
            : undefined;
        const removeCb = this.props.onRemoveCustomWidget
            ? () => this.props.onRemoveCustomWidget!(categoryId, def.id)
            : undefined;

        switch (def.type) {
            case 'clock':
                return (
                    <WidgetClock
                        key={def.id}
                        id={def.id}
                        language={this.props.language}
                        size={def.size}
                        color={def.color}
                        style={def.style}
                        showDate={def.showDate}
                        showDow={def.showDow}
                        showSeconds={def.showSeconds}
                        onOpenSettings={settingsCb}
                        onRemove={removeCb}
                    />
                );
            default:
                return null;
        }
    }

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderCategoryTile(category: CategoryInfo): React.JSX.Element {
        const icon = this.state.icons[category.id];
        const name = this.state.names[category.id] ?? '...';
        const tileCatSettings = this.props.categorySettings[String(category.id)];
        const tileColor = this.state.colors[category.id] || tileCatSettings?.color;
        const tileStoredImage = tileCatSettings?.image;
        const tileImage = tileStoredImage
            ? `/${this.props.admin ? 'files/' : ''}${tileStoredImage.replace(/^\//, '')}`
            : '';
        const deviceCount = this.props.widgets.filter(w => w.parent === category.id).length;

        return (
            <ButtonBase
                id={String(category.id)}
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
                    position: 'relative',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderLeft: `3px solid ${tileColor || theme.palette.primary.main}`,
                    ...(tileImage
                        ? {
                              backgroundImage: `url(${tileImage})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                          }
                        : {}),
                    '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                    },
                    '&:active': {
                        transform: 'scale(0.99)',
                    },
                    ...(tileImage
                        ? {
                              '&::before': {
                                  content: '""',
                                  position: 'absolute',
                                  inset: 0,
                                  backgroundColor: alpha(theme.palette.background.default, 0.75),
                                  borderRadius: 'inherit',
                              },
                          }
                        : {}),
                })}
            >
                {icon ? (
                    <Icon
                        src={icon}
                        style={{
                            width: 28,
                            height: 28,
                            flexShrink: 0,
                            color: tileColor || undefined,
                            position: 'relative',
                            zIndex: 1,
                        }}
                    />
                ) : (
                    <MeetingRoom
                        sx={theme => ({
                            fontSize: 28,
                            color: tileColor || theme.palette.primary.main,
                            flexShrink: 0,
                            position: 'relative',
                            zIndex: 1,
                        })}
                    />
                )}

                <Box sx={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                    <Typography
                        variant="body1"
                        sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: tileColor || undefined,
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

                <ChevronRight sx={{ color: 'text.secondary', flexShrink: 0, position: 'relative', zIndex: 1 }} />
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
                        <Typography
                            variant="body2"
                            sx={{ fontWeight: 500, color: 'text.secondary' }}
                        >
                            {temperature.toFixed(1)}°
                        </Typography>
                    </Box>
                ) : null}
                {humidity !== null ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WaterDrop sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography
                            variant="body2"
                            sx={{ fontWeight: 500, color: 'text.secondary' }}
                        >
                            {Math.round(humidity)}%
                        </Typography>
                    </Box>
                ) : null}
                {motionActive ? (
                    <Tooltip title={I18n.t('wm_Motion')}>
                        <DirectionsRun sx={{ fontSize: 20, color: 'warning.main' }} />
                    </Tooltip>
                ) : null}
                {openings.length > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {openings.map(sensor => (
                            <Tooltip
                                key={sensor.stateId}
                                title={Category.getOpeningTooltip(sensor)}
                            >
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

        const isRoot = !this.props.category.parent;
        const customWidgets = this.props.categorySettings[String(this.props.category.id)]?.customWidgets || [];
        const hasItems = this.subCategories.length > 0 || this.widgets.length > 0 || customWidgets.length > 0;
        const categoryId = String(this.props.category.id);
        const categorySettings = this.props.categorySettings[categoryId];
        const hasHeader = !!(
            parentCategory ||
            this.state.names[this.props.category.id] ||
            categorySettings?.name ||
            this.props.onOpenCategorySettings
        );
        const storedImage = categorySettings?.image;
        // Stored path has no prefix; add files/ prefix for admin
        const catImage = storedImage ? `/${this.props.admin ? 'files/' : ''}${storedImage.replace(/^\//, '')}` : '';
        const imageScope = categorySettings?.imageScope || 'header';
        const catColor = categorySettings?.color;
        const catBgColor = categorySettings?.backgroundColor;
        const displayName = categorySettings?.name || this.state.names[this.props.category.id] || (isRoot ? '' : '...');

        const bgImageSx = catImage
            ? {
                  backgroundImage: `url(${catImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
              }
            : {};

        return (
            <Box
                id={String(this.props.category.id)}
                key={this.props.category.id}
                sx={theme => ({
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden',
                    ...(catBgColor ? { backgroundColor: catBgColor } : {}),
                    ...(catImage && imageScope === 'page'
                        ? {
                              ...bgImageSx,
                              '&::before': {
                                  content: '""',
                                  position: 'absolute',
                                  inset: 0,
                                  backgroundColor: alpha(catBgColor || theme.palette.background.default, 0.75),
                                  zIndex: 0,
                              },
                          }
                        : {}),
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
                            ...(catImage && imageScope === 'header'
                                ? {
                                      ...bgImageSx,
                                      borderRadius: '0 0 16px 16px',
                                      '&::before': {
                                          content: '""',
                                          position: 'absolute',
                                          inset: 0,
                                          backgroundColor: alpha(catBgColor || theme.palette.background.default, 0.7),
                                          borderRadius: 'inherit',
                                      },
                                  }
                                : {}),
                        })}
                    >
                        {/* Room name */}
                        <Box
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, px: 0.5, position: 'relative' }}
                        >
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
                                    style={{ width: 28, height: 28, color: catColor || undefined }}
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
                            {this.props.onAddCustomWidget ? (
                                <Tooltip title={I18n.t('wm_Add widget')}>
                                    <IconButton
                                        size="small"
                                        onClick={() => this.props.onAddCustomWidget!(categoryId)}
                                        sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                    >
                                        <Add fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            ) : null}
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
                        <Box sx={{ position: 'relative' }}>{this.renderCategoryStatus()}</Box>
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
                        <SortableGrid
                            category={this}
                            canDrag={!!this.props.onWidgetOrderChange}
                            categoryId={String(this.props.category.id)}
                            onOrderChange={this.props.onWidgetOrderChange}
                            widgetSettings={this.props.widgetSettings}
                        />
                    </Box>
                ) : null}
            </Box>
        );
    }
}
