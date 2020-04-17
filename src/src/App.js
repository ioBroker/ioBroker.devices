import React from 'react';
import {withStyles} from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Loader from '@iobroker/adapter-react/Components/Loader'
import I18n from '@iobroker/adapter-react/i18n';

import GenericApp from '@iobroker/adapter-react/GenericApp';
import TabDevices from './Tabs/ListDevices';

const styles = theme => ({
    root: {},
    tabContent: {
        padding: 10,
        height: 'calc(100% - 40px - 20px)',
        overflow: 'auto',
        background: theme.palette.type === 'light' ? 'white': 'gray',
    }
});

class App extends GenericApp {
    constructor(props) {
        const extendedProps = {...props};
        extendedProps.bottomButtons = false;
        extendedProps.adapterName = 'devices';
        extendedProps.translations = {
            'en': require('./i18n/en'),
            'de': require('./i18n/de'),
            'ru': require('./i18n/ru'),
            'pt': require('./i18n/pt'),
            'nl': require('./i18n/nl'),
            'fr': require('./i18n/fr'),
            'it': require('./i18n/it'),
            'es': require('./i18n/es'),
            'pl': require('./i18n/pl'),
            'zh-cn': require('./i18n/zh-cn'),
        };
        // get actual port
        extendedProps.socket = extendedProps.socket || {};
        extendedProps.socket.port = parseInt(window.location.port, 10);
        if (isNaN(extendedProps.socket.port)) {
            switch (window.location.protocol) {
                case 'https:':
                    extendedProps.socket.port = 443;
                    break;
                default: //case 'http:':
                    extendedProps.socket.port = 80;
                    break;
            }
        }
        // for debug and fallback purposes
        if (!extendedProps.socket.port || extendedProps.socket.port === 3000) {
            extendedProps.socket.port = 8081;
        }

        super(extendedProps);
    }

    onHashChanged() {
        //const location = GenericApp.getLocation();
    }

    getSelectedTab() {
        const tab = this.state.selectedTab;
        if (!tab || tab === 'list') {
            return 0;
        }
    }

    render() {
        if (!this.state.loaded) {
            return (<Loader theme={this.state.themeType}/>);
        }

        return (
            <div className="App">
                <AppBar position="static">
                    <Tabs value={this.getSelectedTab()}
                          onChange={(e, index) => this.selectTab(e.target.parentNode.dataset.name, index)}>
                        <Tab label={I18n.t('Devices')} data-name="list"/>
                    </Tabs>
                </AppBar>
                <div className={this.props.classes.tabContent}>
                    {(this.state.selectedTab === 'list' || !this.state.selectedTab) && (<TabDevices
                        key="options"
                        common={this.common}
                        socket={this.socket}
                        native={this.state.native}
                        onError={text => this.setState({errorText: text})}
                        onLoad={native => this.onLoadConfig(native)}
                        instance={this.instance}
                        adapterName={this.adapterName}
                        onChange={(attr, value) => this.updateNativeValue(attr, value)}
                    />)}

                </div>
                {this.renderError()}
                {this.renderSaveCloseButtons()}
            </div>
        );
    }
}

export default withStyles(styles)(App);
