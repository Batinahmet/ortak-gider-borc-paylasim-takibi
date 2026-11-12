// Veri erişim katmanı: kullanıcılar (CRUD), roller ve giriş kilidi. Tüm sorgular hazır (parametreli) sorgudur.
import { db } from '../db.js';

// Create (rol varsayılan olarak 'user'; admin sadece sunucu tarafında atanır)
export async function createUser({ id, name, email, passwordHash, role = 'user', createdAt = Date.now() }) {
  await db.run('INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?,?,?,?,?,?)', id, name, email, passwordHash, role, createdAt);
}

// Read
export const countUsers = async () => (await db.get('SELECT COUNT(*) AS n FROM users')).n;
export const emailExists = async (email) => Boolean(await db.get('SELECT 1 FROM users WHERE email = ?', email));
/** Parola özeti ve kilit bilgisini de içeren tam satır; sadece kimlik doğrulama kodu kullanır. */
export const findUserByEmail = (email) => db.get('SELECT * FROM users WHERE email = ?', email);
export const findUserAuthRow = (id) => db.get('SELECT * FROM users WHERE id = ?', id);
export const findUserById = (id) => db.get('SELECT id, name, email, role FROM users WHERE id = ?', id);

/** Yönetici ekranı için: kullanıcılar ve üye oldukları grup sayısı. Parola özeti asla döndürülmez. */
export const listUsersWithStats = () =>
  db.all(
    `SELECT u.id, u.name, u.email, u.role, u.created_at AS createdAt,
            (SELECT COUNT(*) FROM members m WHERE m.user_id = u.id) AS groupCount
     FROM users u ORDER BY u.created_at, u.id`,
  );

// Update
export const updateUserName = async (id, name) => (await db.run('UPDATE users SET name = ? WHERE id = ?', name, id)).changes > 0;
export const updateUserPassword = async (id, passwordHash) =>
  (await db.run('UPDATE users SET password_hash = ? WHERE id = ?', passwordHash, id)).changes > 0;
export const setUserRole = async (id, role) => (await db.run('UPDATE users SET role = ? WHERE id = ?', role, id)).changes > 0;

/**
 * Başarısız girişi sayar. Sayaç maxAttempts'e ulaşınca hesap lockMs süreyle kilitlenir ve sayaç sıfırlanır.
 * Tek UPDATE ile yapılır; iki CASE ifadesi de satırın güncelleme öncesi değerini okur.
 */
export async function recordFailedLogin(id, maxAttempts, lockMs, now = Date.now()) {
  await db.run(
    `UPDATE users SET
       failed_attempts = CASE WHEN failed_attempts + 1 >= ? THEN 0 ELSE failed_attempts + 1 END,
       locked_until    = CASE WHEN failed_attempts + 1 >= ? THEN ? ELSE locked_until END
     WHERE id = ?`,
    maxAttempts, maxAttempts, now + lockMs, id,
  );
}
export const clearFailedLogins = async (id) => {
  await db.run('UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?', id);
};

// Delete (grubu olan kullanıcı silinemez: groups.owner_id yabancı anahtarı engeller)
export const deleteUser = async (id) => (await db.run('DELETE FROM users WHERE id = ?', id)).changes > 0;
