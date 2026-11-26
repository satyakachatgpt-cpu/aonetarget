/**
 * High-Performance In-Memory Micro-Cache for Public API Endpoints
 * Reduces MongoDB aggregation load and cuts response time from seconds to ~1ms.
 */

const cacheStore = new Map();

export const getCache = (key) => {
  const item = cacheStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return item.data;
};

export const setCache = (key, data, ttlSeconds = 60) => {
  cacheStore.set(key, {
    data,
    expiresAt: Date.now() + (ttlSeconds * 1000)
  });
};

export const clearCachePattern = (pattern) => {
  for (const key of cacheStore.keys()) {
    if (key.includes(pattern)) {
      cacheStore.delete(key);
    }
  }
};

export const clearAllCache = () => {
  cacheStore.clear();
};
