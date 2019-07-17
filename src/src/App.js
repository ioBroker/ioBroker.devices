import React from 'react';
import {withStyles} from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Loader from '@iobroker/adapter-react/Components/Loader'
import I18n from './i18n';

import GenericApp from '@iobroker/adapter-react/GenericApp';
import TabDevices from './Tabs/ListDevices';

const styles = theme => ({
    root: {},
    tabContent: {
        padding: 10,
        height: 'calc(100% - 40px - 20px)',
        overflow: 'auto'
    },
    tabContentIFrame: {
        padding: 10,
        height: 'calc(100% - 40px - 20px - 38px)',
        overflow: 'auto'
    }
});

class App extends GenericApp {
    constructor(props) {
        super(props, {bottomButtons: false, adapterName: 'devices'});
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
                <div className={this.isIFrame ? this.props.classes.tabContentIFrame : this.props.classes.tabContent}>
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
