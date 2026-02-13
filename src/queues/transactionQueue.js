import queueManager from "./queueManager.js"

class TransactionQueue {
    async enqueue(chainId, transactionId) {
        try {
            const jobId = await queueManager.enqueueTransaction(
                chainId,
                transactionId,
            );

            return jobId;
        } catch (error) {
            console.error('Failed to enqueue transaction:', error);
            throw error;
        }
    }
}

export default new TransactionQueue();