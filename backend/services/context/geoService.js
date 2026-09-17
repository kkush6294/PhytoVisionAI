const axios = require('axios');

/**
 * Privacy-Preserving Geolocation Service (Phase 4)
 *
 * Privacy & Persistence Architecture:
 * - Exact coordinates (latitude, longitude) are NEVER stored or persisted in any database,
 *   disk, or server logs.
 * - Coarse cache keys are formed by rounding coordinates to 2 decimal places (~1.1 km coarse spatial grid).
 * - This cache key and coarse reverse-geocoded result exist strictly as temporary in-memory
 *   state within a volatile JavaScript Map with the existing 1-hour TTL (CACHE_TTL_MS).
 * - When the process restarts or the TTL expires, all in-memory cache entries are discarded.
 * - Nominatim User-Agent identifying contact is configurable via the NOMINATIM_CONTACT
 *   environment variable and is used strictly server-side for upstream requests.
 * - The contact value and raw external responses are NEVER exposed to the frontend.
 */

// In-memory cache for coarse reverse geocoding results to minimize external requests.
// Strictly temporary in-memory state with existing 1-hour TTL.
const geoCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Constructs a valid identifying User-Agent for OpenStreetMap Nominatim.
 * Usage Policy requires an identifying User-Agent with project/contact information.
 * Configured via process.env.NOMINATIM_CONTACT (e.g. admin@yourdomain.com or repo URL).
 * If unset, falls back to a clean project identifier without fabricated emails.
 *
 * @returns {string} Identifying User-Agent header
 */
function getNominatimUserAgent() {
  if (process.env.NOMINATIM_USER_AGENT && process.env.NOMINATIM_USER_AGENT.trim()) {
    return process.env.NOMINATIM_USER_AGENT.trim();
  }
  const contact = process.env.NOMINATIM_CONTACT;
  if (contact && contact.trim() && !contact.includes('example.com') && !contact.includes('your_contact')) {
    return `PhytoVisionAI/1.0 (${contact.trim()})`;
  }
  return 'PhytoVisionAI/1.0 (botanical-research)';
}

/**
 * Reverse geocodes latitude and longitude into coarse location (city, state, country).
 * Exact coordinates are strictly transient and never persisted.
 *
 * @param {number|string} lat - Latitude (-90 to 90)
 * @param {number|string} lon - Longitude (-180 to 180)
 * @returns {Promise<{success: boolean, city: string|null, state: string|null, country: string|null, label: string|null, error?: string}>}
 */
async function reverseGeocode(lat, lon) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || !isFinite(latitude) || latitude < -90 || latitude > 90) {
    return {
      success: false,
      error: 'Invalid latitude parameter. Must be a numeric value between -90 and 90.',
      city: null,
      state: null,
      country: null,
      label: null
    };
  }

  if (isNaN(longitude) || !isFinite(longitude) || longitude < -180 || longitude > 180) {
    return {
      success: false,
      error: 'Invalid longitude parameter. Must be a numeric value between -180 and 180.',
      city: null,
      state: null,
      country: null,
      label: null
    };
  }

  // Temporary in-memory cache key rounded to 2 decimal places (~1.1 km coarse spatial bucket).
  // Exact coordinates are never stored or persisted.
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const cached = geoCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=10&addressdetails=1`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getNominatimUserAgent(),
        'Accept': 'application/json'
      },
      timeout: 5000
    });

    const address = response.data?.address || {};
    const city = address.city || address.town || address.village || address.municipality || address.county || address.suburb || null;
    const state = address.state || address.region || address.state_district || null;
    const country = address.country || null;

    const parts = [city, state, country].filter(Boolean);
    const label = parts.length > 0 ? parts.join(', ') : (response.data?.display_name || 'Location resolved');

    // Only coarse boundary strings are returned; contact value and coordinates are never returned.
    const result = {
      success: true,
      city,
      state,
      country,
      label
    };

    geoCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  } catch (err) {
    // Graceful fallback - never throw or leak raw coordinate values or raw responses
    return {
      success: false,
      error: 'Coarse reverse-geocoding service unavailable.',
      city: null,
      state: null,
      country: null,
      label: null
    };
  }
}

/**
 * Clear the in-memory geocoding cache (useful for testing)
 */
function clearCache() {
  geoCache.clear();
}

module.exports = {
  reverseGeocode,
  clearCache,
  getNominatimUserAgent,
  CACHE_TTL_MS
};
