// Veri erişim katmanı: gruplar ve üyelik (members ara tablosu).
import { db } from '../db.js';

// Create
export async function createGroup({ id, name, ownerId, inviteCode, createdAt = Date.now() }) {
  await db.run('INSERT INTO groups (id, name, owner_id, invite_code, created_at) VALUES (?,?,?,?,?)', id, name, ownerId, inviteCode, createdAt);
}

/** Üye ekler; kişi zaten üyeyse hiçbir şey yapmaz. Yeni eklendiyse true döner. */
export const addMember = async (groupId, userId, joinedAt = Date.now()) =>
  (await db.run('INSERT OR IGNORE INTO members (group_id, user_id, joined_at) VALUES (?,?,?)', groupId, userId, joinedAt)).changes > 0;

// Read
export const findGroup = (id) => db.get('SELECT * FROM groups WHERE id = ?', id);
export const findGroupByInvite = (code) => db.get('SELECT id, name FROM groups WHERE invite_code = ?', code);

export const listGroupsOfUser = (userId) =>
  db.all(
    `SELECT g.id, g.name FROM groups g JOIN members m ON m.group_id = g.id
     WHERE m.user_id = ? ORDER BY g.created_at DESC`,
    userId,
  );

export const isMember = async (groupId, userId) =>
  Boolean(await db.get('SELECT 1 FROM members WHERE group_id = ? AND user_id = ?', groupId, userId));

export const listMembers = (groupId) =>
  db.all('SELECT u.id, u.name FROM members m JOIN users u ON u.id = m.user_id WHERE m.group_id = ? ORDER BY m.joined_at', groupId);

// Update
export const renameGroup = async (id, name) => (await db.run('UPDATE groups SET name = ? WHERE id = ?', name, id)).changes > 0;

// Delete (üyelik, harcama, ödeme, kural ve etkinlikler ON DELETE CASCADE ile birlikte silinir)
export const removeMember = async (groupId, userId) =>
  (await db.run('DELETE FROM members WHERE group_id = ? AND user_id = ?', groupId, userId)).changes > 0;
export const deleteGroup = async (id) => (await db.run('DELETE FROM groups WHERE id = ?', id)).changes > 0;
