import React from 'react';
import { Box } from '@mui/material';
import { type Theme, createTheme, ThemeProvider } from '@mui/material/styles';

import { I18n } from '@iobroker/adapter-react-v5';
import { Types } from '@iobroker/type-detector';

import de from './i18n/de.json';
import en from './i18n/en.json';
import ru from './i18n/ru.json';
import pt from './i18n/pt.json';
import nl from './i18n/nl.json';
import fr from './i18n/fr.json';
import it from './i18n/it.json';
import es from './i18n/es.json';
import pl from './i18n/pl.json';
import uk from './i18n/uk.json';
import zhCn from './i18n/zh-cn.json';

import Communication, { type CommunicationProps, type CommunicationState } from './Communication';
import StateContext from './StateContext';
import Category from './Category';
import { DEFAULT_CATEGORY_SETTINGS, type CategorySettings, type WmThemeId } from './CategorySettingsDialog';
import { CUSTOM_WIDGET_CONFIGS, getConfigDefault } from './CustomWidgetConfigs';
import { autoGroupItems, flattenGroups, moveWidgetToGroup, stripCollapsed, type WidgetGroup } from './groupUtils';
import CategoryListDialogs from './CategoryListDialogs';
import WidgetGeneric, { resolveTranslated } from './Widgets/Generic';
import { loadPluginComponent, isPluginLoaded } from './pluginLoader';
import type {
    WidgetSettingsBase,
    CustomWidgetBase,
    CategoryInfo,
    WidgetInfo,
    CustomWidgetType,
    ItemInfo,
} from '../../../packages/dm-widgets/src/index';

interface SpecialTile {
    type: 'clock';
    size: '1x1' | '2x0.5' | '2x1' | '2x2';
}

interface GuiConfig {
    root: {
        status?: boolean;
        statusFormat?: string;
        tiles?: SpecialTile[];
        title?: string;
        color?: string;
        backgroundColor?: string;
        image?: string;
        imageScope?: 'header' | 'page';
        /** PWA / Chrome extension icon path */
        icon?: string;
        /** Icon shown before the root name */
        rootIcon?: string;
        /** Widget theme preset */
        wmTheme?: WmThemeId;
        /** Default category ID to show when a page is opened without hash */
        defaultCategory?: string;
        /** Hide the config/play toggle button in play mode (root only) */
        hideConfigButton?: boolean;
        /** Explicit grouping toggle. true = render a grouped list, false/undefined = sorted list. */
        widgetsGrouped?: boolean;
        customWidgets?: CustomWidgetBase[];
        widgetOrder?: string[];
        widgetGroups?: Array<{ id: string; name: string; collapsed?: boolean; widgetIds: string[] }>;
    };
    /** Settings for the virtual Favorites category (no real ioBroker object exists). */
    favorites?: {
        name?: string;
        color?: string;
        backgroundColor?: string;
        image?: string;
        imageScope?: 'header' | 'page';
        icon?: string;
        widgetsGrouped?: boolean;
        widgetOrder?: string[];
        widgetGroups?: Array<{ id: string; name: string; collapsed?: boolean; widgetIds: string[] }>;
    };
}

interface CategoryListProps extends CommunicationProps {
    /** Instance to upload images to, like `adapterName.X` */
    uploadImagesToInstance?: string;
    /** If this component is used in GUI with own toolbar. `false` if this list is used with multiple instances and true if only with one (in this case, it will monitor alive itself */
    embedded?: boolean;
    /** If embedded, this text is shown in the toolbar */
    title?: string;
    /** Style of a component that displays all devices */
    style?: React.CSSProperties;
    /** To trigger the reload of devices, just change this variable */
    triggerLoad?: number;
    /** If the settings button is shown */
    showSettingsButton?: boolean;
    /** Define a state that will accept commands from the backend */
    communicationStateId?: string | boolean;
    /** Is it runs in admin or in web? */
    admin: boolean;
    /** Define an object that will store root settings of the GUI */
    rootSettingsStateId?: string | boolean;
    /** Callback to go back to a device list (shown in the header when in admin split-screen narrow mode) */
    onBackToDevices?: () => void;
}

interface CategoryListState extends CommunicationState {
    categories: CategoryInfo[];
    widgets: WidgetInfo[];
    filter: string;
    loading: boolean | null;
    alive: boolean | null;
    triggerLoad: number;
    currentCategory?: CategoryInfo;
    widgetSettings: Record<string, WidgetSettingsBase>;
    settingsWidgetId: string | number | null;
    chartAvailable: boolean;
    settingsObjectName: string;
    settingsObjectColor: string;
    categorySettings: Record<string, CategorySettings>;
    categorySettingsCategoryId: string | null;
    customWidgetDialogCategoryId: string | null;
    customWidgetSettingsCategoryId: string | null;
    customWidgetSettingsWidgetId: string | null;
    guiConfig?: GuiConfig;
    /** When true, editing controls are shown; when false, play/runtime mode */
    configMode: boolean;
    /** Side Panel install dialog open */
    sidePanelDialogOpen: boolean;
    /** Widget dialog to auto-open on a load (from hash, e.g. "alias.0.Kitchen.Light_chart") */
    openDialogId: string | null;
    /** Plugin widgets available from adapter instances */
    adapterWidgets: Record<string, ioBroker.DevicesWidgets>;
}

const ROOT_CATEGORY = '__root__';
const FAVORITES_CATEGORY = '__favorites__';

/** Widget types where the icon is stored in `common.icon` and iconActive in `common.custom` */
const ALARM_ICON_TYPES = new Set([
    Types.floodAlarm,
    Types.fireAlarm,
    Types.motion,
    Types.window,
    Types.door,
    Types.warning,
]);

/**
 * Device List Component
 */
const WM_FONT_FAMILY = '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif';

interface WmThemePreset {
    mode: 'dark' | 'light';
    primary: string;
    secondary: string;
    bgDefault: string;
    bgPaper: string;
    textPrimary: string;
    textSecondary: string;
    textDisabled: string;
}

// Default GUI background: pure black for dark themes, pure white for light. If the user
// sets a per-category backgroundColor, that takes precedence; otherwise this is the page bg.
// Default text colour mirrors that: pure white on dark themes, pure black on light.
const WM_THEME_PRESETS: Record<string, WmThemePreset> = {
    dark: {
        mode: 'dark',
        primary: '#90caf9',
        secondary: '#ce93d8',
        bgDefault: '#000000',
        bgPaper: '#1e1e1e',
        textPrimary: '#ffffff',
        textSecondary: 'rgba(255,255,255,0.7)',
        textDisabled: 'rgba(255,255,255,0.5)',
    },
    light: {
        mode: 'light',
        primary: '#1976d2',
        secondary: '#9c27b0',
        bgDefault: '#ffffff',
        bgPaper: '#ffffff',
        textPrimary: '#000000',
        textSecondary: 'rgba(0,0,0,0.6)',
        textDisabled: 'rgba(0,0,0,0.38)',
    },
    orangeDark: {
        mode: 'dark',
        primary: '#f5a623',
        secondary: '#ff7043',
        bgDefault: '#000000',
        bgPaper: '#2c2c2e',
        textPrimary: '#f5f5f5',
        textSecondary: 'rgba(245,245,245,0.65)',
        textDisabled: 'rgba(245,245,245,0.4)',
    },
    blueDark: {
        mode: 'dark',
        primary: '#5eb8ff',
        secondary: '#82b1ff',
        bgDefault: '#000000',
        bgPaper: '#1b2838',
        textPrimary: '#e0e6ed',
        textSecondary: 'rgba(224,230,237,0.65)',
        textDisabled: 'rgba(224,230,237,0.4)',
    },
    'styling-grey': {
        mode: 'dark',
        primary: '#a0a0a0',
        secondary: '#78909c',
        bgDefault: '#000000',
        bgPaper: '#1c1c1e',
        textPrimary: '#e8e8e8',
        textSecondary: 'rgba(232,232,232,0.55)',
        textDisabled: 'rgba(232,232,232,0.35)',
    },
};

export class CategoryList extends Communication<CategoryListProps, CategoryListState> {
    static i18nInitialized = false;

    static fontLoaded = false;

    private static loadConfigMode(admin: boolean): boolean {
        try {
            const stored = localStorage.getItem('wm_configMode');
            if (stored !== null) {
                return JSON.parse(stored) === true;
            }
        } catch {
            // ignore
        }
        // Default: true in admin, false in web
        return !!admin;
    }

    private stateContext: StateContext = new StateContext({
        socket: this.props.socket,
        admin: this.props.admin,
        dateFormat: this.props.dateFormat,
        isFloatComma: this.props.isFloatComma,
        instanceId: '',
        latitude: null,
        longitude: null,
        defaultHistory: null,
    });

    private lastAliveSubscribe = '';

    private lastTriggerLoad = 0;

    /** Prevents concurrent loadItemsList calls */
    private loadingInProgress = false;

    private filterTimeout: ReturnType<typeof setTimeout> | null = null;

    private widgetTheme: Theme | null = null;

    private widgetThemeType = '';

    private communicationStateId = '';

    private rootSettingsStateId = '';

    /** Cached guiConfig — available immediately, unlike this.state.guiConfig which is async */
    private guiConfigCache: GuiConfig | undefined;

    constructor(props: CategoryListProps) {
        super(props);

        if (!CategoryList.i18nInitialized) {
            CategoryList.i18nInitialized = true;
            I18n.extendTranslations({
                en,
                de,
                ru,
                pt,
                nl,
                fr,
                it,
                es,
                pl,
                uk,
                'zh-cn': zhCn,
            });
        }

        this.state = {
            ...this.state,
            categories: [],
            widgets: [],
            filter: '',
            loading: null,
            alive: null,
            widgetSettings: {},
            settingsWidgetId: null,
            chartAvailable: false,
            settingsObjectName: '',
            settingsObjectColor: '',
            categorySettings: {},
            categorySettingsCategoryId: null,
            customWidgetDialogCategoryId: null,
            customWidgetSettingsCategoryId: null,
            customWidgetSettingsWidgetId: null,
            configMode: !!this.props.showSettingsButton && CategoryList.loadConfigMode(this.props.admin),
            sidePanelDialogOpen: false,
            openDialogId: null,
            adapterWidgets: {},
        };

        this.lastTriggerLoad = this.props.triggerLoad || 0;
        this.stateContext.setInstanceId(this.state.selectedInstance);
    }

    // --- Hash routing ---

    private getCategoryName = (category: CategoryInfo): string => {
        if (category.name && typeof category.name === 'object' && (category.name as { objectId: string }).objectId) {
            // ValueOrObject pattern — resolved asynchronously elsewhere
            return String(category.id).split('.').pop() || '';
        }
        return (
            resolveTranslated(category.name as ioBroker.StringOrTranslated, this.stateContext.language) ||
            String(category.id).split('.').pop() ||
            ''
        );
    };

    /** Build a hash path like #Room/SubRoom by walking up the parent chain */
    private buildHashPath(category?: CategoryInfo): string {
        if (!category || String(category.id) === ROOT_CATEGORY) {
            return '';
        }
        const segments: string[] = [];
        let current: CategoryInfo | undefined = category;
        while (current && String(current.id) !== ROOT_CATEGORY) {
            segments.unshift(encodeURIComponent(this.getCategoryName(current)));
            current = this.state.categories.find(c => String(c.id) === String(current!.parent));
        }
        return segments.join('/');
    }

    /** Build the virtual Favorites CategoryInfo (or null if no favorites exist) */
    private buildFavoritesCategory(widgetSettings?: Record<string, WidgetSettingsBase>): CategoryInfo | null {
        const ws = widgetSettings || this.state.widgetSettings;
        const hasWidgetFavorites = Object.values(ws).some(s => s.favorite);
        const hasCustomFavorites = Object.values(this.state.categorySettings).some(cs =>
            cs.customWidgets?.some(cw => cw.favorite),
        );
        if (!hasWidgetFavorites && !hasCustomFavorites) {
            return null;
        }
        return {
            id: FAVORITES_CATEGORY,
            type: 'category',
            parent: ROOT_CATEGORY,
            name: I18n.t('wm_Favorites'),
            icon: '⭐',
        };
    }

    /** Resolve a hash like #Room/SubRoom back to a CategoryInfo from the given list */
    private resolveCategoryFromHash(
        hash: string,
        categories: CategoryInfo[],
        widgetSettings?: Record<string, WidgetSettingsBase>,
    ): CategoryInfo | undefined {
        const raw = hash.startsWith('#') ? hash.substring(1) : hash;
        if (!raw || raw === 'root') {
            return categories.find(c => String(c.id) === ROOT_CATEGORY);
        }
        const segments = raw.split('/').map(s => decodeURIComponent(s));

        // Walk down from root matching names at each level
        let parentId: string = ROOT_CATEGORY;
        let found: CategoryInfo | undefined;
        for (const segment of segments) {
            found = categories.find(c => String(c.parent) === String(parentId) && this.getCategoryName(c) === segment);
            if (!found) {
                // Check if this segment matches the virtual Favorites category
                if (parentId === ROOT_CATEGORY) {
                    const favCat = this.buildFavoritesCategory(widgetSettings);
                    if (favCat && this.getCategoryName(favCat) === segment) {
                        found = favCat;
                    }
                }
                if (!found) {
                    return undefined;
                }
            }
            parentId = String(found.id);
        }
        return found;
    }

    private updateHash(category?: CategoryInfo, dialogId?: string | null): void {
        const path = this.buildHashPath(category);
        let newHash = path ? `#${path}` : '#root';
        if (dialogId) {
            newHash += `?dialog=${encodeURIComponent(dialogId)}`;
        }
        if (window.location.hash !== newHash) {
            window.location.hash = newHash;
        }
        // Persist to localStorage so Android WebView can restore on reopening
        try {
            localStorage.setItem('wm_lastHash', newHash);
        } catch {
            // ignore
        }
    }

    /** Parse a hash string and extract the dialog ID if present */
    private static parseHash(hash: string): { path: string; dialogId: string | null } {
        const raw = hash.startsWith('#') ? hash.substring(1) : hash;
        const qIdx = raw.indexOf('?');
        if (qIdx < 0) {
            return { path: raw, dialogId: null };
        }
        const path = raw.substring(0, qIdx);
        const params = new URLSearchParams(raw.substring(qIdx + 1));
        return { path, dialogId: params.get('dialog') };
    }

    /** Open a widget dialog and persist it in the hash */
    onOpenWidgetDialog = (dialogId: string): void => {
        this.setState({ openDialogId: dialogId });
        if (this.state.currentCategory) {
            this.updateHash(this.state.currentCategory, dialogId);
        }
    };

    /** Close the widget dialog and remove it from the hash */
    onCloseWidgetDialog = (): void => {
        this.setState({ openDialogId: null });
        if (this.state.currentCategory) {
            this.updateHash(this.state.currentCategory);
        }
    };

    private onHashChange = (): void => {
        if (!this.state.categories.length) {
            return;
        }
        const { path, dialogId } = CategoryList.parseHash(window.location.hash);
        const hashForResolve = path ? `#${path}` : '';
        const category = this.resolveCategoryFromHash(hashForResolve, this.state.categories);
        if (category && String(category.id) !== String(this.state.currentCategory?.id)) {
            this.setState({ currentCategory: category, openDialogId: dialogId });
        } else if (dialogId !== this.state.openDialogId) {
            this.setState({ openDialogId: dialogId });
        }
    };

    async componentDidMount(): Promise<void> {
        this.rootSettingsStateId = `${this.state.selectedInstance}.${this.props.rootSettingsStateId || 'config'}`;
        const guiConfigState = await this.props.socket.getObject(this.rootSettingsStateId);
        if (guiConfigState) {
            const guiConfig = guiConfigState.native as GuiConfig;
            this.guiConfigCache = guiConfig;
            this.setState({ guiConfig });
            // Apply PWA icon on initial load
            if (guiConfig?.root?.icon) {
                CategoryList.applyPwaIcon(guiConfig.root.icon, this.props.admin);
            }
        }
        await this.props.socket.subscribeObject(this.rootSettingsStateId, this.onConfigChanged);

        if (this.props.communicationStateId) {
            if (this.props.communicationStateId === true) {
                this.communicationStateId = `${this.state.selectedInstance}.info.widgetManager`;
            } else {
                this.communicationStateId = `${this.state.selectedInstance}.${this.communicationStateId}`;
            }
            // ensure that state does exist
            const obj = await this.props.socket.getObject(this.communicationStateId);
            if (!obj) {
                window.alert(
                    `Updates from backend is not available, because state ${this.props.communicationStateId} does not exist`,
                );
            } else {
                await this.props.socket.subscribeState(this.communicationStateId, this.onBackendCommand);
            }
        }
        if (!CategoryList.fontLoaded) {
            CategoryList.fontLoaded = true;
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
            document.head.appendChild(link);
        }

        window.addEventListener('hashchange', this.onHashChange);

        let alive = false;

        if (this.state.alive === null && this.state.selectedInstance) {
            try {
                // check if the instance is alive
                const stateAlive = await this.props.socket.getState(
                    `system.adapter.${this.state.selectedInstance}.alive`,
                );
                if (stateAlive?.val) {
                    alive = true;
                }
            } catch (error) {
                console.error(error);
            }
            this.lastAliveSubscribe = this.state.selectedInstance;
            this.setState({ alive }, () =>
                this.props.socket.subscribeState(
                    `system.adapter.${this.state.selectedInstance}.alive`,
                    this.aliveHandler,
                ),
            );
        } else if (this.state.alive !== null) {
            alive = this.state.alive;
        }

        if (alive) {
            this.loadItemsList();
        }

        // Load system settings from system.config
        try {
            const sysConfig = await this.stateContext.getObject<ioBroker.SystemConfigObject>('system.config');
            if (sysConfig?.common) {
                const common = sysConfig.common;
                const update: Partial<CategoryListState> = {};
                if (common.latitude != null && common.longitude != null) {
                    this.stateContext.setCoordinates(common.latitude, common.longitude);
                }
                if (common.isFloatComma != null) {
                    this.stateContext.setFloatComma(!!common.isFloatComma);
                }
                if (common.dateFormat) {
                    this.stateContext.setDateFormat(common.dateFormat);
                }
                this.setState(update as CategoryListState);
            }
        } catch {
            // ignore
        }
    }

    async componentWillUnmount(): Promise<void> {
        window.removeEventListener('hashchange', this.onHashChange);
        if (this.state.selectedInstance) {
            this.props.socket.unsubscribeState(
                `system.adapter.${this.state.selectedInstance}.alive`,
                this.aliveHandler,
            );
        }

        if (this.communicationStateId) {
            this.props.socket.unsubscribeState(this.communicationStateId, this.onBackendCommand);
        }
        await this.props.socket.unsubscribeObject(this.rootSettingsStateId, this.onConfigChanged);
    }

    onBackendCommand = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === this.communicationStateId && state?.val) {
            try {
                const command = JSON.parse(state.val as string);
                if (command.command === 'all') {
                    this.loadItemsList();
                }
            } catch (error) {
                console.error(`Cannot parse command "${state.val}": ${error}`);
            }
        }
    };

    onConfigChanged = (id: string, obj: ioBroker.ChannelObject | null | undefined): void => {
        if (id === this.rootSettingsStateId && obj?.native) {
            const guiConfig = obj.native as GuiConfig;
            this.guiConfigCache = guiConfig;
            if (JSON.stringify(this.state.guiConfig) !== JSON.stringify(guiConfig)) {
                this.setState(prev => {
                    const categorySettings = { ...prev.categorySettings };
                    if (guiConfig.root) {
                        categorySettings[ROOT_CATEGORY] = {
                            name: guiConfig.root.title || '',
                            color: guiConfig.root.color || '',
                            backgroundColor: guiConfig.root.backgroundColor || '',
                            image: guiConfig.root.image || '',
                            imageScope: guiConfig.root.imageScope || 'header',
                            icon: guiConfig.root.icon || '',
                            rootIcon: guiConfig.root.rootIcon || '',
                            wmTheme: guiConfig.root.wmTheme,
                            defaultCategory: guiConfig.root.defaultCategory || '',
                            hideConfigButton: guiConfig.root.hideConfigButton,
                            widgetsGrouped: guiConfig.root.widgetsGrouped,
                            customWidgets: guiConfig.root.customWidgets,
                            widgetOrder: guiConfig.root.widgetOrder,
                            widgetGroups: guiConfig.root.widgetGroups,
                        };
                    }
                    if (guiConfig.favorites) {
                        categorySettings[FAVORITES_CATEGORY] = {
                            name: guiConfig.favorites.name || '',
                            color: guiConfig.favorites.color || '',
                            backgroundColor: guiConfig.favorites.backgroundColor || '',
                            image: guiConfig.favorites.image || '',
                            imageScope: guiConfig.favorites.imageScope || 'header',
                            icon: guiConfig.favorites.icon || '',
                            widgetsGrouped: guiConfig.favorites.widgetsGrouped,
                            widgetOrder: guiConfig.favorites.widgetOrder,
                            widgetGroups: guiConfig.favorites.widgetGroups,
                        };
                    }
                    return { guiConfig, categorySettings };
                });
                // Apply PWA icon if changed
                if (guiConfig.root?.icon) {
                    CategoryList.applyPwaIcon(guiConfig.root.icon, this.props.admin);
                }
            }
        }
    };

    aliveHandler: ioBroker.StateChangeHandler = (id: string, state: ioBroker.State | null | undefined): void => {
        if (this.state.selectedInstance && id === `system.adapter.${this.state.selectedInstance}.alive`) {
            const alive = !!state?.val;
            if (alive !== this.state.alive) {
                this.setState({ alive }, () => {
                    if (alive) {
                        this.componentDidMount().catch(console.error);
                    }
                });
            }
        }
    };

    /**
     * Load devices
     */
    override loadItemsList(): void {
        if (this.loadingInProgress) {
            return;
        }
        this.loadingInProgress = true;
        this.setState({ loading: true }, async () => {
            console.log(`Loading items for ${this.state.selectedInstance}...`);
            let alive = this.state.alive;

            if (this.state.selectedInstance !== this.lastAliveSubscribe) {
                if (this.lastAliveSubscribe) {
                    // unsubscribe from the old instance
                    this.props.socket.unsubscribeState(
                        `system.adapter.${this.lastAliveSubscribe}.alive`,
                        this.aliveHandler,
                    );
                }

                this.lastAliveSubscribe = this.state.selectedInstance;

                if (this.state.selectedInstance) {
                    this.stateContext.setInstanceId(this.state.selectedInstance);
                    try {
                        // check if the instance is alive
                        const stateAlive = await this.props.socket.getState(
                            `system.adapter.${this.state.selectedInstance}.alive`,
                        );
                        if (stateAlive?.val) {
                            alive = true;
                        }
                    } catch (error) {
                        console.error(error);
                    }
                    await this.props.socket.subscribeState(
                        `system.adapter.${this.state.selectedInstance}.alive`,
                        this.aliveHandler,
                    );
                } else {
                    alive = false;
                }
            }

            try {
                this.setState({ loading: !!alive, alive });
                if (alive) {
                    await this.loadItems(result => {
                        // Build widget settings first so Favorites can be resolved
                        const widgetSettings = CategoryList.extractWidgetSettingsFromWidgets(result.widgets);

                        // In admin mode, always start at root (ignore hash and favorites).
                        // In web mode, restore from hash or fall back to the default category.
                        let currentCategory: CategoryInfo | undefined;
                        let openDialogId: string | null = null;

                        let hash = window.location.hash;
                        // '' = no hash at all → fall back to default/favorites
                        // '#root' or '#Kitchen/...' = explicit path → resolve from hash
                        let hasHash = hash.length > 1;

                        // Restore from localStorage if no hash (e.g. Android WebView reopen)
                        if (!hasHash && !this.props.admin) {
                            try {
                                const stored = localStorage.getItem('wm_lastHash');
                                if (stored && stored.length > 1) {
                                    hash = stored;
                                    hasHash = true;
                                }
                            } catch {
                                // ignore
                            }
                        }

                        if (hasHash) {
                            const parsed = CategoryList.parseHash(hash);
                            openDialogId = parsed.dialogId;
                            const hashForResolve = parsed.path ? `#${parsed.path}` : '';
                            currentCategory = this.resolveCategoryFromHash(
                                hashForResolve,
                                result.categories,
                                widgetSettings,
                            );
                        }

                        if (!currentCategory && !this.props.admin) {
                            const defaultCatId = this.guiConfigCache?.root?.defaultCategory;
                            // Only fall back to default category (favorites) when there is no hash at all
                            if (!hasHash && defaultCatId) {
                                if (defaultCatId === FAVORITES_CATEGORY) {
                                    currentCategory = this.buildFavoritesCategory(widgetSettings) || undefined;
                                } else {
                                    currentCategory = result.categories.find(c => String(c.id) === defaultCatId);
                                }
                            }
                        }

                        if (!currentCategory) {
                            currentCategory =
                                result.categories.find(c => c.id === ROOT_CATEGORY) || result.categories[0];
                        }

                        this.setState({
                            categories: result.categories,
                            widgets: result.widgets,
                            loading: false,
                            currentCategory,
                            widgetSettings,
                            openDialogId,
                            adapterWidgets: result.adapterWidgets || {},
                        });
                        // Update hash to reflect the resolved category (preserve dialog if present)
                        this.updateHash(currentCategory, openDialogId);
                        console.log(
                            `Loaded ${result.categories.length} categories and ${result.widgets.length} widgets...`,
                        );
                        // Extract category settings from category.custom delivered by backend
                        // Pass result.widgets because this.state.widgets hasn't been committed yet
                        this.extractCategorySettings(result.categories, result.widgets);
                        this.loadingInProgress = false;
                    });
                } else {
                    this.loadingInProgress = false;
                }
            } catch (error) {
                console.error(error);
                this.loadingInProgress = false;
            }
        });
    }

    // --- Backend update handlers ---

    override updateItem(update: ItemInfo): void {
        if (update.type === 'category') {
            const category = update as CategoryInfo;
            const exists = this.state.categories.some(c => String(c.id) === String(category.id));
            const categories = exists
                ? this.state.categories.map(c => (String(c.id) === String(category.id) ? category : c))
                : [...this.state.categories, category];

            const stateUpdate: Partial<CategoryListState> = { categories };
            // If the current category was updated, refresh it
            if (this.state.currentCategory && String(this.state.currentCategory.id) === String(category.id)) {
                stateUpdate.currentCategory = category;
            }
            this.setState(stateUpdate as CategoryListState);
        } else {
            const widget = update as WidgetInfo;
            const exists = this.state.widgets.some(w => String(w.id) === String(widget.id));
            const widgets = exists
                ? this.state.widgets.map(w => (String(w.id) === String(widget.id) ? widget : w))
                : [...this.state.widgets, widget];

            // Update widget settings from custom data
            const widgetSettings = { ...this.state.widgetSettings };
            const extracted = CategoryList.extractSingleWidgetSettings(widget);
            if (extracted) {
                widgetSettings[String(widget.id)] = extracted;
            } else {
                delete widgetSettings[String(widget.id)];
            }

            this.setState({ widgets, widgetSettings });
        }
    }

    override deleteItem(itemId: string): void {
        const categoryIdx = this.state.categories.findIndex(c => String(c.id) === itemId);
        if (categoryIdx !== -1) {
            const categories = this.state.categories.filter(c => String(c.id) !== itemId);
            const stateUpdate: Partial<CategoryListState> = { categories };
            // If the deleted category was the current one, navigate to parent or root
            if (this.state.currentCategory && String(this.state.currentCategory.id) === itemId) {
                const parent = this.state.currentCategory.parent;
                stateUpdate.currentCategory =
                    categories.find(c => String(c.id) === String(parent)) ||
                    categories.find(c => String(c.id) === ROOT_CATEGORY) ||
                    categories[0];
            }
            this.setState(stateUpdate as CategoryListState);
        } else {
            const widgets = this.state.widgets.filter(w => String(w.id) !== itemId);
            this.setState({ widgets });
        }
    }

    private onOpenSettings = (widgetId: string | number): void => {
        this.setState({
            settingsWidgetId: widgetId,
            chartAvailable: false,
            settingsObjectName: '',
            settingsObjectColor: '',
        });
        void this.checkChartAvailable(widgetId);
        void this.loadObjectSettings(widgetId);
    };

    private async loadObjectSettings(widgetId: string | number): Promise<void> {
        try {
            const obj = await this.stateContext.getObject<ioBroker.Object>(String(widgetId));
            if (obj?.common) {
                const name = resolveTranslated(obj.common.name, this.stateContext.language);
                const color = (obj.common.color as string) || '';
                this.setState({ settingsObjectName: name, settingsObjectColor: color });
            }
        } catch {
            // ignore
        }
    }

    private async checkChartAvailable(widgetId: string | number): Promise<void> {
        const widget = this.state.widgets.find(w => w.id === widgetId);
        if (!widget?.control?.states?.length) {
            return;
        }

        if (!this.stateContext.defaultHistory) {
            try {
                const sysConfig = await this.stateContext.getObject<ioBroker.SystemConfigObject>('system.config');
                this.stateContext.setDefaultHistory(sysConfig?.common?.defaultHistory || '');
            } catch {
                this.stateContext.setDefaultHistory('');
            }
        }

        if (!this.stateContext.defaultHistory) {
            return;
        }

        for (const s of widget.control.states) {
            if (!s.id) {
                continue;
            }
            try {
                if (await this.hasHistoryEnabled(s.id)) {
                    this.setState({ chartAvailable: true });
                    return;
                }
            } catch {
                // ignore
            }
        }
    }

    private async hasHistoryEnabled(stateId: string): Promise<boolean> {
        let obj: ioBroker.StateObject | undefined;
        try {
            obj = await this.stateContext.getObject<ioBroker.StateObject>(stateId);
        } catch {
            return false;
        }
        if (!obj) {
            return false;
        }
        if (obj.common?.custom?.[this.stateContext.defaultHistory!]?.enabled) {
            return true;
        }
        // Follow alias to the target and check there
        const aliasId = obj.common?.alias?.id;
        if (aliasId) {
            const targetId = typeof aliasId === 'object' ? aliasId.read : aliasId;
            if (targetId && targetId !== stateId) {
                try {
                    const targetObj = await this.stateContext.getObject<ioBroker.StateObject>(targetId);
                    if (targetObj?.common?.custom?.[this.stateContext.defaultHistory!]?.enabled) {
                        return true;
                    }
                } catch {
                    // ignore
                }
            }
        }
        return false;
    }

    private onSaveSettings = (settings: WidgetSettingsBase): void => {
        const { settingsWidgetId } = this.state;
        if (settingsWidgetId != null) {
            const widgetSettings = { ...this.state.widgetSettings, [String(settingsWidgetId)]: settings };

            // Update the local widget icon when the icon changes (via `icon` for all widget types)
            const widget = this.state.widgets.find(w => String(w.id) === String(settingsWidgetId));
            let widgets = this.state.widgets;
            if (widget) {
                if ((settings.icon || '') !== (widget.icon || '')) {
                    widgets = widgets.map(w =>
                        String(w.id) === String(settingsWidgetId) ? { ...w, icon: settings.icon || undefined } : w,
                    );
                }
            }

            this.setState({ widgetSettings, widgets, settingsWidgetId: null });
            void this.saveWidgetSettingsToObject(String(settingsWidgetId), settings);
        }
    };

    private onToggleFavorite = (widgetId: string): void => {
        const current = this.state.widgetSettings[widgetId] || WidgetGeneric.getDefaultSettings();
        const updated: WidgetSettingsBase = { ...current, favorite: !current.favorite };
        const widgetSettings = { ...this.state.widgetSettings, [widgetId]: updated };
        this.setState({ widgetSettings });
        void this.saveWidgetSettingsToObject(widgetId, updated);
    };

    /**
     * Extract WidgetSettingsBase from a single widget's custom data.
     * Returns a full WidgetSettingsBase if any non-default values exist, otherwise null.
     */
    private static extractSingleWidgetSettings(widget: WidgetInfo): WidgetSettingsBase | null {
        const custom = widget.custom;
        if (!custom) {
            return null;
        }
        const settings: Record<string, any> = {};
        const defaultSettings: WidgetSettingsBase = WidgetGeneric.getDefaultSettings();
        for (const key of Object.keys(defaultSettings)) {
            if (key === 'name') {
                // name is stored in common.name (widget.name), not in custom
            } else if (key === 'icon') {
                // icon comes from widget.icon (common.icon) for all widget types
                if (widget.icon) {
                    settings.icon = widget.icon;
                }
            } else if (key in custom) {
                settings[key] = custom[key];
            }
        }
        // Also extract widget-specific keys (e.g., pin, blindType) stored in custom
        for (const key of Object.keys(custom)) {
            if (key === 'enabled' || key === 'uiDisabled') {
                continue; // internal custom fields, not widget settings
            }
            if (!(key in settings) && !(key in defaultSettings)) {
                settings[key] = custom[key];
            }
        }

        if (!Object.keys(settings).length) {
            return null;
        }
        return { ...defaultSettings, ...settings };
    }

    /**
     * Build widgetSettings record from all loaded widgets' custom data.
     */
    static extractWidgetSettingsFromWidgets(widgets: WidgetInfo[]): Record<string, WidgetSettingsBase> {
        const result: Record<string, WidgetSettingsBase> = {};
        for (const widget of widgets) {
            const settings = CategoryList.extractSingleWidgetSettings(widget);
            if (settings) {
                result[String(widget.id)] = settings;
            }
        }
        return result;
    }

    /**
     * Persist widget settings to `common.custom[instanceId]` in the ioBroker object.
     * For alarm-type widgets: icon → `common.icon`, iconActive → `custom.iconActive`
     */
    private async saveWidgetSettingsToObject(widgetId: string, settings: WidgetSettingsBase): Promise<void> {
        const instanceId = this.state.selectedInstance;
        const widget = this.state.widgets.find(w => String(w.id) === widgetId);
        const isAlarmType = widget?.control?.type ? ALARM_ICON_TYPES.has(widget.control.type) : false;

        try {
            const obj = await this.props.socket.getObject(widgetId);
            if (!obj) {
                return;
            }
            const common = obj.common as ioBroker.StateCommon;
            common.custom ||= {};
            const custom = { ...(common.custom[instanceId] || {}) };
            // Compare attribute by attribute — include both base keys and widget-specific keys
            const defaultSettings = WidgetGeneric.getDefaultSettings() as unknown as Record<string, unknown>;
            const settingsRecord = settings as unknown as Record<string, unknown>;

            // Collect all keys: base defaults + any extra keys from the settings object
            const allKeys = new Set([...Object.keys(defaultSettings), ...Object.keys(settingsRecord)]);

            for (const key of allKeys) {
                if (key === 'name') {
                    if (settingsRecord.name) {
                        common.name = settingsRecord.name as string;
                    }
                    continue;
                }
                if (key === 'icon' && isAlarmType) {
                    if (settingsRecord.icon) {
                        common.icon = settingsRecord.icon as string;
                    } else {
                        delete common.icon;
                    }
                    continue;
                }
                if (key === 'icon' && !isAlarmType) {
                    if (settingsRecord.icon) {
                        common.icon = settingsRecord.icon as string;
                    } else {
                        delete common.icon;
                    }
                    continue;
                }
                const value = settingsRecord[key];
                if (value !== defaultSettings[key]) {
                    custom[key] = value;
                } else {
                    delete custom[key];
                }
            }

            common.custom[instanceId] = custom;
            await this.props.socket.setObject(obj._id, obj);
        } catch (err) {
            console.error('Failed to save widget settings:', err);
        }
    }

    private onCloseSettings = (): void => {
        this.setState({ settingsWidgetId: null });
    };

    /** Remove a widget ID from widgetOrder and widgetGroups of a given category */
    private removeWidgetFromOrder(categoryId: string, widgetId: string): void {
        const settings = this.state.categorySettings[categoryId];
        if (!settings) {
            return;
        }
        let changed = false;
        let { widgetOrder, widgetGroups } = settings;

        if (widgetOrder?.includes(widgetId)) {
            widgetOrder = widgetOrder.filter(id => id !== widgetId);
            changed = true;
        }
        if (widgetGroups?.length) {
            const cleaned = widgetGroups.map(g => ({
                ...g,
                widgetIds: g.widgetIds.filter(id => id !== widgetId),
            }));
            if (widgetGroups.some((g, i) => g.widgetIds.length !== cleaned[i].widgetIds.length)) {
                widgetGroups = cleaned;
                changed = true;
            }
        }

        if (changed) {
            if (widgetOrder) {
                this.onWidgetOrderChange(categoryId, widgetOrder);
            }
            if (widgetGroups) {
                this.onWidgetGroupsChange(categoryId, widgetGroups);
            }
        }
    }

    /** Remove a widget ID from order/groups across all categories */
    private removeWidgetFromAllOrders(widgetId: string): void {
        const id = String(widgetId);
        for (const categoryId of Object.keys(this.state.categorySettings)) {
            this.removeWidgetFromOrder(categoryId, id);
        }
    }

    /** Delete a widget by setting custom[instanceId] = null on its ioBroker object */
    private onDeleteWidget = async (): Promise<void> => {
        const widgetId = this.state.settingsWidgetId;
        if (widgetId == null) {
            return;
        }
        const instanceId = this.state.selectedInstance;
        try {
            const obj = await this.props.socket.getObject(String(widgetId));
            if (obj) {
                const common = obj.common as ioBroker.StateCommon;
                common.custom ||= {};
                common.custom[instanceId] = null;
                await this.props.socket.setObject(obj._id, obj);
            }
        } catch (err) {
            console.error('Failed to delete widget custom data:', err);
        }

        // Remove from local state and from order/groups
        const widgetSettings = { ...this.state.widgetSettings };
        delete widgetSettings[String(widgetId)];
        this.setState({ widgetSettings, settingsWidgetId: null });
        this.removeWidgetFromAllOrders(String(widgetId));
    };

    /** Delete a widget by ID (used for unsupported widget types that have a direct delete button) */
    private onDeleteWidgetById = async (widgetId: string | number): Promise<void> => {
        const instanceId = this.state.selectedInstance;
        try {
            const obj = await this.props.socket.getObject(String(widgetId));
            if (obj) {
                const common = obj.common as ioBroker.StateCommon;
                common.custom ||= {};
                common.custom[instanceId] = null;
                await this.props.socket.setObject(obj._id, obj);
            }
        } catch (err) {
            console.error('Failed to delete widget custom data:', err);
        }
        const widgetSettings = { ...this.state.widgetSettings };
        delete widgetSettings[String(widgetId)];
        this.setState({ widgetSettings });
        this.removeWidgetFromAllOrders(String(widgetId));
    };

    private extractCategorySettings(categories: CategoryInfo[], widgets?: WidgetInfo[]): void {
        const categorySettings: Record<string, CategorySettings> = {};

        // Root settings from guiConfig
        const rootConfig = this.state.guiConfig?.root;
        if (rootConfig) {
            categorySettings[ROOT_CATEGORY] = {
                name: rootConfig.title || '',
                color: rootConfig.color || '',
                backgroundColor: rootConfig.backgroundColor || '',
                image: rootConfig.image || '',
                imageScope: rootConfig.imageScope || 'header',
                icon: rootConfig.icon || '',
                rootIcon: rootConfig.rootIcon || '',
                wmTheme: rootConfig.wmTheme,
                defaultCategory: rootConfig.defaultCategory || '',
                hideConfigButton: rootConfig.hideConfigButton,
                widgetsGrouped: rootConfig.widgetsGrouped,
                customWidgets: rootConfig.customWidgets,
                widgetOrder: rootConfig.widgetOrder,
                widgetGroups: rootConfig.widgetGroups,
            };
        }

        // Favorites settings from guiConfig (virtual category — no real ioBroker object)
        const favConfig = this.state.guiConfig?.favorites;
        if (favConfig) {
            categorySettings[FAVORITES_CATEGORY] = {
                name: favConfig.name || '',
                color: favConfig.color || '',
                backgroundColor: favConfig.backgroundColor || '',
                image: favConfig.image || '',
                imageScope: favConfig.imageScope || 'header',
                icon: favConfig.icon || '',
                widgetsGrouped: favConfig.widgetsGrouped,
                widgetOrder: favConfig.widgetOrder,
                widgetGroups: favConfig.widgetGroups,
            };
        }

        for (const cat of categories) {
            const id = String(cat.id);
            if (id === ROOT_CATEGORY) {
                continue;
            }
            // name and color come from common (category fields), image/imageScope/backgroundColor from custom
            const name = this.getCategoryName(cat);
            const color = typeof cat.color === 'string' ? cat.color : '';
            const backgroundColor = cat.custom?.backgroundColor || '';
            const image = cat.custom?.image || '';
            const imageScope = cat.custom?.imageScope || 'header';
            const customWidgets = cat.custom?.customWidgets;

            const widgetOrder = cat.custom?.widgetOrder;
            const widgetGroups = cat.custom?.widgetGroups;
            const widgetsGrouped = cat.custom?.widgetsGrouped;
            const icon = typeof cat.icon === 'string' ? cat.icon : '';
            categorySettings[id] = {
                name,
                color,
                backgroundColor,
                image,
                imageScope,
                customWidgets,
                widgetOrder,
                widgetGroups,
                widgetsGrouped,
                icon,
            };
        }
        // Clean stale widget IDs from order/groups:
        // build a set of all valid IDs (regular widgets + custom widgets + category IDs)
        // Use passed widgets (from loadItems result) since this.state.widgets may not be committed yet
        const validIds = new Set<string>();
        for (const w of widgets || this.state.widgets) {
            validIds.add(String(w.id));
        }
        for (const cat of categories) {
            validIds.add(String(cat.id));
        }
        // The virtual Favorites category never appears in `categories` (it is synthesized in
        // render()), but its id is a legal entry in widgetOrder. Whitelist it so the clean-up
        // below doesn't strip it on every reload — without this, every refresh would persist
        // a widgetOrder with "__favorites__" removed, and the favourites tile would always
        // fall through to the "unordered" tail.
        validIds.add(FAVORITES_CATEGORY);
        for (const cs of Object.values(categorySettings)) {
            if (cs.customWidgets) {
                for (const cw of cs.customWidgets) {
                    validIds.add(cw.id);
                }
            }
        }

        for (const [catId, cs] of Object.entries(categorySettings)) {
            let catDirty = false;
            if (cs.widgetOrder) {
                const cleaned = cs.widgetOrder.filter(id => validIds.has(id));
                if (cleaned.length !== cs.widgetOrder.length) {
                    cs.widgetOrder = cleaned;
                    catDirty = true;
                }
            }
            if (cs.widgetGroups) {
                const cleaned = cs.widgetGroups.map(g => {
                    const ids = g.widgetIds.filter(id => validIds.has(id));
                    if (ids.length !== g.widgetIds.length) {
                        catDirty = true;
                        return { ...g, widgetIds: ids };
                    }
                    return g;
                });
                if (catDirty) {
                    cs.widgetGroups = cleaned;
                }
            }
            if (catDirty) {
                // Persist cleaned order/groups
                if (cs.widgetOrder) {
                    void this.saveWidgetOrderToObject(catId, cs.widgetOrder);
                }
                if (cs.widgetGroups) {
                    void this.saveWidgetGroupsToObject(catId, stripCollapsed(cs.widgetGroups));
                }
            }
        }

        this.setState({ categorySettings });
    }

    private onOpenCategorySettings = (categoryId: string): void => {
        this.setState({ categorySettingsCategoryId: categoryId });
    };

    private onSaveCategorySettings = (settings: CategorySettings): void => {
        const { categorySettingsCategoryId } = this.state;
        if (categorySettingsCategoryId != null) {
            const categorySettings = { ...this.state.categorySettings, [categorySettingsCategoryId]: settings };

            if (categorySettingsCategoryId === ROOT_CATEGORY) {
                // Save root settings to rootSettingsStateId native
                const guiConfig: GuiConfig = {
                    ...this.state.guiConfig,
                    root: {
                        ...this.state.guiConfig?.root,
                        title: settings.name || '',
                        color: settings.color || '',
                        backgroundColor: settings.backgroundColor || '',
                        image: settings.image || '',
                        imageScope: settings.imageScope || 'header',
                        icon: settings.icon || '',
                        rootIcon: settings.rootIcon || '',
                        wmTheme: settings.wmTheme || undefined,
                        defaultCategory: settings.defaultCategory || undefined,
                        hideConfigButton: settings.hideConfigButton || undefined,
                    },
                };
                this.setState({ categorySettings, categorySettingsCategoryId: null, guiConfig });
                void this.saveRootSettings(guiConfig);
                // Apply PWA icon
                if (settings.icon) {
                    CategoryList.applyPwaIcon(settings.icon, this.props.admin);
                }
            } else if (categorySettingsCategoryId === FAVORITES_CATEGORY) {
                // Favorites are virtual — persist in guiConfig.favorites alongside root
                const guiConfig: GuiConfig = {
                    ...this.state.guiConfig,
                    root: this.state.guiConfig?.root || {},
                    favorites: {
                        ...this.state.guiConfig?.favorites,
                        name: settings.name || '',
                        color: settings.color || '',
                        backgroundColor: settings.backgroundColor || '',
                        image: settings.image || '',
                        imageScope: settings.imageScope || 'header',
                        icon: settings.icon || '',
                    },
                };
                this.setState({ categorySettings, categorySettingsCategoryId: null, guiConfig });
                void this.saveRootSettings(guiConfig);
            } else {
                // Update local category: name/color on the category itself, image/imageScope in custom
                const categories = this.state.categories.map(cat => {
                    if (String(cat.id) === categorySettingsCategoryId) {
                        return {
                            ...cat,
                            name: settings.name || cat.name,
                            color: settings.color || undefined,
                            icon: settings.icon || undefined,
                            custom: {
                                enabled: true,
                                ...cat.custom,
                                backgroundColor: settings.backgroundColor || '',
                                image: settings.image || '',
                                imageScope: settings.imageScope || 'header',
                            },
                        };
                    }
                    return cat;
                });
                this.setState({ categorySettings, categories, categorySettingsCategoryId: null });
                // Persist to ioBroker object
                void this.saveCategorySettingsToObject(categorySettingsCategoryId, settings);
            }
        }
    };

    private async saveCategorySettingsToObject(categoryId: string, settings: CategorySettings): Promise<void> {
        const instanceId = this.state.selectedInstance;
        try {
            const obj: ioBroker.StateObject | null | undefined = (await this.props.socket.getObject(categoryId)) as
                | ioBroker.StateObject
                | null
                | undefined;
            if (obj) {
                const common = obj.common || {};
                // name, color and icon go to common
                if (settings.name) {
                    common.name = settings.name;
                }
                common.color = settings.color || '';
                if (settings.icon) {
                    common.icon = settings.icon;
                } else {
                    delete common.icon;
                }
                // image and imageScope go to common.custom[instance]
                common.custom ||= {};
                common.custom[instanceId] = {
                    enabled: true,
                    ...common.custom[instanceId],
                    backgroundColor: settings.backgroundColor || '',
                    image: settings.image || '',
                    imageScope: settings.imageScope || 'header',
                    ...(settings.widgetOrder ? { widgetOrder: settings.widgetOrder } : {}),
                };
                await this.props.socket.setObject(categoryId, obj);
            }
        } catch (err) {
            console.error('Failed to save category settings:', err);
        }
    }

    private async saveRootSettings(guiConfig: GuiConfig): Promise<void> {
        try {
            const obj = await this.props.socket.getObject(this.rootSettingsStateId);
            if (obj) {
                obj.native = guiConfig;
                await this.props.socket.setObject(this.rootSettingsStateId, obj);
            }
        } catch (err) {
            console.error('Failed to save root settings:', err);
        }
    }

    /**
     * Update the browser favicon and PWA manifest dynamically so the
     * Chrome extension / PWA uses the user-chosen icon.
     */
    static applyPwaIcon(iconPath: string, admin: boolean): void {
        const filePrefix = admin ? '../../files/' : '../';
        const iconUrl = `${filePrefix}${iconPath.replace(/^\//, '')}`;

        // Update favicon
        let faviconLink = document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
        if (!faviconLink) {
            faviconLink = document.createElement('link');
            faviconLink.rel = 'shortcut icon';
            document.head.appendChild(faviconLink);
        }
        faviconLink.href = iconUrl;

        // Also set apple-touch-icon
        let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
        if (!appleIcon) {
            appleIcon = document.createElement('link');
            appleIcon.rel = 'apple-touch-icon';
            document.head.appendChild(appleIcon);
        }
        appleIcon.href = iconUrl;

        // Update PWA manifest with a blob URL containing the icon
        const manifest = {
            short_name: document.title || 'Smart Home',
            name: document.title || 'Smart Home',
            icons: [
                { src: iconUrl, sizes: '192x192', type: 'image/png' },
                { src: iconUrl, sizes: '512x512', type: 'image/png' },
            ],
            start_url: '.',
            display: 'standalone',
            theme_color: '#000000',
            background_color: '#121212',
        };
        const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(blob);
        let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
        if (!manifestLink) {
            manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            document.head.appendChild(manifestLink);
        }
        manifestLink.href = manifestUrl;
    }

    private onCloseCategorySettings = (): void => {
        this.setState({ categorySettingsCategoryId: null });
    };

    // --- Widget order ---

    private onWidgetOrderChange = (categoryId: string, widgetOrder: string[]): void => {
        const existing = this.state.categorySettings[categoryId] || {
            name: '',
            color: '',
            backgroundColor: '',
            image: '',
            imageScope: 'header' as const,
        };
        const updatedSettings: CategorySettings = { ...existing, widgetOrder };
        const categorySettings = { ...this.state.categorySettings, [categoryId]: updatedSettings };

        if (categoryId === ROOT_CATEGORY) {
            const guiConfig: GuiConfig = {
                ...this.state.guiConfig,
                root: {
                    ...this.state.guiConfig?.root,
                    widgetOrder,
                },
            };
            this.setState({ categorySettings, guiConfig });
            void this.saveRootSettings(guiConfig);
        } else if (categoryId === FAVORITES_CATEGORY) {
            const guiConfig: GuiConfig = {
                ...this.state.guiConfig,
                root: this.state.guiConfig?.root || {},
                favorites: { ...this.state.guiConfig?.favorites, widgetOrder },
            };
            this.setState({ categorySettings, guiConfig });
            void this.saveRootSettings(guiConfig);
        } else {
            // Update local category custom
            const categories = this.state.categories.map(cat => {
                if (String(cat.id) === categoryId) {
                    return { ...cat, custom: { ...cat.custom, widgetOrder } };
                }
                return cat;
            });
            this.setState({ categorySettings, categories });
            void this.saveWidgetOrderToObject(categoryId, widgetOrder);
        }
    };

    private async saveWidgetOrderToObject(categoryId: string, widgetOrder: string[]): Promise<void> {
        const instanceId = this.state.selectedInstance;
        try {
            const obj = (await this.props.socket.getObject(categoryId)) as ioBroker.StateObject | null | undefined;
            if (obj) {
                const common = obj.common || {};
                common.custom ||= {};
                common.custom[instanceId] = {
                    ...common.custom[instanceId],
                    widgetOrder,
                };
                await this.props.socket.setObject(categoryId, obj);
            }
        } catch (err) {
            console.error('Failed to save widget order:', err);
        }
    }

    // --- Widget groups ---

    private onWidgetGroupsChange = (categoryId: string, widgetGroups: WidgetGroup[]): void => {
        // Strip the `collapsed` field — it lives in localStorage now, not in the object.
        const persistedGroups = stripCollapsed(widgetGroups) || widgetGroups;
        const existing = this.state.categorySettings[categoryId] || { ...DEFAULT_CATEGORY_SETTINGS };
        const updatedSettings: CategorySettings = { ...existing, widgetGroups: persistedGroups };
        const categorySettings = { ...this.state.categorySettings, [categoryId]: updatedSettings };

        if (categoryId === ROOT_CATEGORY) {
            const guiConfig: GuiConfig = {
                ...this.state.guiConfig,
                root: {
                    ...this.state.guiConfig?.root,
                    widgetGroups: persistedGroups,
                },
            };
            this.setState({ categorySettings, guiConfig });
            void this.saveRootSettings(guiConfig);
        } else if (categoryId === FAVORITES_CATEGORY) {
            const guiConfig: GuiConfig = {
                ...this.state.guiConfig,
                root: this.state.guiConfig?.root || {},
                favorites: { ...this.state.guiConfig?.favorites, widgetGroups: persistedGroups },
            };
            this.setState({ categorySettings, guiConfig });
            void this.saveRootSettings(guiConfig);
        } else {
            const categories = this.state.categories.map(cat => {
                if (String(cat.id) === categoryId) {
                    return { ...cat, custom: { ...cat.custom, widgetGroups: persistedGroups } };
                }
                return cat;
            });
            this.setState({ categorySettings, categories });
            void this.saveWidgetGroupsToObject(categoryId, persistedGroups);
        }
    };

    private onToggleGrouping = (
        categoryId: string,
        orderedItems: Array<{ type: 'category' | 'widget' | 'custom'; id: string; data: unknown }>,
    ): void => {
        const existing = this.state.categorySettings[categoryId] || { ...DEFAULT_CATEGORY_SETTINGS };
        // The source of truth is the explicit `widgetsGrouped` boolean. Fall back to checking widgetGroups
        // for legacy data that was saved before the flag existed.
        const isCurrentlyGrouped = existing.widgetsGrouped ?? !!existing.widgetGroups?.length;

        if (isCurrentlyGrouped) {
            // Disable grouping. Prefer the user's last sorted-view order if it was preserved;
            // otherwise reconstruct from the current groups.
            const widgetOrder =
                existing.widgetOrder && existing.widgetOrder.length
                    ? existing.widgetOrder
                    : existing.widgetGroups?.length
                      ? flattenGroups(existing.widgetGroups)
                      : [];
            const updatedSettings: CategorySettings = {
                ...existing,
                widgetsGrouped: false,
                widgetGroups: undefined,
                widgetOrder,
            };
            const categorySettings = { ...this.state.categorySettings, [categoryId]: updatedSettings };

            if (categoryId === ROOT_CATEGORY) {
                const guiConfig: GuiConfig = {
                    ...this.state.guiConfig,
                    root: {
                        ...this.state.guiConfig?.root,
                        widgetsGrouped: false,
                        widgetGroups: undefined,
                        widgetOrder,
                    },
                };
                this.setState({ categorySettings, guiConfig });
                void this.saveRootSettings(guiConfig);
            } else if (categoryId === FAVORITES_CATEGORY) {
                const guiConfig: GuiConfig = {
                    ...this.state.guiConfig,
                    root: this.state.guiConfig?.root || {},
                    favorites: {
                        ...this.state.guiConfig?.favorites,
                        widgetsGrouped: false,
                        widgetGroups: undefined,
                        widgetOrder,
                    },
                };
                this.setState({ categorySettings, guiConfig });
                void this.saveRootSettings(guiConfig);
            } else {
                const categories = this.state.categories.map(cat => {
                    if (String(cat.id) === categoryId) {
                        return {
                            ...cat,
                            custom: { ...cat.custom, widgetsGrouped: false, widgetGroups: undefined, widgetOrder },
                        };
                    }
                    return cat;
                });
                this.setState({ categorySettings, categories });
                void this.saveGroupingToggleToObject(categoryId, false, widgetOrder, undefined);
            }
        } else {
            // Enable grouping: auto-group. Preserve the existing widgetOrder so the user gets it
            // back when they toggle off again.
            const widgetGroups = autoGroupItems(orderedItems);
            const updatedSettings: CategorySettings = {
                ...existing,
                widgetsGrouped: true,
                widgetGroups,
                // existing.widgetOrder is kept by the spread above
            };
            const categorySettings = { ...this.state.categorySettings, [categoryId]: updatedSettings };

            if (categoryId === ROOT_CATEGORY) {
                const guiConfig: GuiConfig = {
                    ...this.state.guiConfig,
                    root: {
                        ...this.state.guiConfig?.root,
                        widgetsGrouped: true,
                        widgetGroups,
                        // widgetOrder kept via spread
                    },
                };
                this.setState({ categorySettings, guiConfig });
                void this.saveRootSettings(guiConfig);
            } else if (categoryId === FAVORITES_CATEGORY) {
                const guiConfig: GuiConfig = {
                    ...this.state.guiConfig,
                    root: this.state.guiConfig?.root || {},
                    favorites: {
                        ...this.state.guiConfig?.favorites,
                        widgetsGrouped: true,
                        widgetGroups,
                    },
                };
                this.setState({ categorySettings, guiConfig });
                void this.saveRootSettings(guiConfig);
            } else {
                const categories = this.state.categories.map(cat => {
                    if (String(cat.id) === categoryId) {
                        return { ...cat, custom: { ...cat.custom, widgetsGrouped: true, widgetGroups } };
                    }
                    return cat;
                });
                this.setState({ categorySettings, categories });
                // Pass existing.widgetOrder so it stays in the object (not overwritten with null).
                void this.saveGroupingToggleToObject(categoryId, true, existing.widgetOrder, widgetGroups);
            }
        }
    };

    /**
     * Single object write that updates widgetsGrouped + widgetOrder + widgetGroups atomically.
     *  `widgetOrder` is preserved (left untouched) when undefined — we never want to wipe it,
     *  because it represents the user's sorted-view choice.
     */
    private async saveGroupingToggleToObject(
        categoryId: string,
        widgetsGrouped: boolean,
        widgetOrder: string[] | undefined,
        widgetGroups: WidgetGroup[] | undefined,
    ): Promise<void> {
        const instanceId = this.state.selectedInstance;
        try {
            const obj = (await this.props.socket.getObject(categoryId)) as ioBroker.StateObject | null | undefined;
            if (obj) {
                const common = obj.common || {};
                common.custom ||= {};
                const prev = common.custom[instanceId] || {};
                common.custom[instanceId] = {
                    ...prev,
                    widgetsGrouped,
                    // Only overwrite widgetOrder when caller supplied one; otherwise keep prev.
                    ...(widgetOrder !== undefined ? { widgetOrder } : {}),
                    widgetGroups: widgetGroups || null,
                };
                await this.props.socket.setObject(categoryId, obj);
            }
        } catch (err) {
            console.error('Failed to save grouping toggle:', err);
        }
    }

    private onWidgetGroupMove = (categoryId: string, widgetId: string, targetGroupId: string): void => {
        const existing = this.state.categorySettings[categoryId];
        if (!existing?.widgetGroups?.length) {
            return;
        }
        const updatedGroups = moveWidgetToGroup(existing.widgetGroups, widgetId, targetGroupId);
        this.onWidgetGroupsChange(categoryId, updatedGroups);
    };

    private onMoveWidgetToCategory = (widgetId: string, targetCategoryId: string): void => {
        // Check if this is a custom widget (id starts with "custom_")
        if (widgetId.startsWith('custom_')) {
            this.moveCustomWidgetToCategory(widgetId, targetCategoryId);
            return;
        }

        // Regular widget: update parent in local state
        const widgets = this.state.widgets.map(w =>
            String(w.id) === widgetId ? { ...w, parent: targetCategoryId } : w,
        );
        this.setState({ widgets });

        // Persist: save parent override into common.custom[instance].parent
        void this.saveWidgetParentOverride(widgetId, targetCategoryId);
    };

    private moveCustomWidgetToCategory(widgetId: string, targetCategoryId: string): void {
        // Find the source category (skip virtual __favorites__)
        let sourceCatId: string | null = null;
        let widgetDef: CustomWidgetBase | null = null;
        for (const [catId, cs] of Object.entries(this.state.categorySettings)) {
            if (catId === FAVORITES_CATEGORY) {
                continue;
            }
            const found = cs.customWidgets?.find(w => w.id === widgetId);
            if (found) {
                sourceCatId = catId;
                widgetDef = found;
                break;
            }
        }
        if (!sourceCatId || !widgetDef) {
            return;
        }

        // Remove from source
        const sourceSettings = this.state.categorySettings[sourceCatId];
        const sourceWidgets = (sourceSettings?.customWidgets || []).filter(w => w.id !== widgetId);

        // Add to target
        const targetSettings = this.state.categorySettings[targetCategoryId] || { ...DEFAULT_CATEGORY_SETTINGS };
        const targetWidgets = [...(targetSettings.customWidgets || []), widgetDef];

        const categorySettings = {
            ...this.state.categorySettings,
            [sourceCatId]: { ...sourceSettings, customWidgets: sourceWidgets },
            [targetCategoryId]: { ...targetSettings, customWidgets: targetWidgets },
        };
        this.setState({ categorySettings });

        // Persist both
        this.persistCustomWidgets(sourceCatId, sourceWidgets);
        this.persistCustomWidgets(targetCategoryId, targetWidgets);
    }

    private async saveWidgetParentOverride(widgetId: string, targetCategoryId: string): Promise<void> {
        const instanceId = this.state.selectedInstance;
        try {
            const obj: ioBroker.StateObject | null | undefined = (await this.props.socket.getObject(widgetId)) as
                | ioBroker.StateObject
                | null
                | undefined;
            if (obj) {
                const common = obj.common || ({} as ioBroker.StateCommon);
                common.custom ||= {};
                common.custom[instanceId] = {
                    ...common.custom[instanceId],
                    parent: targetCategoryId,
                };
                await this.props.socket.setObject(obj._id, obj);
            }
        } catch (err) {
            console.error('Failed to save widget parent override:', err);
        }
    }

    private async saveWidgetGroupsToObject(categoryId: string, widgetGroups: WidgetGroup[] | undefined): Promise<void> {
        const instanceId = this.state.selectedInstance;
        try {
            const obj = (await this.props.socket.getObject(categoryId)) as ioBroker.StateObject | null | undefined;
            if (obj) {
                const common = obj.common || {};
                common.custom ||= {};
                common.custom[instanceId] = {
                    ...common.custom[instanceId],
                    widgetGroups: widgetGroups || null,
                };
                await this.props.socket.setObject(categoryId, obj);
            }
        } catch (err) {
            console.error('Failed to save widget groups:', err);
        }
    }

    // --- Custom widgets ---

    private onOpenCustomWidgetDialog = (categoryId: string): void => {
        this.setState({ customWidgetDialogCategoryId: categoryId });
    };

    private onAddPluginWidget = (adapter: string, component: string, url: string): void => {
        const { customWidgetDialogCategoryId } = this.state;
        if (!customWidgetDialogCategoryId || customWidgetDialogCategoryId === FAVORITES_CATEGORY) {
            return;
        }
        const id = `custom_plugin_${adapter}_${component}_${Date.now().toString(36)}`;
        const def = {
            id,
            type: 'plugin',
            pluginAdapter: adapter,
            pluginComponent: component,
            pluginUrl: url,
            size: '1x1',
        } as unknown as CustomWidgetBase;
        const settings = this.state.categorySettings[customWidgetDialogCategoryId] || { ...DEFAULT_CATEGORY_SETTINGS };
        const customWidgets = [...(settings.customWidgets || []), def];
        const categorySettings = {
            ...this.state.categorySettings,
            [customWidgetDialogCategoryId]: { ...settings, customWidgets },
        };
        this.persistCustomWidgets(customWidgetDialogCategoryId, customWidgets);

        // Ensure the plugin component is loaded before opening the settings dialog,
        // otherwise the config schema is not yet in cache and the dialog would show
        // only the base items (size/color) on first open.
        const openSettings = (): void => {
            this.setState({
                categorySettings,
                customWidgetDialogCategoryId: null,
                customWidgetSettingsCategoryId: customWidgetDialogCategoryId,
                customWidgetSettingsWidgetId: id,
            });
        };

        if (isPluginLoaded(adapter, component)) {
            openSettings();
        } else {
            // Persist widget list + close picker immediately; open settings after load.
            this.setState({ categorySettings, customWidgetDialogCategoryId: null });
            loadPluginComponent(url, adapter, component, this.props.admin)
                .then(openSettings)
                .catch(err => {
                    console.error(`Cannot load plugin ${adapter}/${component}: ${err}`);
                    openSettings();
                });
        }
    };

    private onCloseCustomWidgetDialog = (): void => {
        this.setState({ customWidgetDialogCategoryId: null });
    };

    private onCreateCategory = (name: string): void => {
        const { customWidgetDialogCategoryId } = this.state;
        if (!customWidgetDialogCategoryId) {
            return;
        }
        // Build the new folder object ID under the current category
        // Root category → alias.0.{name}, subcategory → {parentId}.{name}
        const parentId =
            customWidgetDialogCategoryId === ROOT_CATEGORY ? `alias.0` : String(customWidgetDialogCategoryId);
        // Sanitize name for object ID (replace spaces/special chars)
        const safeName = name.replace(/[.\s/\\]+/g, '_').replace(/[^a-zA-Z0-9_äöüÄÖÜß-]/g, '');
        const newId = `${parentId}.${safeName}`;

        const instanceId = this.state.selectedInstance;
        const obj: ioBroker.SettableObject = {
            _id: newId,
            type: 'folder',
            common: {
                name,
                custom: {
                    [instanceId]: { showEmpty: true },
                },
            } as ioBroker.ObjectCommon,
            native: {},
        };

        void this.props.socket
            .setObject(newId, obj as ioBroker.Object)
            .then(() => {
                // Reload categories
                this.setState({ customWidgetDialogCategoryId: null });
                this.setState(prev => ({
                    triggerLoad: (prev as unknown as { triggerLoad?: number }).triggerLoad || 0,
                }));
                // Trigger a full reload
                this.loadItemsList();
            })
            .catch(err => {
                console.error('Failed to create category:', err);
            });
    };

    private onAddCustomWidget = (type: CustomWidgetType): void => {
        const { customWidgetDialogCategoryId } = this.state;
        if (!customWidgetDialogCategoryId) {
            return;
        }
        const id = `custom_${type}_${Date.now().toString(36)}`;
        // Initialize with config defaults so grid sizing works immediately
        const defaults: Record<string, unknown> = {};
        const widgetConfig = CUSTOM_WIDGET_CONFIGS[type];
        if (widgetConfig) {
            for (const [key, item] of Object.entries(widgetConfig.items)) {
                defaults[key] = getConfigDefault(item);
            }
        }
        const def: CustomWidgetBase = { id, type, ...defaults } as CustomWidgetBase;

        const settings = this.state.categorySettings[customWidgetDialogCategoryId] || { ...DEFAULT_CATEGORY_SETTINGS };
        const customWidgets = [...(settings.customWidgets || []), def];
        const categorySettings = {
            ...this.state.categorySettings,
            [customWidgetDialogCategoryId]: { ...settings, customWidgets },
        };
        this.setState({
            categorySettings,
            customWidgetDialogCategoryId: null,
            // Open settings dialog for the newly added widget (skip for newline — no settings)
            customWidgetSettingsCategoryId: type !== 'newline' ? customWidgetDialogCategoryId : null,
            customWidgetSettingsWidgetId: type !== 'newline' ? id : null,
        });
        this.persistCustomWidgets(customWidgetDialogCategoryId, customWidgets);
    };

    private onRemoveCustomWidget = (categoryId: string, widgetId: string): void => {
        const settings = this.state.categorySettings[categoryId];
        if (!settings?.customWidgets) {
            return;
        }
        const customWidgets = settings.customWidgets.filter(w => w.id !== widgetId);
        const categorySettings = {
            ...this.state.categorySettings,
            [categoryId]: { ...settings, customWidgets },
        };
        this.setState({ categorySettings });
        this.persistCustomWidgets(categoryId, customWidgets);
        this.removeWidgetFromOrder(categoryId, widgetId);
    };

    private onToggleCustomWidgetFavorite = (widgetId: string): void => {
        // Find which category owns this custom widget (skip virtual favorites)
        for (const [catId, cs] of Object.entries(this.state.categorySettings)) {
            if (catId === FAVORITES_CATEGORY) {
                continue;
            }
            const idx = cs.customWidgets?.findIndex(w => w.id === widgetId) ?? -1;
            if (idx >= 0 && cs.customWidgets) {
                const customWidgets = cs.customWidgets.map((w, i) => {
                    if (i !== idx) {
                        return w;
                    }
                    return { ...w, favorite: !w.favorite };
                });
                const categorySettings = {
                    ...this.state.categorySettings,
                    [catId]: { ...cs, customWidgets },
                };
                this.setState({ categorySettings });
                this.persistCustomWidgets(catId, customWidgets);
                return;
            }
        }
    };

    private onOpenCustomWidgetSettings = (categoryId: string, widgetId: string): void => {
        this.setState({ customWidgetSettingsCategoryId: categoryId, customWidgetSettingsWidgetId: widgetId });
    };

    private onCloseCustomWidgetSettings = (): void => {
        this.setState({ customWidgetSettingsCategoryId: null, customWidgetSettingsWidgetId: null });
    };

    private onSaveCustomWidgetSettings = (def: CustomWidgetBase): void => {
        const { customWidgetSettingsCategoryId } = this.state;
        if (!customWidgetSettingsCategoryId) {
            return;
        }
        const settings = this.state.categorySettings[customWidgetSettingsCategoryId];
        if (!settings?.customWidgets) {
            return;
        }
        const customWidgets = settings.customWidgets.map(w => (w.id === def.id ? def : w));
        const categorySettings = {
            ...this.state.categorySettings,
            [customWidgetSettingsCategoryId]: { ...settings, customWidgets },
        };
        this.setState({ categorySettings, customWidgetSettingsCategoryId: null, customWidgetSettingsWidgetId: null });
        this.persistCustomWidgets(customWidgetSettingsCategoryId, customWidgets);
    };

    private onDeleteCustomWidgetFromSettings = (): void => {
        const { customWidgetSettingsCategoryId, customWidgetSettingsWidgetId } = this.state;
        if (customWidgetSettingsCategoryId && customWidgetSettingsWidgetId) {
            this.onRemoveCustomWidget(customWidgetSettingsCategoryId, customWidgetSettingsWidgetId);
        }
        this.setState({ customWidgetSettingsCategoryId: null, customWidgetSettingsWidgetId: null });
    };

    private persistCustomWidgets(categoryId: string, customWidgets: CustomWidgetBase[]): void {
        if (categoryId === ROOT_CATEGORY) {
            const guiConfig: GuiConfig = {
                ...this.state.guiConfig,
                root: { ...this.state.guiConfig?.root, customWidgets },
            };
            this.setState({ guiConfig });
            void this.saveRootSettings(guiConfig);
        } else {
            // Update the local category object and persist
            const categories = this.state.categories.map(cat => {
                if (String(cat.id) === categoryId) {
                    return { ...cat, custom: { ...cat.custom, customWidgets } };
                }
                return cat;
            });
            this.setState({ categories });
            void this.saveCustomWidgetsToObject(categoryId, customWidgets);
        }
    }

    private async saveCustomWidgetsToObject(categoryId: string, customWidgets: CustomWidgetBase[]): Promise<void> {
        const instanceId = this.state.selectedInstance;
        try {
            const obj = (await this.props.socket.getObject(categoryId)) as ioBroker.StateObject | null | undefined;
            if (obj) {
                obj.common.custom ||= {};
                obj.common.custom[instanceId] = {
                    ...obj.common.custom[instanceId],
                    customWidgets,
                };
                await this.props.socket.setObject(categoryId, obj);
            }
        } catch (err) {
            console.error('Failed to save custom widgets:', err);
        }
    }

    private getWidgetName(widget: WidgetInfo): string {
        return (
            resolveTranslated(widget.name as ioBroker.StringOrTranslated, this.stateContext.language) ||
            String(widget.id)
        );
    }

    private cachedWmThemeId: WmThemeId | undefined;

    private getWidgetTheme(): Theme {
        const wmThemeId: WmThemeId = this.state.categorySettings[ROOT_CATEGORY]?.wmTheme || 'auto';

        if (this.widgetTheme && this.widgetThemeType === this.props.themeType && this.cachedWmThemeId === wmThemeId) {
            return this.widgetTheme;
        }
        this.widgetThemeType = this.props.themeType;
        this.cachedWmThemeId = wmThemeId;

        const resolvedThemeId = wmThemeId === 'auto' ? this.props.themeType : wmThemeId;
        const preset = WM_THEME_PRESETS[resolvedThemeId];
        if (preset) {
            this.widgetTheme = createTheme({
                palette: {
                    mode: preset.mode,
                    primary: { main: preset.primary },
                    secondary: { main: preset.secondary },
                    background: {
                        default: preset.bgDefault,
                        paper: preset.bgPaper,
                    },
                    text: {
                        primary: preset.textPrimary,
                        secondary: preset.textSecondary,
                        disabled: preset.textDisabled,
                    },
                },
                typography: { fontFamily: WM_FONT_FAMILY },
                ...(resolvedThemeId === 'styling-grey'
                    ? {
                          components: {
                              MuiDialog: {
                                  styleOverrides: {
                                      paper: {
                                          borderRadius: '28px',
                                          background: 'linear-gradient(145deg, #222224, #1a1a1c)',
                                          border: '1px solid rgba(255,255,255,0.04)',
                                          boxShadow: '0 24px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
                                      },
                                  },
                              },
                              MuiDialogTitle: {
                                  styleOverrides: {
                                      root: {
                                          fontSize: '1rem',
                                          fontWeight: 600,
                                      },
                                  },
                              },
                              MuiDialogContent: {
                                  styleOverrides: {
                                      root: {
                                          '&::-webkit-scrollbar': { width: 6 },
                                          '&::-webkit-scrollbar-thumb': {
                                              background: 'rgba(255,255,255,0.1)',
                                              borderRadius: 3,
                                          },
                                      },
                                  },
                              },
                              MuiButton: {
                                  styleOverrides: {
                                      outlined: {
                                          borderColor: 'rgba(255,255,255,0.1)',
                                          borderRadius: '14px',
                                          '&:hover': {
                                              borderColor: 'rgba(255,255,255,0.2)',
                                              background: 'rgba(255,255,255,0.04)',
                                          },
                                      },
                                      contained: {
                                          borderRadius: '14px',
                                          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                      },
                                  },
                              },
                              MuiIconButton: {
                                  styleOverrides: {
                                      root: {
                                          '&:hover': {
                                              background: 'rgba(255,255,255,0.06)',
                                          },
                                      },
                                  },
                              },
                              MuiSlider: {
                                  styleOverrides: {
                                      root: {
                                          '& .MuiSlider-track': {
                                              boxShadow: '0 0 8px currentColor',
                                          },
                                          '& .MuiSlider-thumb': {
                                              boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                                          },
                                      },
                                  },
                              },
                          },
                      }
                    : {}),
            });
            // Store preset ID on theme so widgets can detect styling variants
            (this.widgetTheme as Theme & { wmPreset?: string }).wmPreset = resolvedThemeId;
        } else {
            this.widgetTheme = createTheme(this.props.theme, {
                typography: { fontFamily: WM_FONT_FAMILY },
            });
        }
        return this.widgetTheme;
    }

    render(): React.JSX.Element {
        if (this.state.alive === false) {
            return (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        opacity: 0.5,
                    }}
                >
                    {I18n.t('wm_Instance not active')}
                </div>
            );
        }

        // find the root category
        const currentCategory = this.state.currentCategory || this.state.categories.find(c => c.id === ROOT_CATEGORY);

        const settingsWidget =
            this.state.settingsWidgetId != null
                ? this.state.widgets.find(w => w.id === this.state.settingsWidgetId)
                : null;

        const hideConfigButton =
            this.state.categorySettings[ROOT_CATEGORY]?.hideConfigButton && !this.stateContext.admin;
        // When the config toggle is hidden (web mode + hideConfigButton), force runtime mode —
        // localStorage may carry configMode=true from a previous session, but the user has no
        // way to switch back, so editing callbacks and any per-tile config UI must stay off.
        const effectiveConfigMode = this.state.configMode && !hideConfigButton;
        // Editing callbacks are enabled only when showSettingsButton AND (effective) configMode are both true
        const editing = !!this.props.showSettingsButton && effectiveConfigMode;

        // Build virtual favorites category with widgets that have favorite=true
        const favoriteWidgetIds = Object.entries(this.state.widgetSettings)
            .filter(([, s]) => s.favorite)
            .map(([id]) => id);

        // Collect favorited custom widgets from all categories
        const favoriteCustomWidgets: CustomWidgetBase[] = [];
        for (const cs of Object.values(this.state.categorySettings)) {
            if (cs.customWidgets) {
                for (const cw of cs.customWidgets) {
                    if (cw.favorite) {
                        favoriteCustomWidgets.push(cw);
                    }
                }
            }
        }

        const hasFavorites = favoriteWidgetIds.length > 0 || favoriteCustomWidgets.length > 0;

        // Create a virtual favorites category as a child of root
        const favoritesCategory: CategoryInfo | null = hasFavorites ? this.buildFavoritesCategory() : null;

        // Virtual widget copies: set parent to favorite category so Category.widgets getter picks them up
        const favoriteWidgets: WidgetInfo[] = favoriteWidgetIds.length
            ? this.state.widgets
                  .filter(w => favoriteWidgetIds.includes(String(w.id)))
                  .map(w => ({ ...w, parent: FAVORITES_CATEGORY }))
            : [];

        // Merge into categories and widgets lists
        const categories = favoritesCategory ? [...this.state.categories, favoritesCategory] : this.state.categories;
        const widgets = favoriteWidgets.length ? [...this.state.widgets, ...favoriteWidgets] : this.state.widgets;

        // Add favorited custom widgets to the favorite category settings
        const categorySettings =
            favoriteCustomWidgets.length && favoritesCategory
                ? {
                      ...this.state.categorySettings,
                      [FAVORITES_CATEGORY]: {
                          ...this.state.categorySettings[FAVORITES_CATEGORY],
                          customWidgets: [
                              ...(this.state.categorySettings[FAVORITES_CATEGORY]?.customWidgets || []),
                              ...favoriteCustomWidgets,
                          ],
                      },
                  }
                : this.state.categorySettings;

        if (currentCategory) {
            return (
                <ThemeProvider theme={this.getWidgetTheme()}>
                    {/* The outer admin/GenericApp theme leaks colours into this subtree via
                        CSS inheritance — MUI's inner ThemeProvider only re-styles styled
                        components, not the wrapping div or things behind transparent widget
                        backgrounds. Paint the box explicitly AND force the common MUI surface
                        colours (paper / text.secondary) on every descendant so e.g. Hell theme
                        on a dark-mode admin doesn't show through transparent tile overlays. */}
                    <Box
                        sx={theme => ({
                            width: '100%',
                            height: '100%',
                            color: theme.palette.text.primary,
                            backgroundColor: theme.palette.background.default,
                            // Repaint paper-backed surfaces (Cards, Menus inline, etc.) so widget
                            // backgrounds that use `background.paper` don't leak the outer dark
                            // shade through. Limited to children of this container, so dialogs
                            // rendered in a Portal at the document root are unaffected.
                            '& .MuiPaper-root': {
                                backgroundColor: theme.palette.background.paper,
                                color: theme.palette.text.primary,
                            },
                            // CSS custom properties — picked up by MUI 5 when CssVarsProvider is
                            // active and by any consumer that reads them directly.
                            '--mui-palette-mode': theme.palette.mode,
                            '--mui-palette-background-default': theme.palette.background.default,
                            '--mui-palette-background-paper': theme.palette.background.paper,
                            '--mui-palette-text-primary': theme.palette.text.primary,
                            '--mui-palette-text-secondary': theme.palette.text.secondary,
                            '--mui-palette-divider': theme.palette.divider,
                        })}
                    >
                        <Category
                            key={currentCategory.id}
                            category={currentCategory}
                            categories={categories}
                            widgets={widgets}
                            stateContext={this.stateContext}
                            onNavigate={(category: CategoryInfo) => {
                                this.setState({ currentCategory: category });
                                this.updateHash(category);
                            }}
                            widgetSettings={this.state.widgetSettings}
                            onOpenSettings={editing ? this.onOpenSettings : undefined}
                            categorySettings={categorySettings}
                            onOpenCategorySettings={editing ? this.onOpenCategorySettings : undefined}
                            onAddCustomWidget={editing ? this.onOpenCustomWidgetDialog : undefined}
                            onRemoveCustomWidget={editing ? this.onRemoveCustomWidget : undefined}
                            onOpenCustomWidgetSettings={editing ? this.onOpenCustomWidgetSettings : undefined}
                            onWidgetOrderChange={editing ? this.onWidgetOrderChange : undefined}
                            onWidgetGroupsChange={this.onWidgetGroupsChange}
                            onToggleGrouping={editing ? this.onToggleGrouping : undefined}
                            onMoveWidgetToCategory={editing ? this.onMoveWidgetToCategory : undefined}
                            configMode={effectiveConfigMode}
                            onToggleConfigMode={
                                this.props.showSettingsButton && !hideConfigButton
                                    ? () =>
                                          this.setState(prev => {
                                              const next = !prev.configMode;
                                              try {
                                                  localStorage.setItem('wm_configMode', JSON.stringify(next));
                                              } catch {
                                                  // ignore
                                              }
                                              return { configMode: next };
                                          })
                                    : undefined
                            }
                            onBackToDevices={this.props.onBackToDevices}
                            onInstallSidePanel={() => this.setState({ sidePanelDialogOpen: true })}
                            onDeleteWidgetById={editing ? this.onDeleteWidgetById : undefined}
                            onToggleFavorite={editing ? this.onToggleFavorite : undefined}
                            onToggleCustomWidgetFavorite={this.onToggleCustomWidgetFavorite}
                            openDialogId={this.state.openDialogId}
                            onOpenWidgetDialog={this.onOpenWidgetDialog}
                            onCloseWidgetDialog={this.onCloseWidgetDialog}
                        />
                        <CategoryListDialogs
                            settingsWidget={settingsWidget || null}
                            settingsWidgetName={settingsWidget ? this.getWidgetName(settingsWidget) : ''}
                            widgetSettings={this.state.widgetSettings}
                            chartAvailable={this.state.chartAvailable}
                            settingsObjectName={this.state.settingsObjectName}
                            settingsObjectColor={this.state.settingsObjectColor}
                            onCloseSettings={this.onCloseSettings}
                            onSaveSettings={this.onSaveSettings}
                            onDeleteWidget={this.onDeleteWidget}
                            categorySettingsCategoryId={this.state.categorySettingsCategoryId}
                            categories={this.state.categories}
                            currentCategory={currentCategory}
                            categorySettings={this.state.categorySettings}
                            rootCategory={ROOT_CATEGORY}
                            onCloseCategorySettings={this.onCloseCategorySettings}
                            onSaveCategorySettings={this.onSaveCategorySettings}
                            customWidgetDialogCategoryId={this.state.customWidgetDialogCategoryId}
                            onCloseCustomWidgetDialog={this.onCloseCustomWidgetDialog}
                            onAddCustomWidget={this.onAddCustomWidget}
                            onCreateCategory={this.onCreateCategory}
                            adapterWidgets={this.state.adapterWidgets}
                            onAddPluginWidget={this.onAddPluginWidget}
                            customWidgetSettingsCategoryId={this.state.customWidgetSettingsCategoryId}
                            customWidgetSettingsWidgetId={this.state.customWidgetSettingsWidgetId}
                            onCloseCustomWidgetSettings={this.onCloseCustomWidgetSettings}
                            onSaveCustomWidgetSettings={this.onSaveCustomWidgetSettings}
                            onDeleteCustomWidgetFromSettings={this.onDeleteCustomWidgetFromSettings}
                            sidePanelDialogOpen={this.state.sidePanelDialogOpen}
                            onCloseSidePanel={() => this.setState({ sidePanelDialogOpen: false })}
                            theme={this.props.theme}
                            settingsWidgetId={this.state.settingsWidgetId}
                            onWidgetGroupMove={this.onWidgetGroupMove}
                            getCategoryName={this.getCategoryName}
                            stateContext={this.stateContext}
                        />
                    </Box>
                </ThemeProvider>
            );
        }

        return <div>{I18n.t('wm_Nothing defined')}</div>;
    }
}

export default CategoryList;
