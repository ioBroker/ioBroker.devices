import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Types } from '@iobroker/type-detector';

import { AiOutlineLineChart as TypeIconChart } from 'react-icons/ai';
import TypeIconBlinds from '../icons/Jalousie';
import TypeIconButton from '../icons/PushButton';
import { GoDeviceCameraVideo as TypeIconCamera } from 'react-icons/go';
import {
    FaExternalLinkSquareAlt as TypeIconURL,
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
import TypeIconRGBSingle from '../icons/RGB';
import {
    MdFormatColorFill as TypeIconHUE,
    MdFormatColorFill as TypeIconCT,
    MdWarning as TypeIconWarning,
} from 'react-icons/md';
import TypeIconSocket from '../icons/Socket';
import TypeIconTemperature from '../icons/Thermometer';
import TypeIconThermostat from '../icons/Thermostat';
import TypeIconValve from '../icons/HeatValve';
import TypeIconWindow from '../icons/WindowOpened';
import TypeIconWindowTilt from '../icons/WindowTilted';
import { WiCloudy as TypeIconWeather } from 'react-icons/wi';
import { IoIosRadioButtonOn as TypeIconButtonSensor } from 'react-icons/io';
import TypeIconVacuumCleaner from './icons/Cleaner';

import { Icon as IconAdapter } from '@iobroker/adapter-react-v5';

const TYPE_ICONS = {
    [Types.airCondition]: TypeIconAC,
    [Types.blind]: TypeIconBlinds,
    [Types.blindButtons]: TypeIconBlinds,
    [Types.button]: TypeIconButton,
    [Types.buttonSensor]: TypeIconButtonSensor,
    [Types.camera]: TypeIconCamera,
    [Types.chart]: TypeIconChart,
    [Types.url]: TypeIconURL,
    [Types.image]: TypeIconImage,
    [Types.dimmer]: TypeIconDimmer,
    [Types.door]: TypeIconDoor,
    [Types.fireAlarm]: TypeIconFireAlarm,
    'sensor.alarm.fire': TypeIconFireAlarm,
    [Types.floodAlarm]: TypeIconFloodAlarm,
    'sensor.alarm.flood': TypeIconFireAlarm,
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
    [Types.rgbSingle]: TypeIconRGBSingle,
    [Types.hue]: TypeIconHUE,
    [Types.cie]: TypeIconRGB,
    [Types.slider]: TypeIconSlider,
    [Types.socket]: TypeIconSocket,
    [Types.temperature]: TypeIconTemperature,
    [Types.thermostat]: TypeIconThermostat,
    [Types.valve]: TypeIconValve,
    [Types.vacuumCleaner]: TypeIconVacuumCleaner,
    [Types.volume]: TypeIconVolume,
    [Types.volumeGroup]: TypeIconVolumeGroup,
    [Types.window]: TypeIconWindow,
    [Types.windowTilt]: TypeIconWindowTilt,
    [Types.weatherCurrent]: TypeIconWeather,
    [Types.weatherForecast]: TypeIconWeather,
    [Types.warning]: TypeIconWarning,
};

const defaultStyle = {
    width: 32,
    height: 32,
};

class TypeIcon extends Component {
    render() {
        if (!!this.props.src) {
            return (
                <IconAdapter
                    src={this.props.src}
                    style={{ ...defaultStyle, ...(this.props.style || undefined) }}
                    alt=""
                />
            );
        }

        const Icon = this.props.type && TYPE_ICONS[this.props.type];
        return Icon ? <Icon style={{ ...defaultStyle, ...(this.props.style || undefined) }} /> : null;
    }
}

TypeIcon.propTypes = {
    type: PropTypes.string,
    style: PropTypes.object,
    src: PropTypes.string,
    sx: PropTypes.object,
};

export default TypeIcon;
