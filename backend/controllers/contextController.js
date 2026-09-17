const geoService = require('../services/context/geoService');
const weatherService = require('../services/context/weatherService');

/**
 * Controller for privacy-preserving environmental context.
 * Resolves browser coordinates to coarse geographic boundaries (city, state, country).
 * Coordinate data is strictly transient and never written to database models or server logs.
 */
exports.getLocationContext = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (lat === undefined || lon === undefined || lat === null || lon === null || String(lat).trim() === '' || String(lon).trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude query parameters are required.',
        city: null,
        state: null,
        country: null,
        label: null
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || !isFinite(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude parameter. Latitude must be a numeric value between -90 and 90.',
        city: null,
        state: null,
        country: null,
        label: null
      });
    }

    if (isNaN(longitude) || !isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid longitude parameter. Longitude must be a numeric value between -180 and 180.',
        city: null,
        state: null,
        country: null,
        label: null
      });
    }

    // Call coarse geocoding service - coordinates remain strictly transient in memory
    const geoResult = await geoService.reverseGeocode(latitude, longitude);

    return res.status(200).json({
      success: geoResult.success,
      city: geoResult.city,
      state: geoResult.state,
      country: geoResult.country,
      label: geoResult.label,
      error: geoResult.error || null
    });
  } catch (err) {
    console.error('[CONTEXT] Unexpected error in getLocationContext:', err.message);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while resolving coarse location context.',
      city: null,
      state: null,
      country: null,
      label: null
    });
  }
};

/**
 * Controller for environmental weather context (Phase 5).
 * Operates purely on coarse location identifiers (city, state, country).
 * Exact coordinates are neither accepted nor persisted.
 */
exports.getWeatherContext = async (req, res) => {
  try {
    const { city, state, country } = req.query;

    if (!city || typeof city !== 'string' || city.trim().length === 0) {
      return res.status(400).json({
        success: false,
        weather: null,
        message: 'A valid city or coarse location is required.'
      });
    }

    const result = await weatherService.getWeather(city, state, country);

    return res.status(200).json(result);
  } catch (err) {
    console.error('[CONTEXT] Unexpected error in getWeatherContext:', err.message);
    return res.status(500).json({
      success: false,
      weather: null,
      message: 'Weather information is currently unavailable.'
    });
  }
};

