import { ethers, } from 'ethers';
import { walletRepository as walletRepo, chainRepository as chainRepo, transactionRepository as transactionsRepo, chainRepository } from "../repositories/index.js";
import { decryptPrivateKey } from '../crypto/encryption.js';
import statusQueue from '../queues/statusQueue.js';
import logger from '../config/logger.js';
import AppError from "../errors/AppError.js"
import queueManager from '../queues/queueManager.js';

class StatusWorker {
    async process(job) {
        const { transactionId, chainId } = job.data;
        const { statusQueue } = queueManager.getQueue(chainId);
        const tx = await transactionsRepo.findTransactionById(transactionId);
        if (!tx || !tx.transactionHash) return;

        if (tx.status === "mined" || tx.status === "failed") {
            await job.remove();
            return;
        }
        try {
            const chain = await chainRepo.getChain(chainId);
            const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
            const receipt = await provider.getTransactionReceipt(tx.transactionHash);
            if (!receipt) {
                logger.info(`[${chainId}] Tx still pending: ${transactionId}`);
                return;
            }
            if (receipt.status === 1) {
                await transactionsRepo.updateTransactionStatusMined({
                    id: transactionId,
                    status: "mined",
                    blockNumber: receipt.blockNumber,
                    confirmedAt: new Date(),
                });

                await statusQueue.removeRepeatableByKey(job.opts.repeat.key);
                logger.info(`[${chainId}] Tx mined: ${transactionId}`);
            } else {
                await transactionsRepo.updateTransactionStatusFailed({
                    id: transactionId,
                    status: "failed",
                    confirmedAt: new Date(),
                });

                await statusQueue.removeRepeatableByKey(job.opts.repeat.key);
                logger.info(`[${chainId}] Tx reverted: ${transactionId}`);
            }
            await statusQueue.removeRepeatableByKey(job.opts.repeat.key);

        }
        catch (error) {
            logger.error(`[${chainId}] Status worker error: ${error}`);
            return
        }
    }
}

export default new StatusWorker();