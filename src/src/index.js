import React from 'react';
import ReactDOM from 'react-dom';
import {version} from '../package.json';
import { MuiThemeProvider} from '@material-ui/core/styles';
import * as Sentry from '@sentry/browser';
import * as SentryIntegrations from '@sentry/integrations';

import theme from '@iobroker/adapter-react/Theme';
import Utils from '@iobroker/adapter-react/Components/Utils';
import App from './App';

import * as serviceWorker from './serviceWorker';
import '@iobroker/adapter-react/index.css';

window.adapterName = 'devices';

console.log('iobroker.' + window.adapterName + '@' + version);
let themeName = Utils.getThemeName();

function build() {
    return ReactDOM.render(<MuiThemeProvider theme={ theme(themeName) }>
        <App onThemeChange={_themeName => {
            themeName = _themeName;
            build();
        }}/>
    </MuiThemeProvider>, document.getElementById('root'));
}

if (window.location.host !== 'localhost:3000') {
    Sentry.init({
        dsn: 'https://3cedc5ceb5544e2e8248053c817fc98b@sentry.iobroker.net/131',
        integrations: [
            new SentryIntegrations.Dedupe()
        ]
    });
}

build();

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
