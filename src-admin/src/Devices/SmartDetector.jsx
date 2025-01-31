/**
 * Copyright 2019-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */

import ChannelDetector from '@iobroker/type-detector';

class IOBChannelDetector {
    constructor() {
        this.detector = new ChannelDetector();
    }

    getPatterns() {
        return ChannelDetector.getPatterns();
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
