/**
 * Copyright 2019-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */

import ChannelDetector, { type PatternControl, type DetectOptions } from '@iobroker/type-detector';
import type { ExternalPatternControl } from '@iobroker/type-detector/types';

export default class IOBChannelDetector {
    private detector: ChannelDetector = new ChannelDetector();
    private objects: Record<string, ioBroker.Object> = {};
    private keys: string[] = [];

    static getPatterns(): {
        [type: string]: ExternalPatternControl;
    } {
        return ChannelDetector.getPatterns();
    }

    detect(options: DetectOptions & { forceRebuildKeys?: boolean }): PatternControl[] | null {
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
