
/**
 * Open-Meteo API を利用した天気予報サービス
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export interface WeatherData {
    date: string;
    icon: string; // Keep for backward compatibility if needed
    weatherCode: number;
    tempMax: number;
    tempMin: number;
}

export interface GeocodingResult {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
}

/**
 * 場所名から緯度・経度を取得する (Open-Meteo Geocoding API)
 */
export async function searchLocation(name: string): Promise<GeocodingResult | null> {
    if (!name.trim()) return null;
    try {
        const response = await fetch(`${GEOCODING_URL}?name=${encodeURIComponent(name)}&count=1&language=ja&format=json`);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const res = data.results[0];
            return {
                name: res.name,
                latitude: res.latitude,
                longitude: res.longitude,
                timezone: res.timezone
            };
        }
    } catch (error) {
        console.error('Geocoding failed:', error);
    }
    return null;
}

/**
 * 緯度・経度から天気予報を取得する (Open-Meteo Forecast API)
 */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherData[]> {
    try {
        const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.daily) {
            return data.daily.time.map((time: string, index: number) => ({
                date: time,
                icon: '', // Deprecated
                weatherCode: data.daily.weather_code[index],
                tempMax: Math.round(data.daily.temperature_2m_max[index]),
                tempMin: Math.round(data.daily.temperature_2m_min[index]),
            }));
        }
    } catch (error) {
        console.error('Weather fetch failed:', error);
    }
    return [];
}

/**
 * WMO Weather interpretation codes (WW) をアイコンに変換
 * https://open-meteo.com/en/docs/forecast-api
 */
function getWeatherIcon(code: number): string {
    if (code === 0) return '☀️'; // Clear sky
    if (code <= 3) return '🌤️'; // Mainly clear, partly cloudy, and overcast
    if (code <= 48) return '🌫️'; // Fog and depositing rime fog
    if (code <= 55) return '🌦️'; // Drizzle: Light, moderate, and dense intensity
    if (code <= 57) return '🌧️'; // Freezing Drizzle: Light and dense intensity
    if (code <= 65) return '🌧️'; // Rain: Slight, moderate and heavy intensity
    if (code <= 67) return '🌨️'; // Freezing Rain: Light and heavy intensity
    if (code <= 77) return '❄️'; // Snow fall: Slight, moderate, and heavy intensity; Snow grains
    if (code <= 82) return '🌧️'; // Rain showers: Slight, moderate, and violent
    if (code <= 86) return '❄️'; // Snow showers slight and heavy
    if (code <= 99) return '⚡'; // Thunderstorm: Slight, moderate, and slight or heavy with hail
    return '✨';
}
