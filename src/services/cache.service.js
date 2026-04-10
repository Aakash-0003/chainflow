import logger from '../config/logger.js';
import AppError from '../errors/AppError.js';

/**
 * Simple in-memory cache service for frequently accessed data
 * Caches: Chain data, Wallet-Chain associations, etc.
 */
class CacheService {
    constructor() {
        this.cache = new Map();
        this.ttl = new Map(); // Track TTL for each key if needed
    }

    /**
     * Set a value in cache with optional TTL (Time To Live)
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} ttlMs - Time to live in milliseconds (0 = no expiry)
     */
    set(key, value, ttlMs = 0) {
        this.cache.set(key, value);

        if (ttlMs > 0) {
            // Clear existing timeout if any
            if (this.ttl.has(key)) {
                clearTimeout(this.ttl.get(key).timeoutId);
            }

            // Set auto-expiry
            const timeoutId = setTimeout(() => {
                this.delete(key);
                logger.info(`Cache expired for key: ${key}`);
            }, ttlMs);

            this.ttl.set(key, { timeoutId, expiresAt: Date.now() + ttlMs });
        }

        logger.debug(`Cache SET: ${key}`);
        return value;
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {*} Cached value or undefined
     */
    get(key) {
        const value = this.cache.get(key);
        if (value) {
            logger.debug(`Cache HIT: ${key}`);
        } else {
            logger.debug(`Cache MISS: ${key}`);
        }
        return value;
    }

    /**
     * Delete a specific key from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
        if (this.ttl.has(key)) {
            clearTimeout(this.ttl.get(key).timeoutId);
            this.ttl.delete(key);
        }
        logger.debug(`Cache DELETE: ${key}`);
    }

    /**
     * Clear all cache
     */
    clear() {
        // Clear all timeouts
        for (const { timeoutId } of this.ttl.values()) {
            clearTimeout(timeoutId);
        }
        this.cache.clear();
        this.ttl.clear();
        logger.info('Cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {object} Cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}

export default new CacheService();
