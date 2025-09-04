# MyLorry Fuel Service

A NestJS service that ingests fuel station webhooks and records card-based fuel transactions. It uses PostgreSQL via TypeORM, with optional TimescaleDB for time-series optimization, and Redis for caching.

## Stack

- NestJS, TypeScript
- TypeORM (PostgreSQL)
- Redis (cache)
- OpenAPI + Scalar UI for API docs

## API

- Global prefix: `api/v1` (see `src/main.ts:1`).
- Docs: JSON at `/openapi.json` and Scalar UI at `/docs`.

- POST `/api/v1/webhooks/transactions` (`src/modules/webhooks/controllers/webhooks.controller.ts:1`)
  - Header: `x-idempotency-key` (optional; per-station dedupe)
  - Body (IncomingTransactionDto):
    - `stationCode` string
    - `cardNumber` string
    - `amountCents` numeric string (minor units)
    - `currency` 3-letter code
    - `occurredAt` ISO-8601 datetime
    - `externalRef` string (optional)
  - Response (TransactionResponseDto): `{ status: 'approved' | 'rejected', transactionId?, reason? }`

- GET `/` (under the prefix → `/api/v1/`) returns a friendly message.

## Getting Started

1) Install dependencies

Use your preferred package manager (npm shown):

```
npm install
```

2) Configure environment

Copy `.env.example` to `.env` and adjust values:

```
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

3) Database

Runtime config uses explicit entities (`src/infra/database/database.module.ts:1`).
TypeORM CLI uses `src/infra/database/data-source.ts:1`.

- Run migrations:

```
npm run typeorm:run
```

- Revert last migration:

```
npm run typeorm:revert
```

- Generate a migration from changes:

```
npm run typeorm:generate
```

4) Start the app

```
npm run start:dev
```

Then visit `http://localhost:3000/docs` and `http://localhost:3000/openapi.json`.

## Docker

- Local compose (`docker-compose.yml`) provides Postgres, Redis, and the app.
- Traefik support via labels on service `app` (uses external network `web`).
- Build/run production image with the provided `Dockerfile` (multi-stage; pnpm inside the container).

Quick start (dev):

```
docker compose up -d
```

Deploy example:

```
docker compose -f docker-compose.deploy.yml up -d
```

If Traefik runs separately, create the external network first:

```
docker network create web
```

## Testing

- Unit tests:

```
npm test
```

- E2E tests:

```
npm run test:e2e
```

Included e2e tests:
- `test/app.e2e-spec.ts:1` – root route response
- `test/webhooks.e2e-spec.ts:1` – POST /api/v1/webhooks/transactions (service stubbed)

## Entities (selected)

- `src/modules/transactions/entities/fuel-transaction.entity.ts:1` – composite PK `(id, occurred_at)`; relations to Card/Organization/Station.
- `src/modules/cards/entities/card.entity.ts:1` – card with org relation, last4, status.
- `src/modules/organizations/entities/{organization,org-account}.entity.ts:1` – org and 1:1 account with balances in minor units.
- `src/modules/usage/entities/{card-limit-rule,card-usage-bucket}.entity.ts:1` – spending limits and rolling buckets.
- Monetary values are stored as `bigint` in DB and exposed as `string` in TypeScript.

## Scripts

- `start`, `start:dev`, `build`, `lint`
- `test`, `test:e2e`, `test:cov`
- `typeorm:run`, `typeorm:revert`, `typeorm:show`, `typeorm:generate`
- `seed` – runs `scripts/seed.ts` if present

## Notes

- Global prefix is set in `src/main.ts:1` to `api/v1`.
- OpenAPI spec is generated at startup and served at `/openapi.json`; Scalar UI at `/docs`.
- `src/config/database.config.ts:1` centralizes DB options for runtime and CLI.

---

© 2024 MyLorry Fuel Service.
