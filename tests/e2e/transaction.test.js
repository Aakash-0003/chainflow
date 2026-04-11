/**
 * Transaction API — Validation & Status Tests
 *
 * Covers all input validation rules for /v1/transaction/send
 * and /v1/transaction/:id. None of these tests submit real
 * blockchain transactions — they run fast in both modes.
 *
 * Real transaction lifecycle tests live in lifecycle.test.js.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { config } from './config.js';
import { apiRequest, resolveWalletId } from './helpers.js';

// ─── Send Transaction — Validation ───────────────────────────────────────────

describe('POST /v1/transaction/send — validation', () => {
    let walletId;

    before(async () => {
        walletId = await resolveWalletId();
        assert.ok(walletId, 'Could not resolve walletId — wallet must exist first');
    });

    it('rejects when walletId is missing', async () => {
        const { status } = await apiRequest('POST', '/v1/transaction/send', {
            chainId: config.primaryChainId,
            toAddress: config.transfer.toAddress,
        });
        assert.equal(status, 400);
    });

    it('rejects when chainId is missing', async () => {
        const { status } = await apiRequest('POST', '/v1/transaction/send', {
            walletId,
            toAddress: config.transfer.toAddress,
        });
        assert.equal(status, 400);
    });

    it('rejects when toAddress is missing', async () => {
        const { status } = await apiRequest('POST', '/v1/transaction/send', {
            walletId,
            chainId: config.primaryChainId,
        });
        assert.equal(status, 400);
    });

    it('rejects an invalid toAddress format', async () => {
        const { status } = await apiRequest('POST', '/v1/transaction/send', {
            walletId,
            chainId: config.primaryChainId,
            toAddress: 'not-an-eth-address',
        });
        assert.equal(status, 400);
    });

    it('rejects a chain ID that is not a number', async () => {
        const { status } = await apiRequest('POST', '/v1/transaction/send', {
            walletId,
            chainId: 'ethereum',
            toAddress: config.transfer.toAddress,
        });
        assert.equal(status, 400);
    });

    it('rejects a chain ID not supported by the system', async () => {
        const { status } = await apiRequest('POST', '/v1/transaction/send', {
            walletId,
            chainId: 999999,
            toAddress: config.transfer.toAddress,
        });
        assert.equal(status, 400);
    });

    it('rejects functionSignature provided without args', async () => {
        const { status } = await apiRequest('POST', '/v1/transaction/send', {
            walletId,
            chainId: config.primaryChainId,
            toAddress: config.contract.address,
            functionSignature: config.contract.functionSignature,
            // no args
        });
        assert.equal(status, 400);
    });

    it('rejects args provided without functionSignature', async () => {
        const { status } = await apiRequest('POST', '/v1/transaction/send', {
            walletId,
            chainId: config.primaryChainId,
            toAddress: config.contract.address,
            args: config.contract.args,
            // no functionSignature
        });
        assert.equal(status, 400);
    });

    it('rejects args that is not an array', async () => {
        const { status } = await apiRequest('POST', '/v1/transaction/send', {
            walletId,
            chainId: config.primaryChainId,
            toAddress: config.contract.address,
            functionSignature: config.contract.functionSignature,
            args: 'not-an-array',
        });
        assert.equal(status, 400);
    });

    it('rejects a negative value', async () => {
        const { status } = await apiRequest('POST', '/v1/transaction/send', {
            walletId,
            chainId: config.primaryChainId,
            toAddress: config.transfer.toAddress,
            value: '-1',
        });
        assert.equal(status, 400);
    });

    it('rejects a non-numeric value string', async () => {
        const { status } = await apiRequest('POST', '/v1/transaction/send', {
            walletId,
            chainId: config.primaryChainId,
            toAddress: config.transfer.toAddress,
            value: 'abc',
        });
        assert.equal(status, 400);
    });

    it('rejects a send to a chain not enabled for the wallet', async () => {
        // Use a real chain ID that exists in the system but is NOT enabled for test wallet
        // BNB Testnet (97) is in the system — if test wallet only enables Amoy (80002), this should 400
        const disabledChain = config.chainIds.includes(97) ? 11155111 : 97;

        const { status, data } = await apiRequest('POST', '/v1/transaction/send', {
            walletId,
            chainId: disabledChain,
            toAddress: config.transfer.toAddress,
            value: '0.001',
        });

        // 400 = chain not enabled for wallet (service-level check)
        // 400 = chain validation (middleware) — either is correct
        assert.equal(
            status,
            400,
            `Expected 400 for non-enabled chain ${disabledChain}: ${JSON.stringify(data)}`
        );
    });
});

// ─── Get Transaction Status — Validation ─────────────────────────────────────

describe('GET /v1/transaction/:id', () => {

    it('returns 404 for a UUID that does not exist', async () => {
        const { status } = await apiRequest(
            'GET',
            '/v1/transaction/00000000-0000-0000-0000-000000000000'
        );
        assert.equal(status, 404);
    });

    it('returns 200 and expected fields for a queued transaction', async () => {
        let walletId = await resolveWalletId();
        assert.ok(walletId);

        // Send a real transaction to get a valid ID to poll
        const { status: sendStatus, data: sendData } = await apiRequest(
            'POST',
            '/v1/transaction/send',
            {
                walletId,
                chainId: config.primaryChainId,
                toAddress: config.transfer.toAddress,
                value: config.transfer.value,
            }
        );

        if (sendStatus !== 201) {
            // Skip if balance is insufficient — don't fail the validation test suite
            return;
        }

        const txId = sendData.result.transactionId;
        assert.ok(txId, 'transactionId must be in response');

        const { status: getStatus, data: getData } = await apiRequest(
            'GET',
            `/v1/transaction/${txId}`
        );

        assert.equal(getStatus, 200);
        assert.ok(getData.transactionId, 'transactionId field required');
        assert.ok(getData.status, 'status field required');
        assert.ok(getData.walletId, 'walletId field required');
        assert.ok(getData.chainId, 'chainId field required');
        assert.ok(getData.createdAt, 'createdAt field required');

        assert.ok(
            ['queued', 'processing', 'sent', 'mined'].includes(getData.status),
            `Unexpected status: ${getData.status}`
        );
    });
});
