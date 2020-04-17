import React from 'react';
import ReactDOM from 'react-dom';
import * as Sentry from '@sentry/browser';
import * as SentryIntegrations from '@sentry/integrations';
import { MuiThemeProvider} from '@material-ui/core/styles';
import createTheme from '@iobroker/adapter-react/createTheme';

import '@iobroker/adapter-react/index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

let theme = window.localStorage ? window.localStorage.getItem('App.theme') || 'light' : 'light';

function build() {
    if (typeof Map === 'undefined') {
        console.log('Something is wrong')
    }
    return ReactDOM.render(<MuiThemeProvider theme={createTheme(theme)}>
        <App onThemeChange={_theme => {
            theme = _theme;
            build();
        }}/>
    </MuiThemeProvider>, document.getElementById('root'));

}

Sentry.init({
    dsn: "https://934e853b521248afabe9da038e6bf36e@sentry.iobroker.net/55",
    integrations: [
        new SentryIntegrations.Dedupe()
    ]
});

build();

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
