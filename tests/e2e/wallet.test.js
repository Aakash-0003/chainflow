/**
 * Wallet API Tests
 *
 * Covers all wallet endpoints and every validation rule.
 * No real blockchain calls — runs fast in both fast and full mode.
 *
 * State: walletId is resolved from the API inside before() hooks,
 * so this file works whether or not the wallet already exists.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { config } from './config.js';
import { apiRequest, resolveWalletId } from './helpers.js';

// ─── Import Wallet ────────────────────────────────────────────────────────────

describe('POST /v1/wallet/import', () => {

    it('imports wallet — passes whether new (201) or already exists (400)', async () => {
        const { status, data } = await apiRequest('POST', '/v1/wallet/import', {
            name: config.wallet.name,
            publicAddress: config.wallet.publicAddress,
            privateKey: config.wallet.privateKey,
            chainIds: config.chainIds,
        });

        if (status === 201) {
            // Fresh import
            assert.ok(data.success, 'success should be true on new import');
            assert.ok(data.result, 'result should be present on new import');
        } else if (status === 400) {
            // Wallet already exists — service returns 400 with a specific message
            assert.ok(
                data.error?.includes('already exists'),
                `Got 400 but unexpected message: ${JSON.stringify(data)}`
            );
        } else {
            assert.fail(`Unexpected status ${status}: ${JSON.stringify(data)}`);
        }
    });

    it('rejects when required fields are missing', async () => {
        const cases = [
            { name: 'no name',          body: { publicAddress: config.wallet.publicAddress, privateKey: config.wallet.privateKey, chainIds: config.chainIds } },
            { name: 'no publicAddress', body: { name: 'Test', privateKey: config.wallet.privateKey, chainIds: config.chainIds } },
            { name: 'no privateKey',    body: { name: 'Test', publicAddress: config.wallet.publicAddress, chainIds: config.chainIds } },
            { name: 'no chainIds',      body: { name: 'Test', publicAddress: config.wallet.publicAddress, privateKey: config.wallet.privateKey } },
        ];

        for (const { name, body } of cases) {
            const { status } = await apiRequest('POST', '/v1/wallet/import', body);
            assert.equal(status, 400, `Expected 400 for case: ${name}`);
        }
    });

    it('rejects an invalid Ethereum address', async () => {
        const { status } = await apiRequest('POST', '/v1/wallet/import', {
            name: 'Bad Wallet',
            publicAddress: 'not-a-valid-eth-address',
            privateKey: config.wallet.privateKey,
            chainIds: config.chainIds,
        });
        assert.equal(status, 400);
    });

    it('rejects an invalid private key', async () => {
        const { status } = await apiRequest('POST', '/v1/wallet/import', {
            name: 'Bad Wallet',
            publicAddress: config.wallet.publicAddress,
            privateKey: 'notaprivatekey',
            chainIds: config.chainIds,
        });
        assert.equal(status, 400);
    });

    it('rejects chainIds that is not an array', async () => {
        const { status } = await apiRequest('POST', '/v1/wallet/import', {
            name: 'Bad Wallet',
            publicAddress: config.wallet.publicAddress,
            privateKey: config.wallet.privateKey,
            chainIds: config.primaryChainId, // number, not array
        });
        assert.equal(status, 400);
    });

    it('rejects an empty chainIds array', async () => {
        const { status } = await apiRequest('POST', '/v1/wallet/import', {
            name: 'Bad Wallet',
            publicAddress: config.wallet.publicAddress,
            privateKey: config.wallet.privateKey,
            chainIds: [],
        });
        assert.equal(status, 400);
    });

    it('rejects a chain ID that does not exist in the system', async () => {
        const { status } = await apiRequest('POST', '/v1/wallet/import', {
            name: 'Bad Wallet',
            publicAddress: config.wallet.publicAddress,
            privateKey: config.wallet.privateKey,
            chainIds: [999999],
        });
        assert.equal(status, 400);
    });
});

// ─── Get Wallet ───────────────────────────────────────────────────────────────

describe('GET /v1/wallet/:publicAddress', () => {

    it('fetches an existing wallet and returns expected fields', async () => {
        const { status, data } = await apiRequest(
            'GET',
            `/v1/wallet/${config.wallet.publicAddress}`
        );

        assert.equal(status, 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
        assert.ok(data.success, 'success should be true');

        const result = data.result;
        assert.ok(result.walletId, 'walletId must be present');
        assert.ok(result.name, 'name must be present');
        assert.ok(result.publicAddress, 'publicAddress must be present');
        assert.ok(result.status, 'status must be present');
        assert.ok(result.createdAt, 'createdAt must be present');

        // Address comparison is case-insensitive (checksummed vs lowercase)
        assert.equal(
            result.publicAddress.toLowerCase(),
            config.wallet.publicAddress.toLowerCase(),
            'returned address should match requested address'
        );

        // Verify no sensitive data leaks
        assert.equal(result.privateKey, undefined, 'privateKey must never be returned');
        assert.equal(result.encryptedSecret, undefined, 'encrypted key must never be returned');
    });

    it('returns 400 for an invalid address format', async () => {
        const { status } = await apiRequest('GET', '/v1/wallet/not-an-address');
        assert.equal(status, 400);
    });

    it('returns 404 for an address that does not exist', async () => {
        const { status } = await apiRequest(
            'GET',
            '/v1/wallet/0x0000000000000000000000000000000000000001'
        );
        assert.equal(status, 404);
    });
});

// ─── Update Wallet Status ─────────────────────────────────────────────────────

describe('PATCH /v1/wallet/:publicAddress/status', () => {

    it('cycles through paused → active and persists each change', async () => {
        const transitions = ['paused', 'active'];

        for (const newStatus of transitions) {
            const { status, data } = await apiRequest(
                'PATCH',
                `/v1/wallet/${config.wallet.publicAddress}/status`,
                { status: newStatus }
            );

            assert.equal(status, 200, `Expected 200 for status '${newStatus}', got ${status}`);
            assert.equal(
                data.result.status,
                newStatus,
                `Returned status should be '${newStatus}'`
            );
        }
    });

    it('rejects missing status field', async () => {
        const { status } = await apiRequest(
            'PATCH',
            `/v1/wallet/${config.wallet.publicAddress}/status`,
            {}
        );
        assert.equal(status, 400);
    });

    it('rejects an unknown status value', async () => {
        const badValues = ['flying', 'online', 'enabled', 1, true];

        for (const val of badValues) {
            const { status } = await apiRequest(
                'PATCH',
                `/v1/wallet/${config.wallet.publicAddress}/status`,
                { status: val }
            );
            assert.equal(status, 400, `Expected 400 for status value: ${JSON.stringify(val)}`);
        }
    });

    it('rejects an invalid public address in path param', async () => {
        const { status } = await apiRequest(
            'PATCH',
            '/v1/wallet/not-an-address/status',
            { status: 'active' }
        );
        assert.equal(status, 400);
    });

    it('leaves wallet in active state after all tests', async () => {
        const { status, data } = await apiRequest(
            'PATCH',
            `/v1/wallet/${config.wallet.publicAddress}/status`,
            { status: 'active' }
        );
        assert.equal(status, 200);
        assert.equal(data.result.status, 'active');
    });
});

// ─── Enable Chains ────────────────────────────────────────────────────────────

describe('PATCH /v1/wallet/:walletId/chains', () => {
    let walletId;

    before(async () => {
        walletId = await resolveWalletId();
        assert.ok(walletId, 'Could not resolve walletId — ensure wallet exists before running chain tests');
    });

    it('enables chains for the wallet (idempotent with skipDuplicates)', async () => {
        const { status, data } = await apiRequest(
            'PATCH',
            `/v1/wallet/${walletId}/chains`,
            { chainIds: config.chainIds }
        );

        assert.equal(status, 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
        assert.ok(data.success, 'success should be true');
    });

    it('rejects missing chainIds field', async () => {
        const { status } = await apiRequest(
            'PATCH',
            `/v1/wallet/${walletId}/chains`,
            {}
        );
        assert.equal(status, 400);
    });

    it('rejects an empty chainIds array', async () => {
        const { status } = await apiRequest(
            'PATCH',
            `/v1/wallet/${walletId}/chains`,
            { chainIds: [] }
        );
        assert.equal(status, 400);
    });

    it('rejects a non-existent chain ID', async () => {
        const { status } = await apiRequest(
            'PATCH',
            `/v1/wallet/${walletId}/chains`,
            { chainIds: [999999] }
        );
        assert.equal(status, 400);
    });
});
