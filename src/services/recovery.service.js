import logger from '../config/logger.js';
import * as transactionRepo from '../repositories/transactions.repository.js';
import statusQueue from '../queues/statusQueue.js';
import { walletRepository as walletRepo, chainRepository as chainRepo } from '../repositories/index.js';
import { ethers } from 'ethers';

export async function recoverStuckTransactions() {
    const stuck = await transactionRepo.findTransactionByStatus('processing');

    if (stuck.length === 0) {
        logger.info('No stuck transactions found');
        return;
    }

    logger.info(`Recovering ${stuck.length} stuck transactions`);
    for (const tx of stuck) {
        try {
            if (tx.transactionHash) {
                await transactionRepo.updateTransactionStatus(tx.id, 'sent');
                await statusQueue.enqueue(tx.chainId, tx.id);
                continue;
            }
            if (tx.nonce != null) {
                const chain = await chainRepo.getChain(tx.chainId);
                const provider = new ethers.JsonRpcProvider(chain.rpcUrl);

                const wallet = await walletRepo.getWalletById(tx.walletId);

                const chainNonce = await provider.getTransactionCount(wallet.publicAddress);

                if (chainNonce > tx.nonce) {
                    // tx already executed
                    await transactionRepo.updateTransactionStatus(tx.id, 'sent');
                } else {
                    // safe to retry
                    await transactionRepo.updateTransactionStatus(tx.id, 'queued');
                }

                continue;
            }

            await transactionRepo.updateTransactionStatus(tx.id, 'queued');

        } catch (err) {
            logger.error(`Recovery failed for tx ${tx.id}: ${err.message}`);
        }
    }
}