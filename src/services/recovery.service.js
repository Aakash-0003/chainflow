import logger from '../config/logger.js';
import * as transactionRepo from '../repositories/transactions.repository.js';

export async function recoverStuckTransactions() {
    const stuck = await transactionRepo.findTransactionByStatus('processing');

    if (stuck.length === 0) {
        logger.info('No stuck transactions found');
        return;
    }

    logger.info(`Recovering ${stuck.length} stuck transactions`);
    for (const tx of stuck) {
        await transactionRepo.updateTransactionStatus(tx.id, 'queued');
    }
}
