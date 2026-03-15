import React from 'react';
import { Box, Typography } from '@mui/material';
import { SensorWindow } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';
import moment from 'moment/min/moment-with-locales';

import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericState } from './Generic';

/** 0 = closed, 1 = open, 2 = tilted */
type WindowOpenState = 0 | 1 | 2;

interface WidgetWindowState extends WidgetGenericState {
    isOpen: boolean;
    openState: WindowOpenState;
    lastChanged: number | null;
    lastChangedAgo: string;
}

export class WidgetWindow extends WidgetGeneric<WidgetWindowState> {
    private readonly actualId: string | null;
    private agoTimer: ReturnType<typeof setInterval> | null = null;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');

        this.actualId = actual?.id ?? null;

        this.state = {
            ...this.state,
            isOpen: false,
            openState: 0,
            lastChanged: null,
            lastChangedAgo: '',
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onWindowChange);
        }
        this.agoTimer = setInterval(() => this.updateAgo(), 30_000);
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onWindowChange);
        }
        if (this.agoTimer) {
            clearInterval(this.agoTimer);
            this.agoTimer = null;
        }
    }

    private fromNow(ts: number): string {
        return moment(ts).locale(this.props.language).fromNow();
    }

    private updateAgo(): void {
        const { lastChanged } = this.state;
        if (lastChanged) {
            const ago = this.fromNow(lastChanged);
            if (ago !== this.state.lastChangedAgo) {
                this.setState({ lastChangedAgo: ago });
            }
        }
    }

    onWindowChange = (_id: string, state: ioBroker.State): void => {
        let openState: WindowOpenState;
        if (typeof state.val === 'number') {
            openState = state.val === 2 ? 2 : state.val ? 1 : 0;
        } else {
            openState = state.val ? 1 : 0;
        }
        const isOpen = openState !== 0;
        const lc = state.lc || state.ts || Date.now();
        if (openState !== this.state.openState || isOpen !== this.state.isOpen) {
            this.setState({ isOpen, openState, lastChanged: lc, lastChangedAgo: this.fromNow(lc) });
        } else if (!this.state.lastChanged && lc) {
            this.setState({ lastChanged: lc, lastChangedAgo: this.fromNow(lc) });
        }
    };

    protected isTileActive(): boolean {
        return this.state.isOpen;
    }

    protected getWindowStatusText(): string {
        if (this.state.openState === 2) {
            return I18n.t('wm_Tilted');
        }
        return this.state.isOpen ? I18n.t('wm_Open') : I18n.t('wm_Closed');
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }

        const { isOpen, openState } = this.state;
        const accent = this.getAccentColor();

        return (
            <SensorWindow
                sx={theme => ({
                    fontSize: 32,
                    color: openState === 2
                        ? accent || theme.palette.info.main
                        : isOpen
                          ? accent || theme.palette.warning.main
                          : theme.palette.text.disabled,
                    transform: openState === 2 ? 'rotate(15deg)' : undefined,
                    transition: 'color 0.25s ease, transform 0.25s ease',
                })}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element | null {
        const size = this.props.settings?.size || this.props.size || '1x1';
        if (size === '2x1') {
            return null;
        }

        const { isOpen, openState, lastChangedAgo } = this.state;
        const accent = this.getAccentColor();

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography
                    variant="caption"
                    sx={theme => ({
                        fontWeight: 600,
                        color: openState === 2
                            ? accent || theme.palette.info.main
                            : isOpen
                              ? accent || theme.palette.warning.main
                              : theme.palette.text.secondary,
                        transition: 'color 0.25s ease',
                    })}
                >
                    {this.getWindowStatusText()}
                </Typography>
                {lastChangedAgo ? (
                    <Typography
                        variant="caption"
                        sx={{ fontSize: '0.65rem', color: 'text.disabled', lineHeight: 1.2 }}
                    >
                        {lastChangedAgo}
                    </Typography>
                ) : null}
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const { isOpen, openState, lastChangedAgo } = this.state;
        const accent = this.getAccentColor();

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Typography
                    variant="h6"
                    sx={theme => ({
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        color: openState === 2
                            ? accent || theme.palette.info.main
                            : isOpen
                              ? accent || theme.palette.warning.main
                              : theme.palette.text.secondary,
                    })}
                >
                    {this.getWindowStatusText()}
                </Typography>
                {lastChangedAgo ? (
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.disabled', whiteSpace: 'nowrap' }}
                    >
                        {lastChangedAgo}
                    </Typography>
                ) : null}
            </Box>
        );
    }
}

export default WidgetWindow;
