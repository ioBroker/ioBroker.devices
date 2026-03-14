import React from 'react';
import { Box, Typography } from '@mui/material';
import { Thermostat, WaterDrop } from '@mui/icons-material';

import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetTemperatureState extends WidgetGenericState {
    temperature: number | null;
    humidity: number | null;
}

export class WidgetTemperature extends WidgetGeneric<WidgetTemperatureState> {
    private readonly actualId: string | null;
    private readonly humidityId: string | null;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');
        const second = states.find(s => s.name === 'SECOND');

        this.actualId = actual?.id ?? null;
        this.humidityId = second?.id ?? null;

        this.state = {
            ...this.state,
            temperature: null,
            humidity: null,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onTemperatureChange);
        }
        if (this.humidityId) {
            this.props.stateContext.getState(this.humidityId, this.onHumidityChange);
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onTemperatureChange);
        }
        if (this.humidityId) {
            this.props.stateContext.removeState(this.humidityId, this.onHumidityChange);
        }
    }

    onTemperatureChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const temperature = val != null && !isNaN(val) ? val : null;
        if (temperature !== this.state.temperature) {
            this.setState({ temperature });
        }
    };

    onHumidityChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const humidity = val != null && !isNaN(val) ? val : null;
        if (humidity !== this.state.humidity) {
            this.setState({ humidity });
        }
    };

    protected getHistoryIds(): { id: string; color: string }[] {
        const ids: { id: string; color: string }[] = [];
        if (this.actualId) {
            ids.push({ id: this.actualId, color: '#ff9800' });
        }
        if (this.humidityId) {
            ids.push({ id: this.humidityId, color: '#2196f3' });
        }
        return ids;
    }

    static getHumidityEmoji(h: number): string {
        // very dry
        if (h < 25) {
            return '🏜️';
        }
        // dry
        if (h < 30) {
            return '💧';
        }
        // comfortable
        if (h <= 60) {
            return '😊';
        }
        // humid
        if (h <= 70) {
            return '💧';
        }
        return '💦'; // very humid
    }

    private formatTemperature(): string {
        if (this.state.temperature == null) {
            return '—';
        }
        return `${this.state.temperature.toFixed(1)}°`;
    }

    protected isTileActive(): boolean {
        return this.state.temperature != null;
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const { temperature } = this.state;
        // Color gradient: blue (cold) → green (comfortable) → red (hot)
        const getColor = (t: number | null): string => {
            if (t == null) {
                return 'text.disabled';
            }
            if (t < 10) {
                return '#2196f3'; // blue
            }
            if (t < 20) {
                return '#4caf50'; // green
            }
            if (t < 26) {
                return '#ff9800'; // orange
            }
            return '#f44336'; // red
        };

        return (
            <Thermostat
                sx={{
                    fontSize: 32,
                    color: getColor(temperature),
                    transition: 'color 0.25s ease',
                }}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element | null {
        // In wide mode, values are shown via renderTileAction on the right
        const size = this.props.settings?.size || this.props.size || '1x1';
        if (size === '2x1') {
            return null;
        }

        const { humidity } = this.state;

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
                    {this.formatTemperature()}
                </Typography>
                {humidity != null ? (
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
                        <WaterDrop sx={{ fontSize: 12 }} />
                        {Math.round(humidity)}% {WidgetTemperature.getHumidityEmoji(humidity)}
                    </Typography>
                ) : null}
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const { humidity } = this.state;

        return (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                    {this.formatTemperature()}
                </Typography>
                {humidity != null ? (
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
                        <WaterDrop sx={{ fontSize: 14 }} />
                        {Math.round(humidity)}% {WidgetTemperature.getHumidityEmoji(humidity)}
                    </Typography>
                ) : null}
            </Box>
        );
    }
}

export default WidgetTemperature;
