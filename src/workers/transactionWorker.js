import { ethers, } from 'ethers';
import { walletRepository as walletRepo, chainRepository as chainRepo, transactionRepository as transactionsRepo } from "../repositories/index.js";
import { decryptPrivateKey } from '../crypto/encryption.js';
import transactionQueue from '../queues/transactionQueue.js';
import statusQueue from '../queues/statusQueue.js';
import { classifyError } from '../utils/helper.js';
import logger from '../config/logger.js';
import AppError from "../errors/AppError.js"

class TransactionWorker {
    async process(job) {
        const { transactionId, chainId } = job.data;

        logger.info(`[chain:${chainId}] [tx:${transactionId}] Sending tx`);

        const transaction = await transactionsRepo.findTransactionById(transactionId);
        if (!transaction) {
            throw new AppError('Transaction not found', 404);
        }

        if (transaction.status !== 'queued') {
            if (transaction.status === 'sent' || transaction.status === 'processing') {
                return { skipped: true };
            }
            throw new AppError(
                `Invalid transaction status: ${transaction.status}`,
                400
            );
        }
        if (transaction.transactionHash) {
            return { skipped: true };
        }

        const updateResult = await transactionsRepo.updateTransactionStatus(transactionId, 'processing');
        if (!updateResult) {
            throw new AppError(`Failed to update transaction status to processing for ${transactionId}`, 500);
        }

        const wallet = await walletRepo.getWalletById(transaction.walletId);
        if (!wallet) {
            throw new AppError('Wallet not found', 404);
        }

        if (wallet.status !== 'active') {
            throw new AppError(`Wallet is inactive: ${wallet.id}`, 400);
        }

        const privateKey = decryptPrivateKey({
            encryptedSecret: wallet.encryptedSecret,
            iv: wallet.encryptedIv,
            authTag: wallet.encryptionAuth,
        });

        if (!privateKey) {
            throw new AppError('Failed to decrypt wallet', 500, false);
        }
        const chain = await chainRepo.getChain(chainId);
        const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
        const signer = new ethers.Wallet(privateKey, provider);
        let nonce = transaction.nonce;
        if (nonce == null) {
            nonce = await provider.getTransactionCount(wallet.publicAddress, "pending");

            // store nonce in DB
            await transactionsRepo.updateTransactionNonce(
                transaction.id,
                nonce);
        }
        try {
            const txRequest = {
                to: transaction.toAddress,
                value: BigInt(transaction.value),
                data: transaction.data || '0x',
                nonce: nonce
            };
            // logger.info(`[${chainId}] Sending transaction ${transactionId} to ${transaction.toAddress} with value ${transaction.value}`);
            const txResponse = await signer.sendTransaction(txRequest);

            await transactionsRepo.updateTransactionPostSent({
                id: transactionId,
                transactionHash: txResponse.hash,
                status: 'sent',
                submittedAt: new Date(),
                nonce: txResponse.nonce,
            });
            const statusQueueJob = await statusQueue.enqueue(chainId, transactionId)
            if (!statusQueueJob) {
                logger.error(`Failed to enqueue transaction for status polling!`)
            }
            return {
                success: true,
                txHash: txResponse.hash,
                transactionId: transaction.id
            };
        } catch (error) {
            return this.handleFailure(transaction, error, chainId)
        }

    }

    async handleFailure(tx, error, chainId) {
        const { retryable } = classifyError(error);

        const newRetryCount = tx.retryCount + 1;

        if (retryable && newRetryCount <= 3) {
            await transactionsRepo.updateTransactionPostFailure({
                id: tx.id,
                status: 'queued',
                retryCount: newRetryCount,
            });

            await transactionQueue.enqueue(tx.chainId, tx.id, {
                delay: 2000 * newRetryCount,
            });

            logger.warn(`[${chainId}] Retry ${newRetryCount} for tx ${tx.id}`);

            return { retrying: true };
        }
        //failure
        await transactionsRepo.updateTransactionPostFailure({
            id: tx.id,
            status: 'failed',
            retryCount: newRetryCount,
            confirmedAt: new Date(),
        });

        logger.error(`[${chainId}] Tx failed permanently: ${tx.id} - ${error.message}`);
        return { failed: true };
    }

}

export default new TransactionWorker();