import { createApp } from './app.js';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendPath = join(__dirname, '..', 'frontend');

const app = createApp();

// Arayüz dosyalarını (HTML/CSS/JS) aynı sunucudan sun: tek link, tek origin.
app.use(express.static(frontendPath));

// Hash-tabanlı istemci yönlendirmesi: API dışındaki istekler index.html'e düşer.
app.get(/^(?!\/api)(?!\/health).*$/, (_req, res) => {
  res.sendFile(join(frontendPath, 'index.html'));
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Ortak Gider API + Arayüz http://localhost:${port} adresinde çalışıyor`);
});
