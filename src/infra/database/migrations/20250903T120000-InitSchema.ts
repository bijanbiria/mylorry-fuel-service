import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial database schema for MyLorry Fuel Service.
 *
 * Design notes:
 * - Uses PostgreSQL + TimescaleDB for time-series `fuel_transactions`.
 * - Card spending is tracked in generic time buckets (`card_usage_buckets`) to support DAILY/WEEKLY/MONTHLY/CUSTOM windows
 *   without future schema changes. Non-overlap is enforced with a GiST exclusion constraint.
 * - Per-card limit rules live in `card_limit_rules` (rule-driven, not columns on `cards`).
 * - A simple ledger table is included for account auditability.
 * - All amounts are stored as BIGINT (minor units, e.g., cents) to avoid float issues.
 */
export class InitSchema20250903T120000 implements MigrationInterface {
  name = 'InitSchema20250903T120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Extensions (enabled if available; safe to keep if the role has permissions) ---
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist";`);

    // ============ organizations ============
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name         TEXT NOT NULL,
        status       TEXT NOT NULL DEFAULT 'active',
        currency     TEXT NOT NULL DEFAULT 'USD',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // ============ org_accounts ============
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS org_accounts (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        available_cents   BIGINT NOT NULL CHECK (available_cents >= 0),
        version           BIGINT NOT NULL DEFAULT 0,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (organization_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_org_accounts_org ON org_accounts(organization_id);`);

    // ============ cards ============
    // Card entity holds identity and attachment to organization. Spending limits are NOT stored here.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        card_number_hash      TEXT NOT NULL,
        last4                 TEXT NOT NULL CHECK (char_length(last4) = 4),
        status                TEXT NOT NULL DEFAULT 'active', -- active | blocked
        vehicle_id            UUID,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (organization_id, card_number_hash)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_cards_org ON cards(organization_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);`);

    // ============ card_limit_rules ============
    // Rule-driven card limits; supports DAILY/WEEKLY/MONTHLY/CUSTOM and different window modes.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_limit_rules (
        id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        card_id             UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        period_type         TEXT NOT NULL,                 -- DAILY | WEEKLY | MONTHLY | CUSTOM
        limit_cents         BIGINT NOT NULL CHECK (limit_cents >= 0),
        window_mode         TEXT NOT NULL DEFAULT 'CALENDAR', -- CALENDAR | ANCHOR | ROLLING
        anchor_day_of_month SMALLINT,                      -- used when window_mode = ANCHOR
        anchor_length_days  SMALLINT,                      -- used when window_mode = ANCHOR
        rolling_hours       INT,                           -- used when window_mode = ROLLING
        active              BOOLEAN NOT NULL DEFAULT true,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_limit_rules_card_type
      ON card_limit_rules (card_id, period_type)
      WHERE active = true;
    `);

    // ============ card_usage_buckets ============
    // Generic time-bucketed spending accumulator. Prevents overlapping buckets per (card, period_type).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS card_usage_buckets (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        card_id        UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        period_type    TEXT NOT NULL, -- DAILY | WEEKLY | MONTHLY | CUSTOM
        bucket_start   TIMESTAMPTZ NOT NULL,
        bucket_end     TIMESTAMPTZ NOT NULL,
        spent_cents    BIGINT NOT NULL DEFAULT 0 CHECK (spent_cents >= 0),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (bucket_end > bucket_start)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cub_card_type_time
      ON card_usage_buckets (card_id, period_type, bucket_start);
    `);
    await queryRunner.query(`
      ALTER TABLE card_usage_buckets
      ADD CONSTRAINT cub_no_overlap
      EXCLUDE USING gist (
        card_id      WITH =,
        period_type  WITH =,
        tstzrange(bucket_start, bucket_end, '[)') WITH &&
      );
    `);

    // ============ stations ============
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stations (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code        TEXT NOT NULL UNIQUE,
        name        TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // ============ webhook_events ============
    // Stores raw webhook payloads and idempotency keys for replay/debugging.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        station_id        UUID REFERENCES stations(id) ON DELETE SET NULL,
        idempotency_key   TEXT,
        raw_payload       JSONB NOT NULL,
        signature         TEXT,
        received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        processed_at      TIMESTAMPTZ,
        status            TEXT NOT NULL DEFAULT 'received', -- received | processed | failed
        error_message     TEXT,
        UNIQUE (station_id, idempotency_key)
      );
    `);

    // ============ fuel_transactions (Timescale hypertable) ============
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fuel_transactions (
        id               UUID NOT NULL,
        card_id          UUID NOT NULL REFERENCES cards(id) ON DELETE RESTRICT,
        organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
        station_id       UUID REFERENCES stations(id) ON DELETE SET NULL,
        external_ref     TEXT,
        amount_cents     BIGINT NOT NULL CHECK (amount_cents > 0),
        currency         TEXT NOT NULL,
        occurred_at      TIMESTAMPTZ NOT NULL,
        status           TEXT NOT NULL,
        decline_reason   TEXT,
        meta             JSONB NOT NULL DEFAULT '{}',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (status IN ('approved','rejected','pending')),
        PRIMARY KEY (id, occurred_at)
      );
    `);

    // TimescaleDB hypertable + performance options
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS timescaledb;`);
    await queryRunner.query(`
      SELECT create_hypertable(
        'fuel_transactions',
        'occurred_at',
        if_not_exists => TRUE,
        chunk_time_interval => INTERVAL '7 days'
      );
    `);

    // Indexes after creating hypertable
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tx_card_time
      ON fuel_transactions (card_id, occurred_at DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tx_org_time
      ON fuel_transactions (organization_id, occurred_at DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tx_status_time
      ON fuel_transactions (status, occurred_at DESC);
    `);

    // Optional: enable compression and add a compression policy
    await queryRunner.query(`
      ALTER TABLE fuel_transactions
      SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = 'card_id,organization_id,station_id',
        timescaledb.compress_orderby   = 'occurred_at'
      );
    `);
    await queryRunner.query(`
      SELECT add_compression_policy('fuel_transactions', INTERVAL '30 days');
    `);

    // ============ org_ledger_entries (audit trail) ============
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS org_ledger_entries (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_id     UUID NOT NULL REFERENCES org_accounts(id) ON DELETE CASCADE,
        tx_id          UUID,
        entry_type     TEXT NOT NULL,               -- DEBIT | CREDIT
        amount_cents   BIGINT NOT NULL CHECK (amount_cents > 0),
        balance_after  BIGINT NOT NULL CHECK (balance_after >= 0),
        meta           JSONB NOT NULL DEFAULT '{}',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ledger_account_time ON org_ledger_entries(account_id, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse dependency order.
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ledger_account_time;`);
    await queryRunner.query(`DROP TABLE IF EXISTS org_ledger_entries;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_tx_status_time;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tx_org_time;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tx_card_time;`);
    await queryRunner.query(`DROP TABLE IF EXISTS fuel_transactions;`);

    await queryRunner.query(`DROP TABLE IF EXISTS webhook_events;`);
    await queryRunner.query(`DROP TABLE IF EXISTS stations;`);

    // Remove exclusion constraint before dropping the buckets table
    await queryRunner.query(`ALTER TABLE card_usage_buckets DROP CONSTRAINT IF EXISTS cub_no_overlap;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cub_card_type_time;`);
    await queryRunner.query(`DROP TABLE IF EXISTS card_usage_buckets;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_limit_rules_card_type;`);
    await queryRunner.query(`DROP TABLE IF EXISTS card_limit_rules;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_cards_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cards_org;`);
    await queryRunner.query(`DROP TABLE IF EXISTS cards;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_org_accounts_org;`);
    await queryRunner.query(`DROP TABLE IF EXISTS org_accounts;`);

    await queryRunner.query(`DROP TABLE IF EXISTS organizations;`);

    // Extensions are usually shared and should not be dropped in down()
  }
}