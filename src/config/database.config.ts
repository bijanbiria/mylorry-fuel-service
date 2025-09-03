import * as path from 'path';
import * as dotenv from 'dotenv';
import type { DataSourceOptions } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export function loadEnv() {
  const envPath = process.env.DOTENV_CONFIG_PATH || path.resolve(process.cwd(), '.env');
  dotenv.config({ path: envPath });
}

// Use a narrowed type to Postgres-only options to avoid union-narrowing issues
// with DataSourceOptions (which includes many drivers like spanner, mysql, etc.).

type PgBase = Omit<PostgresConnectionOptions, 'entities' | 'migrations'>;

function common(): PgBase {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'mylorry',
    ssl: false,
    synchronize: false,
    logging: false,
    extra: {
      application_name: 'mylorry-fuel-service',
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      statement_timeout: 0,
    },
  };
}

// CLI (migrations): globs are required for TypeORM CLI to discover files
export function buildCliOptions(): PostgresConnectionOptions {
  const projectRoot = process.cwd();
  const here = __dirname; // in dist: <root>/dist/config
  const distRoot = path.resolve(here, '..'); // <root>/dist
  const isDist = distRoot.endsWith(`${path.sep}dist`);

  const entities = isDist
    ? [path.resolve(distRoot, '**/entities/*.entity.js')]
    : [path.resolve(projectRoot, 'src/**/entities/*.entity.{ts,js}')];

  const migrations = isDist
    ? [path.resolve(distRoot, 'infra/database/migrations/*.js')]
    : [path.resolve(projectRoot, 'src/infra/database/migrations/*.{ts,js}')];

  return {
    ...common(),
    entities,
    migrations,
  } as PostgresConnectionOptions;
}

// Runtime (Nest app): migrations are not needed; use explicit entities or autoLoadEntities in module
export function buildRuntimeOptions(entities: any[] = []): PostgresConnectionOptions {
  return {
    ...common(),
    entities,
    migrations: [],
  } as PostgresConnectionOptions;
}