# Chainflow

**Distributed transaction flow engine for EVM chains**

Chainflow is a reliability-focused Web3 backend that securely manages wallets and orchestrates transactions across multiple EVM chains using asynchronous queues, nonce-safe concurrency, and fault-tolerant workers.

This repository currently contains the **foundation and Wallet Management module**.  
Transaction execution, workers, and advanced reliability mechanisms are being added incrementally.

---

## Why Chainflow?

Most blockchain backends fail not because of smart contracts, but because of **poor transaction orchestration**:

- nonce collisions
- unreliable retries
- unsafe key handling
- blocking APIs

Chainflow is designed to solve these problems by treating transaction execution as a **distributed systems problem**, not just a Web3 one.

---

## Core Principles

- **Security-first**: encrypted wallet storage, no plaintext private keys at rest
- **Asynchronous by design**: APIs enqueue work, workers execute it
- **Correctness over speed**: wallet-scoped nonce management and locking
- **Reliability-focused**: retries, state transitions, crash recovery
- **Clean architecture**: clear separation of API, service, queue, and worker layers

---

## Current Features (v1 – Wallet Foundation)

### Wallet Management

- Import EVM wallets securely
- Encrypted private key storage
- Public address derivation
- Wallet lifecycle states (`active`, `paused`, `disabled`)
- Wallet–Chain association via normalized schema

### Database & Infrastructure

- PostgreSQL with Prisma ORM
- Proper relational modeling (wallets, chains, junction tables)
- Seeded multi-chain configuration
- Centralized error handling
- Structured logging

### API Architecture

- Versioned REST APIs
- Layered design (routes → controllers → services → repositories)
- Request validation & middleware pipeline

---

## 🔐 Wallet Security Model

- Private keys are **never stored in plaintext**
- Keys are encrypted at rest using strong symmetric encryption
- Decryption happens **only in memory** during transaction signing
- Design allows future migration to **AWS KMS / HSM** without API changes

---

## 🛣️ Roadmap

### 🔜 Phase 2 — Transaction Execution

- Transaction lifecycle & state machine
- Per-chain queues
- Worker-based execution
- RPC abstraction layer

### 🔜 Phase 3 — Reliability & Performance

- Wallet-scoped nonce manager
- Retry classification (retryable vs terminal failures)
- Gas handling & optimizations
- Concurrency tuning

### 🔜 Phase 4 — Advanced Features

- Scheduled / DCA transactions
- Webhooks & event streaming
- Metrics & observability
- KMS / HSM integration

---

## 🧪 Tech Stack

- **Node.js / Express**
- **PostgreSQL**
- **Prisma ORM**
- **Redis / BullMQ** (queues)
- **Ethers.js**
- **Docker** (local development)

---

## 📌 Status

🚧 **Active development**  
This project is being built incrementally with a focus on correctness, reliability, and clean backend architecture.

---

## Author

Built by a backend engineer focusing on **distributed systems, reliability, and Web3 infrastructure**.

---

> If you’re reviewing this as a recruiter or engineer:  
> the most interesting parts are the **nonce manager, queue design, and failure handling**, which are implemented in later phases.
