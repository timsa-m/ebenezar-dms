/**
 * Shared in-memory cache for vehicle data with query keying and request deduplication.
 * Eliminates duplicate API calls across components (e.g., GlobalSearchBar, Home, Inventory).
 * TTL: 5 minutes — stale data is re-fetched automatically.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cacheStore = new Map();
const inFlightRequests = new Map();

/**
 * Fetch vehicles using client in-memory cache and in-flight deduplication.
 * @param {string} cacheKey - The query key (e.g. "?limit=100")
 * @param {() => Promise<any>} fetcher - The raw API fetch function
 * @param {number} ttl - Cache TTL in ms
 * @returns {Promise<any>} Cached or freshly fetched vehicle list
 */
export const getCachedVehicles = async (cacheKey = 'default', fetcher, ttl = CACHE_TTL_MS) => {
  const key = cacheKey || 'default';
  const now = Date.now();

  // Cache hit
  const cached = cacheStore.get(key);
  if (cached && now - cached.timestamp < ttl) {
    return cached.data;
  }

  // Deduplicate concurrent in-flight requests for the exact same query
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  // Smart reuse: if this is a general un-filtered inventory request (e.g. ?limit=100 or ?limit=150)
  // and we already have a fresh cached general inventory, reuse it immediately!
  const isPlainInventoryQuery = !key.includes('category=') && !key.includes('make=') && !key.includes('condition=');
  if (isPlainInventoryQuery) {
    for (const [storedKey, entry] of cacheStore.entries()) {
      const isStoredPlain = !storedKey.includes('category=') && !storedKey.includes('make=') && !storedKey.includes('condition=');
      if (isStoredPlain && now - entry.timestamp < ttl && Array.isArray(entry.data) && entry.data.length > 0) {
        return entry.data;
      }
    }
  }

  // Cache miss: initiate fetch and register in-flight promise
  const requestPromise = (async () => {
    try {
      const result = await fetcher();
      cacheStore.set(key, { data: result, timestamp: Date.now() });
      return result;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, requestPromise);
  return requestPromise;
};

/**
 * Invalidate the cache (e.g. after adding, editing, or deleting a vehicle).
 */
export const invalidateVehicleCache = () => {
  cacheStore.clear();
  inFlightRequests.clear();
};
