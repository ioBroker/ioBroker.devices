import React from 'react';
import { Lightbulb } from '@mui/icons-material';
import { WidgetSwitch } from './Switch';
export class WidgetLight extends WidgetSwitch {
    renderTileIcon() {
        const baseIcon = this.renderBaseIcon();
        if (baseIcon) {
            return baseIcon;
        }
        const { isOn } = this.state;
        const accent = this.getAccentColor();
        return (React.createElement(Lightbulb, { sx: theme => ({
                color: isOn ? accent || theme.palette.warning.main : theme.palette.text.disabled,
                transition: 'color 0.25s ease',
            }) }));
    }
}
export default WidgetLight;
//# sourceMappingURL=Light.js.map