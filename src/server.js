import app from './app.js';
import { config } from './config/env.js';
import logger from './config/logger.js';
import { initializeChainsCache } from './repositories/chains.repository.js';
import workerManager from './workers/workerManager.js';
import queueManager from './queues/queueManager.js';
import { recoverStuckTransactions } from './services/recovery.service.js';

const startServer = async () => {
    if (!config.encryptionKey) {
        throw new Error("ENCRYPTION KEY is missing");
    }

    // Initialize caches
    await initializeChainsCache();
    logger.info('Cache initialization completed');

    // Initialize queues
    queueManager.initialize();

    await recoverStuckTransactions();
    workerManager.initialize();
    app.listen(config.port, () => {
        logger.info(`Server is running on port ${config.port}`);
    });
};

startServer();