import type { ValueOrStateOrObject } from '@iobroker/dm-utils';
import { useEffect, useState } from 'react';
import type { StateOrObjectHandler, StateOrObjectSubscription } from './StateOrObjectHandler';

export function useStateOrObject<T extends ioBroker.StringOrTranslated | number | boolean>(
    item: ValueOrStateOrObject<T> | undefined,
    stateOrObjectHandler: StateOrObjectHandler,
): T | undefined {
    const [value, setValue] = useState<T>();

    useEffect(() => {
        let subscription: StateOrObjectSubscription | undefined = undefined;
        void stateOrObjectHandler.addListener(item, value => setValue(value)).then(sub => (subscription = sub));
        return () => void subscription?.unsubscribe();
    }, [stateOrObjectHandler, item]);

    return value;
}
