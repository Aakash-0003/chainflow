import { ethers } from "ethers";
import logger from "../config/logger.js";
import buildTransactionData from "../utils/buildTransactionData.js";
import transactionQueue from "../queues/transactionQueue.js";
import * as transactionRepo from "../repositories/transactions.repository.js"
import * as walletChainRepo from "../repositories/walletChain.repository.js";
import { getWalletBalance } from "../utils/getWalletBalance.js";
import AppError from "../errors/AppError.js";

export async function sendTransaction({ walletId, chainId, toAddress, value, functionSignature, args }) {


    logger.info(`Received transaction request for walletId : ${walletId} on chainId : ${chainId} with toAddress : ${toAddress} and value : ${value || '0'}`)

    const parsedValue = value ? ethers.parseEther(value) : 0n;
    const transactionRequest = {
        toAddress: toAddress,
        value: parsedValue,
        walletId: walletId,
        chainId: chainId,
    };

    //check if the wallet has active chain  and balance is sufficient
    const walletChain = await walletChainRepo.findWalletChain(walletId, chainId)
    if (!walletChain) {
        throw new AppError(`Bad Request:Wallet ${walletId} is not enabled for chain ${chainId}`, 400);
    }

    const walletAddress = walletChain.wallet.public_address;
    const rpcUrl = walletChain.chain.rpc_url;
    const balance = await getWalletBalance(walletAddress, rpcUrl);
    if (balance === null || balance === undefined) {
        throw new AppError(`Internal Server Error:Failed to retrieve balance for wallet ${walletId} on chain ${chainId}`, 500);
    }
    if (balance < value) {
        throw new AppError(`Bad Request Insufficient balance in wallet ${walletId} for chain ${chainId}`, 400);
    }

    //check if its a transfer transaction  or a contract interaction
    if (functionSignature && args) {
        logger.info(`Contract interaction request received for address : ${toAddress} with function signature : ${functionSignature} and args : ${JSON.stringify(args)}`)
        transactionRequest.data = buildTransactionData({
            functionSignature: functionSignature,
            args: args
        })
    } else {
        logger.info(`Transfer transaction request received for address : ${toAddress} with value : ${value}`)
        transactionRequest.data = '0x';
    }

    //build transactionobject to be added to db
    const dbResponse = await transactionRepo.insertTransaction(transactionRequest)
    if (!dbResponse) {
        throw new AppError(`Internal Server Error :Failed to insert transaction in database`, 500);
    }

    const transactionId = dbResponse.id
    const enqueueResult = await transactionQueue.enqueue(transactionRequest.chainId, transactionId)
    if (!enqueueResult) {
        throw new Error(`Internal Server Error :Failed to enqueue transaction for processing`, 500);
    }
    return {
        "transactionId": transactionId,
        "status": dbResponse.status,
        "walletId": dbResponse.wallet_id,
        "chainId": dbResponse.chain_id,
        "createdAt": dbResponse.created_at
    }
}

export async function getTransactionStatusService(transactionId) {
    logger.info(`Received request to get transaction status for transactionId : ${transactionId}`)

    const transaction = await transactionRepo.findTransactionById(transactionId);
    if (!transaction) {
        throw new AppError(`Transaction with id ${transactionId} not found`, 404);
    }

    return {
        "transactionId": transaction.id,
        "status": transaction.status,
        "walletId": transaction.wallet_id,
        "chainId": transaction.chain_id,
        "createdAt": transaction.created_at,
        "updatedAt": transaction.updated_at
    }
}