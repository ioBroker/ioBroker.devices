import React, { Component } from 'react';

import { I18n } from '@iobroker/adapter-react-v5';
import { Types } from '@iobroker/type-detector';

import type { CategoryInfo, WidgetInfo } from '../../../src/widget-utils';
import { type WidgetGenericProps, WidgetSwitch } from './Widgets';
import type StateContext from './StateContext';

interface CategoryProps {
    category: CategoryInfo;
    categories: CategoryInfo[];
    widgets: WidgetInfo[];
    language: ioBroker.Languages;
    stateContext: StateContext;
    onNavigate: (category: CategoryInfo) => void;
}

interface CategoryState {
    names: { [categoryId: string]: string };
    icons: { [categoryId: string]: string };
    colors: { [categoryId: string]: string };
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
    private widgets: WidgetInfo[];
    private subCategories: CategoryInfo[];

    constructor(props: CategoryProps) {
        super(props);
        this.state = {
            names: {},
            icons: {},
            colors: {},
        };
        // get all categories and widgets in this category
        // keep only widgets/subcategories that belong to this category
        this.widgets = this.props.widgets.filter(w => w.parent === this.props.category.id);
        this.subCategories = this.props.categories.filter(c => c.parent === this.props.category.id);
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

        // category color could be an object { stateId, mapping }
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

        // update subcategories that reference this state for color
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

        // the category icon could be an object { stateId, mapping }
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

        // update subcategories that reference this state for icon
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
        }

        if (!Widget) {
            return <div key={widget.id}>{I18n.t('wm_Unknown type')}</div>;
        }
        return (
            <Widget
                key={widget.id}
                stateContext={this.props.stateContext}
                widget={widget}
                language={this.props.language}
            />
        );
    }

    renderCategoryLine(category: CategoryInfo): React.JSX.Element {
        return (
            <div
                key={category.id}
                style={{ fontWeight: 'bold', cursor: 'pointer' }}
                onClick={() => this.props.onNavigate(category)}
            >
                {this.state.names[category.id] ?? '...'}
            </div>
        );
    }

    render(): React.JSX.Element {
        return (
            <div key={this.props.category.id}>
                <div>{this.state.names[this.props.category.id] ?? '...'}</div>
                {this.subCategories.length ? (
                    <div>{this.subCategories.map(c => this.renderCategoryLine(c))}</div>
                ) : null}
                {this.widgets.length ? <div>{this.widgets.map(w => this.renderWidget(w))}</div> : null}
            </div>
        );
    }
}
