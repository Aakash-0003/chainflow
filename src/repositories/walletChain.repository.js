import prisma from '../../prisma/prisma.js';
import cacheService from '../services/cache.service.js';
import logger from '../config/logger.js';

const CACHE_KEYS = {
    WALLET_CHAINS: (walletId) => `walletChains:${walletId}`,
};

export async function enableChains(prismaClient, { walletId, chainIds }) {
    const records = chainIds.map((chainId) => ({
        walletId: walletId,
        chainId: chainId,
    }));

    await prismaClient.walletChain.createMany({
        data: records,
        skipDuplicates: true,
    });

    const result = await prismaClient.walletChain.findMany({
        where: {
            OR: records.map(r => ({
                walletId: r.walletId,
                chainId: r.chainId,
            })),

        }, select: {
            chainId: true,
        },
    });

    // Invalidate cache for this wallet
    invalidateWalletChainCache(walletId);

    return result;
}

/**
 * Find wallet-chain relationship with caching
 * Derives from the walletChains collection cache (walletChains:walletId) to avoid
 * maintaining redundant per-chain keys. Falls back to DB and populates collection cache on miss.
 * @param {string} walletId - Wallet ID
 * @param {number} chainId - Chain ID
 * @returns {Promise<object|null>} Wallet-chain relation with nested data
 */
export async function findWalletChain(walletId, chainId) {
    const collectionKey = CACHE_KEYS.WALLET_CHAINS(walletId);

    // Derive from collection cache if available
    const cachedAll = cacheService.get(collectionKey);
    if (cachedAll) {
        return cachedAll.find(r => r.chainId === chainId) ?? null;
    }

    // Cache miss - fetch all chains for this wallet and populate collection cache
    const relations = await prisma.walletChain.findMany({
        where: { walletId },
        include: {
            wallet: true,
            chain: true
        }
    });

    if (relations && relations.length > 0) {
        cacheService.set(collectionKey, relations, 1800000);
    }

    return relations.find(r => r.chainId === chainId) ?? null;
}

/**
 * Get all chains for a wallet with caching
 * @param {string} walletId - Wallet ID
 * @returns {Promise<array>} All wallet-chain relations
 */
export async function findWalletChains(walletId) {
    const cacheKey = CACHE_KEYS.WALLET_CHAINS(walletId);

    // Check cache first
    let relations = cacheService.get(cacheKey);
    if (relations) {
        return relations;
    }

    // Cache miss - fetch from DB
    relations = await prisma.walletChain.findMany({
        where: { walletId },
        include: {
            wallet: true,
            chain: true
        }
    });

    if (relations && relations.length > 0) {
        // Cache for 30 minutes (1800000ms)
        cacheService.set(cacheKey, relations, 1800000);
    }

    return relations;
}

/**
 * Invalidate wallet-chain collection cache (call after updates)
 * @param {string} walletId - Wallet ID to invalidate
 */
export function invalidateWalletChainCache(walletId) {
    const cacheKey = CACHE_KEYS.WALLET_CHAINS(walletId);
    cacheService.delete(cacheKey);
    logger.debug(`Invalidated cache for all chains of wallet ${walletId}`);
}
