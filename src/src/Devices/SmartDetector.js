/**
 * Copyright 2019 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/

import {TiCogOutline as IconWorking} from 'react-icons/ti';
import {MdPermScanWifi as IconUnreach} from 'react-icons/md';
import {MdPriorityHigh as IconMaintain} from 'react-icons/md';
import {MdBatteryAlert as IconLowbat} from 'react-icons/md';
import {MdError as IconError} from 'react-icons/md';
import ChannelDetector from 'iobroker.type-detector';

const COLORS = {
    working:   '#808080',
    unreach:   'orange',
    lowbat:    'red',
    maintain:  'orange',
    error:     'red',
    direction: 'green',
    connected: 'red'
};

const additionalParameters = {
    'WORKING':      {icon: IconWorking,    color: COLORS.working},
    'UNREACH':      {icon: IconUnreach,    color: COLORS.unreach},
    'LOWBAT':       {icon: IconLowbat,     color: COLORS.lowbat},
    'MAINTAIN':     {icon: IconMaintain,   color: COLORS.maintain},
    'ERROR':        {icon: IconError,      color: COLORS.error},
    'DIRECTION':    {                      color: COLORS.direction},
    'CONNECTED':    {icon: IconUnreach,    color: COLORS.connected},
};

class IOBChannelDetector {
    constructor() {
        this.detector = new ChannelDetector.ChannelDetector();
    }

    getPatterns() {
        return this.detector.getPatterns();
    }

    detect(options) {
        if (!options._keysOptional || options.forceRebuildKeys) {
            if (JSON.stringify(this.objects) !== JSON.stringify(options.objects) || options.forceRebuildKeys) {
                this.objects = options.objects;
                this.keys = Object.keys(this.objects).sort();
            }
            options._keysOptional = this.keys;
        }

        const result = this.detector.detect(options);

        // Apply additionalParameters
        // result && result.forEach(one =>
        //     one.states.forEach(state =>
        //         state.id && additionalParameters[state.name] && Object.assign(state, additionalParameters[state.name])));

        return result;
    }
}

export default IOBChannelDetector;
