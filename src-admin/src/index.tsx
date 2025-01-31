import React from 'react';
import { createRoot } from 'react-dom/client';
import pack from '../package.json';
import * as serviceWorker from './serviceWorker';

import '@iobroker/adapter-react-v5/index.css';
import App from './App';

declare global {
    interface Window {
        sentryDSN: string;
        adapterName: string | undefined;
    }
}

window.adapterName = 'devices';
window.sentryDSN = 'https://3cedc5ceb5544e2e8248053c817fc98b@sentry.iobroker.net/131';

console.log(`iobroker.${window.adapterName}@${pack.version}`);

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
