import React from 'react';

export function useStateLocal<T>(defaultValue: T, key: string): [T, (val: T) => void, boolean] {
    const [state, setState] = React.useState(
        window.localStorage.getItem(key) ? JSON.parse(window.localStorage.getItem(key)!) : defaultValue,
    );

    const eventsToInstall = (newValue: T): void => {
        window.localStorage.setItem(key, JSON.stringify(newValue));
        setState(newValue);
    };

    return [state, eventsToInstall, !!window.localStorage.getItem(key)];
}
