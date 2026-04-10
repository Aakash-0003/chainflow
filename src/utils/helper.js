export function classifyError(error) {
    const msg = error.message.toLowerCase();

    if (msg.includes("timeout") || msg.includes("network")) {
        return { retryable: true, type: "RPC_ERROR" };
    }

    if (msg.includes("insufficient funds")) {
        return { retryable: false, type: "INSUFFICIENT_FUNDS" };
    }

    if (msg.includes("nonce too low")) {
        return { retryable: false, type: "NONCE_CONFLICT" };
    }

    return { retryable: true, type: "UNKNOWN" };
}