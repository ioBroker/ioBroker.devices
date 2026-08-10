import React from 'react';
import { Box, Typography } from '@mui/material';
import { TouchApp } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericState } from './Generic';

type PressKind = 'press' | 'long';

interface WidgetButtonSensorState extends WidgetGenericState {
    lastPress: number | null;
    lastPressAgo: string;
    lastKind: PressKind | null;
    /** True for a short moment after a press so the tile lights up */
    flashing: boolean;
}

/** How long the tile stays highlighted after a press — the button states are momentary */
const FLASH_MS = 1_500;

export class WidgetButtonSensor extends WidgetGeneric<WidgetButtonSensorState> {
    private readonly pressId: string | null;
    private readonly pressLongId: string | null;
    private flashTimer: ReturnType<typeof setTimeout> | null = null;
    private agoTimer: ReturnType<typeof setInterval> | null = null;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        this.pressId = states.find(s => s.name === 'PRESS')?.id ?? null;
        this.pressLongId = states.find(s => s.name === 'PRESS_LONG')?.id ?? null;

        this.state = {
            ...this.state,
            lastPress: null,
            lastPressAgo: '',
            lastKind: null,
            flashing: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.pressId) {
            this.props.stateContext.getState(this.pressId, this.onPress);
        }
        if (this.pressLongId) {
            this.props.stateContext.getState(this.pressLongId, this.onPressLong);
        }
        this.agoTimer = setInterval(() => this.updateAgo(), 60_000);
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.pressId) {
            this.props.stateContext.removeState(this.pressId, this.onPress);
        }
        if (this.pressLongId) {
            this.props.stateContext.removeState(this.pressLongId, this.onPressLong);
        }
        if (this.agoTimer) {
            clearInterval(this.agoTimer);
            this.agoTimer = null;
        }
        if (this.flashTimer) {
            clearTimeout(this.flashTimer);
            this.flashTimer = null;
        }
    }

    private updateAgo(): void {
        const { lastPress } = this.state;
        if (lastPress) {
            const ago = this.fromNow(lastPress);
            if (ago !== this.state.lastPressAgo) {
                this.setState({ lastPressAgo: ago });
            }
        }
    }

    private registerPress(kind: PressKind, state: ioBroker.State): void {
        const ts = state.lc || state.ts || Date.now();
        // Momentary state: only a rising edge is a press. The first value after subscribing is the
        // stored one, which is `false` for an idle button — do not flash for it.
        if (!state.val) {
            if (!this.state.lastPress) {
                this.setState({ lastPress: ts, lastPressAgo: this.fromNow(ts), lastKind: null });
            }
            return;
        }

        if (this.flashTimer) {
            clearTimeout(this.flashTimer);
        }
        this.setState({ lastPress: ts, lastPressAgo: this.fromNow(ts), lastKind: kind, flashing: true });
        this.flashTimer = setTimeout(() => {
            this.flashTimer = null;
            this.setState({ flashing: false });
        }, FLASH_MS);
    }

    private onPress = (_id: string, state: ioBroker.State): void => this.registerPress('press', state);

    private onPressLong = (_id: string, state: ioBroker.State): void => this.registerPress('long', state);

    // --- Overrides ---

    protected isTileActive(): boolean {
        return this.state.flashing;
    }

    private getStatusText(): string {
        const { lastKind, lastPressAgo } = this.state;
        if (!lastKind) {
            return lastPressAgo || I18n.t('wm_Not pressed yet');
        }
        const kindText = lastKind === 'long' ? I18n.t('wm_Long press') : I18n.t('wm_Pressed');
        return lastPressAgo ? `${kindText} · ${lastPressAgo}` : kindText;
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const accent = this.getAccentColor();

        return (
            <TouchApp
                sx={theme => ({
                    color: this.state.flashing ? accent || theme.palette.primary.main : theme.palette.text.disabled,
                    transform: this.state.flashing ? 'scale(1.12)' : 'none',
                    transition: 'color 0.25s ease, transform 0.25s ease',
                })}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element {
        const accent = this.getAccentColor();

        return (
            <Typography
                variant="caption"
                noWrap
                sx={theme => ({
                    fontWeight: 500,
                    color: this.state.flashing ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                    transition: 'color 0.25s ease',
                })}
            >
                {this.getStatusText()}
            </Typography>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const accent = this.getAccentColor();
        const { lastKind, lastPressAgo, flashing } = this.state;

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Typography
                    variant="h6"
                    sx={theme => ({
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        color: flashing ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                    })}
                >
                    {lastKind === 'long'
                        ? I18n.t('wm_Long press')
                        : lastKind === 'press'
                          ? I18n.t('wm_Pressed')
                          : I18n.t('wm_Not pressed yet')}
                </Typography>
                {/* The timestamp belongs to a press; with no press seen it would date the headline */}
                {lastKind && lastPressAgo ? (
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}
                    >
                        {lastPressAgo}
                    </Typography>
                ) : null}
            </Box>
        );
    }
}

export default WidgetButtonSensor;
