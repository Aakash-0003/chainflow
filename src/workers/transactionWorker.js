import { ethers, } from 'ethers';
import * as walletRepo from "../repositories/wallet.repository.js";
import * as chainRepo from "../repositories/chains.repository.js";
import * as transactionsRepo from '../repositories/transactions.repository.js';
import { decryptPrivateKey } from '../crypto/encryption.js';
import logger from '../config/logger.js';
import AppError from "../errors/AppError.js"

class TransactionWorker {
    async process(job) {
        const { transactionId, chainId } = job.data;

        logger.info(`[${chainId}]Transaction processing: ${transactionId}`);

        try {
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

            const updateResult = await transactionsRepo.updateTransactionStatus(transactionId, 'processing');
            if (!updateResult) {
                throw new AppError(`Failed to update transaction status to processing for ${transactionId}`, 500);
            }

            const wallet = await walletRepo.getWalletById(transaction.wallet_id);
            if (!wallet) {
                if (!wallet) {
                    throw new AppError('Wallet not found', 404);
                }
            }
            if (!wallet.isActive) {
                throw new AppError('Wallet is inactive', 403);
            }

            const privateKey = decryptPrivateKey({
                encryptedSecret: wallet.encrypted_secret,
                iv: wallet.encrypted_iv,
                authTag: wallet.encryption_auth,
            });
            if (!privateKey) {
                throw new AppError('Failed to decrypt wallet', 500, false);
            }
            try {
                const chain = await chainRepo.getChain(chainId);
                const provider = new ethers.JsonRpcProvider(chain.rpc_url);
                const signer = new ethers.Wallet(privateKey, provider);
                const txRequest = {
                    to: transaction.to_address,
                    value: BigInt(transaction.value),
                    data: transaction.data || '0x',
                };
                logger.info(`[${chainId}] Sending transaction ${transactionId} to ${transaction.to_address} with value ${transaction.value}`);
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
                // Blockchain errors
                if (error.message.includes('insufficient funds')) {
                    throw new AppError('Insufficient funds', 400);
                }

                if (error.message.includes('nonce too low')) {
                    throw new AppError('Nonce conflict', 409);
                }

                throw new AppError(
                    'Failed to send transaction',
                    503,
                    true,
                    { originalError: error.message }
                );
            }
        }
        catch (error) {
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