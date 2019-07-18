/**
 * Copyright 2018-2019 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Paper from '@material-ui/core/Paper';

import I18n from '../i18n';
import Theme from '@iobroker/adapter-react/Theme';
import {Types} from 'iobroker.type-detector';
import Utils from '@iobroker/adapter-react/Components/Utils';

import SmartGeneric from './SmartGeneric';
import SmartDimmer from './SmartDimmer';
import SmartSwitch from './SmartSwitch';

/*import SmartBlinds from './States/SmartBlinds';
import SmartButton from './States/SmartButton';
import SmartInfo from './States/SmartInfo';
import SmartSlider from './States/SmartSlider';
import SmartState from './States/SmartState';
import SmartThermometer from './States/SmartThermometer';
import SmartThermostat from "./States/SmartThermostat";
import SmartWindowTilt from './States/SmartWindowTilt';
import SmartLock from './States/SmartLock';
import SmartInstance from './States/SmartInstance';
import SmartMedia from './States/SmartMedia';
import SmartVolume from './States/SmartVolume';
import SmartWeatherForecast from './States/SmartWeatherForecast';
import SmartWarning from './States/SmartWarning';
import SmartURL from './States/SmartURL';
import SmartColor from './States/SmartColor';*/

class SmartTile extends Component {
    constructor(props) {
        super(props);
        this.channelInfo = this.props.channelInfo;
        this.state = {
            state: false,
            isPointer: false,
            visible: null,
            colorOn: Theme.tile.tileOn.background,
            colorOff: Theme.tile.tileOff.background,
            background: null,
            bottomBar: false,
            width: 1
        };
        this.stateId = this.channelInfo && this.channelInfo.states.find(state => state.id).id;
        this.handlers = {
            onMouseDown: null,
            onMouseUp: null,
            onClick: null
        };
        this.tileRef = React.createRef();
    }

    getObjectName(channelName) {
        return SmartGeneric.getObjectName(this.props.objects, this.stateId, null, channelName, this.props.enumNames);
    }

    onMouseDown(e) {
        if (this.handlers.onMouseDown && !this.props.editMode) {
            //e.preventDefault();
            e.stopPropagation();
            this.handlers.onMouseDown(e);
        }
    }

    onMouseUp(e) {
        if (this.handlers.onMouseUp && !this.props.editMode) this.handlers.onMouseUp(e);
    }

    onClick(e) {
        if (this.props.onClick) {
            this.props.onClick(e);
        } else
        if (this.handlers.onClick && !this.props.editMode) {
            this.handlers.onClick(e);
        }
    }

    getTileStyle() {
        let style;
        if (this.props.editMode) {
            style = Object.assign(
                {},
                Theme.tile.tile,
                Theme.tile.tileOn,
                typeof this.state.colorOn === 'object' ? this.state.colorOn : {background: this.state.colorOn},
                Theme.tile.editEnabled);
        } else {
            style = this.state.state ?
                Object.assign({}, Theme.tile.tile, Theme.tile.tileOn, typeof this.state.colorOn === 'object' ? this.state.colorOn : {background: this.state.colorOn}) :
                Object.assign({}, Theme.tile.tile, Theme.tile.tileOff, typeof this.state.colorOff === 'object' ? this.state.colorOff : {background: this.state.colorOff});
        }

        if (this.state.background) {
            style.backgroundImage = `url(${this.state.background})`;
            style.backgroundSize = '100% auto';
            style.backgroundPosition = this.state.bottomBar ? 'center center' : 'center calc(50% - 48px)';
            if (!this.state.state) {
                style.filter = 'grayscale(100%)'
            }
            delete style.background;
        }

        style.width = style.width * this.state.width;
        style.color = Utils.isUseBright(style.background) ? 'white' : 'black';

        if (!this.channelInfo) {
            style.paddingTop = 50;
            style.textAlign = 'center'
        }

        return style;
    }

    setSize(width) {
        if (width && width !== this.state.width) {
            this.setState({width});
        }
    }

    setBackgroundImage(url, bottomBar, seemless) {
        if (this.state.background !== url) {
            this.setState({background: url, bottomBar: bottomBar || false});
        }
    }

    setDelete(enumId) {
        this.props.onDelete(enumId);
    }

    setVisibility(isVisible, isDelete) {
        if (this.state.visible !== isVisible) {
            this.lastEnabledChange = Date.now();
            this.setState({visible: isVisible});
            this.props.onVisibilityControl && this.props.onVisibilityControl(this.stateId, isVisible);
        }
    }

    setColorOn(color) {
        if (JSON.stringify(this.state.colorOn) !== JSON.stringify(color)) {
            this.setState({colorOn: color});
        }
    }

    setColorOff(color) {
        if (JSON.stringify(this.state.colorOff) !== JSON.stringify(color)) {
            this.setState({colorOff: color});
        }
    }

    wrapContent(content) {
        let style = {cursor: this.state.isPointer || this.props.onClick ? 'pointer' : 'inherit'};
        if (!this.props.editMode && !this.state.visible && this.channelInfo) {
            style.display = 'none';
        }
        const hasAnimation = this.props.editMode && Date.now() - this.lastEnabledChange < 500;
        if (hasAnimation && this.hasAnimation) {
            this.hasAnimation = this.hasAnimation === 'just-enabled-disabled-1' ? 'just-enabled-disabled-2' : 'just-enabled-disabled-1';
        } else if (hasAnimation) {
            this.hasAnimation = 'just-enabled-disabled-1';
        } else {
            this.hasAnimation = '';
        }

        style = Object.assign(this.getTileStyle(), style);

        return (
            <Paper ref={this.tileRef}
                   style={style}
                   className={this.hasAnimation}
                   onMouseDown={this.onMouseDown.bind(this)}
                   onTouchStart={this.onMouseDown.bind(this)}
                   onMouseUp={this.onMouseUp.bind(this)}
                   onTouchEnd={this.onMouseUp.bind(this)}
                   onClick={this.onClick.bind(this)}
            >
                <span style={{display: 'none'}}>{this.channelInfo ? this.channelInfo.states.find(state => state.id).id : 'nothing'}</span>
                {content}
            </Paper>);
    }

    registerHandler(eventName, handler) {
        this.handlers[eventName] = handler;
    }

    unregisterHandler(eventName) {
        if (this.handlers[eventName]) {
            this.handlers[eventName] = null;
        }
    }

    createControl(control, channelInfo, tile) {
        let Component = control; // This will be used by rendering
        //              ↓
        return (<Component
            key={channelInfo.id + '-tile-' + Component.name}
            enumNames={this.props.enumNames}
            channelInfo={channelInfo}
            tile={tile}
            ignoreIndicators={this.props.ignoreIndicators}
            editMode={this.props.editMode}
            states={this.props.states}
            windowWidth={this.props.windowWidth}
            objects={this.props.objects}
            registerHandler={this.registerHandler.bind(this)}
            onSaveSettings={this.props.onSaveSettings}
            onCollectIds={this.props.onCollectIds}
            onControl={this.props.onControl}
        />);
    }

    render() {
        let Control;

        if (this.channelInfo) {
            switch (this.channelInfo.type) {
                case Types.dimmer:
                    Control = SmartDimmer;
                    break;
                case Types.light:
                case Types.socket:
                    Control = SmartSwitch;
                    break;
                /*case Types.blind:
                    Control = SmartBlinds;
                    break;
                case Types.windowTilt:
                    Control = SmartWindowTilt;
                    break;
                case Types.button:
                    Control = SmartButton;
                    break;
                case Types.temperature:
                    Control = SmartThermometer;
                    break;
                case Types.info:
                    Control = SmartInfo;
                    break;
                case Types.thermostat:
                    Control = SmartThermostat;
                    break;
                case Types.slider:
                    Control = SmartSlider;
                    break;
                case Types.volume:
                case Types.volumeGroup:
                    Control = SmartVolume;
                    break;
                case Types.lock:
                    Control = SmartLock;
                    break;
                case Types.instance:
                    Control = SmartInstance;
                    break;
                case Types.media:
                    Control = SmartMedia;
                    break;
                case Types.warning:
                    Control = SmartWarning;
                    break;
                case Types.window:
                case Types.fireAlarm:
                case Types.door:
                case Types.motion:
                    Control = SmartState;
                    break;
                case Types.rgbSingle:
                case Types.hue:
                case Types.rgb:
                case Types.ct:
                    Control = SmartColor;
                    break;
                case Types.weatherForecast:
                    Control = SmartWeatherForecast;
                    break;
                case Types.url:
                    Control = SmartURL;
                    break;*/
                default:
                    Control = SmartGeneric;
                    break;
            }
        } else {
            return this.wrapContent((<span>{I18n.t('Nothing here')}</span>));
        }

        if (!Control) {
            let name = this.channelInfo.type;
            Object.keys(Types).forEach(e => {
                if (Types[e] === this.channelInfo.type) {
                    name = e;
                    return false;
                }
            });
            console.error(`${name} not implemented!`);
            return null;
        } else {
            return this.wrapContent(this.createControl(Control, this.channelInfo, this));
        }
    }
}
SmartTile.propTypes = {
    objects:            PropTypes.object.isRequired,
    states:             PropTypes.object.isRequired,
    editMode:           PropTypes.bool.isRequired,
    windowWidth:        PropTypes.number,
    onVisibilityControl: PropTypes.func,
    onClick:            PropTypes.func,
    onDelete:           PropTypes.func,
    onSaveSettings:     PropTypes.func,
    onCollectIds:       PropTypes.func,
    onControl:          PropTypes.func,
    ignoreIndicators:   PropTypes.array,
    enumNames:          PropTypes.array,
    channelInfo:        PropTypes.object
};

export default SmartTile;

