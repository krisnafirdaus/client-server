# Healthcare CRM System (Tech Lead Test)

## Overview
This project is a Microservices-based CRM system featuring real-time chat, authentication, and a message queue architecture designed for high concurrency (5000+ concurrent chats).

## Architecture (Case 1)
Please refer to `design.md` for the Architecture Diagram.

### High-Level Flow
1.  **Client** connects to **Gateway** (GraphQL) for queries/mutations.
2.  **Client** connects directly to **Chat Service** (WebSocket) for real-time subscriptions.
3.  **Auth Service** handles User/Login (JWT).
4.  **Chat Service** handles real-time messaging using **Redis Pub/Sub** for speed.
5.  **Chat Service** offloads persistence to **Message Queue (BullMQ)** for reliability.
6.  **Worker Service** consumes messages and saves them to **PostgreSQL**.

### Service Ports
| Service | Port | Description |
|---------|------|-------------|
| Gateway | 3000 | GraphQL API (HTTP) |
| Auth Service | 3001 | Authentication |
| Chat Service | 3002 | Chat + WebSocket Subscriptions |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Pub/Sub & Queue |
| Client | 5173 | React Frontend |

---

## Technical Stack

- **Backend**: NestJS, Apollo Server, Apollo Federation
- **Frontend**: React 19, Apollo Client, Tailwind CSS v4
- **Database**: PostgreSQL 15 + Prisma 7.x (with `@prisma/adapter-pg`)
- **Queue**: BullMQ (Redis-based)
- **Real-time**: GraphQL Subscriptions (`graphql-ws`) + Redis Pub/Sub

---

## Setup & Running

### Prerequisites
- Docker & Docker Compose
- Node.js 22+

### Quick Start

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Start all services with Docker**:
   ```bash
   docker compose up -d
   ```

3. **Wait for services to be healthy**, then run database migrations:
   ```bash
   npx prisma db push
   ```

4. **Create initial test data** (required for chat to work):
   ```bash
   docker exec crm_postgres psql -U postgres -d healthcare_crm -c "
   INSERT INTO \"User\" (id, email, password, \"createdAt\", \"updatedAt\")
   VALUES ('user-1', 'test@test.com', 'hashed', NOW(), NOW())
   ON CONFLICT DO NOTHING;

   INSERT INTO \"Room\" (id, name, \"createdAt\", \"updatedAt\")
   VALUES ('room-1', 'General Chat', NOW(), NOW())
   ON CONFLICT DO NOTHING;
   "
   ```

5. **Start the frontend**:
   ```bash
   cd apps/client
   npm install
   npm run dev
   ```

6. **Open browser**: http://localhost:5173

### Restart Services (if needed)
If the gateway fails to start (timing issue with subgraphs):
```bash
docker restart crm_gateway
```

---

## Technical Decisions & Trade-offs (Case 5)

### 1. Why API does not insert directly to DB?
*   **Performance**: Database writes are expensive (I/O). Validating and inserting 5000 messages/sec directly to Postgres would likely saturate the connection pool and slow down the request-response cycle, causing latency for the user.
*   **Peak Traffic Management**: By using a Queue, we "flatten the curve" of traffic bursts. The queue acts as a buffer.
*   **Reliability**: If the DB goes down maintenance, the Queue holds the messages.

### 2. Trade-Off Sync vs Async
*   **Sync (GraphQL)**:
    *   *Pros*: Simple, immediate consistency, easy error handling for client.
    *   *Cons*: Blocking, limited by slowest component (DB), cascades failures.
*   **Async (Queue)**:
    *   *Pros*: High throughput, decoupling, resilience, strictly ordered processing per worker if needed.
    *   *Cons*: Eventual consistency (UI needs to handle "pending" state), complexity in error handling (DLQ), complexity in debugging.

### 3. Why WebSocket connects to Chat Service directly?
Apollo Gateway does not natively support GraphQL Subscriptions. The architecture uses:
- **HTTP (queries/mutations)** → Gateway (port 3000) → Federated subgraphs
- **WebSocket (subscriptions)** → Chat Service directly (port 3002)

### 4. Prisma 7.x Configuration
Prisma 7.x requires explicit database adapter configuration:
```typescript
// libs/db/src/db.service.ts
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
super({ adapter });
```

### 5. Failure Scenarios (What if?)
*   **Message Queue Down**: Critical failure. We can implement a fallback to write directly to DB (Circuit Breaker pattern), or cache locally in Redis if possible, or return 503 to Client to prevent data loss.
*   **Database Latency High**: The Worker will simply process messages slower. The Queue size will grow. The User Experience remains fast (Optimistic UI + PubSub) because the API doesn't wait for the DB.
*   **Consumer Crash**: The Queue (BullMQ) detects the stalled job. When the consumer restarts (or another replica picks it up), the job is retried.

### 6. Ordering Strategy
*   **Timestamping**: We assign `createdAt` at the Gateway/Chat Service level (Ingestion time), not Worker time.
*   **Strict Ordering**: In BullMQ, we can use a single worker for a reliable FIFO, or ensure strictly ordered processing within a partition/concurrency limit. For this project, we rely on `createdAt` sorting at query time as the simplest robust strategy.

### 7. Dead Letter Queue (DLQ)
*   **When?**: After `N` failed attempts (e.g., 5 retries due to connection errors).
*   **Monitoring**: Tools like robust-bull-board or Prometheus alerts.
*   **Action**: Development/Support team investigates the payload. If it's a bug, fix usage. If it's simple data error, ignore. If valid but failed, "retry" the job from DLQ.

### 8. Team Management (Small Team)
*   **Delegate**: UI Component implementation, CRUD modules, Unit Tests.
*   **Keep**: Architecture core, Security/Auth logic, Queue configuration (Reliability critical path), and Database Schema design changes.

---

## Project Structure

```
healthcare-crm/
├── apps/
│   ├── gateway/          # Apollo Gateway (Federation)
│   ├── auth-service/     # Authentication service
│   ├── chat-service/     # Chat + WebSocket subscriptions
│   ├── worker-service/   # Queue consumer (BullMQ)
│   └── client/           # React frontend
├── libs/
│   └── db/               # Shared Prisma database service
├── prisma/
│   └── schema.prisma     # Database schema
├── docker-compose.yml    # All services orchestration
└── .dockerignore         # Excludes node_modules from Docker builds
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | See .env |
| REDIS_HOST | Redis hostname | localhost / redis |
| JWT_SECRET | JWT signing secret | supersecretkey |

---

## Deliverables Checklist
- [x] Case 1: Architecture Diagram (`design.md`)
- [x] Case 2: Chat Module (Queue, Redis, Worker)
- [x] Case 3: UI (React + Apollo + Tailwind v4)
- [x] Case 4: Prisma Schema (`idempotencyKey`, indexes)
- [x] Case 5: README (This file)
