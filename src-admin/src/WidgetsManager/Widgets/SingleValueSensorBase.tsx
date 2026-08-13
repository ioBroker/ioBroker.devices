import React from 'react';
import { Box, Typography } from '@mui/material';

import WidgetGeneric, {
    formatFloat,
    toNumberOrNull,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';

export interface WidgetSingleValueSensorState extends WidgetGenericState {
    /** Current reading of the tile's required state, `null` while unknown or non-numeric */
    value: number | null;
    /** `common.unit` of that state as delivered by the backend, `''` when the object declares none */
    unit: string;
}

/**
 * Base for read-only tiles that show one numeric sensor reading plus its device-declared unit
 * (illuminance, humidity, temperature, pressure, flow, ...). A subclass passes the control-state
 * name to read (e.g. 'PRESSURE') and a history colour to `super()`, and implements {@link renderValueIcon}.
 */
export abstract class WidgetSingleValueSensorBase<
    TState extends WidgetSingleValueSensorState = WidgetSingleValueSensorState,
> extends WidgetGeneric<TState> {
    private readonly valueId: string | null;
    private readonly historyColor: string;

    protected constructor(props: WidgetGenericProps, valueStateName: string, historyColor: string) {
        super(props);
        const match = props.widget.control.states.find(s => s.name === valueStateName);
        this.valueId = match?.id ?? null;
        this.historyColor = historyColor;

        this.state = {
            ...this.state,
            value: null,
            unit: match?.unit ?? '',
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.valueId) {
            this.props.stateContext.getState(this.valueId, this.onValueChange);
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.valueId) {
            this.props.stateContext.removeState(this.valueId, this.onValueChange);
        }
    }

    private onValueChange = (_id: string, state: ioBroker.State): void => {
        const value = toNumberOrNull(state.val);
        if (value !== this.state.value) {
            this.setState({ value } as Partial<TState> as TState);
        }
    };

    protected getHistoryIds(): { id: string; color: string }[] {
        if (this.valueId) {
            return [{ id: this.valueId, color: this.historyColor }];
        }
        return [];
    }

    protected getChartUnit(): string | undefined {
        return this.state.unit || undefined;
    }

    protected isTileActive(): boolean {
        return this.state.value != null;
    }

    /** Decimal places shown for the reading. Override for units where whole numbers lose meaning. */
    // eslint-disable-next-line class-methods-use-this
    protected getDecimals(): number {
        return 0;
    }

    /** Icon reflecting the reading — subclass decides colour/shape, base decides layout. */
    protected abstract renderValueIcon(value: number | null): React.JSX.Element;

    protected formatValue(): string {
        const { value, unit } = this.state;
        if (value == null) {
            return '—';
        }
        const str = formatFloat(value, this.getDecimals(), this.props.stateContext.isFloatComma);
        return unit ? `${str} ${unit}` : str;
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }
        return this.renderValueIcon(this.state.value);
    }

    protected renderTileStatus(): React.JSX.Element | null {
        // Every layout but the 1x1 shows the reading through renderTileAction — rendering it here as
        // well would print the same value twice on one tile.
        const size = this.props.settings?.size || '1x1';
        if (size !== '1x1') {
            return null;
        }

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        lineHeight: 1.2,
                        color: 'text.primary',
                    }}
                >
                    {this.formatValue()}
                </Typography>
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        return (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                    {this.formatValue()}
                </Typography>
            </Box>
        );
    }
}

export default WidgetSingleValueSensorBase;
