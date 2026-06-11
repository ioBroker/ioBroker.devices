import React, { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Box, ButtonBase, IconButton, Tooltip, Typography } from '@mui/material';
import {
    Add,
    ArrowBack,
    BatteryAlert,
    Build,
    ChevronRight,
    Close,
    Delete,
    DirectionsRun,
    ElectricBolt,
    DragIndicator,
    ErrorOutline,
    ExpandMore,
    Lightbulb,
    LightbulbOutlined,
    LocalFireDepartment,
    MeetingRoom,
    PlayArrow,
    SensorDoor,
    SensorWindow,
    Settings,
    SplitscreenOutlined,
    Star,
    StarBorder,
    Thermostat,
    UnfoldLess,
    UnfoldMore,
    ViewModule,
    Warning,
    WaterDamage,
    WaterDrop,
    Workspaces,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
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

import { Types } from '@iobroker/type-detector';
import { I18n, Icon } from '@iobroker/adapter-react-v5';

import { detectBrowser } from './SidePanelInstallDialog';
import {
    formatFloat,
    resolveTranslated,
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
    WidgetMediaPlayer,
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
    WidgetGauge,
    WidgetUniversal,
    type WidgetUniversalSettings,
    WidgetPresence,
    type WidgetPresenceSettings,
    WidgetEnergyFlow,
    type WidgetEnergyFlowSettings,
    WidgetGate,
    WidgetPlugin,
    type WidgetWeatherSettings,
    type WidgetIframeSettings,
    type WidgetWindSettings,
    type WidgetGaugeSettings,
    type WidgetClockSettings,
} from './Widgets';

import type StateContext from './StateContext';
import type { CategorySettings } from './CategorySettingsDialog';
import { normalizeColor } from './Utils';
import { CUSTOM_WIDGET_CONFIGS, getConfigDefault } from './CustomWidgetConfigs';
import {
    moveWidgetToGroup,
    findWidgetGroup,
    setGroupCollapsed,
    setAllGroupsCollapsed,
    applyCollapsedFromStorage,
    type WidgetGroup,
} from './groupUtils';
import { getGroupIcon } from './groupIcons';
import type {
    WidgetSettingsBase,
    CustomWidgetBase,
    CategoryInfo,
    WidgetInfo,
    DevicesDetectorState,
    CustomWidgetPlugin,
} from '../../../packages/dm-widgets/src/index';
import { WidgetGeneric } from './Widgets/Generic';

interface CategoryProps {
    category: CategoryInfo;
    categories: CategoryInfo[];
    widgets: WidgetInfo[];
    stateContext: StateContext;
    onNavigate: (category: CategoryInfo) => void;
    widgetSettings: Record<string, WidgetSettingsBase>;
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
    /** Whether config/editing mode is active */
    configMode?: boolean;
    /** Toggle between config and play mode. If undefined, no toggle button is shown. */
    onToggleConfigMode?: () => void;
    /** Open the "Install as Side Panel" dialog */
    onInstallSidePanel?: () => void;
    /** Move a widget to a different category (drag & drop between groups) */
    onMoveWidgetToCategory?: (widgetId: string, targetCategoryId: string) => void;
    /** Delete a widget by ID (for unsupported widget types) */
    onDeleteWidgetById?: (widgetId: string | number) => void;
    /** Toggle favorite star on a widget */
    onToggleFavorite?: (widgetId: string) => void;
    /** Toggle favorite on a custom widget */
    onToggleCustomWidgetFavorite?: (widgetId: string) => void;
    /** Callback to go back to the device list (admin split-screen narrow mode) */
    onBackToDevices?: () => void;
    /** Widget dialog ID to auto-open (from hash) */
    openDialogId?: string | null;
    /** Callback to persist an opened widget dialog in the hash */
    onOpenWidgetDialog?: (dialogId: string) => void;
    /** Callback to clear the widget dialog from the hash */
    onCloseWidgetDialog?: () => void;
}

/** 0 = closed, 1 = open, 2 = tilted */
type OpeningState = 0 | 1 | 2;

interface OpeningSensor {
    stateId: string;
    kind: 'window' | 'door';
    name: string;
    state: OpeningState;
    /** Custom widget icon (from `common.icon`) */
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
    power: number | null;
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
    /** Status summaries for each subcategory (keyed by category ID) */
    subCategoryStatuses: Record<string, CategoryStatus>;
    /** Widget grid min-size scale (percent, from localStorage) */
    widgetScale: number;
    /** IDs of widgets that are currently marked as hidden */
    hidden: { [id: string]: boolean };
    /**
     * Bumped when expand-all / collapse-all is clicked to signal GroupedContent to re-read
     *  collapsed state from localStorage.
     */
    collapseVersion: number;
}

const DEFAULT_CATEGORY_STATUS: CategoryStatus = {
    temperature: null,
    power: null,
    humidity: null,
    motionActive: false,
    openings: [],
    lowBatteryDevices: [],
};

// Match common power-related detector roles (e.g. value.power, level.power, *.power.*).
const POWER_ROLE_PATTERN = /(?:^|\.)(?:value|level)\.power(?:\.|$)|(?:^|\.)power(?:\.|$)|watt|consumption/i;

type StatusRole = 'temperature' | 'power' | 'humidity' | 'motion' | 'window' | 'door' | 'lowbat' | 'battery' | 'sensor';

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
    data: CategoryInfo | WidgetInfo | CustomWidgetBase;
};

interface GridSpan {
    gridColumn?: string;
    gridRow?: string;
}

function getGridColumn(
    item: OrderedItem,
    widgetSettings: Record<string, WidgetSettingsBase>,
    editing?: boolean,
): GridSpan | undefined {
    if (item.type === 'category') {
        return { gridColumn: '1 / -1' };
    }
    if (item.type === 'custom' && (item.data as CustomWidgetBase).type === 'newline') {
        // In edit mode: normal 1x1 grid item (draggable); play mode: full-row span for line break
        return editing ? undefined : { gridColumn: '1 / -1' };
    }
    let size: '1x1' | '2x0.5' | '2x1' | '2x2';
    if (item.type === 'widget') {
        size = widgetSettings[item.id]?.size || '1x1';
    } else {
        const def = item.data as CustomWidgetBase;
        // Fall back to the config default when size wasn't persisted (older widgets)
        const configDefault = CUSTOM_WIDGET_CONFIGS[def.type]?.items.size;
        size =
            def.size ||
            (configDefault ? (String(getConfigDefault(configDefault)) as '1x1' | '2x0.5' | '2x1' | '2x2') : '1x1');
    }
    if ((size as string) === '2x2') {
        return { gridColumn: 'span 2', gridRow: 'span 2' };
    }
    if (size === '2x0.5' || size === '2x1') {
        return { gridColumn: 'span 2' };
    }
    return undefined;
}

/** Thin wrapper so each grid cell is a valid droppable/draggable for dnd-kit */
function SortableItem(props: {
    id: string;
    gridSpan?: GridSpan;
    isDragging: boolean;
    /**
     * True when the user is dragging this item AND hovering a "move-into" target. The
     *  ghost should be hidden because the item is about to leave its current position.
     */
    movingIntoTarget?: boolean;
    /**
     * True when THIS item is the current "move-into" drop target (a category being hovered).
     *  dnd-kit would otherwise translate it as if a sortable swap is about to happen — but
     *  for move-into we want the target to stay put so the user sees a stable drop zone.
     */
    isDropTarget?: boolean;
    favorite?: boolean;
    onToggleFavorite?: (widgetId: string) => void;
    children: React.ReactNode;
}): React.JSX.Element {
    const { id, gridSpan, isDragging, movingIntoTarget, isDropTarget, favorite, onToggleFavorite, children } = props;
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id });

    // `rectSortingStrategy` from dnd-kit computes scaleX/scaleY for displaced items based
    // on the swap partner's rect. With non-uniform tile sizes (categories vs 1x1 widgets,
    // 2x1 widgets, 2x2 widgets) that visibly squashes/stretches items during drag — the
    // user explicitly wants every tile to keep its real size. Strip scale on ALL items
    // (keep translate) so the layout reflows by movement only. Also kill the translate
    // entirely on the move-into target: it should stay anchored as a stable drop zone.
    const adjustedTransform = isDropTarget ? null : transform ? { ...transform, scaleX: 1, scaleY: 1 } : transform;

    const style: React.CSSProperties = {
        position: 'relative',
        gridColumn: gridSpan?.gridColumn || undefined,
        gridRow: gridSpan?.gridRow || undefined,
        // Hide the source ghost completely when about to be re-parented into a category —
        // the widget will disappear from this slot once the drop happens, so the 25 %
        // ghost is misleading. Plain reorder keeps the regular 25 % ghost for feedback.
        opacity: isDragging ? (movingIntoTarget ? 0 : 0.25) : 1,
        transform: CSS.Transform.toString(adjustedTransform),
        // Also kill the transition on the move-into target so it doesn't animate from a
        // stale transform position.
        transition: isDropTarget ? undefined : transition || undefined,
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
                    top: 2,
                    left: 2,
                    p: '4px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    zIndex: 3,
                    touchAction: 'none',
                    color: theme.palette.text.secondary,
                    opacity: 0.5,
                    transition: 'opacity 0.2s, background-color 0.2s',
                    '&:hover': {
                        opacity: 1,
                        backgroundColor: theme.palette.action.hover,
                    },
                })}
            >
                <DragIndicator sx={{ fontSize: 20 }} />
            </Box>
            {onToggleFavorite ? (
                <Box
                    component="span"
                    role="button"
                    tabIndex={0}
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onToggleFavorite(id);
                    }}
                    onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            onToggleFavorite(id);
                        }
                    }}
                    sx={theme => ({
                        position: 'absolute',
                        top: 2,
                        left: 28,
                        p: '4px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 3,
                        color: favorite ? '#ffc107' : theme.palette.text.secondary,
                        opacity: favorite ? 0.9 : 0.4,
                        transition: 'opacity 0.2s, color 0.2s',
                        '&:hover': {
                            opacity: 1,
                        },
                    })}
                >
                    {favorite ? <Star sx={{ fontSize: 16 }} /> : <StarBorder sx={{ fontSize: 16 }} />}
                </Box>
            ) : null}
            {children}
        </div>
    );
}

/**
 * Full-row drop slot that wraps the widgets currently between two categories (or at the
 * very top / bottom). Always rendered so its children stay visible; only the frame styling
 * appears while a drag is active and gets stronger on hover. The inner grid uses the same
 * `gridTemplateColumns` as the outer container so child widgets keep their normal sizes.
 */
function DroppableSlot(props: {
    id: string;
    isDragActive: boolean;
    isEmpty: boolean;
    gridColumns: string;
    children?: React.ReactNode;
}): React.JSX.Element {
    const { id, isDragActive, isEmpty, gridColumns, children } = props;
    const { setNodeRef, isOver } = useDroppable({ id });
    const showFrame = isDragActive;
    return (
        <Box
            ref={setNodeRef}
            sx={{
                gridColumn: '1 / -1',
                display: 'grid',
                gridTemplateColumns: gridColumns,
                gap: 1.5,
                padding: showFrame ? 1 : 0,
                borderRadius: 2,
                minHeight: showFrame ? (isEmpty ? 56 : 'auto') : 0,
                border: showFrame
                    ? `${isOver ? 2 : 1}px dashed ${isOver ? '#4dabf5' : 'rgba(77, 171, 245, 0.35)'}`
                    : 'none',
                backgroundColor: showFrame
                    ? isOver
                        ? 'rgba(77, 171, 245, 0.15)'
                        : 'rgba(77, 171, 245, 0.04)'
                    : 'transparent',
                transition: 'background-color 0.12s ease, border-color 0.12s ease, padding 0.12s ease',
                boxSizing: 'border-box',
            }}
        >
            {children}
        </Box>
    );
}

/** Wrapper that makes a subcategory tile act as a drop target during widget drag */
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
    widgetSettings: Record<string, WidgetSettingsBase>;
    onToggleFavorite?: (widgetId: string) => void;
}): React.JSX.Element {
    const { category, canDrag, categoryId, onOrderChange, onMoveWidgetToCategory, widgetSettings, onToggleFavorite } =
        props;
    const sourceItems = category.getOrderedItems();
    const sourceIds = useMemo(() => sourceItems.map(i => i.id), [sourceItems]);

    // Local order kept in sync with props but updated live during drag
    const [liveOrder, setLiveOrder] = useState<string[]>(sourceIds);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Ref to always access the latest liveOrder inside callbacks (avoids stale closures)
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
    // Category over which a drop is *forbidden* (currently only the virtual Favorites tile).
    // We still track it during drag to show a red outline + hide the ghost, but it must NOT
    // trigger any state change on drop.
    const [forbiddenDropId, setForbiddenDropId] = useState<string | null>(null);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(String(event.active.id));
        setDropCategoryId(null);
        setForbiddenDropId(null);
    }, []);

    // Reorder live during drag so the grid reflows naturally
    const handleDragOver = useCallback(
        (event: DragOverEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) {
                setForbiddenDropId(null);
                return;
            }
            const overId = String(over.id);
            const activeEl = itemMap.get(String(active.id));
            const overEl = itemMap.get(overId);

            // Forbidden target — Favorites: signal red outline + hide ghost, but never persist.
            const overIsFavorites = overId === '__favorites__' || overId === 'drop-cat:__favorites__';
            if (overIsFavorites && activeEl && activeEl.type !== 'category') {
                setDropCategoryId(null);
                setForbiddenDropId('__favorites__');
                return;
            }
            setForbiddenDropId(null);

            // Explicit slot drop target (full-row droppables rendered AT category boundaries
            // and at the very top / bottom while a drag is active). They unambiguously mean
            // "reorder to this position" — the category tile itself remains "move INTO".
            if (overId.startsWith('slot:')) {
                const slotK = Number(overId.slice('slot:'.length));
                setDropCategoryId(null);
                setLiveOrder(prev => {
                    const oldIdx = prev.indexOf(String(active.id));
                    if (oldIdx < 0 || !Number.isFinite(slotK)) {
                        return prev;
                    }
                    // slot:K means "insert before item at index K". When the active was to the
                    // left of K, removing it shifts indices left by one, so the effective
                    // target is K-1. Clamp to a valid arrayMove index.
                    const targetIdx = Math.max(0, Math.min(prev.length - 1, slotK - (oldIdx < slotK ? 1 : 0)));
                    return arrayMove(prev, oldIdx, targetIdx);
                });
                return;
            }

            // Widget/custom dragged over a subcategory tile = move target (not reorder).
            // Skip the virtual Favorites tile — it has no real backend object, so setting a
            // widget's parent to `__favorites__` makes the widget vanish (no category to
            // render it under). Favorites entry is toggled via the star icon, not drag.
            if (
                activeEl &&
                activeEl.type !== 'category' &&
                overEl?.type === 'category' &&
                overId !== '__favorites__' &&
                onMoveWidgetToCategory
            ) {
                console.log(`Drop ${active.id} to category ${over.id}`);
                setDropCategoryId(overId);
                return;
            }

            // Check if hovering over a separate droppable category tile (used in grouped mode)
            if (
                overId.startsWith('drop-cat:') &&
                activeEl &&
                activeEl.type !== 'category' &&
                overId !== 'drop-cat:__favorites__' &&
                onMoveWidgetToCategory
            ) {
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
            setForbiddenDropId(null);
            // If dropped on a category, move the widget there
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
        setForbiddenDropId(null);
        setLiveOrder(sourceIds);
    }, [sourceIds]);

    const orderedItems = liveOrder.map(id => itemMap.get(id)).filter(Boolean) as OrderedItem[];
    const activeItem = activeId ? itemMap.get(activeId) : null;
    const draggingNewline = activeItem?.type === 'custom' && (activeItem.data as CustomWidgetBase).type === 'newline';
    const draggingCategory = activeItem?.type === 'category';
    // CSS Grid `dense` would let later items backfill empty cells before a newline, breaking
    // the line-break semantics. Fall back to default `row` flow whenever a newline is present.
    const hasNewline = orderedItems.some(i => i.type === 'custom' && (i.data as CustomWidgetBase).type === 'newline');
    const autoFlow = hasNewline ? 'row' : 'dense';

    const renderContent = (item: OrderedItem, isDropTarget?: boolean, isForbidden?: boolean): React.ReactNode => {
        if (item.type === 'category') {
            return category.renderCategoryTile(item.data as CategoryInfo, isDropTarget, isForbidden);
        }
        if (item.type === 'widget') {
            return category.renderWidget(item.data as WidgetInfo);
        }
        return category.renderCustomWidget(item.data as CustomWidgetBase);
    };

    if (!canDrag) {
        return (
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: category.gridColumns,
                    gridAutoFlow: autoFlow,
                    gap: 1.5,
                }}
            >
                {orderedItems.map(item => {
                    const gridSpan = getGridColumn(item, widgetSettings);
                    return gridSpan ? (
                        <div
                            key={item.id}
                            style={{ gridColumn: gridSpan.gridColumn, gridRow: gridSpan.gridRow }}
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

    // The virtual Favorites category has no real parent to move widgets to — exposing the
    // "Move to parent" drop target there hijacks every in-favourites drag (closestCenter often
    // picks it over individual widgets) and ends up changing the widget's real parent to root.
    const isFavoritesView = categoryId === '__favorites__';
    const parentCatId =
        !isFavoritesView && category.props.category.parent ? String(category.props.category.parent) : null;
    const showParentDrop = !!activeId && !draggingNewline && !!onMoveWidgetToCategory && !!parentCatId;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            {/* Parent category drop target */}
            {showParentDrop ? (
                <Box sx={{ mb: 1 }}>
                    <DroppableCategoryTile id={parentCatId}>
                        <Box
                            sx={theme => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                p: 1.5,
                                borderRadius: '16px',
                                backgroundColor:
                                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                borderLeft: `3px solid ${theme.palette.info.main}`,
                            })}
                        >
                            <ArrowBack sx={{ fontSize: 20, color: 'info.main' }} />
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, color: 'info.main' }}
                            >
                                {I18n.t('wm_Move to parent')}
                            </Typography>
                        </Box>
                    </DroppableCategoryTile>
                </Box>
            ) : null}
            <SortableContext
                items={liveOrder}
                strategy={rectSortingStrategy}
            >
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: category.gridColumns,
                        gridAutoFlow: autoFlow,
                        gap: 1.5,
                    }}
                >
                    {(() => {
                        // Slots act as containers for the widgets currently sitting between
                        // two categories (or before the first / after the last). Always
                        // rendered so the widgets stay visible; the frame styling only shows
                        // up while a drag is active. If the root has no categories at all,
                        // skip the segmentation and render items flat.
                        const isCatItem = (it: OrderedItem): boolean => it.type === 'category';
                        // Slots only help when placing widgets between categories. When the
                        // user drags a category tile, plain sortable arrayMove already works
                        // perfectly — render flat to avoid the visual noise of empty slots.
                        const isDragActive = !!activeId && !draggingNewline && !draggingCategory;
                        const renderItem = (item: OrderedItem): React.JSX.Element => {
                            const isCw = item.type === 'custom';
                            const isNewline = isCw && (item.data as CustomWidgetBase).type === 'newline';
                            const fav =
                                item.type === 'category' || isNewline
                                    ? undefined
                                    : isCw
                                      ? (item.data as CustomWidgetBase).favorite
                                      : widgetSettings[item.id]?.favorite;
                            const toggleFav =
                                item.type === 'category' || isNewline
                                    ? undefined
                                    : isCw
                                      ? category.props.onToggleCustomWidgetFavorite
                                      : onToggleFavorite;
                            const isCatDropTarget = item.type === 'category' && item.id === dropCategoryId;
                            const isCatForbidden = item.type === 'category' && item.id === forbiddenDropId;
                            return (
                                <SortableItem
                                    key={item.id}
                                    id={item.id}
                                    gridSpan={getGridColumn(item, widgetSettings, true)}
                                    isDragging={item.id === activeId}
                                    movingIntoTarget={item.id === activeId && (!!dropCategoryId || !!forbiddenDropId)}
                                    isDropTarget={isCatDropTarget || isCatForbidden}
                                    favorite={fav}
                                    onToggleFavorite={toggleFav}
                                >
                                    {renderContent(item, isCatDropTarget, isCatForbidden)}
                                </SortableItem>
                            );
                        };

                        const hasCategories = orderedItems.some(isCatItem);
                        if (!hasCategories) {
                            return orderedItems.map(renderItem);
                        }

                        // Build alternating list of segments (widget groups) and categories.
                        // `slotIdx` for each segment is the position of its first widget in
                        // `orderedItems` — that is the index `arrayMove` will insert at when
                        // the user drops on the slot.
                        type Segment = { slotIdx: number; widgets: OrderedItem[] };
                        const segments: Segment[] = [];
                        const cats: OrderedItem[] = [];
                        let curWidgets: OrderedItem[] = [];
                        let segStart = 0;
                        orderedItems.forEach((item, idx) => {
                            if (isCatItem(item)) {
                                segments.push({ slotIdx: segStart, widgets: curWidgets });
                                cats.push(item);
                                curWidgets = [];
                                segStart = idx + 1;
                            } else {
                                curWidgets.push(item);
                            }
                        });
                        segments.push({ slotIdx: segStart, widgets: curWidgets });

                        const nodes: React.JSX.Element[] = [];
                        for (let i = 0; i < segments.length; i++) {
                            const seg = segments[i];
                            nodes.push(
                                <DroppableSlot
                                    key={`slot:${seg.slotIdx}`}
                                    id={`slot:${seg.slotIdx}`}
                                    isDragActive={isDragActive}
                                    isEmpty={seg.widgets.length === 0}
                                    gridColumns={category.gridColumns}
                                >
                                    {seg.widgets.map(renderItem)}
                                </DroppableSlot>,
                            );
                            if (i < cats.length) {
                                nodes.push(renderItem(cats[i]));
                            }
                        }
                        return nodes;
                    })()}
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

/** Simple grid for a single group's items — DndContext is owned by GroupedContent */
function GroupSortableGrid(props: {
    category: Category;
    items: OrderedItem[];
    activeId: string | null;
    dropCategoryId?: string | null;
    canDrag: boolean;
    widgetSettings: Record<string, WidgetSettingsBase>;
    onToggleFavorite?: (widgetId: string) => void;
}): React.JSX.Element {
    const { category, items, activeId, dropCategoryId, canDrag, widgetSettings, onToggleFavorite } = props;

    // Use default `row` flow when a newline is present, so later items can't backfill
    // past the line break (see comment in SortableGrid).
    const hasNewline = items.some(i => i.type === 'custom' && (i.data as CustomWidgetBase).type === 'newline');
    const autoFlow = hasNewline ? 'row' : 'dense';

    const renderContent = (item: OrderedItem): React.ReactNode => {
        if (item.type === 'category') {
            return category.renderCategoryTile(item.data as CategoryInfo);
        }
        if (item.type === 'widget') {
            return category.renderWidget(item.data as WidgetInfo);
        }
        return category.renderCustomWidget(item.data as CustomWidgetBase);
    };

    if (!canDrag) {
        return (
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: category.gridColumns,
                    gridAutoFlow: autoFlow,
                    gap: 1.5,
                }}
            >
                {items.map(item => {
                    const gridSpan = getGridColumn(item, widgetSettings);
                    return gridSpan ? (
                        <div
                            key={item.id}
                            style={{ gridColumn: gridSpan.gridColumn, gridRow: gridSpan.gridRow }}
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
        <SortableContext
            items={items.map(i => i.id)}
            strategy={rectSortingStrategy}
        >
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: category.gridColumns,
                    gridAutoFlow: autoFlow,
                    gap: 1.5,
                }}
            >
                {items.map(item => {
                    const isCw = item.type === 'custom';
                    const isNewline = isCw && (item.data as CustomWidgetBase).type === 'newline';
                    const fav =
                        item.type === 'category' || isNewline
                            ? undefined
                            : isCw
                              ? (item.data as CustomWidgetBase).favorite
                              : widgetSettings[item.id]?.favorite;
                    const toggleFav =
                        item.type === 'category' || isNewline
                            ? undefined
                            : isCw
                              ? category.props.onToggleCustomWidgetFavorite
                              : onToggleFavorite;
                    return (
                        <SortableItem
                            key={item.id}
                            id={item.id}
                            gridSpan={getGridColumn(item, widgetSettings, true)}
                            isDragging={item.id === activeId}
                            movingIntoTarget={item.id === activeId && !!dropCategoryId}
                            favorite={fav}
                            onToggleFavorite={toggleFav}
                        >
                            {renderContent(item)}
                        </SortableItem>
                    );
                })}
            </Box>
        </SortableContext>
    );
}

// --- Lights group ON/OFF control ---

function LightsGroupControl(props: {
    widgetIds: string[];
    widgets: WidgetInfo[];
    stateContext: StateContext;
}): React.JSX.Element | null {
    const { widgetIds, widgets, stateContext } = props;

    // Find controllable lights: resolve SET/ON_SET for control and ACTUAL/ON_ACTUAL for reading
    const lightControls = useMemo(() => {
        const controls: { widgetId: string; setId: string; listenId: string }[] = [];
        for (const wId of widgetIds) {
            const widget = widgets.find(w => String(w.id) === wId);
            if (!widget?.control?.states) {
                continue;
            }
            const states = widget.control.states;
            const onSet = states.find(s => s.name === 'ON_SET');
            const on = states.find(s => s.name === 'ON');
            const set = states.find(s => s.name === 'SET');
            const onActual = states.find(s => s.name === 'ON_ACTUAL');
            const actual = states.find(s => s.name === 'ACTUAL');

            const setId = onSet?.id ?? on?.id ?? set?.id;
            const listenId = onActual?.id ?? onSet?.id ?? on?.id ?? actual?.id ?? setId;

            if (setId && listenId) {
                controls.push({ widgetId: wId, setId, listenId });
            }
        }
        return controls;
    }, [widgetIds, widgets]);

    const [onCount, setOnCount] = useState(0);
    const statesRef = useRef<Record<string, boolean>>({});

    useEffect(() => {
        if (!lightControls.length) {
            return;
        }

        const handlers: { id: string; handler: (id: string, state: ioBroker.State) => void }[] = [];
        statesRef.current = {};

        for (const ctrl of lightControls) {
            const handler = (_id: string, state: ioBroker.State | null | undefined): void => {
                const isOn = !!state?.val;
                if (statesRef.current[ctrl.widgetId] !== isOn) {
                    statesRef.current[ctrl.widgetId] = isOn;
                    const count = Object.values(statesRef.current).filter(v => v).length;
                    setOnCount(count);
                }
            };
            stateContext.getState(ctrl.listenId, handler);
            handlers.push({ id: ctrl.listenId, handler });
        }

        return () => {
            for (const h of handlers) {
                stateContext.removeState(h.id, h.handler);
            }
            statesRef.current = {};
        };
    }, [lightControls, stateContext]);

    if (lightControls.length === 0) {
        return null;
    }

    const someOn = onCount > 0;

    const handleToggle = (e: React.MouseEvent): void => {
        e.stopPropagation();
        const newState = !someOn;
        const socket = stateContext.getSocket();
        for (const ctrl of lightControls) {
            void socket.setState(ctrl.setId, newState);
        }
    };

    return (
        <Tooltip title={someOn ? I18n.t('wm_Turn all off') : I18n.t('wm_Turn all on')}>
            <IconButton
                onClick={handleToggle}
                size="small"
                sx={{ ml: 'auto', p: 0.5 }}
            >
                {someOn ? (
                    <Lightbulb sx={{ fontSize: 20, color: 'warning.main' }} />
                ) : (
                    <LightbulbOutlined sx={{ fontSize: 20, color: 'text.disabled' }} />
                )}
            </IconButton>
        </Tooltip>
    );
}

// --- Grouped content: renders subcategories + collapsible widget groups ---
// Uses a single DndContext so widgets can be dragged between groups.

function GroupedContent(props: {
    category: Category;
    groups: WidgetGroup[];
    canDrag: boolean;
    categoryId: string;
    onGroupsChange?: (categoryId: string, groups: WidgetGroup[]) => void;
    onMoveWidgetToCategory?: (widgetId: string, targetCategoryId: string) => void;
    widgetSettings: Record<string, WidgetSettingsBase>;
    configMode?: boolean;
    onToggleFavorite?: (widgetId: string) => void;
    /** Bumped by parent on expand-all/collapse-all to trigger re-sync from localStorage. */
    collapseVersion?: number;
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
        onToggleFavorite,
        collapseVersion,
    } = props;
    const allItems = category.getOrderedItems();
    const itemMap = useMemo(() => {
        const map = new Map<string, OrderedItem>();
        for (const item of allItems) {
            map.set(item.id, item);
        }
        return map;
    }, [allItems]);

    const categoryItems = allItems.filter(i => i.type === 'category');

    const [activeId, setActiveId] = useState<string | null>(null);
    const [dropCategoryId, setDropCategoryId] = useState<string | null>(null);
    const dropCategoryRef = useRef<string | null>(null);
    dropCategoryRef.current = dropCategoryId;

    // Keep a live copy of groups for cross-group moves during drag. Collapsed state is read
    // from localStorage (not the object), so we layer it on top of incoming groups here.
    const [liveGroups, setLiveGroups] = useState(() => applyCollapsedFromStorage(categoryId, groups));
    const prevGroupsRef = useRef(groups);
    if (prevGroupsRef.current !== groups) {
        prevGroupsRef.current = groups;
        setLiveGroups(applyCollapsedFromStorage(categoryId, groups));
    }
    const liveGroupsRef = useRef(liveGroups);
    liveGroupsRef.current = liveGroups;

    // Re-sync collapsed state from localStorage when parent signals expand-all / collapse-all.
    // The version is bumped by the parent; the groups data itself does not change.
    const lastCollapseVersionRef = useRef(collapseVersion);
    if (collapseVersion !== undefined && lastCollapseVersionRef.current !== collapseVersion) {
        lastCollapseVersionRef.current = collapseVersion;
        setLiveGroups(prev => applyCollapsedFromStorage(categoryId, prev));
    }

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    );

    // Collapsed state is persisted in localStorage, not in the object. We update liveGroups
    // locally and skip onGroupsChange so the object is not written for this UI-only preference.
    const handleToggleCollapse = (groupId: string): void => {
        const target = liveGroupsRef.current.find(g => g.id === groupId);
        const newCollapsed = !target?.collapsed;
        setGroupCollapsed(categoryId, groupId, newCollapsed);
        setLiveGroups(prev => prev.map(g => (g.id === groupId ? { ...g, collapsed: newCollapsed } : g)));
    };

    // Collect any widgets not in any group
    const groupedIds = new Set(liveGroups.flatMap(g => g.widgetIds));
    const ungrouped = allItems.filter(i => i.type !== 'category' && !groupedIds.has(i.id));

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
            const activeIdStr = String(active.id);

            // Check if hovering over a droppable category tile. Skip when:
            //   - the target is the virtual Favorites tile (no real parent to move into), or
            //   - the active item is itself a category (Favorites or otherwise — categories
            //     are reordered, never re-parented via drag).
            const activeIsCategory = itemMap.get(activeIdStr)?.type === 'category';
            if (
                overId.startsWith('drop-cat:') &&
                !activeIsCategory &&
                overId !== 'drop-cat:__favorites__' &&
                onMoveWidgetToCategory
            ) {
                setDropCategoryId(overId.replace('drop-cat:', ''));
                return;
            }
            setDropCategoryId(null);

            // Find which groups the active and over items belong to
            const currentGroups = liveGroupsRef.current;
            const activeGroup = findWidgetGroup(currentGroups, activeIdStr);
            const overGroup = findWidgetGroup(currentGroups, overId);

            if (activeGroup && overGroup && activeGroup !== overGroup) {
                // Cross-group move: move widget to target group
                const moved = moveWidgetToGroup(currentGroups, activeIdStr, overGroup);
                // Insert at the position of the over item
                const targetGroup = moved.find(g => g.id === overGroup);
                if (targetGroup) {
                    const overIdx = targetGroup.widgetIds.indexOf(overId);
                    const activeIdx = targetGroup.widgetIds.indexOf(activeIdStr);
                    if (overIdx >= 0 && activeIdx >= 0 && overIdx !== activeIdx) {
                        targetGroup.widgetIds = arrayMove(targetGroup.widgetIds, activeIdx, overIdx);
                    }
                }
                setLiveGroups(moved);
            } else if (activeGroup && activeGroup === overGroup) {
                // Within same group: reorder
                setLiveGroups(prev =>
                    prev.map(g => {
                        if (g.id !== activeGroup) {
                            return g;
                        }
                        const oldIdx = g.widgetIds.indexOf(activeIdStr);
                        const newIdx = g.widgetIds.indexOf(overId);
                        if (oldIdx < 0 || newIdx < 0) {
                            return g;
                        }
                        return { ...g, widgetIds: arrayMove(g.widgetIds, oldIdx, newIdx) };
                    }),
                );
            }
        },
        [itemMap, onMoveWidgetToCategory],
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            setActiveId(null);
            const currentDrop = dropCategoryRef.current;
            setDropCategoryId(null);
            if (currentDrop && onMoveWidgetToCategory) {
                onMoveWidgetToCategory(String(event.active.id), currentDrop);
                return;
            }
            // Persist the updated groups
            if (onGroupsChange) {
                onGroupsChange(categoryId, liveGroupsRef.current);
            }
        },
        [categoryId, onGroupsChange, onMoveWidgetToCategory],
    );

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
        setDropCategoryId(null);
        setLiveGroups(prevGroupsRef.current);
    }, []);

    // Render active item overlay
    const activeItem = activeId ? itemMap.get(activeId) : null;
    const renderOverlayContent = (item: OrderedItem): React.ReactNode => {
        if (item.type === 'widget') {
            return category.renderWidget(item.data as WidgetInfo);
        }
        return category.renderCustomWidget(item.data as CustomWidgetBase);
    };

    const showCatDropTargets = !!activeId && !!onMoveWidgetToCategory;
    const parentCategoryId = category.props.category.parent ? String(category.props.category.parent) : null;

    const groupContent = (
        <>
            {/* Sub-categories */}
            {categoryItems.length > 0 ? (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: category.gridColumns,
                        gridAutoFlow: 'dense',
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

            {/* Droppable category tiles when dragging */}
            {showCatDropTargets ? (
                <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {/* Parent category as drop target */}
                    {parentCategoryId ? (
                        <DroppableCategoryTile
                            key="drop-parent"
                            id={parentCategoryId}
                        >
                            <Box
                                sx={theme => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    p: 1.5,
                                    borderRadius: '16px',
                                    backgroundColor:
                                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                    borderLeft: `3px solid ${theme.palette.info.main}`,
                                })}
                            >
                                <ArrowBack sx={{ fontSize: 20, color: 'info.main' }} />
                                <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 600, color: 'info.main' }}
                                >
                                    {I18n.t('wm_Move to parent')}
                                </Typography>
                            </Box>
                        </DroppableCategoryTile>
                    ) : null}
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

            {/* Groups */}
            {liveGroups.map(group => {
                const groupItems = group.widgetIds.map(id => itemMap.get(id)).filter(Boolean) as OrderedItem[];
                if (groupItems.length === 0) {
                    return null;
                }

                return (
                    <Box
                        key={group.id}
                        sx={{
                            mb: 1.5,
                            ...(!configMode &&
                                !group.collapsed && {
                                    '&:not(:has([class^="widget-"]))': { display: 'none' },
                                }),
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: group.collapsed ? 0 : 0.5 }}>
                            <ButtonBase
                                onClick={() => handleToggleCollapse(group.id)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    flex: 1,
                                    justifyContent: 'flex-start',
                                    py: 0.5,
                                    px: 1,
                                    borderRadius: 1,
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
                            {group.id === 'lights' ? (
                                <LightsGroupControl
                                    widgetIds={group.widgetIds}
                                    widgets={category.props.widgets}
                                    stateContext={category.props.stateContext}
                                />
                            ) : null}
                        </Box>
                        {!group.collapsed ? (
                            <GroupSortableGrid
                                category={category}
                                items={groupItems}
                                activeId={activeId}
                                dropCategoryId={dropCategoryId}
                                canDrag={canDrag}
                                widgetSettings={widgetSettings}
                                onToggleFavorite={onToggleFavorite}
                            />
                        ) : null}
                    </Box>
                );
            })}

            {/* Ungrouped widgets */}
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
                        activeId={activeId}
                        dropCategoryId={dropCategoryId}
                        canDrag={canDrag}
                        widgetSettings={widgetSettings}
                        onToggleFavorite={onToggleFavorite}
                    />
                </Box>
            ) : null}
        </>
    );

    if (!canDrag) {
        return groupContent;
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
            {groupContent}
            <DragOverlay dropAnimation={null}>
                {activeItem ? (
                    <Box sx={{ opacity: 0.85, pointerEvents: 'none' }}>{renderOverlayContent(activeItem)}</Box>
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

    private scrollRef = React.createRef<HTMLDivElement>();
    private parallaxRef = React.createRef<HTMLDivElement>();
    private scrollSaveTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(props: CategoryProps) {
        super(props);
        this.state = {
            names: {},
            icons: {},
            colors: {},
            categoryStatus: { ...DEFAULT_CATEGORY_STATUS },
            subCategoryStatuses: {},
            widgetScale: Number(localStorage.getItem('wm_widgetScale')) || 100,
            hidden: {},
            collapseVersion: 0,
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
            icons: { [categoryId: string]: string | null };
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
        state.names[category.id] ||=
            category.id === '__root__' ? 'ioBroker' : category.id.toString().split('.').pop() || '';

        if (category.icon && typeof category.icon === 'object') {
            if ((category.icon as { stateId: string; mapping?: Record<string | number, string> }).stateId) {
                this.props.stateContext.getState(
                    (category.icon as { stateId: string; mapping?: Record<string | number, string> }).stateId,
                    this.onIconChange,
                );
            }
        } else {
            state.icons[category.id] = this.props.stateContext.getImagePath(category.icon);
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

        // Restore scroll position (next frame so DOM is ready)
        requestAnimationFrame(() => this.restoreScrollPosition());

        // Listen for widget scale changes from settings dialog
        window.addEventListener('wm_widgetScaleChanged', this.onWidgetScaleChanged);
    }

    componentWillUnmount(): void {
        // Save scroll position before leaving
        this.saveScrollPosition();
        if (this.scrollSaveTimer) {
            clearTimeout(this.scrollSaveTimer);
        }
        for (const sub of this.statusSubs) {
            this.props.stateContext.removeState(sub.stateId, this.onStatusChange);
        }
        window.removeEventListener('wm_widgetScaleChanged', this.onWidgetScaleChanged);
    }

    private onWidgetScaleChanged = (): void => {
        const scale = Number(localStorage.getItem('wm_widgetScale')) || 100;
        if (scale !== this.state.widgetScale) {
            this.setState({ widgetScale: scale });
        }
    };

    // eslint-disable-next-line react/no-unused-class-component-methods
    get gridColumns(): string {
        const minPx = Math.round(135 * (this.state.widgetScale / 100));
        return `repeat(auto-fill, minmax(${minPx}px, 1fr))`;
    }

    private get scrollStorageKey(): string {
        return `wm_scroll_${String(this.props.category.id)}`;
    }

    private static getOrientation(): 'portrait' | 'landscape' {
        return window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape';
    }

    private saveScrollPosition(): void {
        const el = this.scrollRef.current;
        if (!el) {
            return;
        }
        try {
            localStorage.setItem(
                this.scrollStorageKey,
                JSON.stringify({
                    top: el.scrollTop,
                    orientation: Category.getOrientation(),
                }),
            );
        } catch {
            // ignore
        }
    }

    private restoreScrollPosition(): void {
        const el = this.scrollRef.current;
        if (!el) {
            return;
        }
        try {
            const raw = localStorage.getItem(this.scrollStorageKey);
            if (raw) {
                const { top, orientation } = JSON.parse(raw);
                if (orientation === Category.getOrientation() && typeof top === 'number') {
                    el.scrollTop = top;
                }
            }
        } catch {
            // ignore
        }
    }

    private onScroll = (): void => {
        if (this.scrollSaveTimer) {
            clearTimeout(this.scrollSaveTimer);
        }
        this.scrollSaveTimer = setTimeout(() => {
            this.scrollSaveTimer = null;
            this.saveScrollPosition();
        }, 300);

        // Parallax: shift background slower than content
        if (this.parallaxRef.current && this.scrollRef.current) {
            const scrollTop = this.scrollRef.current.scrollTop;
            this.parallaxRef.current.style.transform = `translateY(${scrollTop * -0.25}px) scale(1.15)`;
        }
    };

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
            const actual = w.control.states.find(s => s.name === 'ACTUAL');
            if (
                !role &&
                actual?.stateRole &&
                POWER_ROLE_PATTERN.test(actual.stateRole)
            ) {
                role = 'power';
            }
            if (role) {
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
            } else {
                // Subscribe ACTUAL/SET state for all other alarm/sensor widget types
                // so that renderWidgetIconPreviews can determine active state
                const sensorState =
                    w.control.states.find(s => s.name === 'ACTUAL') ||
                    w.control.states.find(s => s.name === 'SET') ||
                    w.control.states.find(s => s.name === 'ON');
                if (
                    sensorState?.id &&
                    !this.statusSubs.some(s => s.stateId === sensorState.id && s.categoryId === categoryId)
                ) {
                    this.statusSubs.push({
                        stateId: sensorState.id,
                        role: 'sensor',
                        widgetId: String(w.id),
                        categoryId,
                    });
                    this.props.stateContext.getState(sensorState.id, this.onStatusChange);
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

        // Subscribe for each subcategory's widgets (tagged with subcategory ID)
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
        let power: number | null = null;
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
                case 'power':
                    if (power === null && val != null) {
                        const n = Number(val);
                        if (!isNaN(n)) {
                            power = n;
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

        return { temperature, power, humidity, motionActive, openings, lowBatteryDevices };
    }

    private recalcCategoryStatus(): void {
        // Compute status for the current category (subs without categoryId)
        const currentSubs = this.statusSubs.filter(s => !s.categoryId);
        const categoryStatus = Category.computeStatus(currentSubs, this.statusValues);

        // Compute status for each subcategory
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
                if (struct.mapping?.[state.val as string]) {
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
        data: CategoryInfo | WidgetInfo | CustomWidgetBase;
    }> {
        const categoryId = String(this.props.category.id);
        const catSettings = this.props.categorySettings[categoryId];
        const customWidgets = catSettings?.customWidgets || [];
        const order = catSettings?.widgetOrder;

        const items: Array<{
            type: 'category' | 'widget' | 'custom';
            id: string;
            data: CategoryInfo | WidgetInfo | CustomWidgetBase;
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
            return text[this.props.stateContext.language] || text.en;
        }

        return text;
    }

    static getWidgetComponent(
        type?: Types,
        states?: DevicesDetectorState[],
    ): typeof WidgetGeneric<any, any> | undefined {
        let Widget: typeof WidgetGeneric<any, any> | undefined;
        if (type === Types.socket) {
            Widget = WidgetSwitch;
        } else if (type === Types.light) {
            Widget = WidgetLight;
        } else if (type === Types.dimmer) {
            Widget = WidgetDimmer;
        } else if (type === Types.temperature) {
            Widget = WidgetTemperature;
        } else if (type === Types.motion) {
            Widget = WidgetMotion;
        } else if (type === Types.window) {
            Widget = WidgetWindow;
        } else if (type === Types.gate) {
            Widget = WidgetGate;
        } else if (type === Types.blind) {
            Widget = WidgetBlind;
        } else if (type === Types.blindButtons) {
            Widget = WidgetBlindButtons;
        } else if (type === Types.lock) {
            Widget = WidgetLock;
        } else if (type === Types.door) {
            Widget = WidgetDoor;
        } else if (type === Types.floodAlarm) {
            Widget = WidgetFloodAlarm;
        } else if (type === Types.fireAlarm) {
            Widget = WidgetFireAlarm;
        } else if (type === Types.humidity) {
            Widget = WidgetHumidity;
        } else if (type === Types.illuminance) {
            Widget = WidgetIlluminance;
        } else if (type === Types.thermostat) {
            Widget = WidgetThermostat;
        } else if (type === Types.airCondition) {
            Widget = WidgetAirCondition;
        } else if (type === Types.warning) {
            Widget = WidgetWarning;
        } else if (type === Types.volume || type === Types.volumeGroup) {
            Widget = WidgetVolume;
        } else if (type === Types.media) {
            Widget = WidgetMediaPlayer;
        } else if (type === Types.slider || type === Types.percentage) {
            Widget = WidgetSlider;
        } else if (
            type === Types.info &&
            states?.some(s => s.name === 'ACTUAL' && /value\.fill|level\.tank|tank/i.test(s.stateRole || ''))
        ) {
            Widget = WidgetTank;
        } else if (type === Types.image) {
            Widget = WidgetImage;
        } else if (type === Types.info) {
            Widget = WidgetInfoWidget;
        } else if (type === Types.location || type === Types.locationOne) {
            Widget = WidgetLocation;
        } else if (type === Types.weatherCurrent) {
            Widget = WidgetWeatherCurrent;
        } else if (type === Types.weatherForecast) {
            Widget = WidgetWeatherForecast;
        } else if (
            type === Types.rgbSingle ||
            type === Types.rgbwSingle ||
            type === Types.rgb ||
            type === Types.hue ||
            type === Types.cie ||
            type === Types.ct
        ) {
            Widget = WidgetColorLight;
        }

        return Widget;
    }

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderWidget(widget: WidgetInfo): React.JSX.Element {
        const Widget = Category.getWidgetComponent(widget.control?.type, widget.control?.states);
        if (!Widget) {
            const settings = this.props.widgetSettings[String(widget.id)];
            const size = settings?.size || '1x1';
            const typeName = widget.control?.type || '?';

            return (
                <Box
                    key={widget.id}
                    id={String(widget.id)}
                    sx={theme => ({
                        position: 'relative',
                        ...(size === '2x0.5'
                            ? { gridColumn: 'span 2', height: 80 }
                            : size === '2x1'
                              ? { gridColumn: 'span 2', aspectRatio: '2' }
                              : { aspectRatio: '1' }),
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        p: 2,
                        borderRadius: 3,
                        border: '2px dashed',
                        borderColor: 'error.main',
                        backgroundColor: alpha(theme.palette.error.main, 0.08),
                        textAlign: 'center',
                        overflow: 'hidden',
                    })}
                >
                    <ErrorOutline sx={{ fontSize: 32, color: 'error.main', opacity: 0.7 }} />
                    <Typography
                        variant="caption"
                        sx={{ color: 'error.main', fontWeight: 500, lineHeight: 1.3 }}
                    >
                        {I18n.t('wm_Widget type not supported').replace('%s', typeName)}
                    </Typography>
                    {this.props.onDeleteWidgetById ? (
                        <Tooltip title={I18n.t('wm_Delete')}>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => this.props.onDeleteWidgetById!(widget.id)}
                            >
                                <Delete fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    ) : null}
                </Box>
            );
        }

        const settings = this.props.widgetSettings[String(widget.id)];
        return (
            <Widget
                key={widget.id}
                stateContext={this.props.stateContext}
                widget={widget}
                settings={settings}
                onOpenSettings={this.props.onOpenSettings}
                openDialogId={this.props.openDialogId}
                onOpenWidgetDialog={this.props.onOpenWidgetDialog}
                onCloseWidgetDialog={this.props.onCloseWidgetDialog}
                onHide={this.hideCb}
            />
        );
    }

    /** Find the actual category that owns a custom widget (skip virtual __favorites__) */
    private findCustomWidgetCategory(widgetId: string): string {
        for (const [catId, cs] of Object.entries(this.props.categorySettings)) {
            if (catId === '__favorites__') {
                continue;
            }
            if (cs.customWidgets?.some(w => w.id === widgetId)) {
                return catId;
            }
        }
        return String(this.props.category.id);
    }

    hideCb = (id: string, hide: boolean): void => {
        if (!!this.state.hidden[id] !== hide) {
            this.setState({ hidden: { ...this.state.hidden, [id]: hide } });
        }
    };

    /** Build a minimal WidgetInfo for a custom widget so it can use WidgetGeneric's lifecycle */
    private static buildCustomWidgetInfo(def: CustomWidgetBase): WidgetInfo {
        return {
            type: 'widget',
            id: def.id,
            name: def.name || '',
            control: {
                states: [],
                type: Types.info,
                storeId: '',
                parentId: '',
                deviceId: '',
                channelId: '',
            },
        };
    }

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderCustomWidget(def: CustomWidgetBase): React.JSX.Element | null {
        const ownerCategoryId = this.findCustomWidgetCategory(def.id);
        // WidgetGenericProps-compatible callback (accepts widget id)
        const settingsCb = this.props.onOpenCustomWidgetSettings
            ? (_widgetId: string | number) => this.props.onOpenCustomWidgetSettings!(ownerCategoryId, def.id)
            : undefined;
        const removeCb = this.props.onRemoveCustomWidget
            ? () => this.props.onRemoveCustomWidget!(ownerCategoryId, def.id)
            : undefined;

        let content: React.JSX.Element | null;

        switch (def.type) {
            case 'clock':
                content = (
                    <WidgetClock
                        key={def.id}
                        widget={Category.buildCustomWidgetInfo(def)}
                        settings={def as WidgetClockSettings}
                        stateContext={this.props.stateContext}
                        onOpenSettings={settingsCb}
                        onHide={this.hideCb}
                    />
                );
                break;
            case 'weather':
                content = (
                    <WidgetWeather
                        key={def.id}
                        widget={Category.buildCustomWidgetInfo(def)}
                        settings={def as WidgetWeatherSettings}
                        stateContext={this.props.stateContext}
                        onOpenSettings={settingsCb}
                        onHide={this.hideCb}
                    />
                );
                break;
            case 'iframe':
                content = (
                    <WidgetIframe
                        key={def.id}
                        widget={Category.buildCustomWidgetInfo(def)}
                        settings={def as WidgetIframeSettings}
                        stateContext={this.props.stateContext}
                        onOpenSettings={settingsCb}
                        onHide={this.hideCb}
                        openDialogId={this.props.openDialogId}
                        onOpenWidgetDialog={this.props.onOpenWidgetDialog}
                        onCloseWidgetDialog={this.props.onCloseWidgetDialog}
                    />
                );
                break;
            case 'wind':
                content = (
                    <WidgetWind
                        key={def.id}
                        widget={Category.buildCustomWidgetInfo(def)}
                        settings={def as WidgetWindSettings}
                        stateContext={this.props.stateContext}
                        onOpenSettings={settingsCb}
                        onHide={this.hideCb}
                    />
                );
                break;
            case 'gauge':
                content = (
                    <WidgetGauge
                        key={def.id}
                        widget={Category.buildCustomWidgetInfo(def)}
                        settings={def as WidgetGaugeSettings}
                        stateContext={this.props.stateContext}
                        onOpenSettings={settingsCb}
                        onHide={this.hideCb}
                    />
                );
                break;
            case 'universal': {
                content = (
                    <WidgetUniversal
                        key={def.id}
                        widget={Category.buildCustomWidgetInfo(def)}
                        settings={def as WidgetUniversalSettings}
                        stateContext={this.props.stateContext}
                        onOpenSettings={settingsCb}
                        onHide={this.hideCb}
                    />
                );
                break;
            }
            case 'presence':
                content = (
                    <WidgetPresence
                        key={def.id}
                        widget={Category.buildCustomWidgetInfo(def)}
                        settings={def as WidgetPresenceSettings}
                        stateContext={this.props.stateContext}
                        onOpenSettings={settingsCb}
                        onHide={this.hideCb}
                    />
                );
                break;
            case 'energyFlow':
                content = (
                    <WidgetEnergyFlow
                        key={def.id}
                        widget={Category.buildCustomWidgetInfo(def)}
                        settings={def as WidgetEnergyFlowSettings}
                        stateContext={this.props.stateContext}
                        onOpenSettings={settingsCb}
                        onHide={this.hideCb}
                    />
                );
                break;
            case 'plugin':
                content = (
                    <WidgetPlugin
                        key={def.id}
                        widget={Category.buildCustomWidgetInfo(def)}
                        settings={def as CustomWidgetPlugin}
                        stateContext={this.props.stateContext}
                        onOpenSettings={settingsCb}
                        onHide={this.hideCb}
                        openDialogId={this.props.openDialogId}
                        onOpenWidgetDialog={this.props.onOpenWidgetDialog}
                        onCloseWidgetDialog={this.props.onCloseWidgetDialog}
                    />
                );
                break;
            case 'newline':
                content = removeCb ? (
                    <Box
                        key={def.id}
                        sx={theme => WidgetGeneric.getStyleCompact(theme)}
                    >
                        <Box
                            sx={theme => ({
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxSizing: 'border-box',
                                width: '100%',
                                aspectRatio: '1',
                                border: '2px dashed',
                                borderColor:
                                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                                borderRadius: 'inherit',
                                gap: 0.5,
                            })}
                        >
                            <Typography sx={{ fontSize: 'max(36px, 20cqi)', lineHeight: 1, opacity: 0.4 }}>
                                ⏎
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ opacity: 0.3, userSelect: 'none', fontSize: 'max(0.6rem, 3cqi)' }}
                            >
                                {I18n.t('wm_New line')}
                            </Typography>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={() => removeCb()}
                            sx={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                p: '3px',
                                opacity: 0,
                                '&:hover': { opacity: 1 },
                                '.MuiBox-root:hover > &': { opacity: 0.7 },
                            }}
                        >
                            <Close sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Box>
                ) : (
                    <Box key={def.id} />
                );
                break;
            default:
                content = null;
        }

        // Wrap in a div with "widget-custom" class so the GroupedContent CSS
        // :has([class^="widget-"]) selector finds it (otherwise the group is hidden in play mode)
        return content ? (
            <div
                className="widget-custom"
                style={this.state.hidden[def.id] && !this.props.configMode ? { display: 'none' } : undefined}
            >
                {content}
            </div>
        ) : null;
    }

    /** Render small alarm/sensor widget icon previews for a subcategory tile (only active ones) */
    private renderWidgetIconPreviews(category: CategoryInfo): React.JSX.Element | null {
        // Only show alarm/sensor types NOT already covered by the status system
        // (window, door, motion are rendered separately via openings/motionActive)
        const ALARM_TYPES = new Set([Types.floodAlarm, Types.fireAlarm, Types.warning]);
        const catWidgets = this.props.widgets.filter(
            w => w.parent === category.id && w.control?.type && ALARM_TYPES.has(w.control.type),
        );
        if (!catWidgets.length) {
            return null;
        }

        // Collect icons (max 8) — only active widgets, with widget colors
        const icons: { id: string | number; src?: string; name: string; type: Types; color?: string }[] = [];
        for (const w of catWidgets) {
            if (icons.length >= 8) {
                break;
            }
            // Check if widget is active via its primary state
            const stateEntry =
                w.control.states.find(s => s.name === 'ACTUAL') ||
                w.control.states.find(s => s.name === 'SET') ||
                w.control.states.find(s => s.name === 'ON');
            if (stateEntry?.id) {
                const val = this.statusValues[stateEntry.id];
                if (!val) {
                    continue; // inactive — skip
                }
            } else {
                continue; // no trackable state — skip
            }
            const wName =
                resolveTranslated(w.name as ioBroker.StringOrTranslated, this.props.stateContext.language) ||
                String(w.id);
            const ws = this.props.widgetSettings[String(w.id)];
            const iconSrc = ws?.iconActive || ws?.icon || (typeof w.icon === 'string' ? w.icon : undefined);
            const color = ws?.color;
            icons.push({ id: w.id, src: iconSrc, name: wName, type: w.control.type, color });
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
                                    style={{ width: 16, height: 16, color: ic.color || undefined }}
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

    /** Render status summary for a subcategory tile (temperature, power, humidity, openings, motion) */
    private renderSubCategoryStatus(category: CategoryInfo, deviceCount: number): React.JSX.Element {
        const status = this.state.subCategoryStatuses[String(category.id)];
        const activeOpenings = status ? status.openings.filter(o => o.state !== 0) : [];
        const hasStatus =
            status &&
            (status.temperature !== null ||
                status.power !== null ||
                status.humidity !== null ||
                status.motionActive ||
                activeOpenings.length > 0 ||
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

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
                {status.temperature !== null ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Thermostat sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', fontWeight: 500 }}
                        >
                            {formatFloat(status.temperature, 1, this.props.stateContext.isFloatComma)}°
                        </Typography>
                    </Box>
                ) : null}
                {status.power !== null ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <ElectricBolt sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', fontWeight: 500 }}
                        >
                            {`${formatFloat(status.power, 1, this.props.stateContext.isFloatComma)} W`}
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
                {activeOpenings.length > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {activeOpenings.map(sensor => {
                            const ws = sensor.widgetId ? this.props.widgetSettings[sensor.widgetId] : undefined;
                            const customIcon = ws ? ws.iconActive || ws.icon : undefined;
                            const iconSrc = customIcon || sensor.icon;
                            const customColor = ws?.color;
                            const fallbackColor = Category.getOpeningColor(sensor);
                            const color = customColor || fallbackColor;
                            const customText = ws?.textActive;
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
                                                style={{ width: 16, height: 16, color }}
                                            />
                                        </Box>
                                    ) : sensor.kind === 'door' ? (
                                        <SensorDoor sx={{ fontSize: 16, color, transition: 'color 0.25s ease' }} />
                                    ) : (
                                        <SensorWindow
                                            sx={{
                                                fontSize: 16,
                                                color,
                                                transform: sensor.state === 2 ? 'rotate(15deg)' : undefined,
                                                transition: 'color 0.25s ease',
                                            }}
                                        />
                                    )}
                                </Tooltip>
                            );
                        })}
                    </Box>
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
    renderCategoryTile(category: CategoryInfo, isDropTarget?: boolean, isForbidden?: boolean): React.JSX.Element {
        const icon = this.state.icons[category.id];
        const name = this.state.names[category.id] ?? '...';
        const tileCatSettings = this.props.categorySettings[String(category.id)];
        const tileColor = normalizeColor(this.state.colors[category.id] || tileCatSettings?.color);
        const tileStoredImage = tileCatSettings?.image;
        const tileImage = tileStoredImage
            ? `/${this.props.stateContext.imagePrefix}${tileStoredImage.replace(/^\//, '')}`
            : '';
        const deviceCount = this.props.widgets.filter(w => w.parent === category.id).length;
        const scale = this.state.widgetScale / 100;

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
                    p: `${Math.round(16 * scale)}px`,
                    position: 'relative',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: isForbidden
                        ? 'rgba(244, 67, 54, 0.15)'
                        : isDropTarget
                          ? 'rgba(77, 171, 245, 0.15)'
                          : theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(0,0,0,0.02)',
                    borderLeft: `3px solid ${tileColor || theme.palette.primary.main}`,
                    // Drop-target / forbidden outline lives on the tile itself, so it always
                    // inherits the full-row gridColumn — wrapping the tile in another <div>
                    // would lose it during dnd-kit reorder transforms and shrink the highlight.
                    outline: isForbidden ? '2px dashed #f44336' : isDropTarget ? '2px dashed #4dabf5' : 'none',
                    outlineOffset: -2,
                    ...(tileImage
                        ? {
                              backgroundImage: `url(${tileImage})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                          }
                        : {}),
                    '&:hover': {
                        backgroundColor: isForbidden
                            ? 'rgba(244, 67, 54, 0.2)'
                            : isDropTarget
                              ? 'rgba(77, 171, 245, 0.2)'
                              : theme.palette.mode === 'dark'
                                ? 'rgba(255,255,255,0.07)'
                                : 'rgba(0,0,0,0.04)',
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
                            width: Math.round(28 * scale),
                            height: Math.round(28 * scale),
                            flexShrink: 0,
                            color: tileColor || undefined,
                            position: 'relative',
                            zIndex: 1,
                        }}
                    />
                ) : (
                    <MeetingRoom
                        sx={theme => ({
                            fontSize: Math.round(28 * scale),
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
                            fontSize: `${scale}rem`,
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
        const { temperature, power, humidity, motionActive, openings, lowBatteryDevices } = this.state.categoryStatus;
        // Only show active openings (state !== 0) in the category header
        const activeOpenings = openings.filter(o => o.state !== 0);
        const hasAny =
            temperature !== null ||
            power !== null ||
            humidity !== null ||
            motionActive ||
            activeOpenings.length > 0 ||
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
                            {formatFloat(temperature, 1, this.props.stateContext.isFloatComma)}°
                        </Typography>
                    </Box>
                ) : null}
                {power !== null ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ElectricBolt sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography
                            variant="body2"
                            sx={{ fontWeight: 500, color: 'text.secondary' }}
                        >
                            {`${formatFloat(power, 1, this.props.stateContext.isFloatComma)} W`}
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
                {activeOpenings.length > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {activeOpenings.map(sensor => {
                            const ws = sensor.widgetId ? this.props.widgetSettings[sensor.widgetId] : undefined;
                            const customIcon = ws ? ws.iconActive || ws.icon : undefined;
                            const iconSrc = customIcon || sensor.icon;
                            const customColor = ws?.color;
                            const fallbackColor = Category.getOpeningColor(sensor);
                            const color = customColor || fallbackColor;
                            const customText = ws?.textActive;
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
        const supportsSidePanel = isRoot && !!detectBrowser();
        const customWidgets = this.props.categorySettings[String(this.props.category.id)]?.customWidgets || [];
        const hasItems = this.subCategories.length > 0 || this.widgets.length > 0 || customWidgets.length > 0;
        const categoryId = String(this.props.category.id);
        const categorySettings = this.props.categorySettings[categoryId];
        // Use the explicit `widgetsGrouped` flag as the source of truth. Fall back to checking
        // widgetGroups for legacy data saved before the flag existed.
        const isGrouped = categorySettings?.widgetsGrouped ?? !!categorySettings?.widgetGroups?.length;
        const widgetGroups = isGrouped ? categorySettings?.widgetGroups : undefined;
        const hasHeader = !!(
            parentCategory ||
            this.state.names[this.props.category.id] ||
            categorySettings?.name ||
            this.props.onOpenCategorySettings
        );
        const storedImage = categorySettings?.image;
        // Stored path has no prefix; add files/ prefix for admin
        const catImage = storedImage ? `${this.props.stateContext.imagePrefix}${storedImage.replace(/^\//, '')}` : '';
        const imageScope = categorySettings?.imageScope || 'header';
        const catColor = normalizeColor(categorySettings?.color);
        const catBgColor = normalizeColor(categorySettings?.backgroundColor);
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
                    // Per-category override wins; otherwise use the widget theme's bgDefault so
                    // the GUI doesn't fall through to the admin's underlying background.
                    backgroundColor: catBgColor || theme.palette.background.default,
                    position: 'relative',
                })}
            >
                {/* Parallax background layer for page-scope images */}
                {catImage && imageScope === 'page' ? (
                    <>
                        <Box
                            ref={this.parallaxRef}
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                backgroundImage: `url(${catImage})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                transform: 'scale(1.15)',
                                willChange: 'transform',
                                zIndex: 0,
                            }}
                        />
                        <Box
                            sx={theme => ({
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: alpha(catBgColor || theme.palette.background.default, 0.75),
                                zIndex: 0,
                            })}
                        />
                    </>
                ) : null}
                {/* Floating config toggle — only when no header is shown */}
                {!hasHeader && this.props.onToggleConfigMode ? (
                    <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, display: 'flex', gap: 0.5 }}>
                        {supportsSidePanel && this.props.configMode && this.props.onInstallSidePanel ? (
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
                                        <PlayArrow
                                            fontSize="small"
                                            sx={{ color: '#4caf50' }}
                                        />
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
                ) : null}
                {/* Fixed header — hidden for the root category (no parent, no name) */}
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
                                <Box
                                    onClick={() => this.props.onNavigate(parentCategory)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        flex: 1,
                                        minWidth: 0,
                                        cursor: 'pointer',
                                        ml: -0.5,
                                    }}
                                >
                                    <ArrowBack sx={{ color: catColor || undefined, fontSize: 24 }} />
                                    {(() => {
                                        const headerIcon = this.state.icons[this.props.category.id];
                                        return headerIcon ? (
                                            <Icon
                                                src={headerIcon}
                                                style={{ width: 28, height: 28, color: catColor || undefined }}
                                            />
                                        ) : null;
                                    })()}
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            fontWeight: 700,
                                            flex: 1,
                                            color: catColor || undefined,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {displayName}
                                    </Typography>
                                </Box>
                            ) : (
                                <>
                                    {(() => {
                                        const rootIconRaw = categorySettings?.rootIcon;
                                        const rootIcon = rootIconRaw
                                            ? `${this.props.stateContext.imagePrefix}${rootIconRaw.replace(/^\//, '')}`
                                            : '';
                                        const headerIcon = rootIcon || this.state.icons[this.props.category.id];
                                        return headerIcon ? (
                                            <Icon
                                                src={headerIcon}
                                                style={{ width: 28, height: 28, color: catColor || undefined }}
                                            />
                                        ) : null;
                                    })()}
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
                                </>
                            )}
                            {this.props.onAddCustomWidget && categoryId !== '__favorites__' ? (
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
                                <Tooltip title={I18n.t(isGrouped ? 'wm_Ungroup widgets' : 'wm_Group by type')}>
                                    <IconButton
                                        size="small"
                                        onClick={() => this.props.onToggleGrouping!(categoryId, this.getOrderedItems())}
                                        sx={{ opacity: isGrouped ? 0.7 : 0.5, '&:hover': { opacity: 1 } }}
                                    >
                                        {isGrouped ? (
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
                            {supportsSidePanel && this.props.configMode && this.props.onInstallSidePanel ? (
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
                                            <PlayArrow
                                                fontSize="small"
                                                sx={{ color: '#4caf50' }}
                                            />
                                        ) : (
                                            <Build
                                                fontSize="small"
                                                sx={{ fontSize: 18 }}
                                            />
                                        )}
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                            {this.props.onBackToDevices ? (
                                <Tooltip title={I18n.t('wm_Back to devices')}>
                                    <IconButton
                                        size="small"
                                        onClick={this.props.onBackToDevices}
                                        sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                    >
                                        <ArrowBack fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            ) : null}
                        </Box>

                        {/* Room status summary */}
                        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ flex: 1 }}>{this.renderCategoryStatus()}</Box>
                            {widgetGroups?.length ? (
                                <Box sx={{ display: 'flex', ml: 'auto' }}>
                                    <Tooltip title={I18n.t('wm_Expand all')}>
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setAllGroupsCollapsed(
                                                    categoryId,
                                                    widgetGroups.map(g => g.id),
                                                    false,
                                                );
                                                this.setState({ collapseVersion: this.state.collapseVersion + 1 });
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
                                                setAllGroupsCollapsed(
                                                    categoryId,
                                                    widgetGroups.map(g => g.id),
                                                    true,
                                                );
                                                this.setState({ collapseVersion: this.state.collapseVersion + 1 });
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
                        ref={this.scrollRef}
                        onScroll={this.onScroll}
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
                                onToggleFavorite={this.props.onToggleFavorite}
                                collapseVersion={this.state.collapseVersion}
                            />
                        ) : (
                            <SortableGrid
                                category={this}
                                canDrag={!!this.props.onWidgetOrderChange}
                                categoryId={String(this.props.category.id)}
                                onOrderChange={this.props.onWidgetOrderChange}
                                onMoveWidgetToCategory={this.props.onMoveWidgetToCategory}
                                widgetSettings={this.props.widgetSettings}
                                onToggleFavorite={this.props.onToggleFavorite}
                            />
                        )}
                    </Box>
                ) : null}
            </Box>
        );
    }
}
