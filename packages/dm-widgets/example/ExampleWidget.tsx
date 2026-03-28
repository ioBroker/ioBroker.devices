/**
 * Example plugin widget extending WidgetGeneric.
 *
 * Install:  npm install @iobroker/dm-widgets
 *
 * Build:    Your bundler (webpack/vite with Module Federation plugin) must
 *           mark '@iobroker/dm-widgets' as a shared dependency so it is
 *           provided by the host at runtime, NOT bundled into the plugin.
 *
 * Register: In your adapter's io-package.json, declare the widget:
 *           {
 *               "widgets": {
 *                   "url": "widgets/remoteEntry.js",
 *                   "components": [{
 *                       "name": "ExampleWidget",
 *                       "label": { "en": "Example", "de": "Beispiel" },
 *                       "description": { "en": "An example plugin widget" },
 *                       "icon": "widgets/example.png"
 *                   }]
 *               }
 *           }
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Speed } from '@mui/icons-material';
import { I18n } from '@iobroker/adapter-react-v5';

// Import types and base class — at runtime, the host provides the real implementation
import WidgetGeneric, {
    getTileStyles,
    isNeumorphicTheme,
    type WidgetGenericProps,
    type WidgetGenericState,
} from '@iobroker/dm-widgets';

// --- Custom state ---

interface ExampleWidgetState extends WidgetGenericState {
    value: number;
    unit: string;
}

// --- Widget ---

export class ExampleWidget extends WidgetGeneric<ExampleWidgetState> {
    private readonly actualId: string | null;

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        this.actualId = states.find(s => s.name === 'ACTUAL')?.id ?? null;

        this.state = {
            ...this.state,
            value: 0,
            unit: '',
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.actualId) {
            this.props.stateContext.getState(this.actualId, this.onValueChange);
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        if (this.actualId) {
            this.props.stateContext.removeState(this.actualId, this.onValueChange);
        }
    }

    private onValueChange = (_id: string, state: ioBroker.State): void => {
        const value = Number(state.val) || 0;
        if (value !== this.state.value) {
            this.setState({ value });
        }
    };

    // --- Overrides ---

    protected isTileActive(): boolean {
        return this.state.value > 0;
    }

    protected getHistoryIds(): { id: string; color: string }[] {
        return this.actualId ? [{ id: this.actualId, color: '#4caf50' }] : [];
    }

    protected renderTileIcon(): React.JSX.Element {
        return <Speed />;
    }

    protected renderTileStatus(): React.JSX.Element {
        return (
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {this.state.value} {this.state.unit}
            </Typography>
        );
    }

    // --- Custom compact rendering ---

    renderCompact(): React.JSX.Element {
        const { name, value, unit } = this.state;
        const isActive = this.isTileActive();
        const accent = this.getAccentColor();

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
                        padding: isNeumorphicTheme(theme) ? 'max(12px, 8cqi)' : 'max(16px, 10cqi)',
                    })}
                >
                    {/* Icon */}
                    <Box sx={{ fontSize: 'max(28px, 16cqi)' }}>
                        <Speed sx={{ fontSize: 'inherit' }} />
                    </Box>

                    {/* Value */}
                    <Typography
                        variant="h5"
                        sx={{ fontWeight: 700, fontSize: 'max(1.2rem, 14cqi)' }}
                    >
                        {value} {unit}
                    </Typography>

                    {/* Name */}
                    <Typography
                        ref={this.nameRef}
                        variant="body2"
                        sx={{ fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap' }}
                    >
                        {this.props.settings?.name || name || '...'}
                    </Typography>

                    {this.renderChart()}
                </Box>
                {this.renderSettingsButton()}
            </Box>
        );
    }

    // renderWide() and renderWideTall() fall back to the base class
    // implementation, which uses renderTileIcon/Status/Action overrides.
}

export default ExampleWidget;
