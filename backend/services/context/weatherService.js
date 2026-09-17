const axios = require('axios');

/**
 * Privacy-Preserving Weather Context Service (Phase 5)
 *
 * Architectural & Privacy Guarantees:
 * - Weather is DESCRIPTIVE CONTEXT ONLY and never influences leaf identification,
 *   MobileNetV2 inference, confidence scores, or Grad-CAM heatmaps.
 * - Queries OpenWeatherMap using COARSE location parameters (city, state, country).
 * - Precise coordinates (latitude, longitude) are NEVER passed to, stored in, or
 *   cached by this service.
 * - In-memory cache is indexed strictly by coarse location strings with a 30-minute TTL.
 * - API credentials (OPENWEATHER_API_KEY) are used strictly server-side and never
 *   exposed in client responses or frontend code.
 * - When weather is unavailable or credentials are missing, returns graceful nulls
 *   without fabricating synthetic values.
 */

// In-memory cache for coarse weather results to prevent redundant external API calls
// Key: coarse location string (e.g. "weather:bengaluru:karnataka:india")
const weatherCache = new Map();
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Builds the coarse cache key from location components.
 * Precise coordinates are NEVER part of the cache key.
 */
function buildCacheKey(city, state, country) {
  const c = (city || '').toLowerCase().trim();
  const s = (state || '').toLowerCase().trim();
  const co = (country || '').toLowerCase().trim();
  return `weather:${c}:${s}:${co}`;
}

/**
 * Fetches current weather for a coarse geographic location.
 *
 * @param {string} city - Coarse city name (e.g. "Bengaluru")
 * @param {string} [state] - Coarse state/region name (e.g. "Karnataka")
 * @param {string} [country] - Coarse country name (e.g. "India")
 * @returns {Promise<{success: boolean, weather: object|null, message?: string}>}
 */
async function getWeather(city, state, country) {
  if (!city || typeof city !== 'string' || city.trim().length === 0) {
    return {
      success: false,
      weather: null,
      message: 'Coarse city parameter is required for weather context.'
    };
  }

  const cleanCity = city.trim();
  const cleanState = (state && typeof state === 'string') ? state.trim() : '';
  const cleanCountry = (country && typeof country === 'string') ? country.trim() : '';

  const cacheKey = buildCacheKey(cleanCity, cleanState, cleanCountry);
  const cached = weatherCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < WEATHER_CACHE_TTL_MS)) {
    return cached.data;
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.trim() === 'your_openweathermap_api_key_here') {
    return {
      success: false,
      weather: null,
      message: 'Weather information is currently unavailable (provider key unconfigured).'
    };
  }

  try {
    // Construct query parameter using coarse location hierarchy
    const queryParts = [cleanCity];
    if (cleanCountry) queryParts.push(cleanCountry);
    const query = queryParts.join(',');

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&units=metric&appid=${encodeURIComponent(apiKey.trim())}`;

    const response = await axios.get(url, {
      timeout: 5000,
      headers: { 'Accept': 'application/json' }
    });

    const data = response.data;
    if (!data || !data.main) {
      return {
        success: false,
        weather: null,
        message: 'Weather information is currently unavailable.'
      };
    }

    const main = data.main || {};
    const wind = data.wind || {};
    const rain = data.rain || {};
    const weatherItem = Array.isArray(data.weather) && data.weather.length > 0 ? data.weather[0] : {};

    // Normalize response without fabricating missing values
    const normalizedWeather = {
      temperatureC: typeof main.temp === 'number' ? Math.round(main.temp * 10) / 10 : null,
      feelsLikeC: typeof main.feels_like === 'number' ? Math.round(main.feels_like * 10) / 10 : null,
      humidityPercent: typeof main.humidity === 'number' ? main.humidity : null,
      windSpeedMs: typeof wind.speed === 'number' ? wind.speed : null,
      precipitationMm: typeof rain['1h'] === 'number' ? rain['1h'] : (typeof rain['3h'] === 'number' ? rain['3h'] : (rain && Object.keys(rain).length > 0 ? null : 0)),
      weatherMain: weatherItem.main || null,
      weatherDescription: weatherItem.description || null,
      observedAt: (typeof data.dt === 'number' && !isNaN(data.dt) && data.dt > 0) ? new Date(data.dt * 1000).toISOString() : null,
      source: 'OpenWeather'
    };

    const result = {
      success: true,
      weather: normalizedWeather
    };

    weatherCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  } catch (err) {
    // Graceful error handling - never leak API key, coordinates, or stack trace
    return {
      success: false,
      weather: null,
      message: 'Weather information is currently unavailable.'
    };
  }
}

/**
 * Clears the in-memory weather cache (for testing)
 */
function clearCache() {
  weatherCache.clear();
}

module.exports = {
  getWeather,
  clearCache,
  WEATHER_CACHE_TTL_MS,
  buildCacheKey
};
