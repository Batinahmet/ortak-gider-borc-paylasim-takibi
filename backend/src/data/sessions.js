// Veri erişim katmanı: oturumlar. Veritabanında ham belirteç değil, SHA-256 özeti saklanır.
import { db } from '../db.js';

export async function createSession(tokenHash, userId, expiresAt) {
  await db.run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)', tokenHash, userId, expiresAt);
}

/** Süresi dolmamış oturumun sahibini (rolüyle birlikte) döndürür; yoksa undefined. */
export const findUserBySession = (tokenHash, now = Date.now()) =>
  db.get(
    `SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    tokenHash, now,
  );

export const deleteSession = async (tokenHash) => (await db.run('DELETE FROM sessions WHERE token_hash = ?', tokenHash)).changes > 0;

/** Kullanıcının oturumlarını siler; exceptTokenHash verilirse o oturum (şu anki) korunur. */
export const deleteSessionsOfUser = async (userId, exceptTokenHash = '') =>
  (await db.run('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?', userId, exceptTokenHash)).changes;

export const deleteExpiredSessions = async (now = Date.now()) =>
  (await db.run('DELETE FROM sessions WHERE expires_at <= ?', now)).changes;
