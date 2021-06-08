/**
 * Copyright 2019-2021 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 **/

import ChannelDetector from './TypeDetector';

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

        return this.detector.detect(options);
    }
}

export default IOBChannelDetector;
