import { ethers, } from 'ethers';
import { walletRepository as walletRepo, chainRepository as chainRepo, transactionRepository as transactionsRepo } from "../repositories/index.js";
import { decryptPrivateKey } from '../crypto/encryption.js';
import logger from '../config/logger.js';

class TransactionWorker {
    async process(job) {
        const { transactionId, chainId } = job.data;

        logger.info(`[${chainId}]Transaction processing: ${transactionId}`);

        try {
            const transaction = await transactionsRepo.findTransactionById(transactionId);
            if (!transaction) {
                throw new Error(`Transaction not found: ${transactionId}`);
            }

            if (transaction.status !== 'queued') {
                if (transaction.status === 'sent' || transaction.status === 'processing') {
                    return { skipped: true };
                }
                throw new Error(`Invalid transaction status: ${transaction.status}`);
            }

            const updateResult = await transactionsRepo.updateTransactionStatus(transactionId, 'processing');
            if (!updateResult) {
                throw new Error(`Failed to update transaction status to processing for ${transactionId}`);
            }

            const wallet = await walletRepo.getWalletById(transaction.walletId);
            if (!wallet) {
                throw new Error(`Wallet not found: ${transaction.walletId}`);
            }
            if (wallet.status !== 'active') {
                throw new Error(`Wallet is inactive: ${wallet.id}`);
            }

            const privateKey = decryptPrivateKey({
                encryptedSecret: wallet.encryptedSecret,
                iv: wallet.encryptedIv,
                authTag: wallet.encryptionAuth,
            });

            const chain = await chainRepo.getChain(chainId);
            const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
            const signer = new ethers.Wallet(privateKey, provider);
            const txRequest = {
                to: transaction.toAddress,
                value: BigInt(transaction.value),
                data: transaction.data || '0x',
            };
            logger.info(`[${chainId}] Sending transaction ${transactionId} to ${transaction.toAddress} with value ${transaction.value}`);
            const txResponse = await signer.sendTransaction(txRequest);

            await transactionsRepo.updateTransactionPostSent({
                id: transactionId,
                txHash: txResponse.hash,
                status: 'sent',
                submittedAt: new Date(),
                nonce: txResponse.nonce,
            });
            return {
                success: true,
                txHash: txResponse.hash,
                transactionId: transaction.id,
            };
        } catch (error) {
            logger.error(`[${chainId}] Worker error for ${transactionId}:`, error.message);

            try {
                await transactionsRepo.updateTransactionStatus(transactionId, 'failed');
            } catch (error) {
                logger.error(`Failed to mark transaction as failed, ${transactionId}`, error);
            }
            throw error
        }
    }
}

export default new TransactionWorker();