import React from 'react';
import { Box, ButtonBase, IconButton, Typography } from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, Stop } from '@mui/icons-material';
import { I18n, type IobTheme } from '@iobroker/adapter-react-v5';

import WidgetGeneric, {
    getTileStyles,
    isNeumorphicTheme,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';

interface WidgetBlindButtonsState extends WidgetGenericState {
    /** Direction: 0 = none, 1 = up/open, 2 = down/close */
    direction: number;
}

export class WidgetBlindButtons extends WidgetGeneric<WidgetBlindButtonsState> {
    private readonly stopId: string | null;
    private readonly openId: string | null;
    private readonly closeId: string | null;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;

        this.stopId = states.find(s => s.name === 'STOP')?.id ?? null;
        this.openId = states.find(s => s.name === 'OPEN')?.id ?? null;
        this.closeId = states.find(s => s.name === 'CLOSE')?.id ?? null;

        this.state = {
            ...this.state,
            direction: 0,
        };
    }

    protected isTileActive(): boolean {
        return this.state.direction !== 0;
    }

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    private sendOpen = (e: React.MouseEvent): void => {
        e.stopPropagation();
        if (this.openId) {
            void this.props.stateContext.getSocket().setState(this.openId, true);
        }
        this.setState({ direction: 1 });
    };

    private sendStop = (e: React.MouseEvent): void => {
        e.stopPropagation();
        if (this.stopId) {
            void this.props.stateContext.getSocket().setState(this.stopId, true);
        }
        this.setState({ direction: 0 });
    };

    private sendClose = (e: React.MouseEvent): void => {
        e.stopPropagation();
        if (this.closeId) {
            void this.props.stateContext.getSocket().setState(this.closeId, true);
        }
        this.setState({ direction: 2 });
    };

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const { direction } = this.state;
        const accent = this.getAccentColor();

        if (direction === 1) {
            return <KeyboardArrowUp sx={theme => ({ color: accent || theme.palette.primary.main })} />;
        }
        if (direction === 2) {
            return <KeyboardArrowDown sx={theme => ({ color: accent || theme.palette.primary.main })} />;
        }
        return <Stop sx={{ color: 'text.disabled' }} />;
    }

    protected renderTileStatus(): React.JSX.Element {
        const { direction } = this.state;
        const accent = this.getAccentColor();

        const text = direction === 1 ? I18n.t('wm_Open') : direction === 2 ? I18n.t('wm_Closed') : I18n.t('wm_Off');

        return (
            <Typography
                variant="caption"
                sx={theme => ({
                    fontWeight: 500,
                    color: direction !== 0 ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                })}
            >
                {text}
            </Typography>
        );
    }

    protected renderTileAction(): React.JSX.Element {
        const accent = this.getAccentColor();
        const { direction } = this.state;

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                    size="small"
                    onClick={this.sendOpen}
                    sx={theme => ({
                        color: direction === 1 ? accent || theme.palette.primary.main : 'text.secondary',
                    })}
                >
                    <KeyboardArrowUp />
                </IconButton>
                <IconButton
                    size="small"
                    onClick={this.sendStop}
                    sx={{ color: 'text.secondary' }}
                >
                    <Stop />
                </IconButton>
                <IconButton
                    size="small"
                    onClick={this.sendClose}
                    sx={theme => ({
                        color: direction === 2 ? accent || theme.palette.primary.main : 'text.secondary',
                    })}
                >
                    <KeyboardArrowDown />
                </IconButton>
            </Box>
        );
    }

    // 1x1 compact — three large buttons
    renderCompact(): React.JSX.Element {
        const { name, direction } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const settingsButton = this.renderSettingsButton();
        const indicators = this.renderIndicators(settingsButton);

        const btnSx = (active: boolean) => (theme: IobTheme) => ({
            flex: 1,
            borderRadius: '12px',
            color: active ? accent || theme.palette.primary.main : theme.palette.text.secondary,
            backgroundColor: active ? `${accent || theme.palette.primary.main}22` : 'transparent',
            transition: 'all 0.2s',
            '&:hover': { backgroundColor: `${accent || theme.palette.primary.main}18` },
        });

        return (
            <Box
                id={String(this.props.widget.id)}
                className={this.getWidgetClass()}
                sx={theme => WidgetGeneric.getStyleCompact(theme)}
            >
                <Box
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        ...getTileStyles(theme, isActive, accent),
                        padding: 'max(12px, 8cqi)',
                    })}
                >
                    {indicators}

                    {/* Three buttons */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'max(4px, 2cqi)',
                            flex: 1,
                            justifyContent: 'center',
                        }}
                    >
                        <ButtonBase
                            onClick={this.sendOpen}
                            sx={btnSx(direction === 1)}
                        >
                            <KeyboardArrowUp sx={{ fontSize: 'max(28px, 18cqi)' }} />
                        </ButtonBase>
                        <ButtonBase
                            onClick={this.sendStop}
                            sx={btnSx(false)}
                        >
                            <Stop sx={{ fontSize: 'max(24px, 16cqi)' }} />
                        </ButtonBase>
                        <ButtonBase
                            onClick={this.sendClose}
                            sx={btnSx(direction === 2)}
                        >
                            <KeyboardArrowDown sx={{ fontSize: 'max(28px, 18cqi)' }} />
                        </ButtonBase>
                    </Box>

                    {/* Name */}
                    <Box>
                        <Typography
                            ref={this.nameRef}
                            variant="body2"
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
                                          fontSize: 'max(0.6rem, 6cqi)',
                                      }
                                    : {}),
                            })}
                        >
                            {this.props.settings?.name || name || '...'}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        );
    }
}

export default WidgetBlindButtons;
