declare module 'suncalc2' {
    interface SunTimes {
        sunrise: Date;
        sunset: Date;
        sunriseEnd: Date;
        sunsetStart: Date;
        dawn: Date;
        dusk: Date;
        nauticalDawn: Date;
        nauticalDusk: Date;
        nightEnd: Date;
        night: Date;
        goldenHourEnd: Date;
        goldenHour: Date;
        solarNoon: Date;
        nadir: Date;
    }
    export function getTimes(date: Date, latitude: number, longitude: number): SunTimes;
}
