// Veritabanı katmanı. İki arka uç vardır, ikisi de aynı async arayüzü sunar:
//   - TURSO_DATABASE_URL tanımlıysa: Turso / libSQL (kalıcı, ücretsiz katmanı var; Render gibi diski kalıcı olmayan ortamlar için)
//   - tanımlı değilse: yerel SQLite dosyası (node:sqlite, DB_PATH; testlerde ':memory:')
// Veri erişim dosyaları (src/data/*.js) yalnızca db.all / db.get / db.run / db.exec ve tx() kullanır.
import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

// ---------- Yerel SQLite (node:sqlite) ----------
async function sqliteBackend(path) {
  const { DatabaseSync } = await import('node:sqlite');
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const raw = new DatabaseSync(path);
  raw.exec('PRAGMA foreign_keys = ON'); // SQLite'ta varsayılan olarak kapalıdır

  // node:sqlite çağrıları eşzamanlıdır; satırlar düz nesneye çevrilir.
  const conn = {
    all: async (sql, args = []) => raw.prepare(sql).all(...args).map((r) => ({ ...r })),
    run: async (sql, args = []) => ({ changes: Number(raw.prepare(sql).run(...args).changes) }),
    exec: async (sql) => raw.exec(sql),
  };

  // Tek bağlantı olduğu için bir işlem (transaction) sürerken başka isteklerin sorguları araya girmesin:
  // işlem dışı çağrılar işlem bitene kadar bekler, işlemler sıraya girer.
  let active = null;
  const idle = async () => {
    while (active) await active.catch(() => {});
  };

  return {
    all: async (sql, args) => { await idle(); return conn.all(sql, args); },
    run: async (sql, args) => { await idle(); return conn.run(sql, args); },
    exec: async (sql) => { await idle(); return conn.exec(sql); },
    async transaction(fn) {
      while (active) await active.catch(() => {}); // kontrol ve atama arasında await yok: iki işlem aynı anda başlayamaz
      const run = (async () => {
        raw.exec('BEGIN');
        try {
          const result = await fn(conn);
          raw.exec('COMMIT');
          return result;
        } catch (e) {
          raw.exec('ROLLBACK');
          throw e;
        }
      })();
      active = run;
      try {
        return await run;
      } finally {
        if (active === run) active = null;
      }
    },
    // Uygulanan son migration sürümü PRAGMA user_version olarak saklanır.
    getVersion: async () => (await conn.all('PRAGMA user_version'))[0].user_version,
    async applyMigration(version, sql) {
      await this.transaction(async (c) => {
        await c.exec(sql);
        await c.exec(`PRAGMA user_version = ${version}`);
      });
    },
  };
}

// ---------- Turso / libSQL ----------
async function libsqlBackend(url, authToken) {
  const { createClient } = await import('@libsql/client');
  const client = createClient({ url, authToken });
  const toRows = (res) => res.rows.map((row) => Object.fromEntries(res.columns.map((c, i) => [c, row[i]])));
  const wrap = (x) => ({
    all: async (sql, args = []) => toRows(await x.execute({ sql, args })),
    run: async (sql, args = []) => ({ changes: (await x.execute({ sql, args })).rowsAffected }),
    exec: (sql) => x.executeMultiple(sql),
  });
  const conn = wrap(client);
  return {
    ...conn,
    async transaction(fn) {
      const t = await client.transaction('write');
      try {
        const result = await fn(wrap(t));
        await t.commit();
        return result;
      } catch (e) {
        await t.rollback().catch(() => {});
        throw e;
      } finally {
        t.close();
      }
    },
    // Uzak veritabanında PRAGMA user_version yerine bir tablo kullanılır.
    async getVersion() {
      await client.execute('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)');
      return (await conn.all('SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations'))[0].v;
    },
    async applyMigration(version, sql) {
      await client.executeMultiple(sql);
      await conn.run('INSERT INTO schema_migrations (version) VALUES (?)', [version]);
    },
  };
}

const tursoUrl = process.env.TURSO_DATABASE_URL;
const backend = tursoUrl
  ? await libsqlBackend(tursoUrl, process.env.TURSO_AUTH_TOKEN)
  : await sqliteBackend(process.env.DB_PATH || 'data/ortak-gider.db');

export const usingTurso = Boolean(tursoUrl);

const als = new AsyncLocalStorage(); // açık bir işlem varsa onun bağlantısını taşır
const current = () => als.getStore() ?? backend;

/** Parametreli sorgular: db.get(sql, a, b) → ilk satır veya undefined; db.all → satır dizisi; db.run → { changes }. */
export const db = {
  all: (sql, ...args) => current().all(sql, args),
  get: async (sql, ...args) => (await current().all(sql, args))[0],
  run: (sql, ...args) => current().run(sql, args),
  exec: (sql) => current().exec(sql),
};

/** fn içindeki tüm yazmaları tek işlem (transaction) olarak çalıştırır; hata olursa hepsi geri alınır. */
export const tx = (fn) => backend.transaction((conn) => als.run(conn, fn));

/**
 * Migration çalıştırıcı: db/migrations/NNN_ad.sql dosyalarını sırayla uygular.
 * Uygulanan son sürüm veritabanında saklanır, böylece her dosya yalnızca bir kez çalışır.
 */
async function migrate() {
  const dir = new URL('../db/migrations/', import.meta.url);
  const files = readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  let current = await backend.getVersion();
  for (const file of files) {
    const version = parseInt(file, 10);
    if (version <= current) continue;
    await backend.applyMigration(version, readFileSync(new URL(file, dir), 'utf8'));
    current = version;
  }
}

await migrate();
