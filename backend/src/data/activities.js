// Veri erişim katmanı: etkinlik akışı (bildirim kaynağı).
import { db } from '../db.js';

export async function logActivity(groupId, actorId, message, createdAt = Date.now()) {
  await db.run('INSERT INTO activities (group_id, actor_id, message, created_at) VALUES (?,?,?,?)', groupId, actorId, message, createdAt);
}

export const listActivities = (groupId, limit = 50) =>
  db.all('SELECT message, created_at AS createdAt FROM activities WHERE group_id = ? ORDER BY id DESC LIMIT ?', groupId, limit);
