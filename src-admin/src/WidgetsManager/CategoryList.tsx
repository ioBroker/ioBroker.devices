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

import type { CategoryInfo, ItemInfo, WidgetInfo } from '../../../src/widget-utils';
import Communication, { type CommunicationProps, type CommunicationState } from './Communication';
import { DEFAULT_WIDGET_SETTINGS, type WidgetSettings } from './Widgets';
import StateContext from './StateContext';
import Category from './Category';
import WidgetSettingsDialog from './WidgetSettingsDialog';

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

    componentWillUnmount(): void {
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
                    </div>
                </ThemeProvider>
            );
        }

        return <div>{I18n.t('wm_Nothing defined')}</div>;
    }
}

export default CategoryList;
