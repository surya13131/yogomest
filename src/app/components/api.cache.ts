export const CACHE_TTL_BUS_LIST = 3 * 60 * 1000; // 3 minutes
export const CACHE_TTL_SEAT_LAYOUT = 2 * 60 * 1000; // 2 minutes
export const CACHE_TTL_CITY = 10 * 60 * 1000; // 10 minutes

const memoryCache = new Map<string, { data: string; expiry: number }>();

export const getCachedData = (key: string) => {
  const cached = memoryCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return JSON.parse(cached.data);
  }
  return null;
};

export const setCachedData = (key: string, data: any, ttl: number) => {
  memoryCache.set(key, { data: JSON.stringify(data), expiry: Date.now() + ttl });
};