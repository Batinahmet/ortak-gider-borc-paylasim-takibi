// Veri erişim katmanı: grubun öğrenilen ortak/kişisel kalem kuralları.
import { db } from '../db.js';

export const listRules = (groupId) => db.all('SELECT item, kind FROM rules WHERE group_id = ?', groupId);

/** Kural yoksa ekler, varsa türünü günceller (UPSERT). */
export async function upsertRule(groupId, item, kind) {
  await db.run(
    'INSERT INTO rules (group_id, item, kind) VALUES (?,?,?) ON CONFLICT(group_id, item) DO UPDATE SET kind = excluded.kind',
    groupId, item, kind,
  );
}

export const deleteRule = async (groupId, item) =>
  (await db.run('DELETE FROM rules WHERE group_id = ? AND item = ?', groupId, item)).changes > 0;
