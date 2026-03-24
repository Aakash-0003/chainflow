import queueManager from "../queues/queueManager.js";
import { chains } from "../config/chains.js";
class StatusQueue {
    async enqueue(chainId, transactionId) {
        const chain = chains.find(c => c.chainId === chainId);

        const jobId = await queueManager.enqueueStatus(
            chain.chainId,
            transactionId,
            chain.pollingInterval || 10000
        );
        return jobId;
    }
}
export default new StatusQueue();