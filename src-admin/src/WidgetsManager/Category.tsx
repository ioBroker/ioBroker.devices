import React, { Component, useCallback, useMemo, useRef, useState } from 'react';

import { Box, ButtonBase, IconButton, Tooltip, Typography } from '@mui/material';
import {
    Add,
    ArrowBack,
    BatteryAlert,
    Build,
    LocalFireDepartment,
    ChevronRight,
    DirectionsRun,
    DragIndicator,
    ExpandMore,
    MeetingRoom,
    PlayArrow,
    SensorDoor,
    SensorWindow,
    Settings,
    Thermostat,
    SplitscreenOutlined,
    UnfoldLess,
    UnfoldMore,
    ViewModule,
    Warning,
    WaterDamage,
    WaterDrop,
    Workspaces,
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
    useDroppable,
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
    WidgetWeather,
    WidgetVolume,
    WidgetColorLight,
    WidgetInfo as WidgetInfoWidget,
    WidgetLocation,
    WidgetSlider,
    WidgetTank,
    WidgetImage,
    WidgetWeatherCurrent,
    WidgetWeatherForecast,
    WidgetIframe,
    WidgetWind,
} from './Widgets';

import type StateContext from './StateContext';
import type { CategorySettings } from './CategorySettingsDialog';
import { CUSTOM_WIDGET_CONFIGS, getConfigDefault } from './CustomWidgetConfigs';
import type { WidgetGroup } from './groupUtils';
import { getGroupIcon } from './groupIcons';

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
    onWidgetGroupsChange?: (categoryId: string, groups: WidgetGroup[]) => void;
    onToggleGrouping?: (
        categoryId: string,
        orderedItems: Array<{ type: 'category' | 'widget' | 'custom'; id: string; data: unknown }>,
    ) => void;
    /** true if running in admin, false if in web */
    admin: boolean;
    /** Whether config/editing mode is active */
    configMode?: boolean;
    /** Toggle between config and play mode. If undefined, no toggle button is shown. */
    onToggleConfigMode?: () => void;
    /** Open "Install as Side Panel" dialog */
    onInstallSidePanel?: () => void;
    /** Default history adapter instance (e.g. "history.0"), passed down to avoid repeated system.config reads */
    defaultHistory?: string;
    /** Move a widget to a different category (drag & drop between groups) */
    onMoveWidgetToCategory?: (widgetId: string, targetCategoryId: string) => void;
}

/** 0 = closed, 1 = open, 2 = tilted */
type OpeningState = 0 | 1 | 2;

interface OpeningSensor {
    stateId: string;
    kind: 'window' | 'door';
    name: string;
    state: OpeningState;
    /** Custom widget icon (from common.icon) */
    icon?: string;
    /** Widget ID to look up settings (color, text, etc.) */
    widgetId?: string;
}

interface LowBatteryDevice {
    name: string;
    level: number | null;
}

interface CategoryStatus {
    temperature: number | null;
    humidity: number | null;
    motionActive: boolean;
    openings: OpeningSensor[];
    lowBatteryDevices: LowBatteryDevice[];
}

interface CategoryState {
    names: { [categoryId: string]: string };
    icons: { [categoryId: string]: string };
    colors: { [categoryId: string]: string };
    categoryStatus: CategoryStatus;
    /** Status summaries for each sub-category (keyed by category ID) */
    subCategoryStatuses: Record<string, CategoryStatus>;
}

const DEFAULT_CATEGORY_STATUS: CategoryStatus = {
    temperature: null,
    humidity: null,
    motionActive: false,
    openings: [],
    lowBatteryDevices: [],
};

type StatusRole = 'temperature' | 'humidity' | 'motion' | 'window' | 'door' | 'lowbat' | 'battery';

interface StatusSubscription {
    stateId: string;
    role: StatusRole;
    /** Widget name for window/door sensors */
    widgetName?: string;
    /** Custom widget icon (from `common.icon`) */
    widgetIcon?: string;
    /** Widget ID to look up settings */
    widgetId?: string;
    /** Which category this sensor belongs to (for subcategory status) */
    categoryId?: string;
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
        const def = item.data as CustomWidgetDef;
        // Fall back to the config default when size wasn't persisted (older widgets)
        const configDefault = CUSTOM_WIDGET_CONFIGS[def.type]?.items.size;
        size = def.size || (configDefault ? String(getConfigDefault(configDefault)) : '1x1');
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

/** Wrapper that makes a sub-category tile act as a drop target during widget drag */
function DroppableCategoryTile(props: { id: string; children: React.ReactNode }): React.JSX.Element {
    const { id, children } = props;
    const { setNodeRef, isOver } = useDroppable({ id: `drop-cat:${id}` });
    return (
        <div
            ref={setNodeRef}
            style={{
                borderRadius: 16,
                outline: isOver ? '2px dashed #4dabf5' : 'none',
                outlineOffset: -2,
                backgroundColor: isOver ? 'rgba(77, 171, 245, 0.08)' : undefined,
                transition: 'outline 0.15s ease, background-color 0.15s ease',
            }}
        >
            {children}
        </div>
    );
}

function SortableGrid(props: {
    category: Category;
    canDrag: boolean;
    categoryId: string;
    onOrderChange?: (categoryId: string, widgetOrder: string[]) => void;
    onMoveWidgetToCategory?: (widgetId: string, targetCategoryId: string) => void;
    widgetSettings: Record<string, WidgetSettings>;
}): React.JSX.Element {
    const { category, canDrag, categoryId, onOrderChange, onMoveWidgetToCategory, widgetSettings } = props;
    const sourceItems = category.getOrderedItems();
    const sourceIds = useMemo(() => sourceItems.map(i => i.id), [sourceItems]);

    // Local order kept in sync with props, but updated live during drag
    const [liveOrder, setLiveOrder] = useState<string[]>(sourceIds);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Ref to always access latest liveOrder inside callbacks (avoids stale closures)
    const liveOrderRef = useRef(liveOrder);
    liveOrderRef.current = liveOrder;

    // Sync liveOrder with props when items are added/removed (not just reordered)
    const prevSourceRef = useRef(sourceIds);
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

    // Build item map for fast lookup (must be before callbacks that reference it)
    const itemMap = useMemo(() => {
        const map = new Map<string, OrderedItem>();
        for (const item of sourceItems) {
            map.set(item.id, item);
        }
        return map;
    }, [sourceItems]);

    const [dropCategoryId, setDropCategoryId] = useState<string | null>(null);
    const dropCategoryRef = useRef<string | null>(null);
    dropCategoryRef.current = dropCategoryId;

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(String(event.active.id));
        setDropCategoryId(null);
    }, []);

    // Reorder live during drag so the grid reflows naturally
    const handleDragOver = useCallback(
        (event: DragOverEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) {
                return;
            }
            const overId = String(over.id);
            const activeEl = itemMap.get(String(active.id));
            const overEl = itemMap.get(overId);

            // Widget/custom dragged over a sub-category tile = move target (not reorder)
            if (activeEl && activeEl.type !== 'category' && overEl?.type === 'category' && onMoveWidgetToCategory) {
                setDropCategoryId(overId);
                return;
            }

            // Check if hovering over a separate droppable category tile (used in grouped mode)
            if (overId.startsWith('drop-cat:') && activeEl && activeEl.type !== 'category' && onMoveWidgetToCategory) {
                setDropCategoryId(overId.replace('drop-cat:', ''));
                return;
            }

            setDropCategoryId(null);
            setLiveOrder(prev => {
                const oldIdx = prev.indexOf(String(active.id));
                const newIdx = prev.indexOf(overId);
                if (oldIdx < 0 || newIdx < 0) {
                    return prev;
                }
                return arrayMove(prev, oldIdx, newIdx);
            });
        },
        [itemMap, onMoveWidgetToCategory],
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            setActiveId(null);
            const currentDrop = dropCategoryRef.current;
            setDropCategoryId(null);
            // If dropped on a category, move widget there
            if (currentDrop && onMoveWidgetToCategory) {
                onMoveWidgetToCategory(String(event.active.id), currentDrop);
                return;
            }
            // handleDragOver already updated liveOrder during drag,
            // so active.id === over.id is common — always persist if order changed
            const currentOrder = liveOrderRef.current;
            if (currentOrder.some((id, idx) => id !== prevSourceRef.current[idx])) {
                onOrderChange?.(categoryId, currentOrder);
            }
        },
        [categoryId, onOrderChange, onMoveWidgetToCategory],
    );

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
        setDropCategoryId(null);
        setLiveOrder(sourceIds);
    }, [sourceIds]);

    const orderedItems = liveOrder.map(id => itemMap.get(id)).filter(Boolean) as OrderedItem[];
    const activeItem = activeId ? itemMap.get(activeId) : null;

    const renderContent = (item: OrderedItem, isDropTarget?: boolean): React.ReactNode => {
        if (item.type === 'category') {
            const tile = category.renderCategoryTile(item.data as CategoryInfo);
            if (isDropTarget) {
                return (
                    <div
                        style={{
                            borderRadius: 16,
                            outline: '2px dashed #4dabf5',
                            outlineOffset: -2,
                            backgroundColor: 'rgba(77, 171, 245, 0.08)',
                            transition: 'outline 0.15s ease, background-color 0.15s ease',
                        }}
                    >
                        {tile}
                    </div>
                );
            }
            return tile;
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
                            {renderContent(item, item.type === 'category' && item.id === dropCategoryId)}
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

// --- Per-group sortable grid (scoped items, no category.getOrderedItems) ---

function GroupSortableGrid(props: {
    category: Category;
    items: OrderedItem[];
    canDrag: boolean;
    groupId: string;
    onOrderChange?: (groupId: string, widgetIds: string[]) => void;
    onMoveWidgetToCategory?: (widgetId: string, targetCategoryId: string) => void;
    /** Sub-category items shown as droppable targets inside this group's DndContext */
    categoryItems?: OrderedItem[];
    widgetSettings: Record<string, WidgetSettings>;
}): React.JSX.Element {
    const { category, items, canDrag, groupId, onOrderChange, onMoveWidgetToCategory, categoryItems, widgetSettings } =
        props;
    const sourceIds = useMemo(() => items.map(i => i.id), [items]);

    const [liveOrder, setLiveOrder] = useState<string[]>(sourceIds);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [dropCategoryId, setDropCategoryId] = useState<string | null>(null);
    const dropCategoryRef = useRef<string | null>(null);
    dropCategoryRef.current = dropCategoryId;

    const liveOrderRef = useRef(liveOrder);
    liveOrderRef.current = liveOrder;

    const prevSourceRef = useRef(sourceIds);
    if (prevSourceRef.current !== sourceIds) {
        prevSourceRef.current = sourceIds;
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
        setDropCategoryId(null);
    }, []);

    const handleDragOver = useCallback(
        (event: DragOverEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) {
                return;
            }
            const overId = String(over.id);
            // Check if hovering over a droppable category tile
            if (overId.startsWith('drop-cat:') && onMoveWidgetToCategory) {
                setDropCategoryId(overId.replace('drop-cat:', ''));
                return;
            }
            setDropCategoryId(null);
            setLiveOrder(prev => {
                const oldIdx = prev.indexOf(String(active.id));
                const newIdx = prev.indexOf(overId);
                if (oldIdx < 0 || newIdx < 0) {
                    return prev;
                }
                return arrayMove(prev, oldIdx, newIdx);
            });
        },
        [onMoveWidgetToCategory],
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            setActiveId(null);
            const currentDrop = dropCategoryRef.current;
            setDropCategoryId(null);
            // If dropped on a category, move widget there
            if (currentDrop && onMoveWidgetToCategory) {
                onMoveWidgetToCategory(String(event.active.id), currentDrop);
                return;
            }
            const currentOrder = liveOrderRef.current;
            if (currentOrder.some((id, idx) => id !== prevSourceRef.current[idx])) {
                onOrderChange?.(groupId, currentOrder);
            }
        },
        [groupId, onOrderChange, onMoveWidgetToCategory],
    );

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
        setDropCategoryId(null);
        setLiveOrder(sourceIds);
    }, [sourceIds]);

    const itemMap = useMemo(() => {
        const map = new Map<string, OrderedItem>();
        for (const item of items) {
            map.set(item.id, item);
        }
        return map;
    }, [items]);

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

    // Droppable category tiles shown inside this DndContext when drag is active
    const showCatDropTargets = !!activeId && !!onMoveWidgetToCategory && !!categoryItems?.length;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            {/* Show droppable subcategory tiles when dragging */}
            {showCatDropTargets ? (
                <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {categoryItems.map(item => (
                        <DroppableCategoryTile
                            key={`drop-${item.id}`}
                            id={item.id}
                        >
                            {category.renderCategoryTile(item.data as CategoryInfo)}
                        </DroppableCategoryTile>
                    ))}
                </Box>
            ) : null}
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

// --- Grouped content: renders sub-categories + collapsible widget groups ---

function GroupedContent(props: {
    category: Category;
    groups: WidgetGroup[];
    canDrag: boolean;
    categoryId: string;
    onGroupsChange?: (categoryId: string, groups: WidgetGroup[]) => void;
    onMoveWidgetToCategory?: (widgetId: string, targetCategoryId: string) => void;
    widgetSettings: Record<string, WidgetSettings>;
    configMode?: boolean;
}): React.JSX.Element {
    const {
        category,
        groups,
        canDrag,
        categoryId,
        onGroupsChange,
        onMoveWidgetToCategory,
        widgetSettings,
        configMode,
    } = props;
    const allItems = category.getOrderedItems();
    const itemMap = useMemo(() => {
        const map = new Map<string, OrderedItem>();
        for (const item of allItems) {
            map.set(item.id, item);
        }
        return map;
    }, [allItems]);

    // Subcategories always at top, ungrouped
    const categoryItems = allItems.filter(i => i.type === 'category');

    const handleToggleCollapse = (groupId: string): void => {
        if (!onGroupsChange) {
            return;
        }
        const updated = groups.map(g => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g));
        onGroupsChange(categoryId, updated);
    };

    const handleGroupOrderChange = (groupId: string, newOrder: string[]): void => {
        if (!onGroupsChange) {
            return;
        }
        const updated = groups.map(g => (g.id === groupId ? { ...g, widgetIds: newOrder } : g));
        onGroupsChange(categoryId, updated);
    };

    // Collect any widgets not in any group (new widgets added after grouping)
    const groupedIds = new Set(groups.flatMap(g => g.widgetIds));
    const ungrouped = allItems.filter(i => i.type !== 'category' && !groupedIds.has(i.id));

    return (
        <>
            {/* Sub-categories */}
            {categoryItems.length > 0 ? (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                        gap: 1.5,
                        mb: 2,
                    }}
                >
                    {categoryItems.map(item => (
                        <div
                            key={item.id}
                            style={{ gridColumn: '1 / -1' }}
                        >
                            {category.renderCategoryTile(item.data as CategoryInfo)}
                        </div>
                    ))}
                </Box>
            ) : null}

            {/* Groups */}
            {groups.map(group => {
                const groupItems = group.widgetIds.map(id => itemMap.get(id)).filter(Boolean) as OrderedItem[];

                if (groupItems.length === 0) {
                    return null;
                }

                return (
                    <Box
                        key={group.id}
                        sx={{
                            mb: 1.5,
                            // At runtime, hide group when all widgets inside are hidden
                            ...(!configMode && {
                                '&:not(:has([class^="widget-"]))': { display: 'none' },
                            }),
                        }}
                    >
                        <ButtonBase
                            onClick={() => handleToggleCollapse(group.id)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                width: '100%',
                                justifyContent: 'flex-start',
                                py: 0.5,
                                px: 1,
                                borderRadius: 1,
                                mb: group.collapsed ? 0 : 0.5,
                            }}
                        >
                            <ExpandMore
                                sx={{
                                    fontSize: 18,
                                    color: 'text.secondary',
                                    transform: group.collapsed ? 'rotate(-90deg)' : 'rotate(0)',
                                    transition: 'transform 0.2s',
                                }}
                            />
                            {(() => {
                                const icon = getGroupIcon(group.id);
                                return icon
                                    ? React.cloneElement(icon, { sx: { fontSize: 18, color: 'text.secondary' } })
                                    : null;
                            })()}
                            <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 600, color: 'text.secondary' }}
                            >
                                {I18n.t(group.name)}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ ml: 0.5, opacity: 0.5, color: 'text.secondary' }}
                            >
                                ({groupItems.length})
                            </Typography>
                        </ButtonBase>
                        {!group.collapsed ? (
                            <GroupSortableGrid
                                category={category}
                                items={groupItems}
                                canDrag={canDrag}
                                groupId={group.id}
                                onOrderChange={onGroupsChange ? handleGroupOrderChange : undefined}
                                onMoveWidgetToCategory={onMoveWidgetToCategory}
                                categoryItems={categoryItems}
                                widgetSettings={widgetSettings}
                            />
                        ) : null}
                    </Box>
                );
            })}

            {/* Ungrouped widgets (added after grouping was enabled) */}
            {ungrouped.length > 0 ? (
                <Box sx={{ mb: 1.5 }}>
                    <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, color: 'text.secondary', px: 1, py: 0.5 }}
                    >
                        {I18n.t('wm_group_Other')}
                    </Typography>
                    <GroupSortableGrid
                        category={category}
                        items={ungrouped}
                        canDrag={canDrag}
                        groupId="__ungrouped__"
                        onMoveWidgetToCategory={onMoveWidgetToCategory}
                        categoryItems={categoryItems}
                        widgetSettings={widgetSettings}
                    />
                </Box>
            ) : null}
        </>
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
            subCategoryStatuses: {},
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

    private subscribeWidgetsForStatus(widgets: WidgetInfo[], categoryId?: string): void {
        for (const w of widgets) {
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
            if (role) {
                const actual = w.control.states.find(s => s.name === 'ACTUAL');
                if (actual?.id) {
                    // Avoid duplicate subscriptions for the same state
                    if (!this.statusSubs.some(s => s.stateId === actual.id && s.categoryId === categoryId)) {
                        const isOpening = role === 'window' || role === 'door';
                        this.statusSubs.push({
                            stateId: actual.id,
                            role,
                            widgetName: isOpening ? this.getWidgetName(w) : undefined,
                            widgetIcon: isOpening ? (typeof w.icon === 'string' ? w.icon : undefined) : undefined,
                            widgetId: isOpening ? String(w.id) : undefined,
                            categoryId,
                        });
                        this.props.stateContext.getState(actual.id, this.onStatusChange);
                    }
                }

                // Temperature sensor may have a SECOND state with humidity
                if (type === Types.temperature) {
                    const second = w.control.states.find(s => s.name === 'SECOND');
                    if (
                        second?.id &&
                        !this.statusSubs.some(s => s.stateId === second.id && s.categoryId === categoryId)
                    ) {
                        this.statusSubs.push({ stateId: second.id, role: 'humidity', categoryId });
                        this.props.stateContext.getState(second.id, this.onStatusChange);
                    }
                }
            }

            // Subscribe to battery indicators for ALL widget types
            const wName = this.getWidgetName(w);
            const lowbatState = w.control.states.find(s => s.name === 'LOWBAT');
            if (
                lowbatState?.id &&
                !this.statusSubs.some(s => s.stateId === lowbatState.id && s.categoryId === categoryId)
            ) {
                this.statusSubs.push({ stateId: lowbatState.id, role: 'lowbat', widgetName: wName, categoryId });
                this.props.stateContext.getState(lowbatState.id, this.onStatusChange);
            }
            const batteryState = w.control.states.find(s => s.name === 'BATTERY');
            if (
                batteryState?.id &&
                !this.statusSubs.some(s => s.stateId === batteryState.id && s.categoryId === categoryId)
            ) {
                this.statusSubs.push({ stateId: batteryState.id, role: 'battery', widgetName: wName, categoryId });
                this.props.stateContext.getState(batteryState.id, this.onStatusChange);
            }
        }
    }

    private subscribeCategoryStatus(): void {
        this.statusSubs = [];
        this.statusValues = {};

        // Subscribe for current category's own widgets (no categoryId tag)
        const currentWidgets = this.props.widgets.filter(w => w.parent === this.props.category.id);
        this.subscribeWidgetsForStatus(currentWidgets);

        // Subscribe for each sub-category's widgets (tagged with sub-category ID)
        for (const subCat of this.subCategories) {
            const subWidgets = this.props.widgets.filter(w => w.parent === subCat.id);
            this.subscribeWidgetsForStatus(subWidgets, String(subCat.id));
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

    private static computeStatus(
        subs: StatusSubscription[],
        values: Record<string, ioBroker.StateValue>,
    ): CategoryStatus {
        let temperature: number | null = null;
        let humidity: number | null = null;
        let motionActive = false;
        const openings: OpeningSensor[] = [];
        const lowBatteryDevices: LowBatteryDevice[] = [];
        // Track which device names already flagged as low battery (avoid duplicates from LOWBAT + BATTERY)
        const lowBatNames = new Set<string>();

        for (const sub of subs) {
            const val = values[sub.stateId];
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
                        icon: sub.widgetIcon,
                        widgetId: sub.widgetId,
                    });
                    break;
                case 'lowbat':
                    if (val && sub.widgetName && !lowBatNames.has(sub.widgetName)) {
                        lowBatNames.add(sub.widgetName);
                        lowBatteryDevices.push({ name: sub.widgetName, level: null });
                    }
                    break;
                case 'battery': {
                    const level = val != null ? Number(val) : null;
                    if (
                        level != null &&
                        !isNaN(level) &&
                        level < 30 &&
                        sub.widgetName &&
                        !lowBatNames.has(sub.widgetName)
                    ) {
                        lowBatNames.add(sub.widgetName);
                        lowBatteryDevices.push({ name: sub.widgetName, level: Math.round(level) });
                    }
                    break;
                }
            }
        }

        return { temperature, humidity, motionActive, openings, lowBatteryDevices };
    }

    private recalcCategoryStatus(): void {
        // Compute status for current category (subs without categoryId)
        const currentSubs = this.statusSubs.filter(s => !s.categoryId);
        const categoryStatus = Category.computeStatus(currentSubs, this.statusValues);

        // Compute status for each sub-category
        const subCategoryStatuses: Record<string, CategoryStatus> = {};
        const catIds = new Set(this.statusSubs.map(s => s.categoryId).filter(Boolean) as string[]);
        for (const catId of catIds) {
            const catSubs = this.statusSubs.filter(s => s.categoryId === catId);
            subCategoryStatuses[catId] = Category.computeStatus(catSubs, this.statusValues);
        }

        this.setState({ categoryStatus, subCategoryStatuses });
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
        } else if (widget.control && widget.control.type === Types.weatherCurrent) {
            Widget = WidgetWeatherCurrent;
        } else if (widget.control && widget.control.type === Types.weatherForecast) {
            Widget = WidgetWeatherForecast;
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
                defaultHistory={this.props.defaultHistory}
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
            case 'weather':
                return (
                    <WidgetWeather
                        key={def.id}
                        id={def.id}
                        weatherSource={def.weatherSource}
                        adapterInstance={def.adapterInstance}
                        latitude={def.latitude}
                        longitude={def.longitude}
                        cityName={def.cityName}
                        language={this.props.language}
                        size={def.size}
                        color={def.color}
                        stateContext={this.props.stateContext}
                        onOpenSettings={settingsCb}
                        onRemove={removeCb}
                    />
                );
            case 'iframe':
                return (
                    <WidgetIframe
                        key={def.id}
                        id={def.id}
                        url={def.url}
                        refreshInterval={def.refreshInterval}
                        appendTimestamp={def.appendTimestamp}
                        clickAction={def.clickAction}
                        size={def.size}
                        color={def.color}
                        onOpenSettings={settingsCb}
                        onRemove={removeCb}
                    />
                );
            case 'wind':
                return (
                    <WidgetWind
                        key={def.id}
                        id={def.id}
                        language={this.props.language}
                        directionStateId={def.directionStateId}
                        speedStateId={def.speedStateId}
                        gustsStateId={def.gustsStateId}
                        size={def.size}
                        color={def.color}
                        stateContext={this.props.stateContext}
                        onOpenSettings={settingsCb}
                        onRemove={removeCb}
                    />
                );
            default:
                return null;
        }
    }

    /** Render small alarm/sensor widget icon previews for a sub-category tile */
    private renderWidgetIconPreviews(category: CategoryInfo): React.JSX.Element | null {
        // Only show alarm/sensor type widgets: window, door, fire, flood, warning, motion
        const ALARM_TYPES = new Set([
            Types.floodAlarm,
            Types.fireAlarm,
            Types.motion,
            Types.window,
            Types.door,
            Types.warning,
        ]);
        const catWidgets = this.props.widgets.filter(
            w => w.parent === category.id && w.control?.type && ALARM_TYPES.has(w.control.type),
        );
        if (!catWidgets.length) {
            return null;
        }

        // Collect icons (max 8) — use custom icon or fall back to default type icon
        const icons: { id: string | number; src?: string; name: string; type: Types }[] = [];
        for (const w of catWidgets) {
            if (icons.length >= 8) {
                break;
            }
            const wName =
                typeof w.name === 'object'
                    ? (w.name as ioBroker.Translated)[I18n.getLanguage()] || (w.name as ioBroker.Translated).en || ''
                    : String(w.name || '');
            const iconSrc = typeof w.icon === 'string' ? w.icon : undefined;
            icons.push({ id: w.id, src: iconSrc, name: wName, type: w.control.type });
        }

        if (!icons.length) {
            return null;
        }

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                {icons.map(ic => (
                    <Tooltip
                        key={ic.id}
                        title={ic.name}
                    >
                        <Box sx={{ display: 'flex' }}>
                            {ic.src ? (
                                <Icon
                                    src={ic.src}
                                    style={{ width: 16, height: 16, color: 'grey' }}
                                />
                            ) : (
                                Category.renderDefaultTypeIcon(ic.type, 16)
                            )}
                        </Box>
                    </Tooltip>
                ))}
            </Box>
        );
    }

    /** Render status summary for a sub-category tile (temperature, humidity, openings, motion) */
    private renderSubCategoryStatus(category: CategoryInfo, deviceCount: number): React.JSX.Element {
        const status = this.state.subCategoryStatuses[String(category.id)];
        const hasStatus =
            status &&
            (status.temperature !== null ||
                status.humidity !== null ||
                status.motionActive ||
                status.openings.some(o => o.state !== 0) ||
                status.lowBatteryDevices.length > 0);

        const widgetIcons = this.renderWidgetIconPreviews(category);

        if (!hasStatus) {
            // Show widget icon previews instead of plain device count
            return (
                widgetIcons ||
                (deviceCount > 0 ? (
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary' }}
                    >
                        {deviceCount === 1 ? I18n.t('wm_one_device') : I18n.t('wm_n_devices', deviceCount.toString())}
                    </Typography>
                ) : (
                    <></>
                ))
            );
        }

        const openWindows = status.openings.filter(o => o.kind === 'window' && o.state !== 0);
        const openDoors = status.openings.filter(o => o.kind === 'door' && o.state !== 0);

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
                {status.temperature !== null ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Thermostat sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', fontWeight: 500 }}
                        >
                            {status.temperature.toFixed(1)}°
                        </Typography>
                    </Box>
                ) : null}
                {status.humidity !== null ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <WaterDrop sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', fontWeight: 500 }}
                        >
                            {Math.round(status.humidity)}%
                        </Typography>
                    </Box>
                ) : null}
                {status.motionActive ? (
                    <Tooltip title={I18n.t('wm_Motion')}>
                        <DirectionsRun sx={{ fontSize: 16, color: 'warning.main' }} />
                    </Tooltip>
                ) : null}
                {openWindows.length > 0 ? (
                    <Tooltip title={openWindows.map(o => Category.getOpeningTooltip(o)).join(', ')}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <SensorWindow sx={{ fontSize: 16, color: 'warning.main' }} />
                            {openWindows.length > 1 ? (
                                <Typography
                                    variant="caption"
                                    sx={{ color: 'warning.main', fontWeight: 600 }}
                                >
                                    {openWindows.length}
                                </Typography>
                            ) : null}
                        </Box>
                    </Tooltip>
                ) : null}
                {openDoors.length > 0 ? (
                    <Tooltip title={openDoors.map(o => Category.getOpeningTooltip(o)).join(', ')}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <SensorDoor sx={{ fontSize: 16, color: 'warning.main' }} />
                            {openDoors.length > 1 ? (
                                <Typography
                                    variant="caption"
                                    sx={{ color: 'warning.main', fontWeight: 600 }}
                                >
                                    {openDoors.length}
                                </Typography>
                            ) : null}
                        </Box>
                    </Tooltip>
                ) : null}
                {status.lowBatteryDevices.length > 0 ? (
                    <Tooltip
                        title={status.lowBatteryDevices
                            .map(d => `${d.name}${d.level != null ? `: ${d.level}%` : ''}`)
                            .join(', ')}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <BatteryAlert sx={{ fontSize: 16, color: 'error.main' }} />
                            {status.lowBatteryDevices.length > 1 ? (
                                <Typography
                                    variant="caption"
                                    sx={{ color: 'error.main', fontWeight: 600 }}
                                >
                                    {status.lowBatteryDevices.length}
                                </Typography>
                            ) : null}
                        </Box>
                    </Tooltip>
                ) : null}
                {widgetIcons}
            </Box>
        );
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
                    {this.renderSubCategoryStatus(category, deviceCount)}
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

    /** Render a default MUI icon for a widget type (used when no custom icon is set) */
    private static renderDefaultTypeIcon(type: Types, size: number): React.JSX.Element {
        const sx = { fontSize: size, color: 'grey' };
        switch (type) {
            case Types.window:
                return <SensorWindow sx={sx} />;
            case Types.door:
                return <SensorDoor sx={sx} />;
            case Types.fireAlarm:
                return <LocalFireDepartment sx={sx} />;
            case Types.floodAlarm:
                return <WaterDamage sx={sx} />;
            case Types.motion:
                return <DirectionsRun sx={sx} />;
            case Types.warning:
                return <Warning sx={sx} />;
            default:
                return <Build sx={sx} />;
        }
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
        const { temperature, humidity, motionActive, openings, lowBatteryDevices } = this.state.categoryStatus;
        const hasAny =
            temperature !== null ||
            humidity !== null ||
            motionActive ||
            openings.length > 0 ||
            lowBatteryDevices.length > 0;
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
                        {openings.map(sensor => {
                            const ws = sensor.widgetId ? this.props.widgetSettings[sensor.widgetId] : undefined;
                            const isActive = sensor.state !== 0;
                            const customIcon = ws
                                ? isActive
                                    ? ws.iconActive || ws.icon
                                    : ws.iconInactive || ws.icon
                                : undefined;
                            const iconSrc = customIcon || sensor.icon;
                            const customColor = ws ? (isActive ? ws.color : ws.colorInactive) : undefined;
                            const fallbackColor = Category.getOpeningColor(sensor);
                            const color = customColor || fallbackColor;
                            const customText = ws ? (isActive ? ws.textActive : ws.textInactive) : undefined;
                            const tooltip = customText
                                ? `${sensor.name}: ${customText}`
                                : Category.getOpeningTooltip(sensor);

                            return (
                                <Tooltip
                                    key={sensor.stateId}
                                    title={tooltip}
                                >
                                    {iconSrc ? (
                                        <Box sx={{ display: 'flex' }}>
                                            <Icon
                                                src={iconSrc}
                                                style={{ width: 20, height: 20, color }}
                                            />
                                        </Box>
                                    ) : sensor.kind === 'door' ? (
                                        <SensorDoor
                                            sx={{
                                                fontSize: 20,
                                                color,
                                                transition: 'color 0.25s ease',
                                            }}
                                        />
                                    ) : (
                                        <SensorWindow
                                            sx={{
                                                fontSize: 20,
                                                color,
                                                transform: sensor.state === 2 ? 'rotate(15deg)' : undefined,
                                                transition: 'color 0.25s ease, transform 0.25s ease',
                                            }}
                                        />
                                    )}
                                </Tooltip>
                            );
                        })}
                    </Box>
                ) : null}
                {lowBatteryDevices.length > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {lowBatteryDevices.map(dev => (
                            <Tooltip
                                key={dev.name}
                                title={`${dev.name}${dev.level != null ? `: ${dev.level}%` : ''}`}
                            >
                                <BatteryAlert sx={{ fontSize: 20, color: 'error.main' }} />
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
        const widgetGroups = categorySettings?.widgetGroups;
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
                {/* Floating config toggle — only when no header is shown */}
                {!hasHeader && this.props.onToggleConfigMode ? (
                    <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, display: 'flex', gap: 0.5 }}>
                        {this.props.configMode && this.props.onInstallSidePanel ? (
                            <Tooltip title={I18n.t('wm_Install as Side Panel')}>
                                <IconButton
                                    size="small"
                                    onClick={this.props.onInstallSidePanel}
                                    sx={{ opacity: 0.35, '&:hover': { opacity: 1 } }}
                                >
                                    <SplitscreenOutlined
                                        fontSize="small"
                                        sx={{ fontSize: 18 }}
                                    />
                                </IconButton>
                            </Tooltip>
                        ) : null}
                        <Tooltip title={I18n.t(this.props.configMode ? 'wm_Play mode' : 'wm_Config mode')}>
                            <IconButton
                                size="small"
                                onClick={this.props.onToggleConfigMode}
                                sx={{
                                    opacity: this.props.configMode ? 0.5 : 0.35,
                                    '&:hover': { opacity: 1 },
                                }}
                            >
                                {this.props.configMode ? (
                                    <PlayArrow fontSize="small" />
                                ) : (
                                    <Build
                                        fontSize="small"
                                        sx={{ fontSize: 18 }}
                                    />
                                )}
                            </IconButton>
                        </Tooltip>
                    </Box>
                ) : null}
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
                            {this.props.onToggleGrouping ? (
                                <Tooltip
                                    title={I18n.t(widgetGroups?.length ? 'wm_Ungroup widgets' : 'wm_Group by type')}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={() => this.props.onToggleGrouping!(categoryId, this.getOrderedItems())}
                                        sx={{ opacity: widgetGroups?.length ? 0.7 : 0.5, '&:hover': { opacity: 1 } }}
                                    >
                                        {widgetGroups?.length ? (
                                            <ViewModule fontSize="small" />
                                        ) : (
                                            <Workspaces sx={{ fontSize: 18 }} />
                                        )}
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
                            {this.props.configMode && this.props.onInstallSidePanel ? (
                                <Tooltip title={I18n.t('wm_Install as Side Panel')}>
                                    <IconButton
                                        size="small"
                                        onClick={this.props.onInstallSidePanel}
                                        sx={{ opacity: 0.35, '&:hover': { opacity: 1 } }}
                                    >
                                        <SplitscreenOutlined
                                            fontSize="small"
                                            sx={{ fontSize: 18 }}
                                        />
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                            {this.props.onToggleConfigMode ? (
                                <Tooltip title={I18n.t(this.props.configMode ? 'wm_Play mode' : 'wm_Config mode')}>
                                    <IconButton
                                        size="small"
                                        onClick={this.props.onToggleConfigMode}
                                        sx={{
                                            opacity: this.props.configMode ? 0.5 : 0.35,
                                            '&:hover': { opacity: 1 },
                                        }}
                                    >
                                        {this.props.configMode ? (
                                            <PlayArrow fontSize="small" />
                                        ) : (
                                            <Build
                                                fontSize="small"
                                                sx={{ fontSize: 18 }}
                                            />
                                        )}
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                        </Box>

                        {/* Room status summary */}
                        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ flex: 1 }}>{this.renderCategoryStatus()}</Box>
                            {widgetGroups?.length && this.props.onWidgetGroupsChange ? (
                                <Box sx={{ display: 'flex', ml: 'auto' }}>
                                    <Tooltip title={I18n.t('wm_Expand all')}>
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                const expanded = widgetGroups.map(g => ({ ...g, collapsed: false }));
                                                this.props.onWidgetGroupsChange!(categoryId, expanded);
                                            }}
                                            sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                        >
                                            <UnfoldMore sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={I18n.t('wm_Collapse all')}>
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                const collapsed = widgetGroups.map(g => ({ ...g, collapsed: true }));
                                                this.props.onWidgetGroupsChange!(categoryId, collapsed);
                                            }}
                                            sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                        >
                                            <UnfoldLess sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            ) : null}
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
                        {widgetGroups?.length ? (
                            <GroupedContent
                                category={this}
                                groups={widgetGroups}
                                canDrag={!!this.props.onWidgetOrderChange}
                                categoryId={String(this.props.category.id)}
                                onGroupsChange={this.props.onWidgetGroupsChange}
                                onMoveWidgetToCategory={this.props.onMoveWidgetToCategory}
                                widgetSettings={this.props.widgetSettings}
                                configMode={this.props.configMode}
                            />
                        ) : (
                            <SortableGrid
                                category={this}
                                canDrag={!!this.props.onWidgetOrderChange}
                                categoryId={String(this.props.category.id)}
                                onOrderChange={this.props.onWidgetOrderChange}
                                onMoveWidgetToCategory={this.props.onMoveWidgetToCategory}
                                widgetSettings={this.props.widgetSettings}
                            />
                        )}
                    </Box>
                ) : null}
            </Box>
        );
    }
}
