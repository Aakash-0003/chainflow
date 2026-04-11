/**
 * E2E test configuration — all values from environment variables.
 *
 * Local run:
 *   cp .env.test.example .env.test  →  fill values  →
 *   node --env-file=.env.test --test "tests/e2e/**\/*.test.js"
 *
 * Skip blockchain (fast mode, used by pre-push hook):
 *   TEST_SKIP_LIVE=true node --env-file=.env.test --test "tests/e2e/**\/*.test.js"
 */
export const config = {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',

    auth: {
        username: process.env.TEST_AUTH_USERNAME,
        password: process.env.TEST_AUTH_PASSWORD,
    },

    wallet: {
        name: process.env.TEST_WALLET_NAME || 'E2E Test Wallet',
        publicAddress: process.env.TEST_PUBLIC_ADDRESS,
        privateKey: process.env.TEST_PRIVATE_KEY,
    },

    chainIds: JSON.parse(process.env.TEST_CHAIN_IDS || '[80002]'),
    primaryChainId: parseInt(process.env.TEST_PRIMARY_CHAIN_ID || '80002'),

    contract: {
        address: process.env.TEST_CONTRACT_ADDRESS,
        functionSignature: process.env.TEST_FUNCTION_SIGNATURE || 'function set(uint256 _z)',
        args: JSON.parse(process.env.TEST_FUNCTION_ARGS || '[42]'),
    },

    transfer: {
        toAddress: process.env.TEST_TRANSFER_TO,
        value: process.env.TEST_TRANSFER_VALUE || '0.001',
    },

    poll: {
        intervalMs: parseInt(process.env.TEST_POLL_INTERVAL_MS || '8000'),
        timeoutMs: parseInt(process.env.TEST_POLL_TIMEOUT_MS || '180000'),
    },

    // Set TEST_SKIP_LIVE=true to skip real blockchain transactions.
    // Pre-push hook uses this for a fast validation-only run.
    skipLive: process.env.TEST_SKIP_LIVE === 'true',
};
