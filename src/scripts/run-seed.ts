import 'dotenv/config';

// Use CommonJS require so it works regardless of TS/ESM interop in the compiled output
/* eslint-disable @typescript-eslint/no-var-requires */
(async () => {
  try {
    const mod = require('./seed.js');
    const run: unknown =
      typeof mod === 'function'
        ? mod
        : (mod && (mod.default || (mod.seed as unknown))) || undefined;

    if (typeof run !== 'function') {
      const keys = mod ? Object.keys(mod) : [];
      throw new Error(
        `seed module does not export a callable function. Exported keys: [${keys.join(', ')}]`,
      );
    }

    await (run as (...args: any[]) => Promise<unknown>)();
    console.log('✅ Seed completed.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
})();