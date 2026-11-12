import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

process.env.DB_PATH = ':memory:';
const { db } = await import('../src/db.js');
const data = await import('../src/data/index.js');
const { seed, dumpSql, TABLES } = await import('../db/seed.js');
const { computeBalances } = await import('../src/split.js');
const { verifyPassword } = await import('../src/auth.js');

test('örnek veri: tablolar dolu, yabancı anahtarlar tutarlı', async () => {
  const counts = await seed();
  assert.deepEqual(counts, { users: 5, sessions: 0, groups: 2, members: 7, expenses: 7, expense_splits: counts.expense_splits, settlements: 2, rules: 3, activities: counts.activities });
  assert.ok(counts.expense_splits >= 20 && counts.activities >= 9);
  assert.deepEqual((await db.all('PRAGMA foreign_key_check')), []);
});

test('örnek veri: her harcamanın payları tutara eşit, bakiyeler toplamı sıfır', async () => {
  for (const g of ['g_ev', 'g_tatil']) {
    const members = (await data.listMembers(g)).map((m) => m.id);
    const expenses = (await data.listExpenses(g));
    for (const e of expenses) {
      assert.equal(Object.values(e.splits).reduce((a, b) => a + b, 0), e.amount, `${e.id} paylar toplamı`);
    }
    const bal = computeBalances(members, expenses, (await data.listSettlements(g)));
    assert.equal(Object.values(bal).reduce((a, b) => a + b, 0), 0, `${g} bakiye toplamı`);
  }
});

test('örnek veri: dört bölüşüm tipinin hepsi var', async () => {
  const types = new Set((await db.all('SELECT DISTINCT split_type FROM expenses')).map((r) => r.split_type));
  assert.deepEqual([...types].sort(), ['equal', 'exact', 'items', 'percent']);
});

test('roller: tek yönetici var, diğerleri kullanıcı, yönetici hiçbir gruba üye değil', async () => {
  const roles = (await db.all('SELECT email, role FROM users ORDER BY email')).map((r) => `${r.email}:${r.role}`);
  assert.deepEqual(roles, ['admin@example.com:admin', 'ayse@example.com:user', 'can@example.com:user', 'mehmet@example.com:user', 'zeynep@example.com:user']);
  assert.equal((await db.get("SELECT COUNT(*) AS n FROM members WHERE user_id = 'u_admin'")).n, 0);
});

test('KVKK: tüm e-postalar example.com alanında, şifreler özetli saklanır', async () => {
  const rows = (await db.all('SELECT email, password_hash FROM users'));
  assert.ok(rows.length > 0);
  for (const r of rows) {
    assert.match(r.email, /@example\.com$/);
    assert.notEqual(r.password_hash, 'demo12345');
  }
  assert.equal(await verifyPassword('demo12345', rows[0].password_hash), true);
});

test('ikinci çalıştırma reset olmadan reddedilir, reset ile temiz doldurur', async () => {
  await assert.rejects(() => seed(), /boş değil/);
  const counts = await seed({ reset: true });
  assert.equal(counts.users, 5);
  assert.equal(counts.expenses, 7);
});

test('SQL dökümü: temiz bir veritabanına yüklenince aynı veriyi üretir', async () => {
  const sql = (await dumpSql());
  assert.match(sql, /INSERT INTO users/);
  const fresh = new DatabaseSync(':memory:');
  for (const f of readdirSync(new URL('../db/migrations/', import.meta.url)).filter((n) => n.endsWith('.sql')).sort()) {
    fresh.exec(readFileSync(new URL(`../db/migrations/${f}`, import.meta.url), 'utf8'));
  }
  fresh.exec(sql);
  for (const t of TABLES) {
    const a = (await db.get(`SELECT COUNT(*) AS n FROM ${t}`)).n;
    const b = fresh.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
    assert.equal(b, a, `${t} satır sayısı`);
  }
  assert.deepEqual(fresh.prepare('PRAGMA foreign_key_check').all(), []);
});
