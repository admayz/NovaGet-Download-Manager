/**
 * Simple memoization utility for expensive computations
 * Caches results based on arguments
 */

interface MemoCache<T> {
  [key: string]: {
    value: T;
    timestamp: number;
  };
}

/**
 * Memoize a function with optional TTL (time to live)
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    ttl?: number; // Time to live in milliseconds
    maxSize?: number; // Maximum cache size
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {}
): T {
  const cache: MemoCache<ReturnType<T>> = {};
  const { ttl, maxSize = 100, keyGenerator } = options;

  return ((...args: Parameters<T>): ReturnType<T> => {
    // Generate cache key
    const key = keyGenerator
      ? keyGenerator(...args)
      : JSON.stringify(args);

    // Check if cached value exists and is still valid
    if (cache[key]) {
      const { value, timestamp } = cache[key];
      if (!ttl || Date.now() - timestamp < ttl) {
        return value;
      }
      // Expired, delete it
      delete cache[key];
    }

    // Compute new value
    const result = fn(...args);

    // Manage cache size
    const keys = Object.keys(cache);
    if (keys.length >= maxSize) {
      // Remove oldest entry
      const oldestKey = keys.reduce((oldest, current) => {
        return cache[current].timestamp < cache[oldest].timestamp
          ? current
          : oldest;
      });
      delete cache[oldestKey];
    }

    // Store in cache
    cache[key] = {
      value: result,
      timestamp: Date.now(),
    };

    return result;
  }) as T;
}

/**
 * Memoize async functions
 */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    ttl?: number;
    maxSize?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {}
): T {
  type PromiseResult = Awaited<ReturnType<T>>;
  const cache: MemoCache<PromiseResult> = {};
  const pending: { [key: string]: Promise<PromiseResult> } = {};
  const { ttl, maxSize = 100, keyGenerator } = options;

  return (async (...args: Parameters<T>): Promise<PromiseResult> => {
    const key = keyGenerator
      ? keyGenerator(...args)
      : JSON.stringify(args);

    // Check if cached value exists and is still valid
    if (cache[key]) {
      const { value, timestamp } = cache[key];
      if (!ttl || Date.now() - timestamp < ttl) {
        return value;
      }
      delete cache[key];
    }

    // Check if request is already pending
    if (key in pending) {
      return pending[key];
    }

    // Execute function
    const promise = fn(...args) as Promise<PromiseResult>;
    pending[key] = promise;

    try {
      const result = await promise;

      // Manage cache size
      const keys = Object.keys(cache);
      if (keys.length >= maxSize) {
        const oldestKey = keys.reduce((oldest, current) => {
          return cache[current].timestamp < cache[oldest].timestamp
            ? current
            : oldest;
        });
        delete cache[oldestKey];
      }

      // Store in cache
      cache[key] = {
        value: result,
        timestamp: Date.now(),
      };

      return result;
    } finally {
      delete pending[key];
    }
  }) as T;
}

/**
 * Clear all memoized caches
 */
export function clearMemoCache(fn: any): void {
  if (fn && typeof fn === 'function' && (fn as any).__memoCache) {
    (fn as any).__memoCache = {};
  }
}
