import React from 'react';
import { Box, Typography } from '@mui/material';
import { WaterDrop, Thermostat } from '@mui/icons-material';

import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetHumidityState extends WidgetGenericState {
    humidity: number | null;
    temperature: number | null;
}

export class WidgetHumidity extends WidgetGeneric<WidgetHumidityState> {
    private readonly actualId: string | null;
    private readonly temperatureId: string | null;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');
        const second = states.find(s => s.name === 'SECOND');

        this.actualId = actual?.id ?? null;
        this.temperatureId = second?.id ?? null;

        this.state = {
            ...this.state,
            humidity: null,
            temperature: null,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onHumidityChange);
        }
        if (this.temperatureId) {
            this.props.stateContext.getState(this.temperatureId, this.onTemperatureChange);
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onHumidityChange);
        }
        if (this.temperatureId) {
            this.props.stateContext.removeState(this.temperatureId, this.onTemperatureChange);
        }
    }

    onHumidityChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const humidity = val != null && !isNaN(val) ? val : null;
        if (humidity !== this.state.humidity) {
            this.setState({ humidity });
        }
    };

    onTemperatureChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const temperature = val != null && !isNaN(val) ? val : null;
        if (temperature !== this.state.temperature) {
            this.setState({ temperature });
        }
    };

    protected getHistoryIds(): { id: string; color: string }[] {
        const ids: { id: string; color: string }[] = [];
        if (this.actualId) {
            ids.push({ id: this.actualId, color: '#2196f3' });
        }
        if (this.temperatureId) {
            ids.push({ id: this.temperatureId, color: '#ff9800' });
        }
        return ids;
    }

    static getHumidityColor(h: number | null): string {
        if (h == null) {
            return 'text.disabled';
        }
        if (h < 25) {
            return '#ff9800'; // too dry — orange
        }
        if (h <= 60) {
            return '#2196f3'; // comfortable — blue
        }
        if (h <= 70) {
            return '#1565c0'; // humid — darker blue
        }
        return '#7b1fa2'; // very humid — purple
    }

    private formatHumidity(): string {
        if (this.state.humidity == null) {
            return '—';
        }
        return `${Math.round(this.state.humidity)}%`;
    }

    protected isTileActive(): boolean {
        return this.state.humidity != null;
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const { humidity } = this.state;

        return (
            <WaterDrop
                sx={{
                    fontSize: 48,
                    color: WidgetHumidity.getHumidityColor(humidity),
                    transition: 'color 0.25s ease',
                }}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element | null {
        const size = this.props.settings?.size || this.props.size || '1x1';
        if (size === '2x0.5') {
            return null;
        }

        const { temperature } = this.state;

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
                    {this.formatHumidity()}
                </Typography>
                {temperature != null ? (
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 500,
                            color: 'text.secondary',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                        }}
                    >
                        <Thermostat sx={{ fontSize: 12 }} />
                        {temperature.toFixed(1)}°
                    </Typography>
                ) : null}
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const { temperature } = this.state;

        return (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                    {this.formatHumidity()}
                </Typography>
                {temperature != null ? (
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'text.secondary',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <Thermostat sx={{ fontSize: 14 }} />
                        {temperature.toFixed(1)}°
                    </Typography>
                ) : null}
            </Box>
        );
    }
}

export default WidgetHumidity;
