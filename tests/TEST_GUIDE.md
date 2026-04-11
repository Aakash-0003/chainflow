# Chainflow — Test Suite Guide

## How to run

```bash
# Copy config and fill in your real values
cp .env.test.example .env.test

# Full suite — includes real blockchain transactions (2–5 min)
npm test

# Fast mode — validation only, no blockchain (used by pre-push hook)
npm run test:fast

# Individual files
npm run test:health
npm run test:wallet
npm run test:transaction
npm run test:lifecycle
```

---

## Test files overview

| File | Blockchain? | Speed | Purpose |
|---|---|---|---|
| `health.test.js` | No | ~1s | Server up, auth middleware |
| `wallet.test.js` | No | ~2s | All wallet API paths + validation |
| `transaction.test.js` | No (1 optional) | ~3s | Tx validation + status fields |
| `lifecycle.test.js` | **Yes** | 2–5 min | Full E2E: send → queue → mine |

---

## All test scenarios

### `health.test.js` — Infrastructure

**GET /v1/health**
- [ ] Returns 200 with `{ status: 'ok', uptime: <number> }`
- [ ] `uptime` is a positive number

**Authentication middleware**
- [ ] Returns 401 when Authorization header is missing entirely
- [ ] Returns 403 for wrong username/password
- [ ] Returns 403 for malformed Basic auth (no colon separator)
- [ ] Valid credentials accepted on all protected routes

---

### `wallet.test.js` — Wallet API

**POST /v1/wallet/import**
- [ ] New wallet: returns 201 with `success: true` and `result`
- [ ] Existing wallet: returns 400 with "already exists" message (idempotent test)
- [ ] Missing `name` → 400
- [ ] Missing `publicAddress` → 400
- [ ] Missing `privateKey` → 400
- [ ] Missing `chainIds` → 400
- [ ] Invalid Ethereum address format → 400
- [ ] Invalid private key format → 400
- [ ] `chainIds` is a number instead of array → 400
- [ ] Empty `chainIds` array → 400
- [ ] Chain ID that doesn't exist in the system → 400

**GET /v1/wallet/:publicAddress**
- [ ] Returns 200 with all expected fields (`walletId`, `name`, `publicAddress`, `status`, `createdAt`)
- [ ] Address comparison is case-insensitive
- [ ] `privateKey` and `encryptedSecret` are never present in response (no leaks)
- [ ] Invalid address format → 400
- [ ] Address not in DB → 404

**PATCH /v1/wallet/:publicAddress/status**
- [ ] Updates status to `paused` and persists it
- [ ] Updates status back to `active` and persists it
- [ ] Missing `status` field in body → 400
- [ ] Unknown status value (`"flying"`, `"online"`, `1`, `true`) → 400
- [ ] Invalid address in path param → 400
- [ ] Wallet left in `active` state after tests (cleanup)

**PATCH /v1/wallet/:walletId/chains**
- [ ] Enables chains for wallet (201 or 200, idempotent with `skipDuplicates`)
- [ ] Missing `chainIds` field → 400
- [ ] Empty `chainIds` array → 400
- [ ] Non-existent chain ID → 400

---

### `transaction.test.js` — Transaction Validation & Status

**POST /v1/transaction/send — validation (no blockchain)**
- [ ] Missing `walletId` → 400
- [ ] Missing `chainId` → 400
- [ ] Missing `toAddress` → 400
- [ ] Invalid `toAddress` format → 400
- [ ] `chainId` is a string instead of number → 400
- [ ] Chain ID not supported by the system → 400
- [ ] `functionSignature` provided without `args` → 400
- [ ] `args` provided without `functionSignature` → 400
- [ ] `args` is a string instead of array → 400
- [ ] Negative `value` → 400
- [ ] Non-numeric `value` string → 400
- [ ] Chain not enabled for wallet → 400

**GET /v1/transaction/:id**
- [ ] Non-existent transaction UUID → 404
- [ ] Newly queued transaction returns 200 with all required fields (`transactionId`, `status`, `walletId`, `chainId`, `createdAt`)
- [ ] Immediate status is one of `queued`, `processing`, `sent`, `mined`

---

### `lifecycle.test.js` — Live Blockchain Tests *(requires testnet funds)*

**Setup**
- [ ] `walletId` resolved from API
- [ ] Wallet set to `active` before tests
- [ ] Target chain enabled for wallet

**Native ETH Transfer — full lifecycle**
- [ ] POST returns 201 with `transactionId`, `status: 'queued'`, correct `walletId` and `chainId`
- [ ] Immediate GET returns one of `queued`, `processing`, `sent`, `mined`
- [ ] Transaction mines on-chain within timeout (180s default)
- [ ] Final GET shows `status: 'mined'` with a `transactionHash`

**Contract Interaction — full lifecycle**
- [ ] POST returns 201 for a contract function call with `functionSignature` + `args`
- [ ] Transaction mines on-chain within timeout
- [ ] Final `transactionHash` is present when mined

**Concurrent transactions — 3 at once**
- [ ] 3 concurrent POSTs all return 201 with unique `transactionId` values
- [ ] All 3 transactions mine successfully (nonce management handled correctly)

**Paused wallet behaviour**
- [ ] POST to paused wallet returns 201 (queueing happens at service level)
- [ ] Worker marks it failed because wallet is inactive (checked inside worker)
- [ ] Wallet re-activated after test (cleanup)

---

## Adding new test cases

1. Open the relevant test file
2. Add a new `it('describes what it tests', async () => { ... })` block inside the appropriate `describe`
3. Use `apiRequest()` from `helpers.js` for API calls
4. Use `assert.equal(actual, expected, 'optional message')` to verify the result
5. For blockchain tests that take time, add `{ timeout: 200000 }` as the second argument to `it()`

Example:
```js
it('my new test case', async () => {
    const { status, data } = await apiRequest('GET', '/v1/some-endpoint');
    assert.equal(status, 200);
    assert.ok(data.someField, 'someField should be present');
});
```
