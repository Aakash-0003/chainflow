import { ethers } from 'ethers';
import AppError from '../errors/AppError.js';
import cacheService from '../services/cache.service.js';

/**
 * Validates Ethereum address format
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid
 */
function isValidEthereumAddress(address) {
    return ethers.isAddress(address);
}

/**
 * Validates private key format
 * @param {string} privateKey - Private key to validate
 * @returns {boolean} True if valid
 */
function isValidPrivateKey(privateKey) {
    try {
        new ethers.Wallet(privateKey);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validates chain ID exists in system (via cache)
 * @param {number} chainId - Chain ID to validate
 * @returns {boolean} True if chain exists
 */
function isValidChainId(chainId) {
    // Get all cached chains
    const cachedChains = cacheService.get('chains:all');
    if (!cachedChains) {
        return true;
    }
    return cachedChains.some(chain => chain.chainId === chainId);
}

/**
 * Validates wallet status
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid status
 */
function isValidWalletStatus(status) {
    return ['active', 'paused', 'disabled'].includes(status);
}

/**
 * Validates numeric value as a positive number
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid positive number or parseable to number
 */
function isValidPositiveNumber(value) {
    if (value === null || value === undefined) return false;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
}

/**
 * Validates that chainIds is a non-empty array of valid chain IDs
 * @param {any} chainIds - Array of chain IDs to validate
 * @returns {boolean} True if valid
 */
function isValidChainIdsArray(chainIds) {
    if (!Array.isArray(chainIds) || chainIds.length === 0) return false;
    return chainIds.every(id => typeof id === 'number' && isValidChainId(id));
}

/**
 * Validates function signature format (e.g., "transfer(address,uint256)")
 * @param {string} functionSignature - Function signature to validate
 * @returns {boolean} True if valid format
 */
function isValidFunctionSignature(functionSignature) {
    const regex = /^(function\s+)?[a-zA-Z_][a-zA-Z0-9_]*\([^)]*\)$/;
    return regex.test(functionSignature);
}

/**
 * Middleware to validate wallet import request
 */
export const validateImportWallet = (req, res, next) => {
    try {
        const { name, publicAddress, privateKey, chainIds } = req.body;

        // Check required fields exist
        if (!name || !publicAddress || !privateKey || !chainIds) {
            throw new AppError(
                'Missing required fields: name, publicAddress, privateKey, chainIds',
                400
            );
        }

        // Validate public address
        if (!isValidEthereumAddress(publicAddress)) {
            throw new AppError('Invalid Ethereum public address', 400);
        }

        // Validate private key
        if (!isValidPrivateKey(privateKey)) {
            throw new AppError('Invalid private key format', 400);
        }

        // Validate chainIds
        if (!isValidChainIdsArray(chainIds)) {
            throw new AppError(
                'chainIds must be a non-empty array of valid chain IDs',
                400
            );
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to validate get wallet request
 */
export const validateGetWallet = (req, res, next) => {
    try {
        const { publicAddress } = req.params;

        if (!publicAddress) {
            throw new AppError('Public address is required', 400);
        }

        if (!isValidEthereumAddress(publicAddress)) {
            throw new AppError('Invalid Ethereum public address', 400);
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to validate update wallet status request
 */
export const validateUpdateWalletStatus = (req, res, next) => {
    try {
        const { publicAddress } = req.params;
        const { status } = req.body;

        if (!publicAddress) {
            throw new AppError('Public address is required', 400);
        }

        if (!isValidEthereumAddress(publicAddress)) {
            throw new AppError('Invalid Ethereum public address', 400);
        }

        if (!status) {
            throw new AppError('Status is required', 400);
        }

        if (!isValidWalletStatus(status)) {
            throw new AppError(
                'Status must be one of: active, paused, disabled',
                400
            );
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to validate enable chains for wallet request
 */
export const validateEnableChains = (req, res, next) => {
    try {
        const { walletId } = req.params;
        const { chainIds } = req.body;

        if (!walletId) {
            throw new AppError('Wallet ID is required', 400);
        }

        if (!chainIds) {
            throw new AppError('chainIds is required', 400);
        }

        if (!isValidChainIdsArray(chainIds)) {
            throw new AppError(
                'chainIds must be a non-empty array of valid chain IDs',
                400
            );
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to validate send transaction request
 */
export const validateSendTransaction = (req, res, next) => {
    try {
        const { walletId, chainId, toAddress, value, functionSignature, args } = req.body;

        // Validate required fields
        if (!walletId || !chainId || !toAddress) {
            throw new AppError(
                'Missing required fields: walletId, chainId, toAddress',
                400
            );
        }

        // Validate chainId
        if (typeof chainId !== 'number' || !isValidChainId(chainId)) {
            throw new AppError('Invalid or unsupported chain ID', 400);
        }

        // Validate toAddress
        if (!isValidEthereumAddress(toAddress)) {
            throw new AppError('Invalid recipient Ethereum address', 400);
        }

        // Validate value (optional, but if provided must be valid)
        if (value !== undefined && value !== null && !isValidPositiveNumber(value)) {
            throw new AppError('Value must be a positive number', 400);
        }

        // If functionSignature is provided, args must also be provided (contract interaction)
        if (functionSignature && !args) {
            throw new AppError(
                'args must be provided when functionSignature is specified',
                400
            );
        }

        // If args is provided, functionSignature must also be provided
        if (args && !functionSignature) {
            throw new AppError(
                'functionSignature must be provided when args is specified',
                400
            );
        }

        // Validate functionSignature if provided
        if (functionSignature) {
            if (typeof functionSignature !== 'string' || !isValidFunctionSignature(functionSignature)) {
                throw new AppError(
                    'Invalid function signature format (e.g., "transfer(address,uint256)")',
                    400
                );
            }
        }

        // Validate args if provided
        if (args) {
            if (!Array.isArray(args)) {
                throw new AppError('args must be an array', 400);
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to validate get transaction status request
 */
export const validateGetTransactionStatus = (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            throw new AppError('Transaction ID is required', 400);
        }

        next();
    } catch (error) {
        next(error);
    }
};
