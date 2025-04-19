import React from 'react';

import { Types } from '@iobroker/type-detector';

import { AiOutlineLineChart as TypeIconChart } from 'react-icons/ai';
import type { IconType } from 'react-icons';
import { GoDeviceCameraVideo as TypeIconCamera } from 'react-icons/go';

import TypeIconBlinds from '../icons/Jalousie';
import TypeIconButton from '../icons/PushButton';
import {
    // FaExternalLinkSquareAlt as TypeIconURL,
    FaImage as TypeIconImage,
    FaRegLightbulb as TypeIconDimmer,
    FaInfoCircle as TypeIconInfo,
    FaLightbulb as TypeIconLight,
    FaLock as TypeIconLock,
    FaStreetView as TypeIconLocation,
    FaStepForward as TypeIconMedia,
    FaSlidersH as TypeIconSlider,
    FaVolumeDown as TypeIconVolume,
    FaVolumeUp as TypeIconVolumeGroup,
    FaFan as TypeIconAC,
} from 'react-icons/fa';
import TypeIconDoor from '../icons/DoorOpened';
import TypeIconFireAlarm from '../icons/FireOn';
import TypeIconFloodAlarm from '../icons/FloodOn';
import TypeIconGate from '../icons/Gate';
import TypeIconHumidity from '../icons/Humidity';
import TypeIconMotion from '../icons/MotionOn';
import TypeIconRGB from '../icons/RGB';
import {
    MdFormatColorFill as TypeIconHUE,
    MdFormatColorFill as TypeIconCT,
    MdWarning as TypeIconWarning,
} from 'react-icons/md';
import TypeIconSocket from '../icons/Socket';
import TypeIconTemperature from '../icons/Thermometer';
import TypeIconThermostat from '../icons/Thermostat';
// import TypeIconValve from '../icons/HeatValve';
import TypeIconWindow from '../icons/WindowOpened';
import TypeIconWindowTilt from '../icons/WindowTilted';
import { WiCloudy as TypeIconWeather } from 'react-icons/wi';
import { IoIosRadioButtonOn as TypeIconButtonSensor } from 'react-icons/io';
import TypeIconVacuumCleaner from './icons/Cleaner';

import { Icon as IconAdapter } from '@iobroker/adapter-react-v5';

const TYPE_ICONS: Partial<Record<Types, IconType>> = {
    [Types.airCondition]: TypeIconAC,
    [Types.blind]: TypeIconBlinds,
    [Types.blindButtons]: TypeIconBlinds,
    [Types.button]: TypeIconButton,
    [Types.buttonSensor]: TypeIconButtonSensor,
    [Types.camera]: TypeIconCamera,
    [Types.chart]: TypeIconChart,
    // [Types.url]: TypeIconURL,
    [Types.image]: TypeIconImage,
    [Types.dimmer]: TypeIconDimmer,
    [Types.door]: TypeIconDoor,
    [Types.fireAlarm]: TypeIconFireAlarm,
    // @ts-expect-error special case
    'sensor.alarm.fire': TypeIconFireAlarm,
    [Types.floodAlarm]: TypeIconFloodAlarm,
    'sensor.alarm.flood': TypeIconFloodAlarm,
    [Types.gate]: TypeIconGate,
    [Types.humidity]: TypeIconHumidity,
    [Types.info]: TypeIconInfo,
    [Types.light]: TypeIconLight,
    [Types.lock]: TypeIconLock,
    [Types.location]: TypeIconLocation,
    [Types.media]: TypeIconMedia,
    [Types.motion]: TypeIconMotion,
    [Types.rgb]: TypeIconRGB,
    [Types.ct]: TypeIconCT,
    [Types.rgbSingle]: TypeIconRGB,
    [Types.hue]: TypeIconHUE,
    [Types.cie]: TypeIconRGB,
    [Types.slider]: TypeIconSlider,
    [Types.socket]: TypeIconSocket,
    [Types.temperature]: TypeIconTemperature,
    [Types.thermostat]: TypeIconThermostat,
    // [Types.valve]: TypeIconValve,
    [Types.vacuumCleaner]: TypeIconVacuumCleaner,
    [Types.volume]: TypeIconVolume,
    [Types.volumeGroup]: TypeIconVolumeGroup,
    [Types.window]: TypeIconWindow,
    [Types.windowTilt]: TypeIconWindowTilt,
    [Types.weatherCurrent]: TypeIconWeather,
    [Types.weatherForecast]: TypeIconWeather,
    [Types.warning]: TypeIconWarning,
};

const defaultStyle: React.CSSProperties = {
    width: 32,
    height: 32,
};

export default function TypeIcon(props: {
    type?: Types;
    style?: React.CSSProperties;
    src?: string | React.JSX.Element | null;
}): React.JSX.Element | null {
    if (props.src) {
        if (typeof props.src === 'object') {
            return React.cloneElement(props.src, {
                style: { ...defaultStyle, ...(props.style || undefined) },
            });
        }

        return (
            <IconAdapter
                src={props.src}
                style={{ ...defaultStyle, ...(props.style || undefined) }}
                alt=""
            />
        );
    }

    const Icon = props.type && TYPE_ICONS[props.type];
    return Icon ? <Icon style={{ ...defaultStyle, ...(props.style || undefined) }} /> : null;
}
