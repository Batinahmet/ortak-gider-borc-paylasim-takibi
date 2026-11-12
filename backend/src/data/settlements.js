// Veri erişim katmanı: ödeme kayıtları ("borcumu ödedim").
import { db } from '../db.js';

export async function insertSettlement({ id, groupId, fromUser, toUser, amount, createdAt = Date.now() }) {
  await db.run('INSERT INTO settlements (id, group_id, from_user, to_user, amount, created_at) VALUES (?,?,?,?,?,?)', id, groupId, fromUser, toUser, amount, createdAt);
}

export const listSettlements = (groupId) => db.all('SELECT from_user, to_user, amount FROM settlements WHERE group_id = ?', groupId);
