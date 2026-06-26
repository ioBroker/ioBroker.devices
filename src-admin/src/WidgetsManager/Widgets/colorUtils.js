export function hexToRgb(hex) {
    const h = hex.replace(/^#/, '');
    const n = parseInt(h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h, 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
export function rgbToHex(r, g, b) {
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
export function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h < 60) {
        r = c;
        g = x;
    }
    else if (h < 120) {
        r = x;
        g = c;
    }
    else if (h < 180) {
        g = c;
        b = x;
    }
    else if (h < 240) {
        g = x;
        b = c;
    }
    else if (h < 300) {
        r = x;
        b = c;
    }
    else {
        r = c;
        b = x;
    }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
export function rgbToHsv(r, g, b) {
    const rr = r / 255;
    const gg = g / 255;
    const bb = b / 255;
    const max = Math.max(rr, gg, bb);
    const min = Math.min(rr, gg, bb);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    if (d !== 0) {
        if (max === rr) {
            h = 60 * (((gg - bb) / d) % 6);
        }
        else if (max === gg) {
            h = 60 * ((bb - rr) / d + 2);
        }
        else {
            h = 60 * ((rr - gg) / d + 4);
        }
    }
    if (h < 0) {
        h += 360;
    }
    return [h, s, v];
}
/** RGB to CIE xy color space */
export function rgbToCie(r, g, b) {
    // sRGB to linear
    let rr = r / 255;
    let gg = g / 255;
    let bb = b / 255;
    rr = rr > 0.04045 ? ((rr + 0.055) / 1.055) ** 2.4 : rr / 12.92;
    gg = gg > 0.04045 ? ((gg + 0.055) / 1.055) ** 2.4 : gg / 12.92;
    bb = bb > 0.04045 ? ((bb + 0.055) / 1.055) ** 2.4 : bb / 12.92;
    // Wide gamut D65 conversion (Philips Hue)
    const X = rr * 0.664511 + gg * 0.154324 + bb * 0.162028;
    const Y = rr * 0.283881 + gg * 0.668433 + bb * 0.047685;
    const Z = rr * 0.000088 + gg * 0.07231 + bb * 0.986039;
    const sum = X + Y + Z;
    if (sum === 0) {
        return [0.3127, 0.329]; // D65 white point
    }
    return [X / sum, Y / sum];
}
/** CIE xy to approximate RGB */
export function cieToRgb(x, y, brightness = 1) {
    const z = 1 - x - y;
    const Y = brightness;
    const X = y === 0 ? 0 : (Y / y) * x;
    const Z = y === 0 ? 0 : (Y / y) * z;
    // XYZ to linear sRGB
    let rr = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
    let gg = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
    let bb = X * 0.051713 - Y * 0.121364 + Z * 1.01153;
    // Clamp negatives
    if (rr < 0) {
        rr = 0;
    }
    if (gg < 0) {
        gg = 0;
    }
    if (bb < 0) {
        bb = 0;
    }
    // Gamma correction
    rr = rr <= 0.0031308 ? 12.92 * rr : 1.055 * rr ** (1 / 2.4) - 0.055;
    gg = gg <= 0.0031308 ? 12.92 * gg : 1.055 * gg ** (1 / 2.4) - 0.055;
    bb = bb <= 0.0031308 ? 12.92 * bb : 1.055 * bb ** (1 / 2.4) - 0.055;
    return [
        Math.max(0, Math.min(255, Math.round(rr * 255))),
        Math.max(0, Math.min(255, Math.round(gg * 255))),
        Math.max(0, Math.min(255, Math.round(bb * 255))),
    ];
}
/** Color temperature (Kelvin) to approximate RGB */
export function ctToRgb(kelvin) {
    const temp = kelvin / 100;
    let r;
    let g;
    let b;
    if (temp <= 66) {
        r = 255;
        g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
        b = temp <= 19 ? 0 : Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
    }
    else {
        r = Math.max(0, Math.min(255, 329.698727446 * (temp - 60) ** -0.1332047592));
        g = Math.max(0, Math.min(255, 288.1221695283 * (temp - 60) ** -0.0755148492));
        b = 255;
    }
    return [Math.round(r), Math.round(g), Math.round(b)];
}
//# sourceMappingURL=colorUtils.js.map