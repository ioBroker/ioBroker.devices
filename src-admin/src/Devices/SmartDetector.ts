/**
 * Copyright 2019-2025 bluefox <dogafox@gmail.com>
 *
 * MIT License
 *
 */

import ChannelDetector, {
    type PatternControl,
    type DetectOptions,
    type ExternalPatternControl,
} from '@iobroker/type-detector';

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

/**
 * Devices-side guard for type-detector issue #597 / #536.
 *
 * When several independent aliases are grouped under one alias *device*, the
 * type-detector merges them into a single detected device: it fills the device's
 * slots — indicators (UNREACH, LOWBAT, ERROR) as well as regular states like
 * ON_ACTUAL — from the sibling channels of that grouping. The detected device then
 * lists datapoints that belong to completely different devices (see the issue
 * screenshots: a motion alias showing a Shelly's "online", or a dimmer showing
 * another light's status).
 *
 * We drop mappings that are aliases sitting in a *different* alias channel than the
 * device's primary (required) state. Required states are never dropped, and real
 * hardware states carry no `common.alias`, so genuine device-level states on a
 * neighbouring channel (e.g. a Homematic LOWBAT on the .0 channel) stay untouched.
 */
export function removeForeignAliasStates(control: PatternControl, objects: Record<string, ioBroker.Object>): void {
    const primary = control.states.find(s => s.id && s.required) || control.states.find(s => s.id);
    if (!primary?.id) {
        return;
    }
    const homeChannel = primary.id.substring(0, primary.id.lastIndexOf('.'));
    for (const state of control.states) {
        if (!state.id || state.required) {
            continue;
        }
        const common = objects[state.id]?.common as ioBroker.StateCommon | undefined;
        if (!common?.alias) {
            // real hardware (no alias) – keep genuine device-level states
            continue;
        }
        if (state.id.substring(0, state.id.lastIndexOf('.')) !== homeChannel) {
            state.id = '';
        }
    }
}
