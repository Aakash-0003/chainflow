import { config } from './config.js';

// ─── Auth ────────────────────────────────────────────────────────────────────

export function authHeader() {
    const creds = Buffer.from(
        `${config.auth.username}:${config.auth.password}`
    ).toString('base64');
    return `Basic ${creds}`;
}

// ─── HTTP ────────────────────────────────────────────────────────────────────

/**
 * Authenticated JSON request.
 * @param {string} method
 * @param {string} path   - e.g. '/v1/wallet/import'
 * @param {object} [body]
 * @param {string} [overrideAuth] - pass a different Authorization header to test auth failures
 * @returns {{ status: number, data: any }}
 */
export async function apiRequest(method, path, body = null, overrideAuth = null) {
    const headers = {
        Authorization: overrideAuth ?? authHeader(),
        'Content-Type': 'application/json',
    };

    const options = { method, headers };
    if (body !== null) options.body = JSON.stringify(body);

    const res = await fetch(`${config.baseUrl}${path}`, options);
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
}

// ─── Polling ─────────────────────────────────────────────────────────────────

/**
 * Polls GET /v1/transaction/:id every intervalMs.
 * Resolves when status reaches 'mined' or 'failed', or when timeout is hit.
 *
 * @param {string} transactionId
 * @returns {{ success: boolean, timedOut?: boolean, data: object }}
 */
export async function pollUntilSettled(transactionId) {
    const { intervalMs, timeoutMs } = config.poll;
    const deadline = Date.now() + timeoutMs;
    let lastStatus = null;

    while (Date.now() < deadline) {
        const { status, data } = await apiRequest(
            'GET',
            `/v1/transaction/${transactionId}`
        );

        if (status === 200 && data) {
            lastStatus = data.status;
            if (data.status === 'mined') return { success: true, data };
            if (data.status === 'failed') return { success: false, data };
        }

        await sleep(intervalMs);
    }

    return {
        success: false,
        timedOut: true,
        data: null,
        lastStatus,
    };
}

/**
 * Fetches walletId for the configured test wallet.
 * Call in before() hooks so multiple describe blocks can share it.
 */
export async function resolveWalletId() {
    const { data } = await apiRequest(
        'GET',
        `/v1/wallet/${config.wallet.publicAddress}`
    );
    return data?.result?.walletId ?? null;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
