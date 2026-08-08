import {
    Air,
    Bolt,
    ElectricalServices,
    ElectricMeter,
    EnergySavingsLeaf,
    Explore,
    Flare,
    Grass,
    Hearing,
    LightMode,
    Opacity,
    RotateRight,
    Schedule,
    Speed,
    Thermostat,
    Visibility,
    Water,
    WaterDrop,
    Waves,
    type SvgIconComponent,
} from '@mui/icons-material';

/**
 * Map ioBroker roles / units to icons.
 *
 * Shared by the widget manager (info widgets) and the device list, so a state is represented by
 * the same symbol everywhere. Order matters — the first matching pattern wins, so put the more
 * specific patterns first.
 */
export const ROLE_ICON_MAP: [RegExp, SvgIconComponent][] = [
    [/pressure|baro/i, Speed],
    [/voltage/i, Bolt],
    [/current(?!.*weather)/i, ElectricalServices],
    [/power|watt/i, ElectricMeter],
    [/energy|consumption|\bk?wh\b/i, EnergySavingsLeaf],
    // Bare unit abbreviations, checked after the spelled-out roles so "value.energy" keeps its own
    // icon. The word boundaries keep "kWh" and "Wh" out — those are energy, not power.
    [/\bw\b|\bkw\b|\bmw\b/i, ElectricMeter],
    [/frequency|hertz|hz/i, Waves],
    [/humidity|moisture/i, WaterDrop],
    [/temperature|temp/i, Thermostat],
    [/wind.*speed/i, Air],
    [/wind.*dir/i, Explore],
    // Knots only ever measure wind here, and aliases frequently carry a generic `state` role, so
    // the unit is the only hint left. `\b` keeps it from firing inside words such as "unknown".
    [/\bkn\b|knot/i, Air],
    [/precipitation|rain/i, Opacity],
    // A starburst rather than yet another sun — `LightMode` below is already a sun and the two
    // were indistinguishable side by side.
    [/uv/i, Flare],
    [/visibility/i, Visibility],
    [/air.*quality|aqi|pm2|pm10|co2/i, Air],
    [/noise|decibel|dba/i, Hearing],
    [/water.*level|tank/i, Water],
    [/soil/i, Grass],
    [/\brpm\b|rotation|revolutions/i, RotateRight],
    // Operating-hour counters and uptimes. `\bh\b` catches the bare unit "h" without firing on
    // "hPa" or "kWh", where the h is glued to another word character.
    [/\bhours?\b|\bh\b|uptime|runtime|operating.*time/i, Schedule],
    [/light|lux|illumin/i, LightMode],
];

/**
 * Pick an icon for a state from its role and unit.
 *
 * @param role `common.role` of the state, e.g. `value.brightness`
 * @param unit `common.unit` of the state, e.g. `lux`
 * @returns The matching icon component, or null when nothing fits
 */
export function getIconForRole(role: string, unit: string): SvgIconComponent | null {
    const combined = `${role} ${unit}`;
    for (const [regex, Icon] of ROLE_ICON_MAP) {
        if (regex.test(combined)) {
            return Icon;
        }
    }
    return null;
}
