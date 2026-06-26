import { I18n } from '@iobroker/adapter-react-v5';
/**
 * Mapping of OpenWeatherMap condition strings (lowercase) → i18n keys.
 * OWM returns these via the adapter's "weather.state" value.
 */
const OWM_CONDITION_KEYS = {
    // Group 2xx: Thunderstorm
    'thunderstorm with light rain': 'wm_w_Thunderstorm',
    'thunderstorm with rain': 'wm_w_Thunderstorm',
    'thunderstorm with heavy rain': 'wm_w_Thunderstorm',
    'light thunderstorm': 'wm_w_Thunderstorm',
    thunderstorm: 'wm_w_Thunderstorm',
    'heavy thunderstorm': 'wm_w_Thunderstorm',
    'ragged thunderstorm': 'wm_w_Thunderstorm',
    'thunderstorm with light drizzle': 'wm_w_Thunderstorm',
    'thunderstorm with drizzle': 'wm_w_Thunderstorm',
    'thunderstorm with heavy drizzle': 'wm_w_Thunderstorm',
    // Group 3xx: Drizzle
    'light intensity drizzle': 'wm_w_Light drizzle',
    drizzle: 'wm_w_Moderate drizzle',
    'heavy intensity drizzle': 'wm_w_Dense drizzle',
    'light intensity drizzle rain': 'wm_w_Light drizzle',
    'drizzle rain': 'wm_w_Moderate drizzle',
    'heavy intensity drizzle rain': 'wm_w_Dense drizzle',
    'shower rain and drizzle': 'wm_w_Moderate drizzle',
    'heavy shower rain and drizzle': 'wm_w_Dense drizzle',
    'shower drizzle': 'wm_w_Moderate drizzle',
    // Group 5xx: Rain
    'light rain': 'wm_w_Light rain',
    'moderate rain': 'wm_w_Moderate rain',
    'heavy intensity rain': 'wm_w_Heavy rain',
    'very heavy rain': 'wm_w_Heavy rain',
    'extreme rain': 'wm_w_Heavy rain',
    'freezing rain': 'wm_w_Light freezing rain',
    'light intensity shower rain': 'wm_w_Light rain showers',
    'shower rain': 'wm_w_Rain showers',
    'heavy intensity shower rain': 'wm_w_Heavy rain showers',
    'ragged shower rain': 'wm_w_Rain showers',
    // Group 6xx: Snow
    'light snow': 'wm_w_Light snow',
    snow: 'wm_w_Snow',
    'heavy snow': 'wm_w_Heavy snow',
    sleet: 'wm_w_Sleet',
    'light shower sleet': 'wm_w_Light sleet showers',
    'shower sleet': 'wm_w_Sleet showers',
    'light rain and snow': 'wm_w_Light sleet',
    'rain and snow': 'wm_w_Sleet',
    'light shower snow': 'wm_w_Light snow showers',
    'shower snow': 'wm_w_Snow showers',
    'heavy shower snow': 'wm_w_Heavy snow showers',
    // Group 7xx: Atmosphere
    mist: 'wm_w_Fog',
    smoke: 'wm_w_Fog',
    haze: 'wm_w_Fog',
    'sand/dust whirls': 'wm_w_Fog',
    fog: 'wm_w_Fog',
    sand: 'wm_w_Fog',
    dust: 'wm_w_Fog',
    'volcanic ash': 'wm_w_Fog',
    squalls: 'wm_w_Fog',
    tornado: 'wm_w_Thunderstorm',
    // Group 800: Clear
    'clear sky': 'wm_w_Clear sky',
    'sky is clear': 'wm_w_Clear sky',
    // Group 80x: Clouds
    'few clouds': 'wm_w_Mainly clear',
    'scattered clouds': 'wm_w_Partly cloudy',
    'broken clouds': 'wm_w_Cloudy',
    'overcast clouds': 'wm_w_Overcast',
};
/**
 * Translate a weather condition string.
 * Checks the OWM condition mapping first, then tries `wm_w_<weather>` as an i18n key.
 * If nothing matches, returns the original string as-is.
 */
export function translateWeather(weather) {
    if (!weather) {
        return null;
    }
    // Check OWM mapping (case-insensitive)
    const key = OWM_CONDITION_KEYS[weather.toLowerCase()];
    if (key) {
        return I18n.t(key);
    }
    // Try direct i18n key (e.g. from yr.no or Open-Meteo via WMO mapping)
    const directKey = `wm_w_${weather}`;
    const translated = I18n.t(directKey);
    if (translated !== directKey) {
        return translated;
    }
    // Return as-is
    return weather;
}
//# sourceMappingURL=weatherTranslations.js.map