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
                    />
                    {this.renderError()}
                </ThemeProvider>
            </StyledEngineProvider>
        );
    }
}
