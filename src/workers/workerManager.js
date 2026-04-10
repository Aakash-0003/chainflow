import transactionWorker from './transactionWorker.js';
import statusWorker from './statusWorker.js';
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
        const queues = queueManager.getQueue(chainId);
        if (!queues) {
            logger.error(`Queue not found for chain: ${chainId}`);
            return;
        }
        const { transactionQueue, statusQueue } = queues;
        if (this.workers.has(chainId)) return;

        const concurrency = this.getConcurrency(chainId);

        transactionQueue.process(concurrency, async (job) => {
            logger.info(`Transaction Worker for ${chainId} started processing job ${job.id}`);
            const result = await transactionWorker.process(job);
            return result;
        });

        statusQueue.process(3, async (job) => {
            logger.info(`Status Worker for ${chainId} started processing job ${job.id}`);
            await statusWorker.process(job);
        });

        this.setupEventListeners(transactionQueue, chainId);
        this.setupEventListeners(statusQueue, chainId);

        this.workers.set(chainId, {
            transactionQueue,
            statusQueue,
            concurrency,
            startedAt: new Date(),
        });

        logger.info(`Workers started for ${chainId} (concurrency: ${concurrency})`);
    }

    getConcurrency() {
        const concurrency = 1;
        return concurrency;
    }

    setupEventListeners(queue, chainId) {
        queue.on('completed', (job) => {
            logger.info(`[Queue-${chainId}] Job ${job.id} completed`);
        });

        queue.on('failed', (job, err) => {
            logger.error(`[Queue-${chainId}] Job ${job.id} failed - Error: ${err.message}`);
        });

        queue.on('error', (error) => {
            logger.error(`[Queue-${chainId}] Queue error: ${error?.message || error}`);
        });
    }

}

export default new WorkerManager();

