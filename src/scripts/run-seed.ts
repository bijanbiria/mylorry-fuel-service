import 'dotenv/config';

(async () => {
  try {
    // Import without extension so TS types resolve to the TS module, while at runtime Node loads dist/scripts/seed.js
    const mod = await import('./seed.js');

    const run: unknown = (mod as any).default ?? (mod as any).seed ?? (typeof mod === 'function' ? (mod as any) : undefined);

    if (typeof run !== 'function') {
      throw new Error('seed module does not export a callable function (default or named `seed`).');
    }

    await (run as (...args: any[]) => Promise<unknown>)();
    console.log('✅ Seed completed.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
})();