import { ethers } from 'ethers';
import { chainRepository as chainRepo, transactionRepository as transactionsRepo } from "../repositories/index.js";
import logger from '../config/logger.js';

class StatusWorker {
    async process(job) {
        const { transactionId, chainId } = job.data;

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

                await job.queue.removeRepeatableByKey(job.opts.repeat.key);
                logger.info(`[${chainId}] Tx mined: ${transactionId}`);
            } else {
                await transactionsRepo.updateTransactionStatusFailed({
                    id: transactionId,
                    status: "failed",
                    confirmedAt: new Date(),
                });

                await job.queue.removeRepeatableByKey(job.opts.repeat.key);
                logger.info(`[${chainId}] Tx reverted: ${transactionId}`);
            }
        }
        catch (error) {
            logger.error(`[${chainId}] Status worker error: ${error}`);
            return
        }
    }
}

export default new StatusWorker();