import React, { Component } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Extension } from '@mui/icons-material';
import { Types } from '@iobroker/type-detector';

import type StateContext from '../StateContext';
import type { WidgetInfo } from '../../../../src/widget-utils';
import WidgetGeneric, { getTileStyles, type WidgetGenericProps } from './Generic';
import { loadPluginComponent } from '../pluginLoader';

interface PluginWidgetProps {
    id: string;
    language: ioBroker.Languages;
    size?: '1x1' | '2x0.5' | '2x1';
    color?: string;
    pluginAdapter: string;
    pluginComponent: string;
    pluginUrl: string;
    admin: boolean;
    stateContext?: StateContext;
    onOpenSettings?: (id: string) => void;
    onRemove?: (id: string) => void;
    /** All custom widget definition fields — includes plugin-specific settings values */
    pluginSettings?: Record<string, unknown>;
}

interface PluginWidgetState {
    PluginComp: React.ComponentType<Record<string, unknown>> | null;
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
            prevProps.pluginAdapter !== this.props.pluginAdapter ||
            prevProps.pluginComponent !== this.props.pluginComponent ||
            prevProps.pluginUrl !== this.props.pluginUrl
        ) {
            this.loadComponent();
        }
    }

    componentWillUnmount(): void {
        this.mounted = false;
    }

    private loadComponent(): void {
        const { pluginUrl, pluginAdapter, pluginComponent } = this.props;
        if (!pluginUrl || !pluginAdapter || !pluginComponent) {
            this.setState({ loading: false, error: 'Missing plugin configuration' });
            return;
        }

        this.setState({ loading: true, error: null });

        loadPluginComponent(pluginUrl, pluginAdapter, pluginComponent, this.props.admin)
            .then(Comp => {
                if (this.mounted) {
                    this.setState({ PluginComp: Comp, loading: false });
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
        const { size, color, id, pluginAdapter, pluginComponent } = this.props;

        // Loading or error state
        if (loading || error || !PluginComp) {
            const is2col = size === '2x0.5' || size === '2x1';
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
                            aspectRatio: size === '2x0.5' ? undefined : '1',
                            height: size === '2x0.5' ? 80 : undefined,
                            overflow: 'hidden',
                            ...getTileStyles(theme, false, color, false),
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

        const pluginProps: WidgetGenericProps & { pluginSettings?: Record<string, unknown> } = {
            widget,
            language: this.props.language,
            stateContext: this.props.stateContext!,
            size,
            settings: {
                size: size || '1x1',
                color: color || '',
            } as WidgetGenericProps['settings'],
            onOpenSettings: this.props.onOpenSettings ? () => this.props.onOpenSettings!(id) : undefined,
            // Pass all custom settings so the plugin can read its own config values
            pluginSettings: this.props.pluginSettings,
        };

        // Render the loaded plugin component with full WidgetGenericProps
        return <PluginComp {...(pluginProps as unknown as Record<string, unknown>)} />;
    }
}

export default PluginWidget;
