/**
 * Image URL utilities for Cloudflare R2.
 *
 * Images are stored in Cloudflare R2 and the full public URL is saved
 * directly in MongoDB by the server (e.g.
 *   https://pub-b5971c79e1e94217b4847709c2e51781.r2.dev/vehicles/abc123.jpg
 * ).
 *
 * This utility normalises image URLs and provides a helper to build R2
 * URLs from bare object keys (e.g. "vehicles/abc123.jpg") for any legacy
 * data that was stored without the full URL.
 */

const R2_PUBLIC_BASE_URL = import.meta.env.VITE_R2_PUBLIC_BASE_URL || '';

/**
 * Resolves an image value to a fully-qualified URL ready to use in <img src>.
 *
 * Handles three input shapes:
 *  1. Full R2 URL   → returned as-is.
 *  2. Bare R2 key   → prefixed with R2_PUBLIC_BASE_URL (needs VITE_R2_PUBLIC_BASE_URL).
 *  3. Any other URL → returned as-is (external/fallback URLs).
 *
 * @param {string} value - A full URL or a bare storage key.
 * @returns {string} A fully-qualified image URL.
 */
export function getImageUrl(value) {
  if (!value || typeof value !== 'string') return value;

  // Already a full URL – pass through unchanged.
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  // Bare key (e.g. "vehicles/abc.jpg") – build the R2 public URL.
  if (R2_PUBLIC_BASE_URL) {
    return `${R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${value}`;
  }

  // Fallback: return the value unchanged.
  return value;
}
