import React from 'react';
import { Box, Typography } from '@mui/material';
import { ElectricMeter } from '@mui/icons-material';
import { I18n } from '@iobroker/gui-components';

import WidgetGeneric, {
    formatFloat,
    toNumberOrNull,
    type WidgetGenericProps,
    type WidgetGenericState,
} from './Generic';
import { hideBaseFields } from '../configUtils';
import { getIconForRole } from '../../Components/helpers/roleIcons';
import type { ConfigItemPanel } from '@iobroker/json-config';

/**
 * All five readings sit in one `requiredOneOf` detector group — a device may declare any single one
 * of them and nothing else (e.g. a device metering only consumption, or only frequency). This order
 * is both the primary-reading preference and, applied a second time over what's left, the
 * secondary-reading preference, so a device with just one reading still shows something.
 */
const READING_ORDER = ['ELECTRIC_POWER', 'CONSUMPTION', 'CURRENT', 'VOLTAGE', 'FREQUENCY'] as const;
type ReadingName = (typeof READING_ORDER)[number];

const READING_LABEL: Record<ReadingName, string> = {
    ELECTRIC_POWER: 'wm_Power',
    CONSUMPTION: 'wm_Consumption',
    CURRENT: 'wm_Current',
    VOLTAGE: 'wm_Voltage',
    FREQUENCY: 'wm_Frequency',
};

const READING_ROLE: Record<ReadingName, string> = {
    ELECTRIC_POWER: 'value.power',
    CONSUMPTION: 'value.power.consumption',
    CURRENT: 'value.current',
    VOLTAGE: 'value.voltage',
    FREQUENCY: 'value.frequency',
};

interface ReadingMeta {
    id: string;
    /** `common.unit` as declared on the state itself, `''` when the device declares none */
    unit: string;
}

interface WidgetElectricityState extends WidgetGenericState {
    values: Partial<Record<ReadingName, number | null>>;
}

export class WidgetElectricity extends WidgetGeneric<WidgetElectricityState> {
    static override getConfigSchema(): { name: string; schema: ConfigItemPanel } {
        return {
            name: 'wm_Electricity',
            schema: { type: 'panel', items: { ...hideBaseFields('colorActive', 'color') } },
        };
    }

    private readonly readingMeta: Partial<Record<ReadingName, ReadingMeta>> = {};
    private readonly primaryName: ReadingName | null;
    private readonly secondaryName: ReadingName | null;
    /** Tile-face state IDs only — the "i" dialog's own subscription to all five is Generic's job. */
    private readonly idToName: Record<string, ReadingName> = {};

    constructor(props: WidgetGenericProps) {
        super(props);
        const states = props.widget.control.states;
        for (const name of READING_ORDER) {
            const match = states.find(s => s.name === name && s.id);
            if (match) {
                this.readingMeta[name] = { id: match.id, unit: match.unit || '' };
            }
        }

        this.primaryName = READING_ORDER.find(name => this.readingMeta[name]) ?? null;
        this.secondaryName = READING_ORDER.find(name => name !== this.primaryName && this.readingMeta[name]) ?? null;

        const values: Partial<Record<ReadingName, number | null>> = {};
        for (const name of [this.primaryName, this.secondaryName]) {
            if (name) {
                values[name] = null;
                this.idToName[this.readingMeta[name]!.id] = name;
            }
        }

        this.state = {
            ...this.state,
            values,
        };
    }

    componentDidMount(): void {
        super.componentDidMount();
        for (const id of Object.keys(this.idToName)) {
            this.props.stateContext.getState(id, this.onReadingChange);
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        for (const id of Object.keys(this.idToName)) {
            this.props.stateContext.removeState(id, this.onReadingChange);
        }
    }

    private onReadingChange = (id: string, state: ioBroker.State): void => {
        const name = this.idToName[id];
        if (!name) {
            return;
        }
        const value = toNumberOrNull(state.val);
        if (this.state.values[name] !== value) {
            this.setState(prev => ({ values: { ...prev.values, [name]: value } }));
        }
    };

    protected getHistoryIds(): { id: string; color: string; name?: string }[] {
        const ids: { id: string; color: string; name?: string }[] = [];
        if (this.primaryName) {
            ids.push({
                id: this.readingMeta[this.primaryName]!.id,
                color: '#f9a825',
                name: I18n.t(READING_LABEL[this.primaryName]),
            });
        }
        if (this.secondaryName) {
            ids.push({
                id: this.readingMeta[this.secondaryName]!.id,
                color: '#4caf50',
                name: I18n.t(READING_LABEL[this.secondaryName]),
            });
        }
        return ids;
    }

    /**
     * The unit shown for every plotted series, so it may only be given when it is true of all of them.
     *
     * Two readings whose units differ are plotted on their own axes and carry their own labels; two
     * where only one declares a unit are not, and naming that one here would label the other's values
     * with a unit its device never reported.
     */
    protected getChartUnit(): string | undefined {
        const units = [this.primaryName, this.secondaryName]
            .filter((name): name is ReadingName => !!name)
            .map(name => this.readingMeta[name]?.unit || '');
        return units.length && units.every(unit => unit === units[0]) ? units[0] || undefined : undefined;
    }

    protected isTileActive(): boolean {
        return !!this.primaryName && this.state.values[this.primaryName] != null;
    }

    /** Format one reading's current value at the scale the device declared, never inventing a unit. */
    private formatReading(name: ReadingName): string {
        const value = this.state.values[name];
        if (value == null) {
            return '—';
        }
        const unit = this.readingMeta[name]?.unit || '';
        // Shown at the scale the device declared, never converted: the same reading appears again as
        // an extra-info row in the "i" dialog, which shows it raw, and one tile stating a value two
        // ways reads as two measurements.
        const abs = Math.abs(value);
        const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
        const str = formatFloat(value, decimals, this.props.stateContext.isFloatComma);
        return unit ? `${str} ${unit}` : str;
    }

    private renderReadingIcon(name: ReadingName, fontSize: number): React.JSX.Element | null {
        const unit = this.readingMeta[name]?.unit || '';
        const IconComp = getIconForRole(READING_ROLE[name], unit);
        if (!IconComp) {
            return null;
        }
        return <IconComp sx={{ fontSize, color: 'text.secondary', flexShrink: 0 }} />;
    }

    protected renderTileIcon(): React.JSX.Element {
        const baseIcon = super.renderTileIcon();
        if (baseIcon) {
            return baseIcon;
        }

        if (!this.primaryName) {
            return <ElectricMeter sx={{ color: 'text.disabled' }} />;
        }
        const unit = this.readingMeta[this.primaryName]?.unit || '';
        const IconComp = getIconForRole(READING_ROLE[this.primaryName], unit) || ElectricMeter;
        const isActive = this.isTileActive();
        return (
            <IconComp
                sx={{
                    color: isActive ? '#f9a825' : 'text.disabled',
                    transition: 'color 0.25s ease',
                }}
            />
        );
    }

    protected renderTileStatus(): React.JSX.Element | null {
        // Every layout but the 1x1 shows the reading through renderTileAction — rendering it here
        // as well would print the same value twice on one tile.
        const size = this.props.settings?.size || '1x1';
        if (size !== '1x1' || !this.primaryName) {
            return null;
        }

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        lineHeight: 1.2,
                        color: 'text.primary',
                    }}
                >
                    {this.formatReading(this.primaryName)}
                </Typography>
                {this.secondaryName ? (
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 500,
                            color: 'text.secondary',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                        }}
                    >
                        {this.renderReadingIcon(this.secondaryName, 12)}
                        {this.formatReading(this.secondaryName)}
                    </Typography>
                ) : null}
            </Box>
        );
    }

    protected renderTileAction(): React.JSX.Element | null {
        if (!this.primaryName) {
            return null;
        }

        return (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                    {this.formatReading(this.primaryName)}
                </Typography>
                {this.secondaryName ? (
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'text.secondary',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {this.renderReadingIcon(this.secondaryName, 14)}
                        {this.formatReading(this.secondaryName)}
                    </Typography>
                ) : null}
            </Box>
        );
    }
}

export default WidgetElectricity;
