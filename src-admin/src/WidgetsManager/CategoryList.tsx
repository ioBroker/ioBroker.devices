import React from 'react';
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

import type { CategoryInfo, WidgetInfo } from '../../../src/widget-utils';
import Communication, { type CommunicationProps, type CommunicationState } from './Communication';
import StateContext from './StateContext';
import Category from './Category';

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
}

interface CategoryListState extends CommunicationState {
    categories: CategoryInfo[];
    widgets: WidgetInfo[];
    filter: string;
    loading: boolean | null;
    alive: boolean | null;
    triggerLoad: number;
    currentCategory: CategoryInfo;
}
const ROOT_CATEGORY = '__root__';

/**
 * Device List Component
 */
export class CategoryList extends Communication<CategoryListProps, CategoryListState> {
    static i18nInitialized = false;

    private stateContext: StateContext = new StateContext(this.props.socket);

    private lastAliveSubscribe = '';

    private lastTriggerLoad = 0;

    private filterTimeout: ReturnType<typeof setTimeout> | null = null;

    private readonly language: ioBroker.Languages = I18n.getLanguage();

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
        };

        this.lastTriggerLoad = this.props.triggerLoad || 0;
    }

    async componentDidMount(): Promise<void> {
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
        if (this.state.selectedInstance) {
            this.props.socket.unsubscribeState(
                `system.adapter.${this.state.selectedInstance}.alive`,
                this.aliveHandler,
            );
        }
    }

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
                        this.setState({
                            categories: result.categories,
                            widgets: result.widgets,
                            loading: false,
                            currentCategory:
                                result.categories.find(c => c.id === ROOT_CATEGORY) || result.categories[0],
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

    render(): React.JSX.Element {
        // find the root category
        const currentCategory = this.state.currentCategory || this.state.categories.find(c => c.id === ROOT_CATEGORY);
        if (currentCategory) {
            return (
                <Category
                    key={currentCategory.id}
                    category={currentCategory}
                    categories={this.state.categories}
                    widgets={this.state.widgets}
                    stateContext={this.stateContext}
                    language={this.language}
                    onNavigate={(category: CategoryInfo) => this.setState({ currentCategory: category })}
                />
            );
        }

        return <div>{I18n.t('wm_Nothing defined')}</div>;
    }
}

export default CategoryList;
