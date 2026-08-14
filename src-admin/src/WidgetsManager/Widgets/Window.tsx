import React from 'react';
import { Box, Typography } from '@mui/material';
import { Help, SensorWindow, SensorWindowOutlined } from '@mui/icons-material';
import { I18n, Icon } from '@iobroker/gui-components';

import WidgetGeneric, { type WidgetGenericSettings, type WidgetGenericProps, type WidgetGenericState } from './Generic';

interface AlarmWidgetSettings extends WidgetGenericSettings {
    hideWhenOk?: boolean;
}

/** Official value.window: 0 = CLOSED, 1 = TILTED, 2 = OPEN */
// acording to: https://www.iobroker.net/#en/documentation/dev/stateroles.md?info
type WindowOpenState = 0 | 1 | 2;

interface WidgetWindowState extends WidgetGenericState {
    isOpen: boolean;
    openState: WindowOpenState;
    /** True until the first ACTUAL value arrives, or when it reports null/undefined */
    isUnknown: boolean;
    lastChanged: number | null;
    lastChangedAgo: string;
}

export class WidgetWindow extends WidgetGeneric<WidgetWindowState, AlarmWidgetSettings> {
    private readonly actualId: string | null;
    private agoTimer: ReturnType<typeof setInterval> | null = null;

    constructor(props: WidgetGenericProps<AlarmWidgetSettings>) {
        super(props);
        const states = props.widget.control.states;
        const actual = states.find(s => s.name === 'ACTUAL');

        this.actualId = actual?.id ?? null;

        this.state = {
            ...this.state,
            isOpen: false,
            openState: 0,
            isUnknown: true,
            lastChanged: null,
            lastChangedAgo: '',
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onWindowChange);
        }
        this.agoTimer = setInterval(() => this.updateAgo(), 60_000);
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
        // A state that cannot be read yet is delivered as val: null, which must not collapse into CLOSED
        const isUnknown = state.val === null || state.val === undefined;
        let openState: WindowOpenState;
        if (typeof state.val === 'number') {
            // value.window: 0=CLOSED, 1=TILTED, 2=OPEN
            openState = state.val === 1 ? 1 : state.val ? 2 : 0;
        } else {
            // sensor.window boolean: true=OPEN, false=CLOSED
            openState = state.val ? 2 : 0;
        }
        const isOpen = openState !== 0;
        const lc = state.lc || state.ts || Date.now();
        if (openState !== this.state.openState || isOpen !== this.state.isOpen || isUnknown !== this.state.isUnknown) {
            this.setState({ isOpen, openState, isUnknown, lastChanged: lc, lastChangedAgo: this.fromNow(lc) });
        } else if (!this.state.lastChanged && lc) {
            this.setState({ lastChanged: lc, lastChangedAgo: this.fromNow(lc) });
        }
    };

    protected isTileActive(): boolean {
        return this.state.isOpen;
    }

    protected getWindowStatusText(): string {
        if (this.state.isUnknown) {
            return I18n.t('wm_No data');
        }
        if (this.state.openState === 1) {
            return I18n.t('wm_Tilted');
        }
        return this.state.isOpen
            ? this.props.settings?.textActive || I18n.t('wm_Open')
            : this.props.settings?.text || I18n.t('wm_Closed');
    }

    protected renderTileIcon(): React.JSX.Element {
        if (this.state.isUnknown) {
            // Before the custom icon, which has no unknown variant and would otherwise be
            // indistinguishable from a contact reporting "closed"
            return <Help sx={{ color: 'text.disabled', transition: 'color 0.25s ease' }} />;
        }

        const { isOpen } = this.state;
        const accent = this.getAccentColor();

        // Active: iconActive, fallback to icon (with active color); Inactive: icon only
        const customIcon = isOpen
            ? this.props.settings?.iconActive || this.props.settings?.icon
            : this.props.settings?.icon;
        if (customIcon) {
            return (
                <Icon
                    src={customIcon}
                    style={{
                        width: '1em',
                        height: '1em',
                        color: isOpen ? accent || this.getOpenIconColor() : 'grey',
                        transition: 'color 0.25s ease',
                    }}
                />
            );
        }

        return this.renderStateIcon(accent);
    }

    /** Colour of a user-configured icon while open, when the widget carries no colour of its own. */
    // eslint-disable-next-line class-methods-use-this
    protected getOpenIconColor(): string {
        return '#0288d1';
    }

    /** The icon drawn for a known state when the widget has no custom one configured. */
    protected renderStateIcon(accent: string | undefined): React.JSX.Element {
        const { isOpen, openState } = this.state;

        // Tilted: rotated filled icon
        if (openState === 1) {
            return (
                <SensorWindow
                    sx={theme => ({
                        color: accent || theme.palette.info.main,
                        transform: 'rotate(15deg)',
                        transition: 'color 0.25s ease, transform 0.25s ease',
                    })}
                />
            );
        }

        // Open: outlined icon
        if (isOpen) {
            return (
                <SensorWindowOutlined
                    sx={theme => ({
                        color: accent || theme.palette.warning.main,
                        transition: 'color 0.25s ease',
                    })}
                />
            );
        }

        // Closed: filled icon
        return (
            <SensorWindow
                sx={theme => ({
                    color: theme.palette.text.disabled,
                    transition: 'color 0.25s ease',
                })}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element | null {
        // Every layout but the 1x1 shows the same text through renderTileAction — rendering it here
        // as well printed it twice on one tile.
        const size = this.props.settings?.size || '1x1';
        if (size !== '1x1') {
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
                        color:
                            openState === 1
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
                        color:
                            openState === 1
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
