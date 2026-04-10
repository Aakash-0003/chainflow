import logger from "../config/logger.js"
import { importWallet, getWalletByPublicAddress, updateWalletStatus, enableChainsForWallet } from "../services/wallet.services.js"
import AppError from "../errors/AppError.js";

export async function getWalletController(req, res, next) {
    try {
        const { publicAddress } = req.params;
        logger.info(`INITIATED : Get wallet for address : ${publicAddress}`)

        const wallet = await getWalletByPublicAddress(publicAddress);
        if (!wallet) {
            throw new AppError("Wallet not found", 404);
        }
        const response = {
            name: wallet.name,
            publicAddress: wallet.publicAddress,
            walletId: wallet.id,
            status: wallet.status,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt
        }
        logger.info(`COMPLETED : Get wallet for address : ${publicAddress} ,Successfull :${JSON.stringify(response)}`)
        return res.status(200).json({ success: true, result: response })
    } catch (error) {
        next(error)
    }
}

export async function importWalletController(req, res, next) {
    try {
        const { name, publicAddress, privateKey, chainIds } = req.body;
        logger.info(`Received request for wallet import for Request : ${req.requestId} : ${JSON.stringify(req.body)}`);

        const response = await importWallet({ name, publicAddress, privateKey, chainIds });
        logger.info(`Importing Wallet Successfull for Request : ${req.requestId} : ${JSON.stringify(response)}`)

        return res.status(201).json({ success: true, result: response });
    } catch (error) {
        next(error)
    }
}

export async function updateWalletController(req, res, next) {
    try {
        const { publicAddress } = req.params;
        const { status } = req.body;
        logger.info(`INITIATED : Update wallet status for address : ${publicAddress}`)

        const result = await updateWalletStatus({ publicAddress, status });
        const response = {
            name: result.name,
            publicAddress: result.publicAddress,
            status: result.status,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt
        }
        logger.info(`COMPLETED : Update wallet status for address: ${publicAddress} ,Successfull :${JSON.stringify(response)}`)
        return res.status(200).json({ success: true, result: response })
    } catch (error) {
        next(error)
    }
}

export async function enableChainsController(req, res, next) {
    try {
        const { walletId } = req.params;
        const { chainIds } = req.body;
        logger.info(`INITIATED : enable chains for wallet : ${walletId}`)

        const result = await enableChainsForWallet({ walletId, chainIds });
        logger.info(`COMPLETED : Update wallet status for wallet: ${walletId} ,Successfull :${JSON.stringify(result)}`)
        return res.status(200).json({ success: true, result: result })
    } catch (error) {
        next(error)
    }
}