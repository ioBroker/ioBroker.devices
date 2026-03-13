import React, { Component } from 'react';

import { type Connection, type IobTheme, type ThemeName, type ThemeType } from '@iobroker/adapter-react-v5';
import { CategoryList } from '../WidgetsManager';
import { LinearProgress } from '@mui/material';

interface WidgetsManagerComponentProps {
    socket: Connection;
    adapterName: string;
    instance: number;
    themeName: ThemeName;
    themeType: ThemeType;
    theme: IobTheme;
}

interface WidgetsManagerComponentState {
    /* increase this number to reload the devices */
    triggerControllerLoad: number;
    systemConfig: ioBroker.SystemConfigObject | null;
}

export default class WidgetsManagerComponent extends Component<
    WidgetsManagerComponentProps,
    WidgetsManagerComponentState
> {
    constructor(props: WidgetsManagerComponentProps) {
        super(props);
        this.state = {
            triggerControllerLoad: 0,
            systemConfig: null,
        };
    }

    async componentDidMount(): Promise<void> {
        const systemConfig = await this.props.socket.getCompactSystemConfig();
        this.setState({ systemConfig });
    }

    render(): React.JSX.Element {
        if (!this.state.systemConfig) {
            return (
                <div style={{ width: '100%', height: '100%' }}>
                    <LinearProgress />
                </div>
            );
        }
        return (
            <div style={{ width: '100%', height: '100%' }}>
                <CategoryList
                    socket={this.props.socket}
                    selectedInstance={`${this.props.adapterName}.${this.props.instance}`}
                    style={{ justifyContent: 'start' }}
                    themeName={this.props.themeName}
                    themeType={this.props.themeType}
                    theme={this.props.theme}
                    isFloatComma={this.state.systemConfig.common.isFloatComma}
                    dateFormat={this.state.systemConfig.common.dateFormat}
                    triggerLoad={this.state.triggerControllerLoad}
                />
            </div>
        );
    }
}
