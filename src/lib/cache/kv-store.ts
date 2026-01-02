/**
 * Simple in-memory cache for exchange rates
 * TTL-based expiration with LRU eviction
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  set(key: string, value: T, ttlMs: number): void {
    // LRU eviction: remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Export singleton instance for exchange rates
// TTL: 1 hour (3600000 ms)
export const exchangeRateCache = new SimpleCache<number>(200);
export const EXCHANGE_RATE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
