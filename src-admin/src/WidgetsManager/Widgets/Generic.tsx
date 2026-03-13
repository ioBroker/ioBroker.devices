import React, { Component } from 'react';
import type { WidgetInfo } from '../../../../src/widget-utils';
import type StateContext from '../StateContext';

export interface WidgetGenericProps {
    widget: WidgetInfo;
    language: ioBroker.Languages;
    stateContext: StateContext;
}

export interface WidgetGenericState {
    name: string | null;
    icon: string | null;
    color: string | null;
}

export class WidgetGeneric<TState extends WidgetGenericState = WidgetGenericState> extends Component<
    WidgetGenericProps,
    TState
> {
    constructor(props: WidgetGenericProps) {
        super(props);
        this.state = {
            name: null,
            icon: null,
            color: null,
        } as TState;
    }

    componentDidMount(): void {
        let state: Partial<WidgetGenericState> | undefined;
        if (this.props.widget.name && typeof this.props.widget.name === 'object') {
            if ((this.props.widget.name as ioBroker.Translated).en) {
                state = {};
                state.name = this.getText(this.props.widget.name as ioBroker.Translated);
            } else if ((this.props.widget.name as { objectId: string; property: string }).objectId) {
                this.props.stateContext.getObjectProperty(
                    (this.props.widget.name as { objectId: string; property: string }).objectId,
                    (this.props.widget.name as { objectId: string; property: string }).property,
                    this.onNameChange,
                );
            }
        } else {
            state = {};
            state.name = this.props.widget.name || '';
        }

        if (this.props.widget.icon && typeof this.props.widget.icon === 'object') {
            if ((this.props.widget.icon as { stateId: string; mapping?: Record<string | number, string> }).stateId) {
                this.props.stateContext.getState(
                    (this.props.widget.icon as { stateId: string; mapping?: Record<string | number, string> }).stateId,
                    this.onIconChange,
                );
            }
        } else if (typeof this.props.widget.icon === 'string') {
            state ||= {};
            state.icon = this.props.widget.icon;
        }

        if (this.props.widget.color && typeof this.props.widget.color === 'object') {
            if ((this.props.widget.color as { stateId: string; mapping?: Record<string | number, string> }).stateId) {
                this.props.stateContext.getState(
                    (this.props.widget.color as { stateId: string; mapping?: Record<string | number, string> }).stateId,
                    this.onColorChange,
                );
            }
        } else if (typeof this.props.widget.color === 'string') {
            state ||= {};
            state.color = this.props.widget.color;
        }

        if (state) {
            this.setState(state as WidgetGenericState & TState);
        }
    }

    onNameChange = (id: string, property: string, value: ioBroker.StringOrTranslated): void => {
        const text = this.getText(value);
        const struct = this.props.widget.name as { objectId: string; property: string };
        if (this.props.widget.name && typeof this.props.widget.name === 'object' && struct.objectId) {
            if (struct.objectId === id && struct.property === property && text !== this.state.name) {
                this.setState({ name: text });
            }
        }
    };

    onColorChange = (id: string, state: ioBroker.State): void => {
        // category color could be an object { stateId, mapping }
        if (this.props.widget.color && typeof this.props.widget.color === 'object') {
            const struct = this.props.widget.color as { stateId?: string; mapping?: Record<string | number, string> };
            if (struct.stateId === id) {
                let color = '';
                if (struct.mapping && struct.mapping[state.val as string]) {
                    color = struct.mapping[state.val as string];
                } else if (state.val !== undefined && state.val !== null) {
                    color = (state.val as string) || '';
                }
                if (color !== this.state.color) {
                    this.setState({ color });
                }
            }
        }
    };

    onIconChange = (id: string, state: ioBroker.State): void => {
        // the category icon could be an object { stateId, mapping }
        if (this.props.widget.icon && typeof this.props.widget.icon === 'object') {
            const struct = this.props.widget.icon as { stateId?: string; mapping?: Record<string | number, string> };
            if (struct.stateId === id) {
                let iconValue = '';
                if (struct.mapping && struct.mapping[state.val as string]) {
                    iconValue = struct.mapping[state.val as string];
                } else if (state.val !== undefined && state.val !== null) {
                    iconValue = (state.val as string) || '';
                }
                if (iconValue !== this.state.icon) {
                    this.setState({ icon: iconValue });
                }
            }
        }
    };

    // eslint-disable-next-line react/no-unused-class-component-methods
    getText(text: ioBroker.StringOrTranslated): string {
        if (typeof text === 'object') {
            return text[this.props.language] || text.en;
        }

        return text;
    }

    render(): React.JSX.Element {
        return <div></div>;
    }
}

export default WidgetGeneric;
