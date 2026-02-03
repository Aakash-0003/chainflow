import logger from "../config/logger.js"
import { importWallet, getWalletByPublicAddress, updateWalletStatus, enableChainsForWallet } from "../services/wallet.services.js"

export async function getWalletController(req, res, next) {
    try {
        const { publicAddress } = req.params;
        logger.info(`INITIATED : Get wallet for address : ${publicAddress}`)

        const result = await getWalletByPublicAddress(publicAddress);
        const response = {
            name: result.name,
            publicAddress: result.public_address,
            status: result.status,
            createdAt: result.created_at,
            updatedAt: result.updated_at
        }
        logger.info(`COMPLETED : Get wallet for address : ${publicAddress} ,Successfull :${JSON.stringify(response)}`)
        return res.status(201).send(response)
    } catch (error) {
        next(error)
    }
}

export async function importWalletController(req, res, next) {
    try {
        // call wallet service with the req.body
        const { name, publicAddress, privateKey, chainIds } = req.body;
        logger.info(`Received request for wallet import for Request : ${req.requestId} : ${JSON.stringify(req.body)}`);
        const result = await importWallet({ name, publicAddress, privateKey, chainIds });
        const response = {
            id: result.id,
            name: result.name,
            publicAddress: result.public_address,
            chainIds: result.chainIds,
            status: result.status,
            createdAt: result.created_at,
            updatedAt: result.updated_at
        }
        logger.info(`Importing Wallet Successfull for Request : ${req.requestId} : ${JSON.stringify(response)}`)
        //return response in res from service 
        return res.status(201).json({ result: response });

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
            publicAddress: result.public_address,
            status: result.status,
            createdAt: result.created_at,
            updatedAt: result.updated_at
        }
        logger.info(`COMPLETED : Update wallet status for address: ${publicAddress} ,Successfull :${JSON.stringify(response)}`)
        return res.status(201).send(response)
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
        return res.status(201).send({ success: true, chains: result })
    } catch (error) {
        next(error)
    }
}