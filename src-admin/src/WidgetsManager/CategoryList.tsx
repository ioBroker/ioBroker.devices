import React from 'react';
import { type Theme, createTheme, ThemeProvider } from '@mui/material/styles';
import { I18n } from '@iobroker/adapter-react-v5';

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

import { Types } from '@iobroker/type-detector';

import type { CategoryInfo, CustomWidgetType, ItemInfo, WidgetInfo, CustomWidgetDef } from '../../../src/widget-utils';
import Communication, { type CommunicationProps, type CommunicationState } from './Communication';
import { DEFAULT_WIDGET_SETTINGS, type WidgetSettings } from './Widgets';
import StateContext from './StateContext';
import Category from './Category';
import WidgetSettingsDialog from './WidgetSettingsDialog';
import CategorySettingsDialog, { DEFAULT_CATEGORY_SETTINGS, type CategorySettings } from './CategorySettingsDialog';
import CustomWidgetDialog from './CustomWidgetDialog';
import CustomWidgetSettingsDialog from './CustomWidgetSettingsDialog';

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
        customWidgets?: CustomWidgetDef[];
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
    /** If settings button is shown */
    showSettingsButton?: boolean;
    /** Define state that will accept commands from backend */
    communicationStateId?: string | boolean;
    /** Is it runs in admin or in web */
    admin: boolean;
    /** Define object that will store root settings of the GUI */
    rootSettingsStateId?: string | boolean;
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
}

const WM_SETTINGS_KEY = 'wm_widget_settings';
const ROOT_CATEGORY = '__root__';

/**
 * Device List Component
 */
const WM_FONT_FAMILY = '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif';

export class CategoryList extends Communication<CategoryListProps, CategoryListState> {
    static i18nInitialized = false;

    static fontLoaded = false;

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

        let widgetSettings: Record<string, WidgetSettings> = {};
        try {
            const raw = localStorage.getItem(WM_SETTINGS_KEY);
            if (raw) {
                widgetSettings = JSON.parse(raw) as Record<string, WidgetSettings>;
            }
        } catch {
            // ignore parse errors
        }

        this.state = {
            ...this.state,
            categories: [],
            widgets: [],
            filter: '',
            loading: null,
            alive: null,
            widgetSettings,
            settingsWidgetId: null,
            chartAvailable: false,
            settingsObjectName: '',
            settingsObjectColor: '',
            categorySettings: {},
            categorySettingsCategoryId: null,
            customWidgetDialogCategoryId: null,
            customWidgetSettingsCategoryId: null,
            customWidgetSettingsWidgetId: null,
        };

        this.lastTriggerLoad = this.props.triggerLoad || 0;
    }

    // --- Hash routing ---

    private getCategoryName(category: CategoryInfo): string {
        if (typeof category.name === 'string') {
            return category.name || String(category.id);
        }
        if (typeof category.name === 'object' && 'en' in category.name) {
            const translated = category.name;
            return translated[this.language] || translated.en || String(category.id);
        }
        return String(category.id);
    }

    /** Build hash path like #Room/SubRoom by walking up the parent chain */
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

    /** Resolve a hash like #Room/SubRoom back to a CategoryInfo from the given list */
    private resolveCategoryFromHash(hash: string, categories: CategoryInfo[]): CategoryInfo | undefined {
        const raw = hash.startsWith('#') ? hash.substring(1) : hash;
        if (!raw) {
            return categories.find(c => String(c.id) === ROOT_CATEGORY);
        }
        const segments = raw.split('/').map(s => decodeURIComponent(s));

        // Walk down from root matching names at each level
        let parentId: string = ROOT_CATEGORY;
        let found: CategoryInfo | undefined;
        for (const segment of segments) {
            found = categories.find(c => String(c.parent) === String(parentId) && this.getCategoryName(c) === segment);
            if (!found) {
                return undefined;
            }
            parentId = String(found.id);
        }
        return found;
    }

    private updateHash(category: CategoryInfo): void {
        const path = this.buildHashPath(category);
        const newHash = path ? `#${path}` : '';
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
            this.setState({ guiConfig: guiConfigState.native as GuiConfig });
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
                        };
                    }
                    return { guiConfig, categorySettings };
                });
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
                        // Try to restore category from URL hash, fall back to root
                        const currentCategory =
                            this.resolveCategoryFromHash(window.location.hash, result.categories) ||
                            result.categories.find(c => c.id === ROOT_CATEGORY) ||
                            result.categories[0];

                        this.setState({
                            categories: result.categories,
                            widgets: result.widgets,
                            loading: false,
                            currentCategory,
                        });
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
            this.setState({ widgets });
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
            const obj = await this.props.socket.getObject(String(widgetId));
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
                const sysConfig: ioBroker.SystemConfigObject | null | undefined =
                    await this.props.socket.getObject('system.config');
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
        const obj = (await this.props.socket.getObject(stateId)) as ioBroker.StateObject | null | undefined;
        if (!obj) {
            return false;
        }
        if (obj.common?.custom?.[this.defaultHistory!]?.enabled) {
            return true;
        }
        // Follow alias to target and check there
        const aliasId = (obj.common as any)?.alias?.id;
        if (aliasId) {
            const targetId = typeof aliasId === 'object' ? aliasId.read : aliasId;
            if (targetId && targetId !== stateId) {
                try {
                    const targetObj = (await this.props.socket.getObject(targetId)) as
                        | ioBroker.StateObject
                        | null
                        | undefined;
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
            localStorage.setItem(WM_SETTINGS_KEY, JSON.stringify(widgetSettings));
            this.setState({ widgetSettings, settingsWidgetId: null });
        }
    };

    private onCloseSettings = (): void => {
        this.setState({ settingsWidgetId: null });
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
                customWidgets: rootConfig.customWidgets,
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

            categorySettings[id] = { name, color, backgroundColor, image, imageScope, customWidgets };
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
                    },
                };
                this.setState({ categorySettings, categorySettingsCategoryId: null, guiConfig });
                void this.saveRootSettings(guiConfig);
            } else {
                // Update local category: name/color on category itself, image/imageScope in custom
                const categories = this.state.categories.map(cat => {
                    if (String(cat.id) === categorySettingsCategoryId) {
                        return {
                            ...cat,
                            name: settings.name || cat.name,
                            color: settings.color || undefined,
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
                // name and color go to common
                if (settings.name) {
                    common.name = settings.name;
                }
                common.color = settings.color || '';
                // image and imageScope go to common.custom[instance]
                common.custom ||= {};
                common.custom[instanceId] = {
                    enabled: true,
                    ...common.custom[instanceId],
                    backgroundColor: settings.backgroundColor || '',
                    image: settings.image || '',
                    imageScope: settings.imageScope || 'header',
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

    private onCloseCategorySettings = (): void => {
        this.setState({ categorySettingsCategoryId: null });
    };

    // --- Custom widgets ---

    private onOpenCustomWidgetDialog = (categoryId: string): void => {
        this.setState({ customWidgetDialogCategoryId: categoryId });
    };

    private onCloseCustomWidgetDialog = (): void => {
        this.setState({ customWidgetDialogCategoryId: null });
    };

    private onAddCustomWidget = (type: CustomWidgetType): void => {
        const { customWidgetDialogCategoryId } = this.state;
        if (!customWidgetDialogCategoryId) {
            return;
        }
        const id = `custom_${type}_${Date.now().toString(36)}`;
        const def = { id, type };
        const settings = this.state.categorySettings[customWidgetDialogCategoryId] || { ...DEFAULT_CATEGORY_SETTINGS };
        const customWidgets = [...(settings.customWidgets || []), def];
        const categorySettings = {
            ...this.state.categorySettings,
            [customWidgetDialogCategoryId]: { ...settings, customWidgets },
        };
        this.setState({ categorySettings, customWidgetDialogCategoryId: null });
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

    private getWidgetTheme(): Theme {
        if (!this.widgetTheme || this.widgetThemeType !== this.props.themeType) {
            this.widgetThemeType = this.props.themeType;
            this.widgetTheme = createTheme(this.props.theme, {
                typography: {
                    fontFamily: WM_FONT_FAMILY,
                },
            });
        }
        return this.widgetTheme;
    }

    render(): React.JSX.Element {
        // find the root category
        const currentCategory = this.state.currentCategory || this.state.categories.find(c => c.id === ROOT_CATEGORY);

        const settingsWidget =
            this.state.settingsWidgetId != null
                ? this.state.widgets.find(w => w.id === this.state.settingsWidgetId)
                : null;

        if (currentCategory) {
            return (
                <ThemeProvider theme={this.getWidgetTheme()}>
                    <div style={{ width: '100%', height: '100%' }}>
                        <Category
                            key={currentCategory.id}
                            category={currentCategory}
                            categories={this.state.categories}
                            widgets={this.state.widgets}
                            stateContext={this.stateContext}
                            language={this.language}
                            onNavigate={(category: CategoryInfo) => {
                                this.setState({ currentCategory: category });
                                this.updateHash(category);
                            }}
                            widgetSettings={this.state.widgetSettings}
                            onOpenSettings={this.props.showSettingsButton ? this.onOpenSettings : undefined}
                            categorySettings={this.state.categorySettings}
                            onOpenCategorySettings={
                                this.props.showSettingsButton ? this.onOpenCategorySettings : undefined
                            }
                            onAddCustomWidget={
                                this.props.showSettingsButton ? this.onOpenCustomWidgetDialog : undefined
                            }
                            onRemoveCustomWidget={this.props.showSettingsButton ? this.onRemoveCustomWidget : undefined}
                            onOpenCustomWidgetSettings={
                                this.props.showSettingsButton ? this.onOpenCustomWidgetSettings : undefined
                            }
                            admin={this.props.admin}
                        />
                        <WidgetSettingsDialog
                            open={settingsWidget != null}
                            widgetName={settingsWidget ? this.getWidgetName(settingsWidget) : ''}
                            settings={
                                settingsWidget
                                    ? this.state.widgetSettings[String(settingsWidget.id)] || DEFAULT_WIDGET_SETTINGS
                                    : DEFAULT_WIDGET_SETTINGS
                            }
                            onClose={this.onCloseSettings}
                            onSave={this.onSaveSettings}
                            showChart={this.state.chartAvailable}
                            showBlindType={settingsWidget?.control?.type === Types.blind}
                            showPin={settingsWidget?.control?.type === Types.lock}
                            showHideWhenOk={
                                settingsWidget?.control?.type === Types.floodAlarm ||
                                settingsWidget?.control?.type === Types.fireAlarm
                            }
                            objectName={this.state.settingsObjectName}
                            objectColor={this.state.settingsObjectColor}
                        />
                        <CategorySettingsDialog
                            open={this.state.categorySettingsCategoryId != null}
                            categoryName={
                                this.state.categorySettingsCategoryId === ROOT_CATEGORY
                                    ? this.state.categorySettings[ROOT_CATEGORY]?.name || I18n.t('wm_Settings')
                                    : this.state.categorySettingsCategoryId
                                      ? this.getCategoryName(
                                            this.state.categories.find(
                                                c => String(c.id) === this.state.categorySettingsCategoryId,
                                            ) || currentCategory,
                                        )
                                      : ''
                            }
                            categoryId={this.state.categorySettingsCategoryId || ''}
                            settings={
                                this.state.categorySettingsCategoryId
                                    ? this.state.categorySettings[this.state.categorySettingsCategoryId] ||
                                      DEFAULT_CATEGORY_SETTINGS
                                    : DEFAULT_CATEGORY_SETTINGS
                            }
                            onClose={this.onCloseCategorySettings}
                            onSave={this.onSaveCategorySettings}
                            socket={this.props.socket}
                            instance={this.state.selectedInstance}
                            theme={this.props.theme}
                            admin={this.props.admin}
                        />
                        <CustomWidgetDialog
                            open={this.state.customWidgetDialogCategoryId != null}
                            onClose={this.onCloseCustomWidgetDialog}
                            onAdd={this.onAddCustomWidget}
                        />
                        <CustomWidgetSettingsDialog
                            open={this.state.customWidgetSettingsCategoryId != null}
                            widgetDef={
                                this.state.customWidgetSettingsCategoryId && this.state.customWidgetSettingsWidgetId
                                    ? this.state.categorySettings[
                                          this.state.customWidgetSettingsCategoryId
                                      ]?.customWidgets?.find(w => w.id === this.state.customWidgetSettingsWidgetId) ||
                                      null
                                    : null
                            }
                            onClose={this.onCloseCustomWidgetSettings}
                            onSave={this.onSaveCustomWidgetSettings}
                            onDelete={this.onDeleteCustomWidgetFromSettings}
                        />
                    </div>
                </ThemeProvider>
            );
        }

        return <div>{I18n.t('wm_Nothing defined')}</div>;
    }
}

export default CategoryList;
