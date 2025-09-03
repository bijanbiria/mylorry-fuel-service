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
loadEnv();
export default new DataSource(buildCliOptions());
