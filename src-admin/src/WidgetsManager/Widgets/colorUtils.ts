export function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace(/^#/, '');
    const n = parseInt(h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h, 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h < 60) {
        r = c;
        g = x;
    } else if (h < 120) {
        r = x;
        g = c;
    } else if (h < 180) {
        g = c;
        b = x;
    } else if (h < 240) {
        g = x;
        b = c;
    } else if (h < 300) {
        r = x;
        b = c;
    } else {
        r = c;
        b = x;
    }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
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
        } else if (max === gg) {
            h = 60 * ((bb - rr) / d + 2);
        } else {
            h = 60 * ((rr - gg) / d + 4);
        }
    }
    if (h < 0) {
        h += 360;
    }
    return [h, s, v];
}

/** Color temperature (Kelvin) to approximate RGB */
export function ctToRgb(kelvin: number): [number, number, number] {
    const temp = kelvin / 100;
    let r: number;
    let g: number;
    let b: number;
    if (temp <= 66) {
        r = 255;
        g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
        b = temp <= 19 ? 0 : Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
    } else {
        r = Math.max(0, Math.min(255, 329.698727446 * (temp - 60) ** -0.1332047592));
        g = Math.max(0, Math.min(255, 288.1221695283 * (temp - 60) ** -0.0755148492));
        b = 255;
    }
    return [Math.round(r), Math.round(g), Math.round(b)];
}
