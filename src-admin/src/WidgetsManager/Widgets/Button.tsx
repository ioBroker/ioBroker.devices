import React from 'react';
import { Button, Typography } from '@mui/material';
import { TouchApp } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';
import type { ConfigItemPanel } from '@iobroker/json-config';

import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericSettings, type WidgetGenericState } from './Generic';

/** Settings for the Button widget */
export interface ButtonWidgetSettings extends WidgetGenericSettings {
    /** Label of the action button; defaults to "Press" */
    buttonText?: string;
    /** Confirmation mode: none, pin pad, or simple confirm dialog */
    confirmMode?: 'none' | 'pin' | 'confirm';
    /** PIN code (only used when confirmMode is 'pin') */
    pin?: string;
    /** Custom confirmation text */
    confirmText?: string;
}

interface WidgetButtonState extends WidgetGenericState {
    pressed: boolean;
}

/** How long the tile stays highlighted after a press — `button.SET` is write-only, so there is no feedback state */
const PRESS_FEEDBACK_MS = 1_200;

export class WidgetButton extends WidgetGeneric<WidgetButtonState, ButtonWidgetSettings> {
    private readonly setId: string | null;
    private pressTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(props: WidgetGenericProps<ButtonWidgetSettings>) {
        super(props);
        this.setId = props.widget.control.states.find(s => s.name === 'SET')?.id ?? null;

        this.state = {
            ...this.state,
            pressed: false,
        };
    }

    static getDefaultSettings(): ButtonWidgetSettings {
        return {
            ...WidgetGeneric.getDefaultSettings(),
            buttonText: '',
            confirmMode: 'none',
            pin: '',
            confirmText: '',
        };
    }

    static getConfigSchema(): { name: string; schema: ConfigItemPanel } {
        return {
            name: 'Button',
            schema: {
                type: 'panel',
                items: {
                    buttonText: {
                        type: 'text',
                        label: 'wm_Button text',
                        default: '',
                    },
                    confirmMode: {
                        type: 'select',
                        label: 'wm_Confirmation',
                        options: [
                            { value: 'none', label: 'wm_No confirmation' },
                            { value: 'pin', label: 'wm_PIN code' },
                            { value: 'confirm', label: 'wm_Confirm dialog' },
                        ],
                        default: 'none',
                        format: 'dropdown',
                    },
                    pin: {
                        type: 'text',
                        label: 'wm_PIN Code',
                        default: '',
                        hidden: "data.confirmMode !== 'pin'",
                    },
                    confirmText: {
                        type: 'text',
                        label: 'wm_Confirmation text',
                        default: '',
                        hidden: "data.confirmMode === 'none' || !data.confirmMode",
                    },
                },
            },
        };
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.pressTimer) {
            clearTimeout(this.pressTimer);
            this.pressTimer = null;
        }
    }

    private press(): void {
        if (this.setId) {
            void this.setValue(this.setId, true);
        }
        if (this.pressTimer) {
            clearTimeout(this.pressTimer);
        }
        this.setState({ pressed: true });
        this.pressTimer = setTimeout(() => {
            this.pressTimer = null;
            this.setState({ pressed: false });
        }, PRESS_FEEDBACK_MS);
    }

    private requestPress = (): void => {
        const mode = this.props.settings?.confirmMode || 'none';
        if (mode === 'pin') {
            this.showPinPad(this.props.settings?.pin || '');
        } else if (mode === 'confirm') {
            this.showConfirmDialog('dialog', undefined, this.props.settings?.confirmText);
        } else {
            this.press();
        }
    };

    protected onPinPadSuccess(): void {
        this.press();
    }

    protected onConfirmDialogSuccess(): void {
        this.press();
    }

    // --- Overrides ---

    protected isTileActive(): boolean {
        return this.state.pressed;
    }

    protected hasTileAction(): boolean {
        return !!this.setId;
    }

    protected onTileClick(): void {
        this.requestPress();
    }

    private get buttonLabel(): string {
        return this.props.settings?.buttonText || I18n.t('wm_Press');
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
                    color: this.state.pressed ? accent || theme.palette.primary.main : theme.palette.text.disabled,
                    transition: 'color 0.25s ease',
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
                    color: this.state.pressed ? accent || theme.palette.primary.main : theme.palette.text.secondary,
                    transition: 'color 0.25s ease',
                })}
            >
                {this.state.pressed ? I18n.t('wm_Sent') : this.buttonLabel}
            </Typography>
        );
    }

    protected renderTileAction(): React.JSX.Element | null {
        if (!this.setId) {
            return null;
        }
        const accent = this.getAccentColor();

        return (
            <Button
                variant="outlined"
                size="small"
                disabled={this.isReadOnly}
                onClick={e => {
                    e.stopPropagation();
                    this.requestPress();
                }}
                sx={theme => ({
                    borderColor: accent || theme.palette.primary.main,
                    color: accent || theme.palette.primary.main,
                    textTransform: 'none',
                    minWidth: 0,
                })}
            >
                {this.buttonLabel}
            </Button>
        );
    }
}

export default WidgetButton;
