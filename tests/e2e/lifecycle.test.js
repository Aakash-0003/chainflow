/**
 * End-to-End Lifecycle Tests — LIVE blockchain transactions
 *
 * These tests submit real transactions to a testnet and poll until mined.
 * They prove the full system works: HTTP → DB → Queue → Worker → Blockchain → Status poller.
 *
 * Skipped when TEST_SKIP_LIVE=true (used by pre-push hook for fast runs).
 * Expected runtime: 1–3 minutes depending on testnet congestion.
 *
 * Prerequisites:
 *   - Server running with Redis and Postgres
 *   - Test wallet imported and enabled on the target chain
 *   - Wallet has testnet funds (use a faucet)
 *   - .env.test filled with real values
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { config } from './config.js';
import { apiRequest, pollUntilSettled, resolveWalletId } from './helpers.js';

// Skip entire file when TEST_SKIP_LIVE=true
if (config.skipLive) {
    console.log('\n[lifecycle.test.js] TEST_SKIP_LIVE=true — skipping live blockchain tests\n');
    process.exit(0);
}

// ─── Shared state ─────────────────────────────────────────────────────────────
let walletId;

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('Lifecycle Setup', () => {

    it('resolves walletId from API', async () => {
        walletId = await resolveWalletId();
        assert.ok(
            walletId,
            'walletId could not be resolved — run wallet.test.js first to ensure wallet exists'
        );
    });

    it('ensures test wallet is active before sending transactions', async () => {
        const { status, data } = await apiRequest(
            'PATCH',
            `/v1/wallet/${config.wallet.publicAddress}/status`,
            { status: 'active' }
        );
        assert.equal(status, 200, `Could not set wallet to active: ${JSON.stringify(data)}`);
        assert.equal(data.result.status, 'active');
    });

    it('ensures target chain is enabled for the test wallet', async () => {
        const { status } = await apiRequest(
            'PATCH',
            `/v1/wallet/${walletId}/chains`,
            { chainIds: config.chainIds }
        );
        // 200 = enabled, chains already enabled is also fine (skipDuplicates)
        assert.equal(status, 200, 'Failed to enable chains — chain must be enabled before sending txns');
    });
});

// ─── Native ETH Transfer ──────────────────────────────────────────────────────

describe('Native ETH Transfer — full lifecycle', () => {
    let transactionId;

    it('POST /v1/transaction/send returns 201 with transactionId', async () => {
        const { status, data } = await apiRequest('POST', '/v1/transaction/send', {
            walletId,
            chainId: config.primaryChainId,
            toAddress: config.transfer.toAddress,
            value: config.transfer.value,
        });

        assert.equal(status, 201, `Send failed: ${JSON.stringify(data)}`);
        assert.ok(data.success, 'success should be true');

        const result = data.result;
        assert.ok(result.transactionId, 'transactionId required');
        assert.equal(result.status, 'queued', 'initial status should be queued');
        assert.equal(result.walletId, walletId, 'walletId should match');
        assert.equal(result.chainId, config.primaryChainId, 'chainId should match');

        transactionId = result.transactionId;
        console.log(`      Native transfer queued: ${transactionId}`);
    });

    it('GET /v1/transaction/:id returns queued or later status immediately', async () => {
        assert.ok(transactionId, 'transactionId not set — previous test may have failed');

        const { status, data } = await apiRequest('GET', `/v1/transaction/${transactionId}`);

        assert.equal(status, 200);
        assert.ok(
            ['queued', 'processing', 'sent', 'mined'].includes(data.status),
            `Unexpected immediate status: ${data.status}`
        );
    });

    it('transaction mines on-chain within timeout', { timeout: 200000 }, async () => {
        assert.ok(transactionId, 'transactionId not set — previous test may have failed');

        console.log(`      Polling ${transactionId} (up to ${config.poll.timeoutMs / 1000}s)...`);

        const result = await pollUntilSettled(transactionId);

        assert.ok(
            !result.timedOut,
            `Transaction did not settle within ${config.poll.timeoutMs / 1000}s. Last status: ${result.lastStatus}`
        );
        assert.ok(
            result.success,
            `Transaction failed on-chain. Response: ${JSON.stringify(result.data)}`
        );

        const tx = result.data;
        assert.ok(tx.transactionHash, 'mined tx must have a transaction hash');
        assert.equal(tx.status, 'mined', 'final status must be mined');

        console.log(`      Mined — hash: ${tx.transactionHash}`);
    });

    it('final GET /v1/transaction/:id reflects mined status and hash', async () => {
        assert.ok(transactionId);

        const { status, data } = await apiRequest('GET', `/v1/transaction/${transactionId}`);

        assert.equal(status, 200);
        assert.equal(data.status, 'mined');
        assert.ok(data.transactionHash, 'transactionHash must be present when mined');
    });
});

// ─── Contract Interaction ─────────────────────────────────────────────────────

describe('Contract Interaction — full lifecycle', () => {
    let transactionId;

    it('POST /v1/transaction/send returns 201 for contract call', async () => {
        const { status, data } = await apiRequest('POST', '/v1/transaction/send', {
            walletId,
            chainId: config.primaryChainId,
            toAddress: config.contract.address,
            functionSignature: config.contract.functionSignature,
            args: config.contract.args,
        });

        assert.equal(status, 201, `Contract tx send failed: ${JSON.stringify(data)}`);
        assert.ok(data.success);

        const result = data.result;
        assert.ok(result.transactionId, 'transactionId required');
        assert.equal(result.status, 'queued');

        transactionId = result.transactionId;
        console.log(`      Contract tx queued: ${transactionId}`);
    });

    it('transaction mines on-chain within timeout', { timeout: 200000 }, async () => {
        assert.ok(transactionId, 'transactionId not set — previous test may have failed');

        console.log(`      Polling ${transactionId} (up to ${config.poll.timeoutMs / 1000}s)...`);

        const result = await pollUntilSettled(transactionId);

        assert.ok(
            !result.timedOut,
            `Contract tx did not settle within ${config.poll.timeoutMs / 1000}s. Last status: ${result.lastStatus}`
        );
        assert.ok(
            result.success,
            `Contract tx failed on-chain: ${JSON.stringify(result.data)}`
        );

        const tx = result.data;
        assert.ok(tx.transactionHash, 'mined tx must have a hash');
        assert.equal(tx.status, 'mined');

        console.log(`      Mined — hash: ${tx.transactionHash}`);
    });
});

// ─── Concurrent Transactions ──────────────────────────────────────────────────

describe('Concurrent transactions — same wallet, same chain', () => {
    const txIds = [];

    it('sends 3 transactions concurrently and all get queued', async () => {
        const sends = Array.from({ length: 3 }, () =>
            apiRequest('POST', '/v1/transaction/send', {
                walletId,
                chainId: config.primaryChainId,
                toAddress: config.transfer.toAddress,
                value: config.transfer.value,
            })
        );

        const results = await Promise.all(sends);

        for (const { status, data } of results) {
            assert.equal(status, 201, `Concurrent send failed: ${JSON.stringify(data)}`);
            txIds.push(data.result.transactionId);
        }

        assert.equal(txIds.length, 3, 'All 3 transactions should be queued');
        // All IDs must be unique
        assert.equal(new Set(txIds).size, 3, 'Each transaction must have a unique ID');
        console.log(`      3 concurrent txns queued: ${txIds.join(', ')}`);
    });

    it('all 3 transactions eventually mine', { timeout: 300000 }, async () => {
        assert.ok(txIds.length === 3, 'No transaction IDs from previous test');

        console.log(`      Polling 3 concurrent txns...`);

        const results = await Promise.all(txIds.map(pollUntilSettled));

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            assert.ok(
                !result.timedOut,
                `Tx ${txIds[i]} timed out. Last status: ${result.lastStatus}`
            );
            assert.ok(
                result.success,
                `Tx ${txIds[i]} failed on-chain: ${JSON.stringify(result.data)}`
            );
            console.log(`      Tx ${i + 1} mined — hash: ${result.data.transactionHash}`);
        }
    });
});

// ─── Paused Wallet ────────────────────────────────────────────────────────────

describe('Paused wallet — transactions should be rejected by worker', () => {
    let txId;

    before(async () => {
        // Pause the wallet
        await apiRequest(
            'PATCH',
            `/v1/wallet/${config.wallet.publicAddress}/status`,
            { status: 'paused' }
        );
    });

    it('send to a paused wallet still queues (service does not check status)', async () => {
        // The status check happens in the worker, not the service.
        // So /send returns 201 but the worker marks it failed.
        const { status, data } = await apiRequest('POST', '/v1/transaction/send', {
            walletId,
            chainId: config.primaryChainId,
            toAddress: config.transfer.toAddress,
            value: config.transfer.value,
        });

        // Either 201 (queued) or 400 (if service-level check added later)
        if (status === 201) {
            txId = data.result.transactionId;
            console.log(`      Paused wallet tx queued: ${txId} (expect worker to fail it)`);
        } else {
            assert.equal(status, 400, `Expected 201 or 400 for paused wallet, got ${status}`);
        }
    });

    it('re-activates wallet after paused wallet test', async () => {
        const { status } = await apiRequest(
            'PATCH',
            `/v1/wallet/${config.wallet.publicAddress}/status`,
            { status: 'active' }
        );
        assert.equal(status, 200, 'Failed to re-activate wallet after paused test');
    });
});
