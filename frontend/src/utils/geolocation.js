import { getLocationContext } from "../services/api";

/**
 * Privacy-Preserving Geolocation Utility (Phase 4)
 *
 * Privacy Guarantees:
 * 1. Default state is OFF - never called on page load or automatically.
 * 2. Invoked ONLY upon explicit user opt-in action.
 * 3. Uses single reading (getCurrentPosition) with enableHighAccuracy: false.
 * 4. watchPosition() is never used.
 * 5. Exact coordinates are transient in memory only - never saved in localStorage,
 *    cookies, backend databases, or logs.
 * 6. Location data is coarse (city, state, country) and used exclusively for
 *    environmental context AFTER plant identification.
 * 7. Location NEVER influences MobileNetV2 classification, confidence, or Grad-CAM.
 */

const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: false, // Low-power, privacy-friendly cell/wifi coarse resolution
  timeout: 10000,           // 10 second timeout
  maximumAge: 300000        // Accept cached position within 5 minutes
};

/**
 * Requests coarse location context after explicit user consent.
 *
 * @returns {Promise<{available: boolean, city?: string, state?: string, country?: string, label?: string, error?: string}>}
 */
export async function getBrowserCoarseLocation() {
  if (typeof window === "undefined" || !navigator || !navigator.geolocation) {
    return {
      available: false,
      error: "Geolocation is not supported by your browser."
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          // Resolve coarse location via backend proxy
          const data = await getLocationContext(lat, lon);

          // Raw coordinates are discarded immediately from memory
          if (data && data.success && data.label) {
            resolve({
              available: true,
              city: data.city || null,
              state: data.state || null,
              country: data.country || null,
              label: data.label
            });
          } else {
            resolve({
              available: false,
              error: data?.error || "Location context could not be determined."
            });
          }
        } catch (err) {
          resolve({
            available: false,
            error: err.response?.data?.error || "Failed to resolve coarse location context."
          });
        }
      },
      (geoError) => {
        let errorMsg = "Unable to retrieve location context.";
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            errorMsg = "Location permission denied. Geolocation context is optional.";
            break;
          case geoError.POSITION_UNAVAILABLE:
            errorMsg = "Location information is unavailable.";
            break;
          case geoError.TIMEOUT:
            errorMsg = "Location request timed out.";
            break;
          default:
            errorMsg = geoError.message || "Location request failed.";
        }
        resolve({
          available: false,
          error: errorMsg
        });
      },
      GEOLOCATION_OPTIONS
    );
  });
}
