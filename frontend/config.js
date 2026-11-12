// Sadece herkese açık ayarlar. Gizli anahtar (API key vb.) buraya ASLA yazılmaz.
// Tek depoda backend aynı sunucuya hizmet verirse '/api' yeterlidir.
// Yerelde frontend (5173) ve backend (3000) ayrıysa otomatik localhost:3000/api kullanılır.
window.APP_CONFIG = {
  API_URL: (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : '/api',
};
