import React from 'react';
import { Box, Typography } from '@mui/material';
import { DarkMode, LightMode, NightsStay, WbTwilight } from '@mui/icons-material';

import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface WidgetIlluminanceState extends WidgetGenericState {
    illuminance: number | null;
}

export class WidgetIlluminance extends WidgetGeneric<WidgetIlluminanceState> {
    private readonly actualId: string | null;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');

        this.actualId = actual?.id ?? null;

        this.state = {
            ...this.state,
            illuminance: null,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onIlluminanceChange);
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onIlluminanceChange);
        }
    }

    onIlluminanceChange = (_id: string, state: ioBroker.State): void => {
        const val = state.val != null ? Number(state.val) : null;
        const illuminance = val != null && !isNaN(val) ? val : null;
        if (illuminance !== this.state.illuminance) {
            this.setState({ illuminance });
        }
    };

    protected getHistoryIds(): { id: string; color: string }[] {
        if (this.actualId) {
            return [{ id: this.actualId, color: '#ffc107' }];
        }
        return [];
    }

    static getIlluminanceColor(lux: number | null): string {
        if (lux == null) {
            return 'text.disabled';
        }
        if (lux < 50) {
            return '#5c6bc0'; // dark — indigo
        }
        if (lux < 200) {
            return '#ffa726'; // dim — orange
        }
        if (lux < 1000) {
            return '#ffca28'; // moderate — amber
        }
        return '#fdd835'; // bright — yellow
    }

    private formatIlluminance(): string {
        if (this.state.illuminance == null) {
            return '—';
        }
        return `${Math.round(this.state.illuminance)} lx`;
    }

    protected isTileActive(): boolean {
        return this.state.illuminance != null;
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const lux = this.state.illuminance;
        const color = WidgetIlluminance.getIlluminanceColor(lux);
        const sx = { fontSize: 48, color, transition: 'color 0.25s ease' };

        if (lux != null && lux < 10) {
            return <DarkMode sx={sx} />;
        }
        if (lux != null && lux < 50) {
            return <NightsStay sx={sx} />;
        }
        if (lux != null && lux < 200) {
            return <WbTwilight sx={sx} />;
        }
        return <LightMode sx={sx} />;
    }

    protected renderTileStatus(): React.JSX.Element | null {
        const size = this.props.settings?.size || this.props.size || '1x1';
        if (size === '2x0.5') {
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
                    {this.formatIlluminance()}
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
                    {this.formatIlluminance()}
                </Typography>
            </Box>
        );
    }
}

export default WidgetIlluminance;
