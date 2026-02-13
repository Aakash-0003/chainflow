import Bull from "bull";
import { config } from "../config/env.js"
import { chains } from "../config/chains.js"
import logger from "../config/logger.js";

class QueueManager {
    constructor() {
        this.queues = new Map();
        this.initialize();
    }

    initialize() {
        chains.forEach(chain => {
            const queueName = `${chain.chainId}-transactions`;

            const queue = new Bull(queueName, {
                redis: config.redisUrl,
                defaultJobOptions: {
                    removeOnComplete: 100,
                    removeOnFail: 500,
                },
            });

            this.queues.set(chain.chainId, queue);
            logger.info(`Queue initialized: ${queueName}`);
        });
    }

    async enqueueTransaction(chainId, transactionId) {
        const queue = this.queues.get(chainId);

        if (!queue) {
            throw new Error(`Queue not found for chain: ${chainId}`);
        }

        const jobData = {
            transactionId,
            chainId,
            enqueuedAt: new Date().toISOString(),
        };

        const job = await queue.add(jobData, {
            jobId: transactionId,
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