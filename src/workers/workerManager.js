import transactionWorker from './transactionWorker.js';
import queueManager from '../queues/queueManager.js';
import logger from '../config/logger.js';

class WorkerManager {
    constructor() {
        this.workers = new Map();
    }

    initialize() {
        logger.info('Initializing workers...');

        queueManager.getAllQueues().forEach((queue, chainId) => {
            this.startWorker(chainId);
        });
    }

    startWorker(chainId) {
        if (this.workers.has(chainId)) return;

        const queue = queueManager.getQueue(chainId);
        if (!queue) {
            logger.error(`Queue not found for chain: ${chainId}`);
            return;
        }

        const concurrency = this.getConcurrency(chainId);

        queue.process(concurrency, async (job) => {
            logger.info(`Worker for ${chainId} started processing job ${job.id}`);
            const result = await transactionWorker.process(job);
            return result;
        });

        this.setupEventListeners(queue, chainId);

        this.workers.set(chainId, {
            queue,
            concurrency,
            startedAt: new Date(),
        });

        logger.info(`Worker started for ${chainId} (concurrency: ${concurrency})`);
    }

    getConcurrency() {
        const concurrency = 1;
        return concurrency;
    }

    setupEventListeners(queue, chainId) {
        queue.on('completed', (job, result) => {
            logger.info(`[Queue-${chainId}] Job ${job.id} completed:  Transaction hash: ${result.txHash}`);
        });

        queue.on('failed', (job, err) => {
            logger.error(`[Queue-${chainId}] Job ${job.id} failed - Error: ${err.message}`);
        });

        queue.on('error', (error) => {
            logger.error(`[Queue-${chainId}] Queue error:`, error.message);

        });
    }

}

export default new WorkerManager();

