/**
 * Shared in-memory cache for vehicle data.
 * Eliminates duplicate API calls when navigating between Home and Inventory.
 * TTL: 5 minutes — stale data is re-fetched automatically.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = {
  data: null,
  timestamp: null,
  inflight: null, // Shared promise for in-progress fetches (prevents duplicate requests)
};

/**
 * Fetch vehicles using the cache.
 * @param {() => Promise<any>} fetcher - The raw API fetch function.
 * @returns {Promise<any>} Cached or freshly fetched vehicle list.
 */
export const getCachedVehicles = async (fetcher) => {
  const now = Date.now();

  // Cache hit: data exists and is still fresh
  if (cache.data && cache.timestamp && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  // Deduplicate: if a fetch is already in-flight, wait for it instead of firing again
  if (cache.inflight) {
    return cache.inflight;
  }

  // Cache miss: fire a new fetch and store the promise
  cache.inflight = fetcher()
    .then((result) => {
      cache.data = result;
      cache.timestamp = Date.now();
      return result;
    })
    .finally(() => {
      cache.inflight = null;
    });

  return cache.inflight;
};

/**
 * Manually invalidate the cache (e.g. after adding/editing/deleting a vehicle in Admin).
 */
export const invalidateVehicleCache = () => {
  cache.data = null;
  cache.timestamp = null;
  cache.inflight = null;
};
