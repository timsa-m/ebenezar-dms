interface CacheEntry {
  data: any[];
  timestamp: number;
}

// In-memory cache for public /api/vehicles responses
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export function getCachedVehiclesApi(cacheKey: string): any[] | null {
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

export function setCachedVehiclesApi(cacheKey: string, data: any[]): void {
  const now = Date.now();
  memoryCache.set(cacheKey, { data, timestamp: now });

  if (memoryCache.size > 50) {
    for (const [key, entry] of memoryCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL_MS * 2) {
        memoryCache.delete(key);
      }
    }
  }
}

export function invalidateVehiclesApiCache(): void {
  memoryCache.clear();
}
