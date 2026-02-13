# Chainflow

**Distributed transaction flow engine for EVM chains**

Chainflow V1 is a correctness-first Web3 backend infrastructure designed to provide reliable, deterministic blockchain transaction management across multiple chains. Unlike typical blockchain backends that prioritize scalability, Chainflow V1 establishes a solid foundation focused on correctness, safety, and observability.

### Core Capabilities

Chainflow V1 provides the following foundational capabilities:

- **Encrypted Wallet Management**: Securely stores and manages blockchain wallets with encryption at rest
- **Multi-Chain Support**: Enables individual wallets to operate across multiple blockchain networks
- **Asynchronous Transaction Processing**: Accepts transaction requests and processes them reliably in the background
- **Per-Chain Queue Architecture**: Maintains dedicated processing queues for each blockchain network
- **Transaction Lifecycle Tracking**: Monitors and maintains the complete state of each transaction
- **Crash-Safe Recovery**: Automatically recovers from system failures without losing transaction state

---

#### What We Optimize For:

1. **Deterministic Behavior**: Every operation produces predictable, repeatable results
2. **State Correctness**: System state remains accurate and consistent at all times
3. **Clean Layering**: Clear separation of concerns with well-defined layer boundaries
4. **Observability**: Complete visibility into system behavior and transaction states
5. **Infrastructure Clarity**: Simple, understandable architecture that's easy to reason about

#### What We Don't Optimize For (Yet):

- **Scalability**: High-throughput transaction processing (planned for V2)
- **Advanced Nonce Management**: Sophisticated nonce tracking and prediction
- **Transaction Confirmations**: On-chain confirmation monitoring and finality tracking
- **Automatic Retries**: Complex retry logic and failure recovery strategies

This deliberate scoping allows V1 to establish a rock-solid foundation that can be built upon in future versions.

---
## Architecture Overview

![Architecture Diagram](Technical%20documentation/ChainflowHighLevelArchitecture.png)

The system follows a layered architecture to promote separation of concerns and ease of development. Requests flow sequentially through the layers, ensuring that each component handles a specific aspect of the operation. This design prevents tight coupling and allows for independent testing and scaling of individual layers.

High-level flow:
- **Client** → Initiates requests via HTTP.
- **Express API Layer** → Handles incoming requests, validation, and response formatting.
- **Service Layer** → Encapsulates business logic, including validations and transaction preparation.
- **Database (Postgres via Prisma)** → Persists data using an ORM for type-safe interactions.
- **Queue Layer (Bull + Redis)** → Manages job queuing with durability features.
- **Worker Layer** → Executes queued jobs, interacting with blockchain RPCs.
- **Blockchain RPC** → External interface for signing and broadcasting transactions.

This unidirectional flow ensures that errors are propagated appropriately and that the system remains resilient to failures at any layer.

## Sequence Diagrams for flows
### Import wallet flow 
![Import wallet flow Diagram](Technical%20documentation/ImportWallet.png)
### Transaction Submission Flow (API → Queue)
![transaction submission flow Diagram](Technical%20documentation/QueueWorkerTransactionProcessing.png)
### Queue worker Processing Flow
![Queue worker processing flow Diagram](Technical%20documentation/SendTransactionApiFlow.png)
---

## Current Features (v1 – Wallet Foundation)

### Wallet Management

- Private keys are **never stored in plaintext**
- Import EVM wallets securely
- Keys are encrypted using **AES-GCM Encryption algorithm** .
- Decryption happens **only in memory** during transaction signing
- Design allows future migration to **AWS KMS / HSM** without API changes

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

### Execution Engine (v1)

Chainflow V1 includes a deterministic transaction execution engine built on a queue + worker architecture.

#### Per-Chain Queue Architecture

- One **Bull queue per blockchain network**
- `jobId = transactionId` (prevents duplicate execution)
- Redis AOF persistence enabled
- Concurrency = **1 per chain (V1)**

This design ensures:

- Deterministic transaction ordering  
- No nonce conflicts  
- Chain-level isolation  
- Clean execution boundaries  

---

## Crash-Safe Recovery Model

On startup:

- Any transaction in `processing` state is reset to `queued`
- Workers resume execution safely
- Ensures system remains consistent after restart

This allows safe restarts without losing transaction intent.

---

## Design principles:

- PostgreSQL is the **single source of truth**
- Redis is used only for asynchronous execution
- All execution decisions are DB-driven

## Future Vision

Chainflow is designed to evolve incrementally.

### Execution Upgrades

- Nonce Manager (per wallet)
- Advanced Retry Classification
- Failure Reason Tracking
- Confirmation Polling
- Gas Optimization Module

### Feature Expansion

- **Account Abstraction (ERC-4337)** for creating and utilizing Smart wallets
- **Smart Wallet** APIs
- Transaction Scheduler
- Oracle Price Feed Integration for token prices

### Scalability Enhancements

- Concurrency > 1
- Horizontal worker scaling
- Distributed nonce service
- Observability stack (metrics, tracing,monitoring)

📁 Detailed architectural roadmap and upgrade plan are documented in:
[View Technical Documentation](./Technical%20documentation)

### 🔜 Phase 2 — Reliability & Performance

- Wallet-scoped nonce manager
- Retry classification (retryable vs terminal failures)
- Gas handling & optimizations
- Concurrency and workers scaling 

### 🔜 Phase 3 — Advanced Features

- Account abstraction implementation for Smart wallet support
- Scheduled transactions
- Webhooks & event streaming
- Metrics & observability

---

## 🧪 Tech Stack

- **Node.js / Express**
- **PostgreSQL**
- **Prisma ORM**
- **Redis / Bull** (queues)
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
