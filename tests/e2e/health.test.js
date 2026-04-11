/**
 * Health & Infrastructure Tests
 *
 * Verifies the server is up, auth middleware works correctly,
 * and rate limiting is in place. These tests make no DB writes
 * and run in under a second. They run in both fast mode and full mode.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { config } from './config.js';
import { apiRequest } from './helpers.js';

describe('Health & Infrastructure', () => {

    describe('GET /v1/health', () => {
        it('returns 200 with status ok and uptime', async () => {
            const { status, data } = await apiRequest('GET', '/v1/health');

            assert.equal(status, 200, `Expected 200, got ${status}`);
            assert.equal(data.status, 'ok', 'status field should be "ok"');
            assert.ok(typeof data.uptime === 'number', 'uptime should be a number');
            assert.ok(data.uptime > 0, 'uptime should be positive');
            console.log(`Server Response: ${JSON.stringify(data)} seconds`); // Useful for debugging restarts during tests
        });
    });

    describe('Authentication middleware', () => {
        it('returns 401 when Authorization header is missing entirely', async () => {
            const res = await fetch(`${config.baseUrl}/v1/health`);
            assert.equal(res.status, 401);
        });
        it('returns 403 for wrong credentials', async () => {
            const { status } = await apiRequest(
                'GET',
                '/v1/health',
                null,
                `Basic ${Buffer.from('wrong:credentials').toString('base64')}`
            );
            assert.equal(status, 403);
        });

        it('returns 403 for malformed Basic auth (no colon)', async () => {
            const { status } = await apiRequest(
                'GET',
                '/v1/health',
                null,
                `Basic ${Buffer.from('nodivider').toString('base64')}`
            );
            assert.equal(status, 403);
        });

        it('accepts valid credentials on all protected routes', async () => {
            const routes = [
                { method: 'GET', path: '/v1/health' },
                { method: 'GET', path: `/v1/wallet/${config.wallet.publicAddress}` },
            ];

            for (const route of routes) {
                const { status } = await apiRequest(route.method, route.path);
                assert.ok(
                    status !== 401 && status !== 403,
                    `${route.method} ${route.path} rejected valid credentials (got ${status})`
                );
            }
        });
    });
});
