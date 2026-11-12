/**
 * A web component of an adapter (`common.webComponents`, contract of `@iobroker/web-components`) as a tile.
 *
 * The tile is the frame - size, background, the settings button; the component draws everything inside it and gets
 * the socket of devices, its settings, the theme and the dialogs of devices. The module of the component is imported
 * when its first tile is shown; until then only its manifest is known.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Extension } from '@mui/icons-material';

import type { ConfigItemPanel } from '@iobroker/json-config';
import {
    getWebComponentTheme,
    importWebComponent,
    type LoadedWebComponent,
    type WebComponentDialogRequest,
    type WebComponentDialogs,
    type WebComponentElement,
    type WebComponentSettings,
    type WebComponentSocket,
} from '@iobroker/web-components';

import type { CustomWidgetWebComponent } from '../../../../packages/dm-widgets/src/index';
import { I18n } from '@iobroker/gui-components';
import WidgetGeneric, { type WidgetGenericProps, type WidgetGenericState } from './Generic';
import RemoveWidgetButton from './RemoveWidgetButton';
import type { OpenWebComponentDialog } from './WebComponentDialogs';
import { getDeviceWebComponents, getElementSettings, getLoadedWebComponent } from '../webComponents';

/** The dialogs come with JSON-Config: only fetched when a component asks for one */
const WebComponentDialogsView = React.lazy(() => import('./WebComponentDialogs'));

interface WebComponentHostProps {
    component: LoadedWebComponent;
    socket: WebComponentSocket;
    settings: WebComponentSettings;
    editMode: boolean;
    dialogs: WebComponentDialogs;
    /** Removes the tile, when the component cannot be loaded; only in the edit mode */
    onRemove?: () => void;
}

/**
 * Imports the module of the component, then renders the custom element and hands it its properties
 *
 * The element is created only when its class is defined, so it gets its properties through the setters of the
 * class. Properties, not attributes: the socket is an object, and a setting keeps its type. The socket comes first,
 * so that the element can subscribe as soon as it has its settings. The theme follows the one of devices.
 */
function WebComponentHost(props: WebComponentHostProps): React.JSX.Element {
    const ref = useRef<WebComponentElement | null>(null);
    // the colors, the font and the corners of devices
    const muiTheme = useTheme();
    const theme = useMemo(() => getWebComponentTheme(muiTheme), [muiTheme]);
    const { component } = props;
    const tag = component.manifest.tag;
    // drag & drop mounts a tile again whenever it moves: a component already shown draws at once
    const [ready, setReady] = useState(() => !!window.customElements.get(tag));
    const [error, setError] = useState('');

    useEffect(() => {
        if (ready) {
            return undefined;
        }
        let active = true;
        importWebComponent(component).then(
            () => active && setReady(true),
            (e: unknown) => {
                const message = (e as Error)?.message || String(e);
                console.error(`Cannot load web component <${tag}>: ${message}`);
                if (active) {
                    setError(message);
                }
            },
        );
        return () => {
            active = false;
        };
    }, [component, tag, ready]);

    useLayoutEffect(() => {
        if (ref.current) {
            ref.current.socket = props.socket;
            ref.current.dialogs = props.dialogs;
        }
    }, [ready, props.socket, props.dialogs]);

    useLayoutEffect(() => {
        if (ref.current) {
            ref.current.theme = theme;
            ref.current.editMode = props.editMode;
        }
    }, [ready, theme, props.editMode]);

    useLayoutEffect(() => {
        if (ref.current) {
            ref.current.settings = props.settings;
        }
    }, [ready, props.settings]);

    if (!ready) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    width: '100%',
                    height: '100%',
                }}
            >
                {error ? (
                    <>
                        <Typography
                            variant="caption"
                            title={error}
                            sx={{ color: 'error.main', textAlign: 'center', px: 1, wordBreak: 'break-word' }}
                        >
                            {I18n.t('wm_Web component cannot be loaded', `<${tag}>`)}
                        </Typography>
                        {props.onRemove ? <RemoveWidgetButton onRemove={props.onRemove} /> : null}
                    </>
                ) : (
                    <CircularProgress size={24} />
                )}
            </Box>
        );
    }

    // `iob-navigate` is not handled: devices has no views of the names a component knows
    return React.createElement(tag, {
        ref,
        style: { display: 'block', width: '100%', height: '100%' },
    });
}

interface WidgetWebComponentState extends WidgetGenericState {
    component: LoadedWebComponent | null;
    /** True once the components are loaded and this one is not among them */
    missing: boolean;
    wcDialogs: OpenWebComponentDialog[];
}

let nextDialogId = 1;

interface WidgetWebComponentProps extends WidgetGenericProps<CustomWidgetWebComponent> {
    /** Removes the tile; only in the edit mode */
    onRemove?: () => void;
}

export class WidgetWebComponent extends WidgetGeneric<WidgetWebComponentState, CustomWidgetWebComponent> {
    static getConfigSchema(): ConfigItemPanel {
        // the fields come from the manifest of the component, see CustomWidgetSettingsDialog
        return {
            type: 'panel',
            label: 'wm_Web component',
            items: {},
        };
    }

    declare readonly props: Readonly<WidgetWebComponentProps>;

    private mounted = false;

    /** The last settings handed to the element - kept, so that unchanged settings are no new object */
    private elementSettings: WebComponentSettings = {};

    private elementSettingsJson = '';

    /** The dialogs of devices for the element; one object, so the element gets it once */
    private readonly wcDialogs: WebComponentDialogs = {
        open: (request: WebComponentDialogRequest): Promise<unknown> =>
            new Promise(resolve => {
                const id = nextDialogId++;
                const dialog: OpenWebComponentDialog = {
                    id,
                    request,
                    resolve: (result: unknown): void => {
                        if (this.mounted) {
                            this.setState(state => ({ wcDialogs: state.wcDialogs.filter(d => d.id !== id) }));
                        }
                        resolve(result ?? null);
                    },
                };
                this.setState(state => ({ wcDialogs: [...state.wcDialogs, dialog] }));
            }),
    };

    constructor(props: WidgetWebComponentProps) {
        super(props);
        // a loaded component draws at once: drag & drop mounts the tile again whenever it moves
        const component = getLoadedWebComponent(props.settings.wcTag) || null;
        this.state = { ...this.state, component, missing: false, wcDialogs: [] };
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.mounted = true;
        if (!this.state.component) {
            this.findComponent();
        }
    }

    componentDidUpdate(prevProps: Readonly<WidgetGenericProps<CustomWidgetWebComponent>>): void {
        super.componentDidUpdate(prevProps);
        if (prevProps.settings.wcTag !== this.props.settings.wcTag) {
            this.setState({ component: getLoadedWebComponent(this.props.settings.wcTag) || null, missing: false });
            this.findComponent();
        }
    }

    componentWillUnmount(): void {
        // a dialog still open answers "cancelled", so the component does not wait forever
        this.mounted = false;
        for (const dialog of this.state.wcDialogs) {
            dialog.resolve(null);
        }
        super.componentWillUnmount();
    }

    /** Wait for the components to be loaded and take this one */
    private findComponent(): void {
        const tag = this.props.settings.wcTag;
        void getDeviceWebComponents().then(() => {
            if (this.mounted && tag === this.props.settings.wcTag) {
                const component = getLoadedWebComponent(tag) || null;
                this.setState({ component, missing: !component });
            }
        });
    }

    /** The settings of the element out of the tile */
    private getElementSettings(component: LoadedWebComponent): WebComponentSettings {
        const settings = getElementSettings(component.manifest, this.props.settings);
        const json = JSON.stringify(settings);
        if (json !== this.elementSettingsJson) {
            this.elementSettingsJson = json;
            this.elementSettings = settings;
        }
        return this.elementSettings;
    }

    private renderPlaceholder(): React.JSX.Element {
        const { wcAdapter, wcTag } = this.props.settings;
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    gap: 1,
                }}
            >
                {this.state.missing ? (
                    <>
                        <Extension sx={{ fontSize: 32, opacity: 0.3 }} />
                        <Typography
                            variant="caption"
                            sx={{ color: 'error.main', textAlign: 'center', px: 1 }}
                        >
                            {I18n.t('wm_Web component is not installed', `${wcAdapter}/${wcTag}`)}
                        </Typography>
                        {this.props.onRemove ? <RemoveWidgetButton onRemove={this.props.onRemove} /> : null}
                    </>
                ) : (
                    <CircularProgress size={24} />
                )}
            </Box>
        );
    }

    render(): React.JSX.Element {
        const { component, wcDialogs } = this.state;
        const size = this.props.settings.size || '1x1';
        const settingsButton = this.renderSettingsButton();
        // In the edit mode of devices - and for a user who may only look - the element writes no states
        const editMode = !!this.props.onOpenSettings || this.isReadOnly;

        let frameStyle: (theme: Parameters<typeof WidgetGeneric.getStyleCompact>[0]) => React.CSSProperties;
        if (size === '2x0.5') {
            frameStyle = WidgetGeneric.getStyleWide;
        } else if (size === '2x1') {
            frameStyle = WidgetGeneric.getStyleWideTall;
        } else if (size === '2x2') {
            frameStyle = WidgetGeneric.getStyleHuge;
        } else {
            frameStyle = WidgetGeneric.getStyleCompact;
        }

        return (
            <Box
                id={String(this.props.widget.id)}
                className="widget-webComponent"
                sx={theme => frameStyle(theme)}
            >
                {/* Sizer: gives the tile its height, the element fills it */}
                <Box
                    sx={
                        size === '2x0.5'
                            ? { height: 80 }
                            : size === '2x1'
                              ? { width: 'calc(50% - 6px)', aspectRatio: '1' }
                              : { width: '100%', aspectRatio: '1' }
                    }
                />
                <Box
                    sx={theme => ({
                        position: 'absolute',
                        inset: 0,
                        overflow: 'hidden',
                        ...this.applyTileStyles(theme, false, { interactive: false }),
                        padding: 0,
                    })}
                >
                    {component ? (
                        <WebComponentHost
                            component={component}
                            socket={this.props.stateContext.getSocket()}
                            settings={this.getElementSettings(component)}
                            editMode={editMode}
                            dialogs={this.wcDialogs}
                            onRemove={this.props.onRemove}
                        />
                    ) : (
                        this.renderPlaceholder()
                    )}
                </Box>
                {settingsButton ? (
                    <Box sx={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 0.5, zIndex: 2 }}>
                        {settingsButton}
                    </Box>
                ) : null}
                {wcDialogs.length ? (
                    <React.Suspense fallback={null}>
                        <WebComponentDialogsView
                            dialogs={wcDialogs}
                            stateContext={this.props.stateContext}
                            adapter={component?.adapter || this.props.settings.wcAdapter}
                        />
                    </React.Suspense>
                ) : null}
            </Box>
        );
    }
}

export default WidgetWebComponent;
