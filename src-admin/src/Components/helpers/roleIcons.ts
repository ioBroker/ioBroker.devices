import {
    Air,
    Bolt,
    ElectricalServices,
    ElectricMeter,
    EnergySavingsLeaf,
    Explore,
    Grass,
    Hearing,
    LightMode,
    Opacity,
    Speed,
    Thermostat,
    Visibility,
    Water,
    WaterDrop,
    WbSunny,
    Waves,
    type SvgIconComponent,
} from '@mui/icons-material';

/** Map ioBroker roles / units to icons */
const ROLE_ICON_MAP: [RegExp, SvgIconComponent][] = [
    [/pressure|baro/i, Speed],
    [/voltage/i, Bolt],
    [/current(?!.*weather)/i, ElectricalServices],
    [/power|watt/i, ElectricMeter],
    [/energy|consumption|kwh/i, EnergySavingsLeaf],
    [/frequency|hertz|hz/i, Waves],
    [/humidity|moisture/i, WaterDrop],
    [/temperature|temp/i, Thermostat],
    [/wind.*speed/i, Air],
    [/wind.*dir/i, Explore],
    [/precipitation|rain/i, Opacity],
    [/uv/i, WbSunny],
    [/visibility/i, Visibility],
    [/air.*quality|aqi|pm2|pm10|co2/i, Air],
    [/noise|decibel|dba/i, Hearing],
    [/water.*level|tank/i, Water],
    [/soil/i, Grass],
    [/light|lux|illumin/i, LightMode],
];

/**
 * Pick a symbol that describes what a state measures, from its role and unit.
 *
 * @param role `common.role` of the state
 * @param unit `common.unit` of the state
 * @returns The matching MUI icon, or `null` when nothing matches
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
