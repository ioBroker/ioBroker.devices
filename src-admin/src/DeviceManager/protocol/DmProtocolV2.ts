/* eslint-disable class-methods-use-this */
import type * as V1 from '@iobroker/dm-utils-v1/build/types/api';
import type { InstanceDetails } from './api';
import { DmProtocolV1 } from './DmProtocolV1';

export class DmProtocolV2 extends DmProtocolV1 {
    public override convertInstanceDetails(details: any): InstanceDetails {
        if (details.apiVersion !== 'v2') {
            throw new Error(`Unsupported API version: ${details.apiVersion ?? 'unknown'}`);
        }

        const v1 = details as V1.InstanceDetails;
        return { ...v1, apiVersion: 'v3' };
    }
}
