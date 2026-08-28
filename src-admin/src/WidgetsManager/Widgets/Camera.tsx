import React from 'react';
import { Box, Dialog, IconButton, Slider, Switch, Typography } from '@mui/material';
import { Close, Refresh, Videocam, VideocamOff } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';
import type { ConfigItemPanel } from '@iobroker/json-config';

import { WidgetImage, type ImageWidgetSettings, type PictureDefaults, type WidgetImageState } from './Image';
import WidgetGeneric, { type WidgetGenericProps } from './Generic';

/** Boolean camera features, in the order they are offered in the dialog */
const SWITCH_STATES: { name: string; label: string }[] = [
    { name: 'NIGHTMODE', label: 'wm_Night mode' },
    { name: 'AUTOFOCUS', label: 'wm_Autofocus' },
    { name: 'AUTOWHITEBALANCE', label: 'wm_Auto white balance' },
    { name: 'BRIGHTNESS', label: 'wm_Brightness' },
];

/**
 * A camera tile is useless without auto-refresh, so unlike a plain picture it polls by default.
 * `appendTimestamp` stays off: the refresh counter already busts the cache, and a wall-clock stamp
 * would refetch the snapshot on every unrelated re-render.
 */
const CAMERA_DEFAULTS: PictureDefaults = { refreshInterval: 10, appendTimestamp: false };

interface WidgetCameraState extends WidgetImageState {
    dialogOpen: boolean;
    /** Current value of each boolean feature, keyed by pattern state name */
    switches: Record<string, boolean>;
    ptz: number | null;
    ptzMin: number;
    ptzMax: number;
}

type StateChangeHandler = (id: string, state: ioBroker.State) => void;

export class WidgetCamera extends WidgetImage<WidgetCameraState> {
    private readonly switchIds: Record<string, string> = {};
    private readonly ptzId: string | null;
    private readonly cameraHandlers: { id: string; handler: StateChangeHandler }[] = [];

    constructor(props: WidgetGenericProps<ImageWidgetSettings>) {
        super(props);
        const states = props.widget.control.states;

        for (const { name } of SWITCH_STATES) {
            const id = states.find(s => s.name === name)?.id;
            if (id) {
                this.switchIds[name] = id;
            }
        }
        this.ptzId = states.find(s => s.name === 'PTZ')?.id ?? null;

        this.state = {
            ...this.state,
            dialogOpen: false,
            switches: {},
            ptz: null,
            ptzMin: 0,
            ptzMax: 100,
        };
    }

    static getConfigSchema(): { name: string; schema: ConfigItemPanel } {
        return {
            name: 'Camera',
            schema: {
                type: 'panel',
                items: {
                    refreshInterval: {
                        type: 'number',
                        label: 'wm_Refresh interval',
                        default: 10,
                        min: 0,
                        help: 'wm_Refresh interval help',
                    },
                    appendTimestamp: {
                        type: 'checkbox',
                        label: 'wm_Append timestamp',
                        default: false,
                    },
                },
            },
        };
    }

    static getDefaultSettings(): ImageWidgetSettings {
        return {
            ...WidgetGeneric.getDefaultSettings(),
            ...CAMERA_DEFAULTS,
        };
    }

    // eslint-disable-next-line class-methods-use-this
    protected getPictureDefaults(): PictureDefaults {
        return CAMERA_DEFAULTS;
    }

    componentDidMount(): void {
        super.componentDidMount();
        for (const [name, id] of Object.entries(this.switchIds)) {
            const handler: StateChangeHandler = (_id, state) => {
                const value = !!state.val;
                if (this.state.switches[name] !== value) {
                    this.setState(prev => ({ switches: { ...prev.switches, [name]: value } }));
                }
            };
            this.cameraHandlers.push({ id, handler });
            this.props.stateContext.getState(id, handler);
        }
        if (this.ptzId) {
            this.cameraHandlers.push({ id: this.ptzId, handler: this.onPtz });
            this.props.stateContext.getState(this.ptzId, this.onPtz);
            void this.loadPtzRange();
        }
    }

    /** `level.camera.position` has no declared range — pan is often 0..360 or a preset index. */
    private async loadPtzRange(): Promise<void> {
        if (!this.ptzId) {
            return;
        }
        try {
            const obj = (await this.props.stateContext.getSocket().getObject(this.ptzId)) as
                ioBroker.StateObject | null | undefined;
            const min = obj?.common?.min != null ? Number(obj.common.min) : 0;
            const max = obj?.common?.max != null ? Number(obj.common.max) : 100;
            if (!isNaN(min) && !isNaN(max) && max > min) {
                this.setState({ ptzMin: min, ptzMax: max });
            }
        } catch {
            // keep the 0..100 default
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        for (const { id, handler } of this.cameraHandlers) {
            this.props.stateContext.removeState(id, handler);
        }
    }

    private onPtz = (_id: string, state: ioBroker.State): void => {
        const val = Number(state.val);
        const ptz = state.val != null && !isNaN(val) ? Math.round(val) : null;
        if (ptz !== this.state.ptz) {
            this.setState({ ptz });
        }
    };

    private toggleSwitch = (name: string): void => {
        const id = this.switchIds[name];
        if (!id) {
            return;
        }
        const value = !this.state.switches[name];
        void this.setValue(id, value);
        this.setState(prev => ({ switches: { ...prev.switches, [name]: value } }));
    };

    private onPtzChange = (_e: Event | React.SyntheticEvent, value: number | number[]): void => {
        if (this.ptzId) {
            void this.setValue(this.ptzId, value as number);
        }
        this.setState({ ptz: value as number });
    };

    private refreshSnapshot = (): void => this.bumpTick();

    // --- Overrides ---

    // eslint-disable-next-line class-methods-use-this
    protected hasTileAction(): boolean {
        return true;
    }

    protected onTileClick(): void {
        this.setState({ dialogOpen: true });
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const accent = this.getAccentColor();

        return this.state.url ? (
            <Videocam sx={theme => ({ color: accent || theme.palette.primary.main })} />
        ) : (
            <VideocamOff sx={{ color: 'text.disabled' }} />
        );
    }

    private renderCameraDialog(): React.JSX.Element | null {
        if (!this.state.dialogOpen) {
            return null;
        }

        const displayUrl = this.getDisplayUrl();
        const switches = SWITCH_STATES.filter(s => this.switchIds[s.name]);

        return (
            <Dialog
                open
                onClose={() => this.setState({ dialogOpen: false })}
                fullWidth
                maxWidth="md"
                slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1 }}>
                    <Typography
                        variant="subtitle1"
                        noWrap
                        sx={{ fontWeight: 600, flex: 1 }}
                    >
                        {this.props.settings?.name || this.state.name || I18n.t('wm_Camera')}
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={this.refreshSnapshot}
                        title={I18n.t('wm_Refresh')}
                    >
                        <Refresh />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => this.setState({ dialogOpen: false })}
                    >
                        <Close />
                    </IconButton>
                </Box>

                <Box
                    sx={theme => ({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 240,
                        backgroundColor: theme.palette.mode === 'dark' ? '#000' : '#111',
                    })}
                >
                    {displayUrl ? (
                        <Box
                            component="img"
                            src={displayUrl}
                            alt=""
                            sx={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', display: 'block' }}
                        />
                    ) : (
                        <VideocamOff sx={{ fontSize: 64, color: 'text.disabled' }} />
                    )}
                </Box>

                {switches.length || this.ptzId ? (
                    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {switches.map(s => (
                            <Box
                                key={s.name}
                                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            >
                                <Typography variant="body2">{I18n.t(s.label)}</Typography>
                                <Switch
                                    checked={!!this.state.switches[s.name]}
                                    disabled={this.isReadOnly}
                                    onChange={() => this.toggleSwitch(s.name)}
                                    size="small"
                                />
                            </Box>
                        ))}
                        {this.ptzId ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography
                                    variant="body2"
                                    sx={{ minWidth: 40 }}
                                >
                                    {I18n.t('wm_PTZ')}
                                </Typography>
                                <Slider
                                    value={this.state.ptz ?? this.state.ptzMin}
                                    min={this.state.ptzMin}
                                    max={this.state.ptzMax}
                                    size="small"
                                    disabled={this.isReadOnly}
                                    onChangeCommitted={this.onPtzChange}
                                />
                            </Box>
                        ) : null}
                    </Box>
                ) : null}
            </Dialog>
        );
    }

    render(): React.JSX.Element {
        return (
            <>
                {super.render()}
                {this.renderCameraDialog()}
            </>
        );
    }
}

export default WidgetCamera;
