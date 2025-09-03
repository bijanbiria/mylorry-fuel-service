/**
 * TypeORM DataSource for CLI usage (migrations/generate/run).
 *
 * Notes:
 * - Loads environment variables before building options.
 * - Uses CLI-friendly globs via buildCliOptions().
 * - This file is NOT used by Nest runtime; see DatabaseModule instead.
 */
import { DataSource } from 'typeorm';
import { loadEnv, buildCliOptions } from '../../config/database.config';
import * as path from 'path';
loadEnv();

// Important: resolve both dist (JS) and src (TS) patterns
const distDir = __dirname; // e.g. /app/dist/infra/database in Docker
const projectRoot = process.cwd();

const entityGlobs = [
  // when compiled
  path.resolve(distDir, '../../**/entities/*.entity.{js,ts}'),
  // when running with ts-node locally
  path.resolve(projectRoot, 'src/**/entities/*.entity.{ts,js}'),
];

const migrationGlobs = [
  // compiled migrations in dist
  path.resolve(distDir, './migrations/*.{js,ts}'),
  // ts migrations for local CLI
  path.resolve(projectRoot, 'src/infra/database/migrations/*.{ts,js}'),
];


export default new DataSource(buildCliOptions());
