import React from 'react';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import { Paper } from '@mui/material';

import { AdminConnection, Loader, GenericApp } from '@iobroker/adapter-react-v5';

import TabDevices from './Tabs/ListDevices';

import enLang from './i18n/en.json';
import deLang from './i18n/de.json';
import ruLang from './i18n/ru.json';
import ptLang from './i18n/pt.json';
import nlLang from './i18n/nl.json';
import frLang from './i18n/fr.json';
import itLang from './i18n/it.json';
import esLang from './i18n/es.json';
import plLang from './i18n/pl.json';
import ukLang from './i18n/uk.json';
import zhCnLang from './i18n/zh-cn.json';

const styles = {
    tabContent: {
        height: '100%',
        overflow: 'auto',
    },
};

class App extends GenericApp {
    constructor(props) {
        const extendedProps = { ...props };
        extendedProps.bottomButtons = false;
        extendedProps.Connection = AdminConnection;
        extendedProps.adapterName = 'devices';
        extendedProps.translations = {
            en: enLang,
            de: deLang,
            ru: ruLang,
            pt: ptLang,
            nl: nlLang,
            fr: frLang,
            it: itLang,
            es: esLang,
            pl: plLang,
            uk: ukLang,
            'zh-cn': zhCnLang,
        };
        extendedProps.sentryDSN = window.sentryDSN;
        super(props, extendedProps);

        const theme = this.createTheme();
        this.state = {
            theme,
            themeName: this.getThemeName(theme),
            themeType: this.getThemeType(theme),
        }
    }

    render() {
        if (!this.state.loaded) {
            return <Loader themeType={this.state.themeType} />;
        }

        return <StyledEngineProvider injectFirst>
            <ThemeProvider theme={this.state.theme}>
                <Paper square elevation={0} style={styles.tabContent}>
                    {(this.state.selectedTab === 'list' || !this.state.selectedTab) ?
                    <TabDevices
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
                    />
                    : null}

                </Paper>
                {this.renderError()}
                {this.renderSaveCloseButtons()}
            </ThemeProvider>
        </StyledEngineProvider>;
    }
}

export default App;
