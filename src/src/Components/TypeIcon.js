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
import {FaFan as TypeIconAC} from 'react-icons/fa';
import {IoIosRadioButtonOn as TypeIconButtonSensor} from 'react-icons/io';
import TypeIconVacuumCleaner from './icons/Cleaner';
import IconAdapter from '@iobroker/adapter-react/Components/Icon';
import Utils from '@iobroker/adapter-react/Components/Utils';

const TYPE_ICONS = {
    [Types.airCondition]: TypeIconAC,
    [Types.blind]: TypeIconBlinds,
    [Types.button]: TypeIconButton,
    [Types.buttonSensor]: TypeIconButtonSensor,
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
    marginTop: 4,
    marginLeft: 4,
    width: 32,
    height: 32,
};

class TypeIcon extends Component {

    constructor(props) {
        super(props);
        this.icon = null
    }
    async componentDidMount() {
        // find all icons
        if(!this.props.enumIDs && !this.props.objects){
            return
        }
        const icons = [];
        let changed = false;
        const memberIds = this.props.enumIDs
            if (memberIds) {
                for (let i = 0; i < icons.length; i++) {
                    if (!icons[i]) {
                        // check the parent
                        const channelId = Utils.getParentId(memberIds[i]);
                        if (channelId && channelId.split('.').length > 2) {
                            const channelObj = this.props.objects[channelId];
                            if (channelObj && (channelObj.type === 'channel' || channelObj.type === 'device')) {
                                if (channelObj.common?.icon) {
                                    icons[i] = channelObj.common?.icon;
                                    changed = true;
                                } else {
                                    // check the parent
                                    const deviceId = Utils.getParentId(channelId);
                                    if (deviceId && deviceId.split('.').length > 2) {
                                        console.log('Get deviceId' + deviceId);
                                        const deviceObj = await this.props.socket.getObject(deviceId);
                                        if (deviceObj && (deviceObj.type === 'channel' || deviceObj.type === 'device')) {
                                            if (deviceObj.common?.icon) {
                                                icons[i] = deviceObj.common?.icon;
                                                changed = true;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

        let imagePrefix = '.';

        if (memberIds) {
            const objects = this.props.objects;
            for (let i = 0; i < icons.length; i++) {
                const cIcon = icons[i];
                const id = memberIds[i];

                if (cIcon && !cIcon.startsWith('data:image/') && cIcon.includes('.')) {
                    let instance;
                    if (objects[id].type === 'instance' || objects[id].type === 'adapter') {
                        icons[i] = `${imagePrefix}/adapter/${objects[id].common.name}/${cIcon}`;
                    } else if (id && id.startsWith('system.adapter.')) {
                        instance = id.split('.', 3);
                        if (cIcon[0] === '/') {
                            instance[2] += cIcon;
                        } else {
                            instance[2] += '/' + cIcon;
                        }
                        icons[i] = `${imagePrefix}/adapter/${instance[2]}`;
                    } else {
                        instance = id.split('.', 2);
                        if (cIcon[0] === '/') {
                            instance[0] += cIcon;
                        } else {
                            instance[0] += '/' + cIcon;
                        }
                        icons[i] = `${imagePrefix}/adapter/${instance[0]}`;
                    }
                }
            }
        }
        if(changed){
            this.icon = icons
        }
        // changed && this.setState({icons});
    }

    render() {
        console.log(112233,this.props.type)
        if (!!this.props.src) {
            return <IconAdapter src={this.props.src} style={Object.assign({}, !this.props.className && defaultStyle, this.props.style || {})} className={this.props.className || ''} alt=""/>;
        } else {
            const Icon = this.props.type && TYPE_ICONS[this.props.type];
            return Icon ? <Icon style={Object.assign({}, !this.props.className && defaultStyle, this.props.style || {})} className={this.props.className || ''}/> : null;
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