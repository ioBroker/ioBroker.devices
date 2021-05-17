import React from 'react';
import { ThemeProvider, withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Loader from '@iobroker/adapter-react/Components/Loader'
import I18n from '@iobroker/adapter-react/i18n';

import GenericApp from '@iobroker/adapter-react/GenericApp';
import TabDevices from './Tabs/ListDevices';
import Utils from '@iobroker/adapter-react/Components/Utils';
import ToggleThemeMenu from './Components/ToggleThemeMenu';
import { Paper, Toolbar } from '@material-ui/core';
import DvrIcon from '@material-ui/icons/Dvr';

const styles = theme => ({
    root: {},
    tabContent: {
        padding: 10,
        height: 'calc(100% - 48px - 20px)',
        overflow: 'auto',
        // background: theme.palette.type === 'light' ? 'white' : 'gray',
    },
    wrapperMenu: {
        display: 'flex',
        justifyContent: 'space-between'
    },
    wrapperIconHeader: {

    },
    wrapperName: {
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center'
    }
});

class App extends GenericApp {
    constructor(props) {
        const extendedProps = { ...props };
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
        super(props, extendedProps);

        const theme = this.createTheme();
        this.state = {
            theme,
            themeName: this.getThemeName(theme),
            themeType: this.getThemeType(theme),
        }
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
    /**
     * Changes the current theme
     */
    toggleTheme = currentThemeName => {
        const themeName = this.state.themeName;

        // dark => blue => colored => light => dark
        let newThemeName = themeName === 'dark' ? 'blue' :
            (themeName === 'blue' ? 'colored' :
                (themeName === 'colored' ? 'light' : 'dark'));

        if (currentThemeName) {
            newThemeName = currentThemeName;
        }

        Utils.setThemeName(newThemeName);

        const theme = this.createTheme(newThemeName);

        this.setState({
            theme: theme,
            themeName: this.getThemeName(theme),
            themeType: this.getThemeType(theme)
        });
    }

    render() {
        if (!this.state.loaded) {
            return <Loader theme={this.state.themeType} />;
        }
        console.log(this.state.themeName)
        return <ThemeProvider theme={this.state.theme}>
            <Paper square elevation={0}>
                <AppBar
                    color="default"
                    position="static"
                >
                    <Toolbar
                        variant="dense"
                        className={this.props.classes.wrapperMenu}>
                        <div className={this.props.classes.wrapperIconHeader}>
                            <ToggleThemeMenu
                                toggleTheme={this.toggleTheme}
                                themeName={this.state.themeName}
                                t={I18n.t} />
                        </div>
                        <div className={this.props.classes.wrapperName}>
                            <DvrIcon color={this.state.themeName !== "colored" ? "primary" : "inherit"} style={{ marginRight: 5 }} />
                            {I18n.t('Devices')}
                        </div>
                    </Toolbar>
                </AppBar>
            </Paper>
            <Paper square elevation={0} className={this.props.classes.tabContent}>
                {(this.state.selectedTab === 'list' || !this.state.selectedTab) ? <TabDevices
                    theme={this.state.theme}
                    themeType={this.state.themeType}
                    key="options"
                    common={this.common}
                    socket={this.socket}
                    native={this.state.native}
                    onError={text => this.setState({ errorText: text })}
                    onLoad={native => this.onLoadConfig(native)}
                    instance={this.instance}
                    adapterName={this.adapterName}
                    onChange={(attr, value) => this.updateNativeValue(attr, value)}
                /> : null}

            </Paper>
            {this.renderError()}
            {this.renderSaveCloseButtons()}
        </ThemeProvider>;
    }
}

export default withStyles(styles)(App);
