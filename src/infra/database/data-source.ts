import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';


/**
 * Loads environment variables for CLI usage as well as runtime.
 * - Looks for DOTENV_CONFIG_PATH (if provided), otherwise falls back to project .env in CWD.
 */
const envPath = process.env.DOTENV_CONFIG_PATH || path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

/**
 * Central TypeORM DataSource for CLI & app runtime.
 * - Uses env vars; keeps `synchronize=false` (migrations only).
 * - Adds pg connection timeouts to avoid indefinite hangs when DB is unreachable.
 * - Uses CWD-based glob paths so CLI can resolve TS files regardless of module type.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'mylorry',
  ssl: false,
  synchronize: false,
  logging: false,
  entities: [path.resolve(process.cwd(), 'src/**/entities/*.entity.{ts,js}')],
  migrations: [path.resolve(process.cwd(), 'src/infra/database/migrations/*.{ts,js}')],
  extra: {
    application_name: 'mylorry-fuel-service',
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    statement_timeout: 0,
  },
});