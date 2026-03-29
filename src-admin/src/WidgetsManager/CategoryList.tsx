import React from 'react';
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

import type {
    CategoryInfo,
    CustomWidgetType,
    InstanceWidgetDescription,
    ItemInfo,
    WidgetInfo,
    CustomWidgetDef,
} from '../../../src/widget-utils';
import Communication, { type CommunicationProps, type CommunicationState } from './Communication';
import { DEFAULT_WIDGET_SETTINGS, type WidgetSettings } from './Widgets';
import StateContext from './StateContext';
import Category from './Category';
import { DEFAULT_CATEGORY_SETTINGS, type CategorySettings, type WmThemeId } from './CategorySettingsDialog';
import { CUSTOM_WIDGET_CONFIGS, getConfigDefault } from './CustomWidgetConfigs';
import { autoGroupItems, flattenGroups, moveWidgetToGroup, type WidgetGroup } from './groupUtils';
import CategoryListDialogs from './CategoryListDialogs';

interface SpecialTile {
    type: 'clock';
    size: '1x1' | '2x0.5' | '2x1';
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
        /** Icon shown before root name */
        rootIcon?: string;
        /** Widget theme preset */
        wmTheme?: WmThemeId;
        /** Default category ID to show when page is opened without hash */
        defaultCategory?: string;
        customWidgets?: CustomWidgetDef[];
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
    /** Callback to go back to device list (shown in header when in admin split-screen narrow mode) */
    onBackToDevices?: () => void;
}

interface CategoryListState extends CommunicationState {
    categories: CategoryInfo[];
    widgets: WidgetInfo[];
    filter: string;
    loading: boolean | null;
    alive: boolean | null;
    triggerLoad: number;
    currentCategory: CategoryInfo;
    widgetSettings: Record<string, WidgetSettings>;
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
    /** Coordinates from system.config for sun calculations */
    latitude: number | null;
    longitude: number | null;
    /** Plugin widgets available from adapter instances */
    adapterWidgets: Record<string, InstanceWidgetDescription>;
}

const ROOT_CATEGORY = '__root__';
const FAVORITES_CATEGORY = '__favorites__';

/** Widget types where iconInactive is stored in `common.icon` and iconActive in `common.custom` */
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

const WM_THEME_PRESETS: Record<string, WmThemePreset> = {
    dark: {
        mode: 'dark',
        primary: '#90caf9',
        secondary: '#ce93d8',
        bgDefault: '#121212',
        bgPaper: '#1e1e1e',
        textPrimary: '#ffffff',
        textSecondary: 'rgba(255,255,255,0.7)',
        textDisabled: 'rgba(255,255,255,0.5)',
    },
    light: {
        mode: 'light',
        primary: '#1976d2',
        secondary: '#9c27b0',
        bgDefault: '#f5f5f5',
        bgPaper: '#ffffff',
        textPrimary: 'rgba(0,0,0,0.87)',
        textSecondary: 'rgba(0,0,0,0.6)',
        textDisabled: 'rgba(0,0,0,0.38)',
    },
    orangeDark: {
        mode: 'dark',
        primary: '#f5a623',
        secondary: '#ff7043',
        bgDefault: '#1a1a1a',
        bgPaper: '#2c2c2e',
        textPrimary: '#f5f5f5',
        textSecondary: 'rgba(245,245,245,0.65)',
        textDisabled: 'rgba(245,245,245,0.4)',
    },
    blueDark: {
        mode: 'dark',
        primary: '#5eb8ff',
        secondary: '#82b1ff',
        bgDefault: '#0d1b2a',
        bgPaper: '#1b2838',
        textPrimary: '#e0e6ed',
        textSecondary: 'rgba(224,230,237,0.65)',
        textDisabled: 'rgba(224,230,237,0.4)',
    },
    'styling-grey': {
        mode: 'dark',
        primary: '#a0a0a0',
        secondary: '#78909c',
        bgDefault: '#111113',
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

    private stateContext: StateContext = new StateContext(this.props.socket);

    private defaultHistory: string | undefined;

    private lastAliveSubscribe = '';

    private lastTriggerLoad = 0;

    private filterTimeout: ReturnType<typeof setTimeout> | null = null;

    private readonly language: ioBroker.Languages = I18n.getLanguage();

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
            latitude: null,
            longitude: null,
            adapterWidgets: {},
        };

        this.lastTriggerLoad = this.props.triggerLoad || 0;
    }

    // --- Hash routing ---

    private getCategoryName = (category: CategoryInfo): string => {
        if (category.name && typeof category.name === 'string') {
            return category.name;
        }
        if (
            category.name &&
            typeof category.name === 'object' &&
            !(category.name as { objectId: string; property: string }).objectId
        ) {
            const translated = category.name as ioBroker.Translated;
            return translated[this.language] || translated.en || String(category.id);
        }
        return String(category.id).split('.').pop() || '';
    };

    /** Build a hash path like #Room/SubRoom by walking up the parent chain */
    private buildHashPath(category: CategoryInfo): string {
        if (String(category.id) === ROOT_CATEGORY) {
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
    private buildFavoritesCategory(widgetSettings?: Record<string, WidgetSettings>): CategoryInfo | null {
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
            name: {
                en: 'Favorites',
                de: 'Favoriten',
                ru: 'Избранное',
                pt: 'Favoritos',
                nl: 'Favorieten',
                fr: 'Favoris',
                it: 'Preferiti',
                es: 'Favoritos',
                pl: 'Ulubione',
                uk: 'Обрані',
                'zh-cn': '收藏夹',
            } as ioBroker.Translated,
            icon: '⭐',
        };
    }

    /** Resolve a hash like #Room/SubRoom back to a CategoryInfo from the given list */
    private resolveCategoryFromHash(
        hash: string,
        categories: CategoryInfo[],
        widgetSettings?: Record<string, WidgetSettings>,
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

    private updateHash(category: CategoryInfo): void {
        const path = this.buildHashPath(category);
        // Use '#root' for root so a bare '#' (which browsers report as '') is never written
        const newHash = path ? `#${path}` : '#root';
        if (window.location.hash !== newHash) {
            window.location.hash = newHash;
        }
    }

    private onHashChange = (): void => {
        if (!this.state.categories.length) {
            return;
        }
        const category = this.resolveCategoryFromHash(window.location.hash, this.state.categories);
        if (category && String(category.id) !== String(this.state.currentCategory?.id)) {
            this.setState({ currentCategory: category });
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

        // Load coordinates from system.config for sun calculations
        try {
            const sysConfig = await this.stateContext.getObject<ioBroker.SystemConfigObject>('system.config');
            const lat = sysConfig?.common?.latitude;
            const lng = sysConfig?.common?.longitude;
            if (lat != null && lng != null) {
                this.setState({ latitude: lat, longitude: lng });
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
                            customWidgets: guiConfig.root.customWidgets,
                            widgetOrder: guiConfig.root.widgetOrder,
                            widgetGroups: guiConfig.root.widgetGroups,
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
                        // In web mode, restore from hash or fall back to default category.
                        let currentCategory: CategoryInfo | undefined;

                        const hash = window.location.hash;
                        // '' = no hash at all → fall back to default/favorites
                        // '#root' or '#Kitchen/...' = explicit path → resolve from hash
                        const hasHash = hash.length > 1;

                        if (hasHash) {
                            currentCategory = this.resolveCategoryFromHash(hash, result.categories, widgetSettings);
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
                            adapterWidgets: result.adapterWidgets || {},
                        });
                        // Update hash to reflect the resolved category
                        this.updateHash(currentCategory);
                        console.log(
                            `Loaded ${result.categories.length} categories and ${result.widgets.length} widgets...`,
                        );
                        // Extract category settings from category.custom delivered by backend
                        this.extractCategorySettings(result.categories);
                    });
                }
            } catch (error) {
                console.error(error);
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
                const name =
                    typeof obj.common.name === 'object'
                        ? obj.common.name[this.language] || obj.common.name.en || ''
                        : obj.common.name || '';
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

        if (this.defaultHistory === undefined) {
            try {
                const sysConfig = await this.stateContext.getObject<ioBroker.SystemConfigObject>('system.config');
                this.defaultHistory = sysConfig?.common?.defaultHistory || '';
            } catch {
                this.defaultHistory = '';
            }
        }

        if (!this.defaultHistory) {
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
        if (obj.common?.custom?.[this.defaultHistory!]?.enabled) {
            return true;
        }
        // Follow alias to the target and check there
        const aliasId = obj.common?.alias?.id;
        if (aliasId) {
            const targetId = typeof aliasId === 'object' ? aliasId.read : aliasId;
            if (targetId && targetId !== stateId) {
                try {
                    const targetObj = await this.stateContext.getObject<ioBroker.StateObject>(targetId);
                    if (targetObj?.common?.custom?.[this.defaultHistory!]?.enabled) {
                        return true;
                    }
                } catch {
                    // ignore
                }
            }
        }
        return false;
    }

    private onSaveSettings = (settings: WidgetSettings): void => {
        const { settingsWidgetId } = this.state;
        if (settingsWidgetId != null) {
            const widgetSettings = { ...this.state.widgetSettings, [String(settingsWidgetId)]: settings };

            // Update the local widget icon when the icon changes (for non-alarm widgets via `icon`, for alarm via `iconInactive`)
            const widget = this.state.widgets.find(w => String(w.id) === String(settingsWidgetId));
            let widgets = this.state.widgets;
            if (widget) {
                const isAlarmType = widget.control?.type ? ALARM_ICON_TYPES.has(widget.control.type) : false;
                const newIcon = isAlarmType ? settings.iconInactive || '' : settings.icon || '';
                if (newIcon !== (widget.icon || '')) {
                    widgets = widgets.map(w =>
                        String(w.id) === String(settingsWidgetId) ? { ...w, icon: newIcon || undefined } : w,
                    );
                }
            }

            this.setState({ widgetSettings, widgets, settingsWidgetId: null });
            void this.saveWidgetSettingsToObject(String(settingsWidgetId), settings);
        }
    };

    private onToggleFavorite = (widgetId: string): void => {
        const current = this.state.widgetSettings[widgetId] || { ...DEFAULT_WIDGET_SETTINGS };
        const updated: WidgetSettings = { ...current, favorite: !current.favorite };
        const widgetSettings = { ...this.state.widgetSettings, [widgetId]: updated };
        this.setState({ widgetSettings });
        void this.saveWidgetSettingsToObject(widgetId, updated);
    };

    /**
     * Extract WidgetSettings from a single widget's custom data.
     * Returns a full WidgetSettings if any non-default values exist, otherwise null.
     */
    private static extractSingleWidgetSettings(widget: WidgetInfo): WidgetSettings | null {
        const custom = widget.custom;
        if (!custom) {
            return null;
        }
        const settings: Record<string, any> = {};
        for (const key of Object.keys(DEFAULT_WIDGET_SETTINGS)) {
            if (key === 'name') {
                // name is stored in common.name (widget.name), not in custom
            } else if (key === 'iconInactive' && ALARM_ICON_TYPES.has(widget.control?.type)) {
                // For alarm types: iconInactive comes from widget.icon (common.icon)
                if (widget.icon) {
                    settings.iconInactive = widget.icon;
                }
            } else if (key === 'icon' && !ALARM_ICON_TYPES.has(widget.control?.type)) {
                // For non-alarm types: icon comes from widget.icon (common.icon)
                if (widget.icon) {
                    settings.icon = widget.icon;
                }
            } else if (key in custom) {
                settings[key] = custom[key];
            }
        }

        if (Object.keys(settings).length === 0) {
            return null;
        }
        return { ...DEFAULT_WIDGET_SETTINGS, ...settings };
    }

    /**
     * Build widgetSettings record from all loaded widgets' custom data.
     */
    static extractWidgetSettingsFromWidgets(widgets: WidgetInfo[]): Record<string, WidgetSettings> {
        const result: Record<string, WidgetSettings> = {};
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
     * For alarm-type widgets: iconInactive → `common.icon`, iconActive → `custom.iconActive`
     */
    private async saveWidgetSettingsToObject(widgetId: string, settings: WidgetSettings): Promise<void> {
        const instanceId = this.state.selectedInstance;
        const widget = this.state.widgets.find(w => String(w.id) === widgetId);
        const isAlarmType = widget?.control?.type ? ALARM_ICON_TYPES.has(widget.control.type) : false;

        try {
            const obj = await this.props.socket.getObject(widgetId);
            if (!obj) {
                return;
            }
            const common = obj.common as Record<string, any>;
            common.custom ||= {};
            const custom = { ...(common.custom[instanceId] || {}) };

            for (const key of Object.keys(DEFAULT_WIDGET_SETTINGS) as (keyof WidgetSettings)[]) {
                if (key === 'name') {
                    // name → common.name
                    if (settings.name) {
                        common.name = settings.name;
                    }
                    continue;
                }
                if (key === 'iconInactive' && isAlarmType) {
                    // For alarm types: iconInactive → common.icon
                    if (settings.iconInactive) {
                        common.icon = settings.iconInactive;
                    } else {
                        delete common.icon;
                    }
                    continue;
                }
                if (key === 'icon' && !isAlarmType) {
                    // For non-alarm types: icon → common.icon
                    if (settings.icon) {
                        common.icon = settings.icon;
                    } else {
                        delete common.icon;
                    }
                    continue;
                }
                // Store non-default values, remove defaults
                const value = settings[key];
                if (value !== DEFAULT_WIDGET_SETTINGS[key]) {
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
                const common = obj.common as Record<string, any>;
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
                const common = obj.common as Record<string, any>;
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

    private extractCategorySettings(categories: CategoryInfo[]): void {
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
                customWidgets: rootConfig.customWidgets,
                widgetOrder: rootConfig.widgetOrder,
                widgetGroups: rootConfig.widgetGroups,
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
                icon,
            };
        }
        // Clean stale widget IDs from order/groups:
        // build a set of all valid IDs (regular widgets + custom widgets + category IDs)
        const validIds = new Set<string>();
        for (const w of this.state.widgets) {
            validIds.add(String(w.id));
        }
        for (const cat of categories) {
            validIds.add(String(cat.id));
        }
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
                    void this.saveWidgetGroupsToObject(catId, cs.widgetGroups);
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
                    },
                };
                this.setState({ categorySettings, categorySettingsCategoryId: null, guiConfig });
                void this.saveRootSettings(guiConfig);
                // Apply PWA icon
                if (settings.icon) {
                    CategoryList.applyPwaIcon(settings.icon, this.props.admin);
                }
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
        const existing = this.state.categorySettings[categoryId] || { ...DEFAULT_CATEGORY_SETTINGS };
        const updatedSettings: CategorySettings = { ...existing, widgetGroups };
        const categorySettings = { ...this.state.categorySettings, [categoryId]: updatedSettings };

        if (categoryId === ROOT_CATEGORY) {
            const guiConfig: GuiConfig = {
                ...this.state.guiConfig,
                root: {
                    ...this.state.guiConfig?.root,
                    widgetGroups,
                },
            };
            this.setState({ categorySettings, guiConfig });
            void this.saveRootSettings(guiConfig);
        } else {
            const categories = this.state.categories.map(cat => {
                if (String(cat.id) === categoryId) {
                    return { ...cat, custom: { ...cat.custom, widgetGroups } };
                }
                return cat;
            });
            this.setState({ categorySettings, categories });
            void this.saveWidgetGroupsToObject(categoryId, widgetGroups);
        }
    };

    private onToggleGrouping = (
        categoryId: string,
        orderedItems: Array<{ type: 'category' | 'widget' | 'custom'; id: string; data: unknown }>,
    ): void => {
        const existing = this.state.categorySettings[categoryId] || { ...DEFAULT_CATEGORY_SETTINGS };

        if (existing.widgetGroups?.length) {
            // Disable grouping: flatten groups back to widgetOrder
            const widgetOrder = flattenGroups(existing.widgetGroups);
            const updatedSettings: CategorySettings = { ...existing, widgetGroups: undefined, widgetOrder };
            this.onWidgetOrderChange(categoryId, widgetOrder);
            const categorySettings = { ...this.state.categorySettings, [categoryId]: updatedSettings };
            this.setState({ categorySettings });

            if (categoryId === ROOT_CATEGORY) {
                const guiConfig: GuiConfig = {
                    ...this.state.guiConfig,
                    root: { ...this.state.guiConfig?.root, widgetGroups: undefined, widgetOrder },
                };
                this.setState({ guiConfig });
                void this.saveRootSettings(guiConfig);
            } else {
                const categories = this.state.categories.map(cat => {
                    if (String(cat.id) === categoryId) {
                        return { ...cat, custom: { ...cat.custom, widgetGroups: undefined, widgetOrder } };
                    }
                    return cat;
                });
                this.setState({ categories });
                void this.saveWidgetGroupsToObject(categoryId, undefined);
            }
        } else {
            // Enable grouping: auto-group
            const widgetGroups = autoGroupItems(orderedItems);
            this.onWidgetGroupsChange(categoryId, widgetGroups);
        }
    };

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
        let widgetDef: CustomWidgetDef | null = null;
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
        const def: CustomWidgetDef = {
            id,
            type: 'plugin',
            pluginAdapter: adapter,
            pluginComponent: component,
            pluginUrl: url,
            size: '1x1',
        };
        const settings = this.state.categorySettings[customWidgetDialogCategoryId] || { ...DEFAULT_CATEGORY_SETTINGS };
        const customWidgets = [...(settings.customWidgets || []), def];
        const categorySettings = {
            ...this.state.categorySettings,
            [customWidgetDialogCategoryId]: { ...settings, customWidgets },
        };
        this.setState({
            categorySettings,
            customWidgetDialogCategoryId: null,
            customWidgetSettingsCategoryId: customWidgetDialogCategoryId,
            customWidgetSettingsWidgetId: id,
        });
        this.persistCustomWidgets(customWidgetDialogCategoryId, customWidgets);
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
        // Root category → alias.0.{name}, sub-category → {parentId}.{name}
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
        const def: CustomWidgetDef = { id, type, ...defaults } as CustomWidgetDef;

        const settings = this.state.categorySettings[customWidgetDialogCategoryId] || { ...DEFAULT_CATEGORY_SETTINGS };
        const customWidgets = [...(settings.customWidgets || []), def];
        const categorySettings = {
            ...this.state.categorySettings,
            [customWidgetDialogCategoryId]: { ...settings, customWidgets },
        };
        this.setState({
            categorySettings,
            customWidgetDialogCategoryId: null,
            // Open settings dialog for the newly added widget
            customWidgetSettingsCategoryId: customWidgetDialogCategoryId,
            customWidgetSettingsWidgetId: id,
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

    private onSaveCustomWidgetSettings = (def: CustomWidgetDef): void => {
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

    private persistCustomWidgets(categoryId: string, customWidgets: CustomWidgetDef[]): void {
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

    private async saveCustomWidgetsToObject(categoryId: string, customWidgets: CustomWidgetDef[]): Promise<void> {
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
        if (typeof widget.name === 'string') {
            return widget.name || String(widget.id);
        }
        if (typeof widget.name === 'object' && 'en' in widget.name) {
            const translated = widget.name;
            return translated[this.language] || translated.en || String(widget.id);
        }
        return String(widget.id);
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

        // Editing callbacks are enabled only when showSettingsButton AND configMode are both true
        const editing = !!this.props.showSettingsButton && this.state.configMode;
        const hideConfigButton = this.state.categorySettings[ROOT_CATEGORY]?.hideConfigButton;

        // Build virtual favorites category with widgets that have favorite=true
        const favoriteWidgetIds = Object.entries(this.state.widgetSettings)
            .filter(([, s]) => s.favorite)
            .map(([id]) => id);

        // Collect favorited custom widgets from all categories
        const favoriteCustomWidgets: CustomWidgetDef[] = [];
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

        // Virtual widget copies: set parent to favorites category so Category.widgets getter picks them up
        const favoriteWidgets: WidgetInfo[] = favoriteWidgetIds.length
            ? this.state.widgets
                  .filter(w => favoriteWidgetIds.includes(String(w.id)))
                  .map(w => ({ ...w, parent: FAVORITES_CATEGORY }))
            : [];

        // Merge into categories and widgets lists
        const categories = favoritesCategory ? [...this.state.categories, favoritesCategory] : this.state.categories;
        const widgets = favoriteWidgets.length ? [...this.state.widgets, ...favoriteWidgets] : this.state.widgets;

        // Add favorited custom widgets to the favorites category settings
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
                    <div style={{ width: '100%', height: '100%' }}>
                        <Category
                            key={currentCategory.id}
                            category={currentCategory}
                            categories={categories}
                            widgets={widgets}
                            stateContext={this.stateContext}
                            language={this.language}
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
                            configMode={this.state.configMode}
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
                            admin={this.props.admin}
                            onBackToDevices={this.props.onBackToDevices}
                            defaultHistory={this.defaultHistory || undefined}
                            instanceId={this.state.selectedInstance || undefined}
                            onInstallSidePanel={() => this.setState({ sidePanelDialogOpen: true })}
                            onDeleteWidgetById={editing ? this.onDeleteWidgetById : undefined}
                            onToggleFavorite={editing ? this.onToggleFavorite : undefined}
                            onToggleCustomWidgetFavorite={this.onToggleCustomWidgetFavorite}
                            latitude={this.state.latitude}
                            longitude={this.state.longitude}
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
                            defaultHistory={this.defaultHistory || undefined}
                            categorySettingsCategoryId={this.state.categorySettingsCategoryId}
                            categories={this.state.categories}
                            currentCategory={currentCategory}
                            categorySettings={this.state.categorySettings}
                            rootCategory={ROOT_CATEGORY}
                            onCloseCategorySettings={this.onCloseCategorySettings}
                            onSaveCategorySettings={this.onSaveCategorySettings}
                            selectedInstance={this.state.selectedInstance}
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
                            admin={this.props.admin}
                            socket={this.props.socket}
                            theme={this.props.theme}
                            settingsWidgetId={this.state.settingsWidgetId}
                            onWidgetGroupMove={this.onWidgetGroupMove}
                            getCategoryName={this.getCategoryName}
                            language={this.language}
                        />
                    </div>
                </ThemeProvider>
            );
        }

        return <div>{I18n.t('wm_Nothing defined')}</div>;
    }
}

export default CategoryList;
