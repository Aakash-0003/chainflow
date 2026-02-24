import { ethers } from "ethers";
import logger from "../config/logger.js";
import buildTransactionData from "../utils/buildTransactionData.js";
import transactionQueue from "../queues/transactionQueue.js";
import { transactionRepository as transactionRepo, walletChainRepository as walletChainRepo } from "../repositories/index.js";
import { getWalletBalance } from "../utils/getWalletBalance.js";

export async function sendTransaction(requestData) {

    if (!requestData.walletId || !requestData.chainId || !requestData.toAddress) {
        throw new Error('Missing required fields');
    }
    logger.info(`Received transaction request for walletId : ${requestData.walletId} on chainId : ${requestData.chainId} with toAddress : ${requestData.toAddress} and value : ${requestData.value || '0'}`)

    const value = requestData.value ? ethers.parseEther(requestData.value) : 0n;
    const transactionRequest = {
        toAddress: requestData.toAddress,
        value: value,
        walletId: requestData.walletId,
        chainId: requestData.chainId,
    };

    //check if the wallet has active chain  and balance is sufficient
    const walletChain = await walletChainRepo.findWalletChain(requestData.walletId, requestData.chainId)
    if (!walletChain) {
        throw new Error(`Wallet ${requestData.walletId} is not enabled for chain ${requestData.chainId}`);
    }

    const walletAddress = walletChain.wallet.publicAddress;
    const rpcUrl = walletChain.chain.rpcUrl;
    const balance = await getWalletBalance(walletAddress, rpcUrl);
    if (balance === null || balance === undefined) {
        throw new Error(`Failed to retrieve balance for wallet ${requestData.walletId} on chain ${requestData.chainId}`);
    }
    if (balance < value) {
        throw new Error(`Insufficient balance in wallet ${requestData.walletId} for chain ${requestData.chainId}`);
    }

    //check if its a transfer transaction  or a contract interaction
    if (requestData.functionSignature && requestData.args) {
        logger.info(`Contract interaction request received for address : ${requestData.toAddress} with function signature : ${requestData.functionSignature} and args : ${JSON.stringify(requestData.args)}`)
        transactionRequest.data = buildTransactionData({
            functionSignature: requestData.functionSignature,
            args: requestData.args
        })
    } else {
        logger.info(`Transfer transaction request received for address : ${requestData.toAddress} with value : ${requestData.value}`)
        transactionRequest.data = '0x';
    }

    //build transactionobject to be added to db
    const dbResponse = await transactionRepo.insertTransaction(transactionRequest)
    if (!dbResponse) {
        throw new Error(`Failed to insert transaction in database`);
    }

    const transactionId = dbResponse.id
    const enqueueResult = await transactionQueue.enqueue(transactionRequest.chainId, transactionId)
    if (!enqueueResult) {
        throw new Error(`Failed to enqueue transaction for processing`);
    }
    return {
        "transactionId": transactionId,
        "status": dbResponse.status,
        "walletId": dbResponse.walletId,
        "chainId": dbResponse.chainId,
        "createdAt": dbResponse.createdAt
    }
}

export async function getTransactionStatusService(transactionId) {
    if (!transactionId) {
        throw new Error('Missing required field: transactionId');
    }
    logger.info(`Received request to get transaction status for transactionId : ${transactionId}`)

    const transaction = await transactionRepo.findTransactionById(transactionId);
    if (!transaction) {
        throw new Error(`Transaction with id ${transactionId} not found`);
    }

    return {
        "transactionId": transaction.id,
        "status": transaction.status,
        "walletId": transaction.walletId,
        "chainId": transaction.chainId,
        "createdAt": transaction.createdAt,
        "updatedAt": transaction.updatedAt
    }
}