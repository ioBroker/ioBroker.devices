import React from 'react';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import { Paper } from '@mui/material';

import { AdminConnection, Loader, GenericApp, I18n } from '@iobroker/adapter-react-v5';

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
import type { GenericAppProps } from '@iobroker/adapter-react-v5/build/types';

// TODO: Replace it by deviceTypeExtendTranslations from @iobroker/adapter-react-v5 after admin 7.6.11
import enDtLang from '@iobroker/adapter-react-v5/build/Components/DeviceType/i18n/en.json';
import deDtLang from '@iobroker/adapter-react-v5/build/Components/DeviceType/i18n/de.json';
import ruDtLang from '@iobroker/adapter-react-v5/build/Components/DeviceType/i18n/ru.json';
import ptDtLang from '@iobroker/adapter-react-v5/build/Components/DeviceType/i18n/pt.json';
import plDtLang from '@iobroker/adapter-react-v5/build/Components/DeviceType/i18n/pl.json';
import frDtLang from '@iobroker/adapter-react-v5/build/Components/DeviceType/i18n/fr.json';
import itDtLang from '@iobroker/adapter-react-v5/build/Components/DeviceType/i18n/it.json';
import nlDtLang from '@iobroker/adapter-react-v5/build/Components/DeviceType/i18n/nl.json';
import ukDtLang from '@iobroker/adapter-react-v5/build/Components/DeviceType/i18n/uk.json';
import zhDtLang from '@iobroker/adapter-react-v5/build/Components/DeviceType/i18n/zh-cn.json';

const styles: Record<'tabContent', React.CSSProperties> = {
    tabContent: {
        height: '100%',
        overflow: 'auto',
    },
};

export function deviceTypeExtendTranslations(): void {
    I18n.extendTranslations({
        en: enDtLang,
        de: deDtLang,
        ru: ruDtLang,
        pt: ptDtLang,
        pl: plDtLang,
        fr: frDtLang,
        it: itDtLang,
        nl: nlDtLang,
        uk: ukDtLang,
        'zh-cn': zhDtLang,
    });
}

export default class App extends GenericApp {
    constructor(props: GenericAppProps) {
        const extendedProps: GenericAppProps = { ...props };
        extendedProps.bottomButtons = false;
        // @ts-expect-error no idea how to fix it
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

        deviceTypeExtendTranslations();

        const theme = this.createTheme();
        this.state = {
            ...this.state,
            theme,
            themeName: this.getThemeName(theme),
            themeType: this.getThemeType(theme),
        };
    }

    render(): React.JSX.Element {
        if (!this.state.loaded) {
            return (
                <StyledEngineProvider injectFirst>
                    <ThemeProvider theme={this.state.theme}>
                        <Loader themeType={this.state.themeType} />
                    </ThemeProvider>
                </StyledEngineProvider>
            );
        }

        return (
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>
                    <Paper
                        square
                        elevation={0}
                        style={styles.tabContent}
                    >
                        {this.state.selectedTab === 'list' || !this.state.selectedTab ? (
                            <TabDevices
                                theme={this.state.theme}
                                themeType={this.state.themeType}
                                socket={this.socket}
                            />
                        ) : null}
                    </Paper>
                    {this.renderError()}
                    {this.renderSaveCloseButtons()}
                </ThemeProvider>
            </StyledEngineProvider>
        );
    }
}
