import Bull from "bull";
import { config } from "../config/env.js"
import logger from "../config/logger.js";
import AppError from "../errors/AppError.js"
import cacheService from "../services/cache.service.js"

class QueueManager {
    constructor() {
        this.queues = new Map();
    }

    initialize() {
        // Get chains from cache (initialized during server startup)
        const chains = cacheService.get('chains:all') || [];

        if (chains.length === 0) {
            logger.warn('No chains found in cache during queueManager initialization');
            return;
        }

        chains.forEach(chain => {
            const transactionQueueName = `${chain.chainId}-transactions`;
            const statusQueueName = `${chain.chainId}-status`;

            const transactionQueue = new Bull(transactionQueueName, {
                redis: config.redisUrl,
                defaultJobOptions: {
                    removeOnComplete: 100,
                    removeOnFail: 500,
                },
            });
            const statusQueue = new Bull(statusQueueName, {
                redis: config.redisUrl,
                defaultJobOptions: {
                    removeOnComplete: 100,
                    removeOnFail: 500,
                },
            });

            this.queues.set(chain.chainId, {
                transactionQueue,
                statusQueue,
            });
            logger.info(`Queues initialized: ${transactionQueue.name} | ${statusQueue.name}`);
        });
    }

    async enqueueTransaction(chainId, transactionId, options = {}) {
        const queues = this.queues.get(chainId);

        if (!queues) {
            throw new AppError(`Queues not found for chain: ${chainId}`, 500);
        }

        const jobData = {
            transactionId,
            chainId,
            enqueuedAt: new Date().toISOString(),
        };

        const job = await queues.transactionQueue.add(jobData, {
            jobId: `txn-${transactionId}`,
            delay: options.delay || 0,
        });

        logger.info(`Job enqueued: ${job.id} on ${chainId}`);

        return job.id;
    }

    async enqueueStatus(chainId, transactionId, repeatInterval) {
        const queues = this.queues.get(chainId);

        if (!queues) {
            throw new AppError(`Queues not found for chain: ${chainId}`, 500);
        }

        const jobData = {
            transactionId,
            chainId,
            enqueuedAt: new Date().toISOString(),
        };

        const job = await queues.statusQueue.add(jobData, {
            jobId: `status-${transactionId}`,
            repeat: {
                every: repeatInterval,
                limit: 30,
                endDate: Date.now() + 10 * 60 * 1000 // 10 minutes
            },
        });

        logger.info(`Job enqueued: ${job.id} on ${chainId}`);

        return job.id;
    }

    getQueue(chainId) {
        return this.queues.get(chainId);
    }

    getAllQueues() {
        return this.queues;
    }

}

export default new QueueManager();