// Veri erişim katmanı: harcamalar ve paylar (expense_splits ara tablosu).
// Not: Bu fonksiyonlar kendi transaction'larını açmaz; birden çok yazmayı atomik yapmak için
// çağıran taraf tx() (src/db.js) içinde kullanır.
import { db } from '../db.js';

/** Harcamayı ve kişi başı paylarını ekler. shares: { kullaniciId: kuruş } */
export async function insertExpense(e, shares) {
  await db.run(
    'INSERT INTO expenses (id, group_id, title, amount, paid_by, created_by, split_type, items_json, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    e.id, e.groupId, e.title, e.amount, e.paidBy, e.createdBy, e.splitType,
    e.items ? JSON.stringify(e.items) : null, e.createdAt ?? Date.now(),
  );
  for (const [userId, share] of Object.entries(shares)) {
    if (share > 0) await db.run('INSERT INTO expense_splits (expense_id, user_id, share) VALUES (?,?,?)', e.id, userId, share);
  }
}

/** Bir grubun harcamaları (yeniden eskiye), her biri splits: { kullaniciId: pay } ile. */
export async function listExpenses(groupId) {
  const rows = await db.all('SELECT * FROM expenses WHERE group_id = ? ORDER BY created_at DESC, id DESC', groupId);
  const splits = await db.all(
    'SELECT s.expense_id, s.user_id, s.share FROM expense_splits s JOIN expenses e ON e.id = s.expense_id WHERE e.group_id = ?',
    groupId,
  );
  const byExpense = {};
  for (const s of splits) (byExpense[s.expense_id] ||= {})[s.user_id] = s.share;
  return rows.map((e) => ({ ...e, splits: byExpense[e.id] || {} }));
}

export const findExpense = (id, groupId) => db.get('SELECT * FROM expenses WHERE id = ? AND group_id = ?', id, groupId);

export const updateExpenseTitle = async (id, title) => (await db.run('UPDATE expenses SET title = ? WHERE id = ?', title, id)).changes > 0;

/** Harcamayı siler; payları ON DELETE CASCADE ile otomatik silinir. */
export const deleteExpense = async (id) => (await db.run('DELETE FROM expenses WHERE id = ?', id)).changes > 0;
