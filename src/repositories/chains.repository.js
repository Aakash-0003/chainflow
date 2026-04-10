import prisma from "../../prisma/prisma.js";
import cacheService from "../services/cache.service.js";
import logger from "../config/logger.js";

const CACHE_KEYS = {
    CHAIN: (chainId) => `chain:${chainId}`,
    ALL_CHAINS: 'chains:all',
};

/**
 * Get a single chain by ID with caching
 * Cache TTL: 1 hour (chains rarely change)
 * @param {number} chainId - Chain ID
 * @returns {Promise<object>} Chain data
 */
export async function getChain(chainId) {
    const cacheKey = CACHE_KEYS.CHAIN(chainId);

    // Check cache first
    let chain = cacheService.get(cacheKey);
    if (chain) {
        return chain;
    }

    // Cache miss - fetch from DB
    chain = await prisma.chain.findUnique({
        where: { chainId },
    });

    if (chain) {
        // Cache for 1 hour (3600000ms)
        cacheService.set(cacheKey, chain, 3600000);
    }

    return chain;
}

/**
 * Get all chains with caching
 * Cache TTL: 1 hour (chains rarely change)
 * @returns {Promise<array>} All chains
 */
export async function getAllChains() {
    const cacheKey = CACHE_KEYS.ALL_CHAINS;

    // Check cache first
    let chains = cacheService.get(cacheKey);
    if (chains) {
        return chains;
    }

    // Cache miss - fetch from DB
    chains = await prisma.chain.findMany({
        where: { status: 'active' },
    });

    if (chains && chains.length > 0) {
        // Cache for 1 hour (3600000ms)
        cacheService.set(cacheKey, chains, 3600000);
    }

    return chains;
}

/**
 * Invalidate chain cache (call this after chain updates)
 * @param {number} chainId - Chain ID to invalidate (optional, clears all if not provided)
 */
export function invalidateChainCache(chainId = null) {
    if (chainId) {
        const cacheKey = CACHE_KEYS.CHAIN(chainId);
        cacheService.delete(cacheKey);
        logger.info(`Invalidated cache for chain ${chainId}`);
    } else {
        cacheService.delete(CACHE_KEYS.ALL_CHAINS);
        logger.info('Invalidated cache for all chains');
    }
}

/**
 * Initialize chains cache from database (called on server startup)
 * Preloads all active chains into memory for instant access
 * @returns {Promise<array>} All chains that were cached
 */
export async function initializeChainsCache() {
    try {
        logger.info('Initializing chains cache from database...');

        // Fetch all active chains from DB
        const chains = await prisma.chain.findMany({
            where: { status: 'active' },
        });

        if (!chains || chains.length === 0) {
            logger.warn('No active chains found in database');
            return [];
        }

        // Cache individual chains with 1 hour TTL
        chains.forEach(chain => {
            const cacheKey = CACHE_KEYS.CHAIN(chain.chainId);
            cacheService.set(cacheKey, chain);
        });

        // Cache all chains array with 1 hour TTL
        cacheService.set(CACHE_KEYS.ALL_CHAINS, chains);

        logger.info(`Chains cache initialized successfully with ${chains.length} chains`);
        return chains;
    } catch (error) {
        logger.error('Failed to initialize chains cache:', error.message);
        throw error;
    }
}