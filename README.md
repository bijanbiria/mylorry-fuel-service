# MyLorry Fuel Service

A NestJS service that ingests petrol station webhooks and records card-based fuel transactions.  
It enforces **balance checks, card spending limits, and idempotency**, with results returned in a standardized response envelope.  
The service uses **PostgreSQL (TimescaleDB extension optional)** for persistence and **Redis** for caching (future).

---

## Stack

- **NestJS** + TypeScript (modular, DTO-driven, class-validator)
- **TypeORM** with PostgreSQL
- **Redis** (cache layer, optional/future use)
- **OpenAPI 3** with **Scalar UI** for API documentation
- **Docker + Traefik** for deployment
- **GitHub Actions** for CI/CD pipeline

---

## Architecture & Design

- **Hexagonal / Modular structure**:
  - `webhooks` (ingestion, idempotency)
  - `transactions` (domain service, validation, persistence)
  - `cards`, `organizations`, `usage` (entities and rules)
  - `infra` (database, config)
- **Controllers** handle HTTP requests and wrap all responses in `{ data, message, error }`.
- **Services** encapsulate business logic and transaction handling.
- **Entities + Repositories** managed via TypeORM with migrations.
- **Validation** with DTOs and `class-validator`.
- **Database**: TimescaleDB hypertables for large `fuel_transactions`, enforcing daily/monthly buckets.
- **CI/CD**: GitHub Actions builds, tests, pushes image to GHCR, deploys via SSH to server with Traefik.

---

## Business Rules

1. Organization balance must cover the transaction.
2. Daily and monthly card spending limits must not be exceeded.
3. Blocked cards cannot transact.
4. Currency of transaction must match organization’s currency.
5. Transactions are atomic: balance, buckets, and transaction insert all succeed or all rollback.
6. Validation failures result in **422 Unprocessable Entity**.
7. Duplicate requests are rejected with **409 Conflict** using `x-idempotency-key`.

---

## API

- **Global prefix:** `/api/v1`
- **Docs:** JSON at `/openapi.json` and Scalar UI at `/docs`.

### POST `/api/v1/webhooks/transactions`

- **Headers:**  
  `x-idempotency-key` (optional; deduplicates per station)

- **Body (IncomingTransactionDto):**
  ```json
  {
    "stationCode": "STN-001",
    "cardNumber": "4242424242424242",
    "amountCents": "10000",
    "currency": "USD",
    "occurredAt": "2025-09-03T10:00:00Z",
    "externalRef": "RRN-123"
  }
  ```

- **Response Envelope:**
  ```json
  { "data": { "status": "approved", "transactionId": "uuid" }, "message": "Approved", "error": null }
  ```

- **Example Error (limit exceeded):**
  ```json
  { "data": null, "message": "Daily limit exceeded", "error": { "code": "DAILY_LIMIT_EXCEEDED" } }
  ```

- **Status codes:**
  - 200 OK (approved)
  - 400 Bad Request (invalid card/org/currency)
  - 409 Conflict (duplicate idempotency key)
  - 422 Unprocessable Entity (limits, insufficient funds, blocked card)

### GET `/api/v1/`

Returns a friendly message confirming the service is up.

---

## Getting Started

### 1. Install dependencies
```sh
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env`:
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mylorry
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
SWAGGER_ENABLED=true
```

### 3. Database
- CLI config: `src/infra/database/data-source.ts`  
- Runtime config: `src/infra/database/database.module.ts`

Run migrations:
```sh
npm run typeorm:run
```

Revert:
```sh
npm run typeorm:revert
```

Generate:
```sh
npm run typeorm:generate
```

Seed:
```sh
npm run seed
```

### 4. Start app
```sh
npm run start:dev
```
Visit:  
`http://localhost:3000/docs` and `http://localhost:3000/openapi.json`

---

## Docker & Deployment

- Local `docker-compose.yml`: runs app + Postgres + Redis.
- Deployment `docker-compose.deploy.yml`: runs with Traefik, TimescaleDB, seed job.
- External network `web` required for Traefik.

```sh
docker compose up -d
docker compose -f docker-compose.deploy.yml up -d
```

---

## CI/CD

- **GitHub Actions** workflow:
  1. Checkout, install deps, run unit & e2e tests.
  2. Start ephemeral Postgres (with TimescaleDB) for e2e.
  3. Run migrations + seed.
  4. Build and push image to GHCR.
  5. SSH to server, deploy via `docker compose up -d`.

- Secrets: `.env` and GHCR token injected via GitHub Secrets.

---

## Testing

- **Unit tests**:
  ```sh
  npm test
  ```
- **E2E tests**:
  ```sh
  npm run test:e2e
  ```

Tests include:
- Root route returns expected message.
- Webhook transaction validation (happy path + rejection cases).

---

## Entities (Selected)

- `FuelTransaction`: composite PK `(id, occurred_at)`, FK to card/org/station, hypertable in Timescale.
- `Card`: linked to organization, stores `cardNumberHash`, `last4`, status.
- `Organization` + `OrgAccount`: balances in minor units (`bigint` in DB).
- `CardLimitRule`: daily/monthly/custom limits.
- `CardUsageBucket`: rolling usage windows.

---

## Scripts

- `start`, `start:dev`, `build`, `lint`
- `test`, `test:e2e`, `test:cov`
- `typeorm:*` (run/revert/show/generate)
- `seed` (runs `scripts/seed.ts`)

---

## Security Notes

- TLS handled by Traefik with ACME certresolver.
- Database access restricted to internal Docker network.
- `.env` injected at runtime; not committed.
- Authentication & rate-limiting not in scope for assessment but pluggable.

---

## Flow Diagram
```mermaid
sequenceDiagram
  autonumber
  participant ST as Petrol Station
  participant API as MyLorry API (NestJS)
  participant EVT as Webhook Events (idempotency)
  participant SVC as TransactionsService
  participant DB as Postgres/Timescale
  participant CACHE as Redis (cache)

  ST->>API: POST /api/v1/webhooks/transactions + x-idempotency-key
  API->>EVT: find/create webhook_event (station_id, key)

  alt event already processed
    API-->>ST: 409 Conflict - duplicate idempotency key
  else first-time or previous failed
    API->>SVC: validate DTO and process

    par cache lookup
      SVC->>CACHE: GET card/org (may miss)
    and DB read/write
      SVC->>DB: load card/org/account/rules (FOR UPDATE)
    end

    alt bad request (card/org/currency invalid)
      SVC-->>API: BAD_REQUEST(code, message)
      API->>EVT: status=failed, processed_at=now, error=code
      API-->>ST: 400 Bad Request
    else business rule failed (limits/funds/blocked)
      SVC-->>API: REJECTED(code, message)
      API->>EVT: status=failed, processed_at=now, error=code
      note over SVC,DB: No tx insert, no bucket write
      API-->>ST: 422 Unprocessable Entity
    else approved
      SVC-->>DB: deduct balance, upsert DAILY and MONTHLY buckets, insert approved tx
      API-->>EVT: status=processed, processed_at=now
      API-->>ST: 200 OK
    end
  end
```

## System Architecture
```mermaid
flowchart LR
  subgraph Internet
    ST[Petrol Station Webhook Client]
    DEV[Developer / API Consumer]
  end

  subgraph Server["Ubuntu Host"]
    subgraph Docker["Docker / Compose Network"]
      TR[Traefik 'Reverse Proxy, TLS']
      APP[MyLorry API 'NestJS']
      DOCS[API Docs 'Scalar UI']
      SEED[Seed and Migration Job]
      REDIS['Redis']
      PG['Postgres 16 + TimescaleDB']
    end
  end

  subgraph CI["GitHub Actions (CI/CD)"]
    BUILD[Build &amp; Test]
    PUSH[Build Image &amp; Push to GHCR]
    DEPLOY[SSH Deploy: docker compose up]
    GHCR[(GHCR Registry)]
  end

  %% Traffic
  ST -- POST /api/v1/webhooks/transactions --> TR
  Dev -- GET /api/v1/docs & /openapi.json --> TR

  TR -- route: mylorry.bijanbiria.com --> APP
  TR -- route: mylorry.bijanbiria.com/docs --> DOCS

  %% App deps
  APP --- REDIS
  APP --- PG

  %% Seed/Migration job
  SEED -. runs on deploy .-> PG
  SEED -. runs on deploy .-> APP

  %% CI/CD pipeline
  CI_Build --> CI_Push --> GHCR
  GHCR --> CI_Deploy --> TR
  CI_Deploy --> APP
  CI_Deploy --> DOCS
  CI_Deploy --> REDIS
  CI_Deploy --> PG

  %% Notes
  classDef infra fill:#eef,stroke:#557;
  class TR,APP,DOCS,SEED,REDIS,PG infra;
```

## Runtime Data Paths
```mermaid
flowchart TD
  ST[Petrol Station] -->|Webhook JSON + x-idempotency-key| TR[Traefik]
  TR --> APP[MyLorry API 'NestJS']

  APP -->|Validate DTO / Idempotency check| APP
  APP -->|Load Card/Org/Rules 'FOR UPDATE'| PG['Postgres/TimescaleDB']
  APP -->|Compute daily/monthly buckets| PG
  APP -->|On success: insert approved tx + update usage + deduct balance| PG
  APP -->|On failure: NO tx insert, NO bucket write| PG
  APP -->|Envelope 'data,message,error' + HTTP 200/400/409/422| TR
  TR --> ST

  subgraph Background
    SEED[mylorry-seed 'run-migrations, run-seed']
  end
  SEED --> PG
```

---

© 2025 MyLorry Fuel Service
