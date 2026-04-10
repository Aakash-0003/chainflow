import queueManager from "../queues/queueManager.js";
import { getChain } from "../repositories/chains.repository.js";

class StatusQueue {
    async enqueue(chainId, transactionId) {
        // Use repository — has cache-aside so it falls back to DB if TTL has expired
        const chain = await getChain(chainId);

        if (!chain) {
            throw new Error(`Chain ${chainId} not found`);
        }

        const jobId = await queueManager.enqueueStatus(
            chain.chainId,
            transactionId,
            chain.pollingInterval || 10000
        );
        return jobId;
    }
}
export default new StatusQueue();