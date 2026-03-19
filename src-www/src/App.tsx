import React from 'react';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import {
    AdminConnection,
    Loader,
    GenericApp,
    type GenericAppProps,
    type GenericAppState,
} from '@iobroker/adapter-react-v5';

import { CategoryList } from '../../src-admin/src/WidgetsManager';

import enLang from '../../src-admin/src/i18n/en.json';
import deLang from '../../src-admin/src/i18n/de.json';
import ruLang from '../../src-admin/src/i18n/ru.json';
import ptLang from '../../src-admin/src/i18n/pt.json';
import nlLang from '../../src-admin/src/i18n/nl.json';
import frLang from '../../src-admin/src/i18n/fr.json';
import itLang from '../../src-admin/src/i18n/it.json';
import esLang from '../../src-admin/src/i18n/es.json';
import plLang from '../../src-admin/src/i18n/pl.json';
import ukLang from '../../src-admin/src/i18n/uk.json';
import zhCnLang from '../../src-admin/src/i18n/zh-cn.json';

// Android WebView does not support `prefers-color-scheme: dark` media query,
// so the theme is always detected as "light". Allow overriding via URL parameter:
// e.g. ?theme=dark or ?theme=light
// This must run before GenericApp constructor calls createTheme().
const urlTheme = new URLSearchParams(window.location.search).get('theme');
if (urlTheme && ['dark', 'light'].includes(urlTheme)) {
    window.localStorage.setItem('App.themeName', urlTheme);
}

interface AppState extends GenericAppState {
    systemConfig?: ioBroker.SystemConfigObject;
}

export default class App extends GenericApp<GenericAppProps, AppState> {
    constructor(props: GenericAppProps) {
        const extendedProps: GenericAppProps = { ...props };
        extendedProps.bottomButtons = false;
        // @ts-expect-error no idea how to fix it
        extendedProps.Connection = AdminConnection;
        extendedProps.adapterName = 'devices';
        extendedProps.sentryDSN = window.sentryDSN;
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
        super(props, extendedProps);

        const theme = this.createTheme();
        this.state = {
            ...this.state,
            theme,
            themeName: this.getThemeName(theme),
            themeType: this.getThemeType(theme),
        };
    }

    onConnectionReady(): void {
        super.onConnectionReady();
        const systemConfig: ioBroker.SystemConfigObject = this.socket.systemConfig!;
        this.setState({ systemConfig });
    }

    render(): React.JSX.Element {
        if (!this.state.systemConfig) {
            return (
                <StyledEngineProvider injectFirst>
                    <ThemeProvider theme={this.state.theme}>
                        <CssBaseline />
                        <Loader themeType={this.state.themeType} />
                    </ThemeProvider>
                </StyledEngineProvider>
            );
        }

        return (
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>
                    <CssBaseline />
                    <CategoryList
                        socket={this.socket}
                        selectedInstance={`${this.adapterName}.${this.instance}`}
                        style={{ justifyContent: 'start' }}
                        themeName={this.state.themeName}
                        themeType={this.state.themeType}
                        theme={this.state.theme}
                        isFloatComma={this.state.systemConfig.common.isFloatComma}
                        dateFormat={this.state.systemConfig.common.dateFormat}
                        communicationStateId
                        admin={false}
                        showSettingsButton
                    />
                    {this.renderError()}
                </ThemeProvider>
            </StyledEngineProvider>
        );
    }
}
