import React from 'react';
import { Box, IconButton, Typography, type Theme } from '@mui/material';
import { Garage, KeyboardArrowDown, KeyboardArrowUp, Stop } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

import WidgetGeneric, {
    getTileStyles,
    isNeumorphicTheme,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';

interface WidgetGateState extends WidgetGenericState {
    /** Gate position 0 (closed) – 100 (open) */
    position: number;
    dragging: boolean;
}

export class WidgetGate extends WidgetGeneric<WidgetGateState> {
    private readonly setId: string | null;
    private readonly actualId: string | null;
    private readonly stopId: string | null;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        const find = (name: string): string | null => states.find(s => s.name === name)?.id ?? null;

        this.setId = find('SET');
        this.actualId = find('ACTUAL');
        this.stopId = find('STOP');

        this.state = {
            ...this.state,
            position: 0,
            dragging: false,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        const listenId = this.actualId || this.setId;
        if (listenId) {
            this.props.stateContext.getState(listenId, this.onPositionChange);
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        const listenId = this.actualId || this.setId;
        if (listenId) {
            this.props.stateContext.removeState(listenId, this.onPositionChange);
        }
    }

    private onPositionChange = (_id: string, state: ioBroker.State): void => {
        if (this.state.dragging) {
            return;
        }
        const val = state.val;
        let position: number;
        if (typeof val === 'boolean') {
            position = val ? 100 : 0;
        } else {
            position = Math.max(0, Math.min(100, Math.round(Number(val) || 0)));
        }
        if (position !== this.state.position) {
            this.setState({ position });
        }
    };

    // ── Actions ──────────────────────────────────────────────────────

    private toggle = (): void => {
        if (this.setId) {
            if (this.actualId) {
                // Has position: toggle between 0 and 100
                const target = this.state.position > 50 ? 0 : 100;
                void this.props.stateContext.getSocket().setState(this.setId, target);
            } else {
                // Boolean: toggle
                void this.props.stateContext.getSocket().setState(this.setId, !this.state.position);
            }
        }
    };

    private open = (): void => {
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, this.actualId ? 100 : true);
        }
    };

    private close = (): void => {
        if (this.setId) {
            void this.props.stateContext.getSocket().setState(this.setId, this.actualId ? 0 : false);
        }
    };

    private stop = (): void => {
        if (this.stopId) {
            void this.props.stateContext.getSocket().setState(this.stopId, true);
        }
    };

    // ── Overrides ────────────────────────────────────────────────────

    protected getHistoryIds(): { id: string; color: string }[] {
        const id = this.actualId || this.setId;
        if (!id) {
            return [];
        }
        return [{ id, color: this.getAccentColor() || '#ff9800' }];
    }

    protected isTileActive(): boolean {
        return this.state.position > 0;
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    protected onTileClick(): void {
        this.toggle();
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const { position } = this.state;
        const isOpen = position > 0;
        const accent = this.getAccentColor();

        return (
            <Garage
                sx={theme => ({
                    color: isOpen ? accent || theme.palette.warning.main : theme.palette.text.disabled,
                    transition: 'color 0.25s ease',
                })}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element {
        const { position } = this.state;
        const accent = this.getAccentColor();
        const isOpen = position > 0;

        let text: string;
        if (this.actualId) {
            // Has position feedback
            if (position === 0) {
                text = I18n.t('wm_Closed');
            } else if (position >= 100) {
                text = I18n.t('wm_Open');
            } else {
                text = `${position}%`;
            }
        } else {
            text = isOpen ? I18n.t('wm_Open') : I18n.t('wm_Closed');
        }

        return (
            <Typography
                variant="caption"
                noWrap
                sx={theme => ({
                    fontWeight: 500,
                    maxWidth: '100%',
                    color: isOpen ? accent || theme.palette.warning.main : theme.palette.text.secondary,
                    transition: 'color 0.25s ease',
                })}
            >
                {text}
            </Typography>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const accent = this.getAccentColor();
        const btnSx = (theme: Theme): Record<string, unknown> => ({
            color: this.isTileActive() ? accent || theme.palette.warning.main : theme.palette.text.secondary,
            p: 0.5,
        });

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <IconButton
                    size="small"
                    onClick={e => {
                        e.stopPropagation();
                        this.open();
                    }}
                    sx={btnSx}
                >
                    <KeyboardArrowUp fontSize="small" />
                </IconButton>
                {this.stopId ? (
                    <IconButton
                        size="small"
                        onClick={e => {
                            e.stopPropagation();
                            this.stop();
                        }}
                        sx={btnSx}
                    >
                        <Stop fontSize="small" />
                    </IconButton>
                ) : null}
                <IconButton
                    size="small"
                    onClick={e => {
                        e.stopPropagation();
                        this.close();
                    }}
                    sx={btnSx}
                >
                    <KeyboardArrowDown fontSize="small" />
                </IconButton>
            </Box>
        );
    }

    // ── Compact 1x1 ──────────────────────────────────────────────────

    renderCompact(): React.JSX.Element {
        const { name, position } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <Box
                    onClick={() => this.toggle()}
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        userSelect: 'none',
                        position: 'relative',
                        ...getTileStyles(theme, isActive, accent),
                    })}
                >
                    {indicators}

                    {/* Gate visualization */}
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                        }}
                    >
                        {WidgetGate.renderGateSvg(position, accent)}
                    </Box>

                    {/* Controls */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.5,
                        }}
                    >
                        <IconButton
                            size="small"
                            onClick={e => {
                                e.stopPropagation();
                                this.open();
                            }}
                            sx={theme => ({ color: theme.palette.text.primary, p: 0.25 })}
                        >
                            <KeyboardArrowUp sx={{ fontSize: 'max(1rem, 10cqi)' }} />
                        </IconButton>
                        {this.stopId ? (
                            <IconButton
                                size="small"
                                onClick={e => {
                                    e.stopPropagation();
                                    this.stop();
                                }}
                                sx={theme => ({ color: theme.palette.text.primary, p: 0.25 })}
                            >
                                <Stop sx={{ fontSize: 'max(1rem, 10cqi)' }} />
                            </IconButton>
                        ) : null}
                        <IconButton
                            size="small"
                            onClick={e => {
                                e.stopPropagation();
                                this.close();
                            }}
                            sx={theme => ({ color: theme.palette.text.primary, p: 0.25 })}
                        >
                            <KeyboardArrowDown sx={{ fontSize: 'max(1rem, 10cqi)' }} />
                        </IconButton>
                    </Box>

                    {/* Name & status */}
                    <Box>
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
                            noWrap
                            sx={theme => ({
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                fontSize: 'max(0.875rem, 9cqi)',
                                ...(isNeumorphicTheme(theme)
                                    ? {
                                          textTransform: 'uppercase' as const,
                                          letterSpacing: '0.08em',
                                          fontSize: 'max(0.7rem, 7cqi)',
                                      }
                                    : {}),
                            })}
                        >
                            {this.props.settings?.name || name || '...'}
                        </Typography>
                        {this.renderTileStatus()}
                    </Box>
                    {this.renderChart()}
                </Box>
            </Box>
        );
    }

    // ── Gate SVG visualization ────────────────────────────────────────

    static renderGateSvg(position: number, accent?: string): React.JSX.Element {
        const vw = 60;
        const vh = 50;
        const doorH = vh * 0.8;
        const openH = (position / 100) * doorH;
        const closedH = doorH - openH;
        const slats = 5;

        return (
            <svg
                viewBox={`0 0 ${vw} ${vh}`}
                style={{ width: '60%', maxWidth: 80, height: 'auto' }}
            >
                {/* Frame */}
                <rect
                    x={2}
                    y={2}
                    width={vw - 4}
                    height={vh - 4}
                    rx={2}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    opacity={0.2}
                />
                {/* Opening (light) */}
                <rect
                    x={4}
                    y={4}
                    width={vw - 8}
                    height={openH}
                    fill={accent || '#ff9800'}
                    opacity={0.15}
                />
                {/* Gate door (slats) */}
                {Array.from({ length: slats }, (_, i) => {
                    const slatH = closedH / slats;
                    const y = 4 + openH + i * slatH;
                    return (
                        <rect
                            key={i}
                            x={5}
                            y={y + 1}
                            width={vw - 10}
                            height={slatH - 2}
                            rx={1}
                            fill="currentColor"
                            opacity={0.35 + i * 0.05}
                        />
                    );
                })}
            </svg>
        );
    }
}

export default WidgetGate;
