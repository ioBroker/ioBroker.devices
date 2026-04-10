import React, { Component } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Extension } from '@mui/icons-material';
import { Types } from '@iobroker/type-detector';

import type StateContext from '../StateContext';
import type { CustomWidgetPlugin, WidgetInfo } from '@iobroker/dm-widgets';
import WidgetGeneric, { getTileStyles } from './Generic';
import { loadPluginComponent } from '../pluginLoader';

interface PluginWidgetProps {
    id: string;
    stateContext: StateContext;
    onOpenSettings?: (id: string) => void;
    onRemove?: (id: string) => void;
    /** All custom widget definition fields — includes plugin-specific settings values */
    settings: CustomWidgetPlugin;
    openDialogId?: string | null;
    onOpenWidgetDialog?: (widgetId: string) => void;
    onCloseWidgetDialog?: () => void;
}

interface PluginWidgetState {
    PluginComp: typeof WidgetGeneric<any, any> | null;
    loading: boolean;
    error: string | null;
}

export class PluginWidget extends Component<PluginWidgetProps, PluginWidgetState> {
    private mounted = false;

    constructor(props: PluginWidgetProps) {
        super(props);
        this.state = { PluginComp: null, loading: true, error: null };
    }

    componentDidMount(): void {
        this.mounted = true;
        this.loadComponent();
    }

    componentDidUpdate(prevProps: PluginWidgetProps): void {
        if (
            prevProps.settings.pluginAdapter !== this.props.settings.pluginAdapter ||
            prevProps.settings.pluginComponent !== this.props.settings.pluginComponent ||
            prevProps.settings.pluginUrl !== this.props.settings.pluginUrl
        ) {
            this.loadComponent();
        }
    }

    componentWillUnmount(): void {
        this.mounted = false;
    }

    private loadComponent(): void {
        const { pluginUrl, pluginAdapter, pluginComponent } = this.props.settings;
        if (!pluginUrl || !pluginAdapter || !pluginComponent) {
            this.setState({ loading: false, error: 'Missing plugin configuration' });
            return;
        }

        this.setState({ loading: true, error: null });

        loadPluginComponent(pluginUrl, pluginAdapter, pluginComponent, this.props.stateContext.admin)
            .then(Comp => {
                if (this.mounted) {
                    this.setState({ PluginComp: Comp as any, loading: false });
                }
            })
            .catch(err => {
                if (this.mounted) {
                    this.setState({ loading: false, error: String(err?.message || err) });
                }
            });
    }

    render(): React.JSX.Element {
        const { PluginComp, loading, error } = this.state;
        const { id, pluginAdapter, pluginComponent } = this.props.settings;

        // Loading or error state
        if (loading || error || !PluginComp) {
            const is2col = this.props.settings.size === '2x0.5' || this.props.settings.size === '2x1';
            return (
                <Box
                    id={id}
                    sx={theme => (is2col ? WidgetGeneric.getStyleWide(theme) : WidgetGeneric.getStyleCompact(theme))}
                >
                    <Box
                        sx={theme => ({
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            aspectRatio: this.props.settings.size === '2x0.5' ? undefined : '1',
                            height: this.props.settings.size === '2x0.5' ? 80 : undefined,
                            overflow: 'hidden',
                            ...getTileStyles(theme, false, this.props.settings.color, false),
                            gap: 1,
                        })}
                    >
                        {loading ? (
                            <CircularProgress size={24} />
                        ) : (
                            <>
                                <Extension sx={{ fontSize: 32, opacity: 0.3 }} />
                                <Typography
                                    variant="caption"
                                    sx={{ color: 'error.main', textAlign: 'center', px: 1 }}
                                >
                                    {error || `${pluginAdapter}/${pluginComponent}`}
                                </Typography>
                            </>
                        )}
                    </Box>
                </Box>
            );
        }

        // Build a synthetic WidgetInfo so the plugin can use WidgetGeneric's full lifecycle
        const widget: WidgetInfo = {
            type: 'widget',
            id,
            name: { en: '' },
            control: {
                states: [],
                type: Types.info,
                storeId: '',
                parentId: '',
                deviceId: '',
                channelId: '',
            },
        };

        // Render the loaded plugin component with full WidgetGenericProps
        return (
            <PluginComp
                widget={widget}
                stateContext={this.props.stateContext}
                settings={this.props.settings}
                onOpenSettings={this.props.onOpenSettings ? () => this.props.onOpenSettings!(id) : undefined}
                openDialogId={this.props.openDialogId}
                onOpenWidgetDialog={this.props.onOpenWidgetDialog}
                onCloseWidgetDialog={this.props.onCloseWidgetDialog}
            />
        );
    }
}

export default PluginWidget;
