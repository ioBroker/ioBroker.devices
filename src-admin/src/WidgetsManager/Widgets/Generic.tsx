import React, { Component } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { Settings } from '@mui/icons-material';
import { alpha, type Theme } from '@mui/material/styles';
import { Icon } from '@iobroker/adapter-react-v5';

import type { WidgetInfo } from '../../../../src/widget-utils';
import type StateContext from '../StateContext';

export interface WidgetSettings {
    enabled: boolean;
    size: '1x1' | '2x1';
}

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
    enabled: true,
    size: '1x1',
};

export interface WidgetGenericProps {
    widget: WidgetInfo;
    language: ioBroker.Languages;
    stateContext: StateContext;
    size?: '1x1' | '2x1';
    settings?: WidgetSettings;
    onOpenSettings?: (widgetId: string | number) => void;
}

export interface WidgetGenericState {
    name: string | null;
    icon: string | null;
    color: string | null;
}

export function getTileStyles(theme: Theme, isActive: boolean, accentColor?: string): Record<string, unknown> {
    const accent = accentColor || theme.palette.primary.main;
    const isDark = theme.palette.mode === 'dark';

    return {
        borderRadius: '16px',
        boxSizing: 'border-box',
        padding: theme.spacing(2),
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: isActive
            ? alpha(accent, 0.12)
            : isDark
              ? alpha(theme.palette.common.white, 0.06)
              : alpha(theme.palette.common.black, 0.035),
        border: `1.5px solid ${
            isActive
                ? alpha(accent, 0.3)
                : isDark
                  ? alpha(theme.palette.common.white, 0.08)
                  : alpha(theme.palette.common.black, 0.08)
        }`,
        '&:active': {
            transform: 'scale(0.97)',
        },
    };
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

    // --- Overridable tile methods ---

    protected isTileActive(): boolean {
        return false;
    }

    protected getAccentColor(): string | undefined {
        return this.state.color || undefined;
    }

    protected onTileClick(): void {
        // noop by default
    }

    protected renderTileIcon(): React.JSX.Element | null {
        const { icon, color } = this.state;
        const isActive = this.isTileActive();

        if (icon) {
            return (
                <Icon
                    src={icon}
                    style={{
                        width: 32,
                        height: 32,
                        color: isActive ? color || undefined : undefined,
                        opacity: isActive ? 1 : 0.5,
                        transition: 'opacity 0.25s ease, color 0.25s ease',
                    }}
                />
            );
        }
        return null;
    }

    protected renderTileStatus(): React.JSX.Element | null {
        return null;
    }

    protected renderTileAction(): React.JSX.Element | null {
        return null;
    }

    // --- Settings button ---

    protected renderSettingsButton(): React.JSX.Element | null {
        if (!this.props.onOpenSettings) {
            return null;
        }
        const isEnabled = this.props.settings?.enabled !== false;

        return (
            <Box
                component="span"
                role="button"
                tabIndex={0}
                onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    this.props.onOpenSettings!(this.props.widget.id);
                }}
                onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        this.props.onOpenSettings!(this.props.widget.id);
                    }
                }}
                sx={theme => ({
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    p: '3px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 1,
                    color: isEnabled ? theme.palette.primary.main : theme.palette.text.disabled,
                    opacity: 0.6,
                    transition: 'opacity 0.2s, background-color 0.2s',
                    '&:hover': {
                        opacity: 1,
                        backgroundColor: theme.palette.action.hover,
                    },
                })}
            >
                <Settings sx={{ fontSize: 16 }} />
            </Box>
        );
    }

    // --- Frame rendering ---

    renderCompact(): React.JSX.Element {
        const { name } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;

        return (
            <Box sx={{ position: 'relative' }}>
                <ButtonBase
                    component="div"
                    disabled={isDisabled}
                    onClick={() => this.onTileClick()}
                    sx={theme => ({
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%',
                        aspectRatio: '1',
                        textAlign: 'left',
                        overflow: 'hidden',
                        opacity: isDisabled ? 0.4 : 1,
                        ...getTileStyles(theme, isActive, accent),
                    })}
                >
                    <Box>{this.renderTileIcon()}</Box>

                    <Box>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {name ?? '...'}
                        </Typography>
                        {this.renderTileStatus()}
                    </Box>
                </ButtonBase>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    renderWide(): React.JSX.Element {
        const { name } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();
        const isDisabled = this.props.settings?.enabled === false;

        return (
            <Box sx={{ position: 'relative', gridColumn: 'span 2' }}>
                <Box
                    onClick={isDisabled ? undefined : () => this.onTileClick()}
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                        cursor: isDisabled ? 'default' : 'pointer',
                        overflow: 'hidden',
                        opacity: isDisabled ? 0.4 : 1,
                        ...getTileStyles(theme, isActive, accent),
                    })}
                >
                    <Box sx={{ flexShrink: 0 }}>{this.renderTileIcon()}</Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {name ?? '...'}
                        </Typography>
                        {this.renderTileStatus()}
                    </Box>

                    {this.renderTileAction()}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    render(): React.JSX.Element {
        const size = this.props.settings?.size || this.props.size || '1x1';
        if (size === '2x1') {
            return this.renderWide();
        }
        return this.renderCompact();
    }
}

export default WidgetGeneric;
