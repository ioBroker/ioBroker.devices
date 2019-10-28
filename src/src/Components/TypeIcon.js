import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {Types} from 'iobroker.type-detector';

import TypeIconBlinds from '../icons/Jalousie';
import TypeIconButton from '../icons/PushButton';
import {GoDeviceCameraVideo as TypeIconCamera} from 'react-icons/go';
import {FaExternalLinkSquareAlt as TypeIconURL} from 'react-icons/fa';
import {FaImage as TypeIconImage} from 'react-icons/fa';
import {FaRegLightbulb as TypeIconDimmer} from 'react-icons/fa';
import TypeIconDoor from '../icons/DoorOpened';
import TypeIconFireAlarm from '../icons/FireOn';
import TypeIconFloodAlarm from '../icons/FloodOn';
import TypeIconGate from '../icons/Gate';
import TypeIconHumidity from '../icons/Humidity';
import {FaInfoCircle as TypeIconInfo} from 'react-icons/fa';
import {FaLightbulb as TypeIconLight} from 'react-icons/fa';
import {FaLock as TypeIconLock} from 'react-icons/fa';
import {FaStreetView as TypeIconLocation} from 'react-icons/fa';
import {FaStepForward as TypeIconMedia} from 'react-icons/fa';
import TypeIconMotion from '../icons/MotionOn';
import TypeIconRGB from '../icons/RGB';
import {MdFormatColorFill as TypeIconCT} from 'react-icons/md';
import TypeIconRGBSingle from '../icons/RGB';
import {MdFormatColorFill as TypeIconHUE} from 'react-icons/md';
import {FaSlidersH as TypeIconSlider} from 'react-icons/fa';
import TypeIconSocket from '../icons/Socket';
import TypeIconTemperature from '../icons/Thermometer';
import TypeIconThermostat from '../icons/Thermostat';
import TypeIconValve from '../icons/HeatValve';
import {FaVolumeDown as TypeIconVolume} from 'react-icons/fa';
import {FaVolumeUp as TypeIconVolumeGroup} from 'react-icons/fa';
import TypeIconWindow from '../icons/WindowOpened';
import TypeIconWindowTilt from '../icons/WindowTilted';
import {WiCloudy as TypeIconWeather} from 'react-icons/wi';
import {MdWarning as TypeIconWarning} from 'react-icons/md';

const TYPE_ICONS = {
    [Types.blind]: TypeIconBlinds,
    [Types.button]: TypeIconButton,
    [Types.camera]: TypeIconCamera,
    [Types.url]: TypeIconURL,
    [Types.image]: TypeIconImage,
    [Types.dimmer]: TypeIconDimmer,
    [Types.door]: TypeIconDoor,
    [Types.fireAlarm]: TypeIconFireAlarm,
    [Types.floodAlarm]: TypeIconFloodAlarm,
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
    [Types.slider]: TypeIconSlider,
    [Types.socket]: TypeIconSocket,
    [Types.temperature]: TypeIconTemperature,
    [Types.thermostat]: TypeIconThermostat,
    [Types.valve]: TypeIconValve,
    [Types.volume]: TypeIconVolume,
    [Types.volumeGroup]: TypeIconVolumeGroup,
    [Types.window]: TypeIconWindow,
    [Types.windowTilt]: TypeIconWindowTilt,
    [Types.weatherCurrent]: TypeIconWeather,
    [Types.weatherForecast]: TypeIconWeather,
    [Types.warning]: TypeIconWarning,
};

const defaultStyle = {
    marginTop: 4,
    marginLeft: 4,
    width: 32,
    height: 32,
};

class TypeIcon extends Component {
    render() {
        if (this.props.src) {
            return (<img src={this.props.src} style={Object.assign({}, defaultStyle, this.props.style || {})} className={this.props.className || ''} alt=""/>);
        } else {
            const Icon = this.props.type && TYPE_ICONS[this.props.type];
            return Icon ? (<Icon style={Object.assign({}, defaultStyle, this.props.style || {})} className={this.props.className || ''}/>) : null;
        }
    }
}

TypeIcon.propTypes = {
    type: PropTypes.string.isRequired,
    style: PropTypes.object,
    src: PropTypes.string,
    className: PropTypes.string,
};

export default TypeIcon;