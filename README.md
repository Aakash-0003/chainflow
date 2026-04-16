# Chainflow

**Multi-chain EVM transaction execution infrastructure for Web3 backends**

Chainflow is a self-hosted execution engine that manages the full lifecycle of blockchain transactions across multiple EVM networks — from secure key management and async queuing, to signing, broadcasting, retry-on-failure, and on-chain confirmation. It supports native token transfers, ERC-20/ERC-721 operations, and arbitrary smart contract interactions through a single REST API.

---

## The Problem

Any backend system that touches a blockchain eventually runs into the same set of hard infrastructure problems:

- **Nonce management** — silent killer at scale. A single mismatched nonce stalls all future transactions from that wallet. Most teams discover this in production.
- **Unreliable RPCs** — nodes time out, rate-limit, and return stale state. Naive retry logic double-sends or drops transactions entirely.
- **No confirmation guarantee** — a transaction being *sent* is not the same as it being *confirmed*. Your system needs to know the difference.
- **Private key exposure** — embedding signing logic inside application code means keys live in app memory, get logged, or end up in error traces.
- **Crash safety** — if your server restarts mid-transaction, what happens? Most systems have no answer.
- **Multi-chain complexity** — every chain you add multiplies all of the above.

Teams building DeFi protocols, NFT platforms, GameFi backends, DAO tooling, or any on-chain automation face these problems from day one. The usual outcome is either a fragile hand-rolled solution or skipping reliability entirely and getting burned in production.

---

## What Chainflow Is

Chainflow is a self-hosted transaction execution layer — the infrastructure piece between your application and EVM blockchains that handles everything your app shouldn't have to think about.

Your backend submits a transaction via a single REST call. Chainflow takes it from there: validates the wallet and chain, checks balance, queues the job, signs and broadcasts, retries on transient failure, polls for on-chain confirmation, and tracks the full lifecycle in a persistent store.

> Think of it like a job queue, but purpose-built for blockchain transactions — with the signing, nonce management, retry logic, and confirmation tracking baked in.

**Any backend system that needs to execute on-chain operations can offload that entire layer to Chainflow:**

| Use Case | What They Need Chainflow For |
|---|---|
| DeFi protocol | Automated rebalancing, fee collection, liquidations |
| NFT platform | Batch minting, royalty distribution, ownership transfers |
| GameFi backend | In-game item minting, reward distribution, on-chain state updates |
| DAO tooling | Treasury operations, automated proposal execution |
| On-chain payment system | Triggered or recurring EVM payments |
| Bridge / relayer | Reliable cross-chain transaction submission |
| Any Web3 backend | Replace inline `ethers.js` calls with a durable, observable execution layer |

---

## Architecture

![Architecture Diagram](Technical%20documentation/ChainflowHighLevelArchitecture.png)

Built in strict, isolated layers — each with a single responsibility, communicating only with the layer directly below it.

```
Client
  → REST API (Express)         — auth, rate limiting, validation
  → Cache Layer (In-Memory)    — chain configs & wallet-chain lookups, TTL-based
  → Service Layer              — business logic, balance checks, calldata construction
  → Repository Layer           — all DB access via Prisma ORM
  → Queue Layer (Bull + Redis) — durable, per-chain job queues
  → Worker Layer               — nonce fetch, sign, broadcast, retry logic
  → Status Worker              — confirmation polling, mined/failed state transitions
  → Blockchain RPC (ethers.js) — external chain interaction
```

**Core design decisions:**

- **PostgreSQL is the source of truth** — Redis is exclusively a job queue, never used for state storage
- **One queue per chain** — complete chain-level isolation, no cross-chain interference
- **Concurrency = 1 per chain** — deterministic nonce ordering by design, not by luck
- **jobId = transactionId** — idempotent execution, submitting the same job twice is a safe no-op
- **Nonce stored in DB after fetch** — retries reuse the same nonce slot, no double-fetch, no gaps

---

## Sequence Diagrams

### Import Wallet
![Import Wallet](Technical%20documentation/ImportWallet.png)

### Transaction Submission (API → Queue)
![Transaction Submission](Technical%20documentation/SendTransactionApiFlow.png)

### Worker Processing (Queue → Chain)
![Queue Worker](Technical%20documentation/QueueWorkerTransactionProcessing.png)

---

## What's Built in V1

### Encrypted Wallet Management
- Import EVM wallets with private key encryption at rest (**AES-256-GCM**)
- Private keys decrypted **only in memory** at signing time — never logged, never persisted in plaintext
- Encryption layer is abstracted behind an interface — can be swapped to AWS KMS or an HSM without touching the API
- Per-wallet chain enablement — wallets only transact on chains they've been explicitly enabled for

### Transaction Execution Engine
- Submit via REST, get a `transactionId` back immediately — your backend never blocks on chain latency
- Worker fetches nonce just-in-time, stores it in the DB, signs and broadcasts
- On retry, the stored nonce is reused — same slot, no gap, no conflict

### Retry & Failure Classification
Failures are classified before deciding whether to retry — not everything should be retried:

| Error Type | Retryable | Behavior |
|---|---|---|
| RPC timeout / network error | Yes | Retry up to 3x, exponential backoff (`2s × retryCount`) |
| Insufficient funds | No | Mark `failed` immediately |
| Nonce conflict | No | Mark `failed` immediately |
| Unknown | Yes | Retry up to 3x, then mark `failed` |

### Confirmation Polling
- After broadcast, a repeating status job polls `getTransactionReceipt` at a per-chain interval
- On success: marks `mined`, records `blockNumber` and `confirmedAt`
- On revert: marks `failed`, records `confirmedAt`
- Job removes itself on terminal state — no orphan polling jobs

### Crash-Safe Recovery
On every startup, the recovery service scans for transactions stuck in `processing` and requeues them. No manual intervention, no lost transactions — the system self-heals after a crash or restart.

### In-Memory Caching
A lightweight singleton cache sits between the validation layer and the database:
- **Chain configs** — cached 1 hour. Serves chain ID validation, queue init, and RPC URL lookups without hitting DB
- **Wallet-chain associations** — cached 30 minutes. Verifies wallet-chain enablement pre-enqueue
- TTL-based auto-expiry, falls back to DB on miss
- Completely separate from Redis — Redis is only the job queue

### Middleware Pipeline
Every request passes through the full pipeline before touching business logic:
- **Basic Auth** — all routes protected
- **Rate Limiting** — per-IP throttling
- **Request ID** — unique ID injected and propagated through every log line
- **Input Validation** — address format, chain existence, field presence — rejected before reaching services
- **HTTP Logger** — structured request/response logging
- **Centralized Error Handler** — consistent `{ success, error }` response shape across the entire API

---

## Getting Started

### Option 1 — Docker (recommended, zero dependencies)

```bash
git clone <repo>
cd chainflow

cp .env.docker.example .env.docker
# Set: AUTH_USERNAME, AUTH_PASSWORD, ENCRYPTION_KEY (32-byte hex)
# DB and Redis are pre-wired to Docker service names — nothing else to change

docker compose up --build
```

Server starts at `http://localhost:3000`. Postgres, Redis, schema push, and chain seeding all happen automatically.

### Option 2 — Local

Requires: Node.js 20+, PostgreSQL, Redis

```bash
git clone <repo>
cd chainflow

cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, AUTH_USERNAME, AUTH_PASSWORD, ENCRYPTION_KEY

npm install
npx prisma db push
node prisma/seed.js
npm run dev
```

---

## API

All endpoints require Basic Auth (`Authorization: Basic <base64(username:password)>`).

| Method | Endpoint | Description |
|---|---|---|
| GET | `/v1/health` | Health check |
| POST | `/v1/wallet/import` | Import a wallet — encrypts and stores the private key |
| GET | `/v1/wallet/:address` | Get wallet metadata |
| PATCH | `/v1/wallet/:address/status` | Set wallet status (`active` / `paused` / `disabled`) |
| PATCH | `/v1/wallet/:walletId/chains` | Enable additional chains for a wallet |
| POST | `/v1/transaction/send` | Submit a transaction (transfer or contract call) |
| GET | `/v1/transaction/:id` | Poll transaction status and lifecycle details |

Full request/response documentation: [Technical Documentation](./Technical%20documentation/Chainflow%20V1%20Documentation.md)

---

## Transaction Lifecycle

```
queued → processing → sent → mined        (happy path)
                           ↓
                       failed              (on-chain revert)

processing → queued                        (retry, up to 3x)
processing → failed                        (permanent error or retries exhausted)
processing → queued  [on startup]          (crash recovery)
```

---

## Running Tests

Tests are end-to-end — they run against a live server with a real database and (optionally) real blockchain transactions.

```bash
cp .env.test.example .env.test
# Fill in test wallet credentials, chain IDs, and contract addresses

npm run test:fast     # validation suite — no blockchain required (~seconds)
npm test              # full suite including live on-chain transactions
```

CI runs on every PR via GitHub Actions — spins up fresh Postgres and Redis containers, pushes schema, seeds chains, starts the app, and runs the full validation suite automatically.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20, ES Modules |
| Framework | Express 5 |
| Database | PostgreSQL + Prisma ORM |
| Queue | Bull + Redis |
| Blockchain | ethers.js v6 |
| Encryption | AES-256-GCM (Node.js crypto) |
| Caching | In-memory (Node.js Map, TTL-based) |
| Logging | Winston + Daily Rotate |
| Testing | Node.js built-in test runner (E2E) |
| CI/CD | GitHub Actions |
| Containerization | Docker + Docker Compose |

---

## Roadmap

### V2 — Scale
- Wallet-scoped nonce manager with in-memory tracking for parallel execution
- Concurrency > 1 per chain with nonce-safe ordering
- Advanced gas estimation and EIP-1559 fee strategies
- Horizontal worker scaling

### V3 — Platform
- Webhook callbacks on transaction state changes
- Scheduled and recurring transactions
- Account abstraction (ERC-4337) support
- Metrics, tracing, and observability stack

---

## Documentation

Full architectural documentation including layer breakdowns, API reference, sequence diagrams, and reliability guarantees:
[Technical Documentation →](./Technical%20documentation/Chainflow%20V1%20Documentation.md)

---

*Built with a focus on correctness, distributed systems reliability, and Web3 infrastructure. V1 is intentionally scoped — solve the hard problems well before adding scale.*
