'use strict';

const API = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || 'http://localhost:3000/api';
const app = document.getElementById('app');
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tl = (k) => `${(k / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
const toKurus = (v) => Math.round(parseFloat(String(v).replace(',', '.')) * 100);

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* depolama kapalı olabilir */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* yoksay */ } },
};
let token = store.get('token');
let me = null;
let notice = ''; // giriş ekranında bir kez gösterilen bilgi mesajı

async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) { token = null; me = null; store.del('token'); notice = 'Oturum süren doldu, lütfen tekrar giriş yap.'; }
  if (!res.ok) throw new Error(data.error || `Hata (${res.status})`);
  return data;
}

const showError = (el, e) => { el.textContent = e.message || String(e); el.className = 'error'; };

// ---------- Giriş / kayıt ----------
function authView(mode = 'login') {
  const reg = mode === 'register';
  app.innerHTML = `<header class="hero"><h1>Ortak Gider</h1><p>Ortak harcamaları böl, kimin kime ne kadar borçlu olduğunu gör.</p></header><div class="card"><h2>${reg ? 'Kayıt ol' : 'Giriş yap'}</h2>
    <form id="f">${reg ? '<input name="name" placeholder="Adın" required maxlength="50">' : ''}
    <input name="email" type="email" placeholder="E-posta" required>
    <input name="password" id="pw" type="password" placeholder="Şifre (en az 8 karakter)" required minlength="8" maxlength="128" autocomplete="${reg ? 'new-password' : 'current-password'}">
    <label class="check"><input type="checkbox" id="show"> Şifreyi göster</label>
    <button>${reg ? 'Kayıt ol' : 'Giriş yap'}</button><div id="err"></div></form>
    <button class="ghost" id="sw">${reg ? 'Hesabım var' : 'Yeni hesap oluştur'}</button></div>`;
  if (notice) { const n = $('#err'); n.textContent = notice; n.className = 'muted'; notice = ''; }
  $('#show').onchange = (e) => { $('#pw').type = e.target.checked ? 'text' : 'password'; };
  $('#sw').onclick = () => authView(reg ? 'login' : 'register');
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try {
      const r = await api('POST', reg ? '/auth/register' : '/auth/login', d);
      token = r.token; me = r.user; store.set('token', token);
      route();
    } catch (err) { showError($('#err'), err); }
  };
}

// ---------- Üst çubuk (rol bilinçli) ----------
const logout = async () => { try { await api('POST', '/auth/logout'); } catch { /* yoksay */ } token = null; me = null; store.del('token'); location.hash = ''; route(); };
// Yönetici bağlantısı sadece görünürlük içindir; asıl yetki kontrolü sunucudadır (403).
const topBar = () => `<header class="hero"><div class="top"><h1>Merhaba ${esc(me.name)}${me.role === 'admin' ? ' <span class="badge">yönetici</span>' : ''}</h1>
  <nav><a href="#/">Gruplar</a> <a href="#/hesap">Hesabım</a>${me.role === 'admin' ? ' <a href="#/admin">Yönetim</a>' : ''} <button class="ghost small" id="out">Çıkış</button></nav></div></header>`;
const bindTopBar = () => { $('#out').onclick = logout; };

// ---------- Hesabım ----------
function accountView() {
  app.innerHTML = `${topBar()}
    <div class="card"><h2>Profil</h2>
      <p class="muted">${esc(me.email)} · rol: ${esc(me.role === 'admin' ? 'yönetici' : 'kullanıcı')}</p>
      <form id="nf"><input name="name" value="${esc(me.name)}" required maxlength="50"><button>Adı kaydet</button><div id="nerr"></div></form></div>
    <div class="card"><h2>Şifre değiştir</h2>
      <form id="pf"><input name="currentPassword" id="cp" type="password" placeholder="Mevcut şifre" required autocomplete="current-password">
      <input name="newPassword" id="np" type="password" placeholder="Yeni şifre (en az 8 karakter)" required minlength="8" maxlength="128" autocomplete="new-password">
      <label class="check"><input type="checkbox" id="show"> Şifreleri göster</label>
      <button>Şifreyi değiştir</button><div id="perr"></div></form>
      <p class="muted">Şifre değişince diğer cihazlardaki oturumlar kapanır.</p></div>`;
  bindTopBar();
  $('#show').onchange = (e) => { const t = e.target.checked ? 'text' : 'password'; $('#cp').type = t; $('#np').type = t; };
  $('#nf').onsubmit = async (e) => {
    e.preventDefault();
    try { me = (await api('PATCH', '/me', { name: new FormData(e.target).get('name') })).user; accountView(); const ok = $('#nerr'); ok.textContent = 'Kaydedildi'; ok.className = 'pos'; }
    catch (err) { showError($('#nerr'), err); }
  };
  $('#pf').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('POST', '/me/password', Object.fromEntries(new FormData(e.target)));
      e.target.reset();
      const ok = $('#perr'); ok.textContent = `Şifre değişti${r.closedSessions ? ` (${r.closedSessions} diğer oturum kapatıldı)` : ''}`; ok.className = 'pos';
    } catch (err) { showError($('#perr'), err); }
  };
}

// ---------- Yönetim (sadece admin) ----------
async function adminView() {
  // Rol kontrolü için kullanıcıya güvenilmez: istek her zaman gönderilir, sunucu yetkisizse 403 döner.
  let users;
  try { users = (await api('GET', '/admin/users')).users; }
  catch (e) { app.innerHTML = `${topBar()}<div class="card"><p class="error">${esc(e.message)}</p></div>`; bindTopBar(); return; }
  app.innerHTML = `${topBar()}<div class="card"><h2>Kullanıcılar (${users.length})</h2>${users.map((u) => `<div class="row">
    <span>${esc(u.name)}<br><span class="muted">${esc(u.email)} · ${u.groupCount} grup</span></span>
    <select data-uid="${esc(u.id)}" ${u.id === me.id ? 'disabled' : ''}><option value="user" ${u.role === 'user' ? 'selected' : ''}>kullanıcı</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>yönetici</option></select></div>`).join('')}
    <div id="aerr"></div></div>`;
  bindTopBar();
  app.querySelectorAll('select[data-uid]').forEach((sel) => {
    sel.onchange = async () => {
      try { await api('PATCH', `/admin/users/${sel.dataset.uid}/role`, { role: sel.value }); const ok = $('#aerr'); ok.textContent = 'Rol güncellendi'; ok.className = 'pos'; }
      catch (err) { showError($('#aerr'), err); adminView(); }
    };
  });
}

// ---------- Ana sayfa ----------
async function homeView() {
  const { groups } = await api('GET', '/groups');
  app.innerHTML = `${topBar()}
    <div class="card"><h2>Yeni grup</h2><input id="gn" placeholder="Grup adı (ör. Ev arkadaşları)" maxlength="60"><button id="mk">Grup oluştur</button></div>
    <div class="card"><h2>Davet koduyla katıl</h2><input id="code" placeholder="Davet kodu" maxlength="20"><button class="ghost" id="jn">Katıl</button><div id="err"></div></div>
    <div class="card"><h2>Gruplarım</h2>${groups.length
      ? groups.map((g) => `<div class="row"><span>${esc(g.name)}</span><a href="#/g/${esc(g.id)}">Aç</a></div>`).join('')
      : '<p class="muted">Henüz grubun yok.</p>'}</div>`;
  bindTopBar();
  $('#mk').onclick = async () => {
    const name = $('#gn').value.trim();
    if (!name) return;
    try { const g = await api('POST', '/groups', { name }); location.hash = `#/g/${g.id}`; } catch (e) { showError($('#err'), e); }
  };
  $('#jn').onclick = async () => {
    try { const g = await api('POST', '/groups/join', { code: $('#code').value.trim() }); location.hash = `#/g/${g.id}`; } catch (e) { showError($('#err'), e); }
  };
}

// ---------- Grup sayfası ----------
async function groupView(gid) {
  const g = await api('GET', `/groups/${gid}`);
  const names = Object.fromEntries(g.members.map((m) => [m.id, m.name]));
  const nm = (u) => (u === me.id ? 'Sen' : names[u] || '?');
  const inviteLink = `${location.origin}${location.pathname}#join=${g.inviteCode}`;
  const memberOpts = (sel) => g.members.map((m) => `<option value="${esc(m.id)}" ${m.id === sel ? 'selected' : ''}>${esc(nm(m.id))}</option>`).join('');

  app.innerHTML = `<header class="hero"><a class="back" href="#/">← Gruplar</a><h1>${esc(g.name)}</h1></header>
  <section class="card"><h2>Davet</h2><p>Kod: <b>${esc(g.inviteCode)}</b></p>
    <input id="link" readonly value="${esc(inviteLink)}"><button class="ghost" id="copy">Linki kopyala</button></section>

  <section class="card"><h2>Harcama ekle</h2><form id="ef">
    <input name="title" placeholder="Ne için? (market, elektrik…)" required maxlength="120">
    <input name="amount" type="text" inputmode="decimal" placeholder="Tutar (₺)" required>
    <select name="paidBy">${g.members.map((m) => `<option value="${esc(m.id)}" ${m.id === me.id ? 'selected' : ''}>${esc(nm(m.id))} ödedi</option>`).join('')}</select>
    <select name="type"><option value="equal">Eşit böl</option><option value="percent">Yüzdeyle böl</option><option value="exact">Tutarla böl</option></select>
    <div id="parts">${g.members.map((m) => `<label class="member-row"><input type="checkbox" checked value="${esc(m.id)}">${esc(nm(m.id))}<input type="number" step="0.01" min="0" placeholder="" hidden></label>`).join('')}</div>
    <button>Ekle</button><div id="eerr"></div></form></section>

  <section class="card"><h2>Grup üyeleri</h2>${g.members.map((m) => `<div class="row"><span>${esc(nm(m.id))}${m.id === g.ownerId ? ' <span class="badge">sahip</span>' : ''}</span>
    ${g.ownerId === me.id && m.id !== me.id ? `<button class="small ghost" data-kick="${esc(m.id)}">Çıkar</button>` : ''}</div>`).join('')}
    <button class="ghost" id="leave">Gruptan ayrıl</button>
    ${g.ownerId === me.id ? '<button class="ghost danger" id="delgroup">Grubu sil</button>' : ''}<div id="gerr"></div></section>
  <div id="live"></div>`;

  // Üyelik yönetimi: kurallar (bakiye sıfır olmalı, sahip ayrılamaz) sunucuda uygulanır, mesajı gösteririz.
  const memberAction = async (fn) => { try { await fn(); } catch (e) { showError($('#gerr'), e); } };
  $('#leave').onclick = () => memberAction(async () => {
    if (!confirm('Gruptan ayrılmak istediğine emin misin?')) return;
    await api('DELETE', `/groups/${gid}/members/me`); location.hash = '#/';
  });
  app.querySelectorAll('[data-kick]').forEach((b) => { b.onclick = () => memberAction(async () => {
    if (!confirm('Bu üyeyi gruptan çıkarmak istediğine emin misin?')) return;
    await api('DELETE', `/groups/${gid}/members/${b.dataset.kick}`); groupView(gid);
  }); });
  if ($('#delgroup')) $('#delgroup').onclick = () => memberAction(async () => {
    if (!confirm('Grup, tüm harcamaları ve ödemeleriyle birlikte silinecek. Emin misin?')) return;
    await api('DELETE', `/groups/${gid}`); location.hash = '#/';
  });
  $('#copy').onclick = () => { $('#link').select(); try { navigator.clipboard.writeText(inviteLink); } catch { document.execCommand('copy'); } };

  // Bölüşüm tipine göre kişi başı alan göster
  const typeSel = $('#ef select[name=type]');
  typeSel.onchange = () => {
    const t = typeSel.value;
    document.querySelectorAll('#parts input[type=number]').forEach((i) => {
      i.hidden = t === 'equal';
      i.placeholder = t === 'percent' ? '%' : '₺';
    });
  };
  $('#ef').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const rows = [...document.querySelectorAll('#parts .member-row')].filter((r) => r.querySelector('[type=checkbox]').checked);
    const type = f.type.value;
    const body = { title: f.title.value.trim(), amount: toKurus(f.amount.value), paidBy: f.paidBy.value, splitType: type };
    if (type === 'equal') body.participants = rows.map((r) => r.querySelector('[type=checkbox]').value);
    else body.shares = Object.fromEntries(rows.map((r) => {
      const v = r.querySelector('[type=number]').value;
      return [r.querySelector('[type=checkbox]').value, type === 'percent' ? parseFloat(v) : toKurus(v)];
    }));
    try { await api('POST', `/groups/${gid}/expenses`, body); f.title.value = ''; f.amount.value = ''; $('#eerr').textContent = ''; refresh(); }
    catch (err) { showError($('#eerr'), err); }
  };

  async function refresh() {
    const [bal, exp, act] = await Promise.all([
      api('GET', `/groups/${gid}/balances`), api('GET', `/groups/${gid}/expenses`), api('GET', `/groups/${gid}/activity`),
    ]);
    $('#live').innerHTML = `
      <section class="card receipt"><h2>Kim kime ne kadar</h2>${bal.transfers.length
        ? bal.transfers.map((t, k) => `<div class="row"><span>${esc(nm(t.from))} → ${esc(nm(t.to))}</span><span><b>${tl(t.amount)}</b>
            ${t.from === me.id ? `<button class="small ghost" data-pay="${k}">Ödedim</button>` : ''}</span></div>`).join('')
        : '<p class="muted">Borç yok, hesap denk.</p>'}</section>
      <section class="card"><h2>Bakiyeler</h2>${g.members.map((m) => {
        const b = bal.balances[m.id] || 0;
        return `<div class="row"><span>${esc(nm(m.id))}</span><b class="${b >= 0 ? 'pos' : 'neg'}">${b >= 0 ? '+' : '−'}${tl(Math.abs(b))}</b></div>`;
      }).join('')}</section>
      <section class="card"><h2>Geçmiş</h2>${exp.expenses.length ? exp.expenses.map((x) => `<div class="row"><span>${esc(x.title)}<br>
        <span class="muted">${esc(nm(x.paidBy))} ödedi · ${new Date(x.createdAt).toLocaleDateString('tr-TR')}</span></span>
        <span><b>${tl(x.amount)}</b> ${x.createdBy === me.id || g.ownerId === me.id ? `<button class="small ghost" data-del="${esc(x.id)}">Sil</button>` : ''}</span></div>`).join('') : '<p class="muted">Henüz harcama yok.</p>'}</section>
      <section class="card"><h2>Etkinlik</h2>${act.activity.length ? act.activity.map((a) => `<div class="row"><span>${esc(a.message)}</span><span class="muted">${new Date(a.createdAt).toLocaleString('tr-TR')}</span></div>`).join('') : '<p class="muted">Henüz etkinlik yok.</p>'}</section>`;
    document.querySelectorAll('[data-pay]').forEach((b) => {
      b.onclick = async () => {
        const t = bal.transfers[b.dataset.pay];
        if (!confirm(`${nm(t.to)} kişisine ${tl(t.amount)} ödediğini kaydet?`)) return;
        try { await api('POST', `/groups/${gid}/settlements`, { to: t.to, amount: t.amount }); refresh(); } catch (err) { alert(err.message); }
      };
    });
    document.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Bu harcama silinsin mi?')) return;
        try { await api('DELETE', `/groups/${gid}/expenses/${b.dataset.del}`); refresh(); } catch (err) { alert(err.message); }
      };
    });
  }
  await refresh();
}

// ---------- Yönlendirme ----------
async function route() {
  try {
    const hash = location.hash;
    if (hash.startsWith('#join=')) { sessionStorage.setItem('pendingJoin', hash.slice(6)); history.replaceState(null, '', location.pathname); }
    if (token && !me) {
      try { me = (await api('GET', '/me')).user; } catch { /* oturum geçersiz */ }
    }
    if (!me) return authView();
    const pending = sessionStorage.getItem('pendingJoin');
    if (pending) {
      sessionStorage.removeItem('pendingJoin');
      try { const g = await api('POST', '/groups/join', { code: pending }); location.hash = `#/g/${g.id}`; return; } catch { /* kod geçersizse ana sayfaya düş */ }
    }
    const m = location.hash.match(/^#\/g\/(\w+)/);
    if (m) await groupView(m[1]);
    else if (location.hash === '#/hesap') accountView();
    else if (location.hash === '#/admin') await adminView();
    else await homeView();
  } catch (e) {
    app.innerHTML = `<header class="hero"><h1>Ortak Gider</h1></header><div class="card"><p class="error">${esc(e.message)}</p><p class="muted">Backend çalışıyor mu? (${esc(API)})</p><button id="retry">Tekrar dene</button></div>`;
    $('#retry').onclick = route;
  }
}

window.addEventListener('hashchange', route);
route();
