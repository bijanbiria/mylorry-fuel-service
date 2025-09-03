import 'dotenv/config';
import dataSource from '../infra/database/data-source';

(async () => {
  try {
    await dataSource.initialize();
    console.log('Running TypeORM migrations…');
    await dataSource.runMigrations();
    console.log('✅ Migrations completed.');
    await dataSource.destroy();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
})();