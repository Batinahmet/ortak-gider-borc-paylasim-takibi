# Ortak Gider Borç Paylaşım Takibi

Ev arkadaşları ve gruplar için ortak gider paylaşımı ve borç takibi uygulaması.
Frontend ve backend tek bir GitHub deposunda, tek bir linkle çalışır (backend aynı zamanda arayüz dosyalarını da sunar).

```
ortak-gider/
├── frontend/          # HTML / CSS / JS arayüzü (derleme gerektirmez)
├── backend/           # Node.js + Express + SQLite API
├── README.md          # Bu dosya
├── package.json       # Kök komutlar
├── .env.example       # Ortam değişkenleri örneği
└── .gitignore
```

## Özellikler

- Kayıt / giriş, şifre hashleme (`scrypt`), oturum yönetimi, giriş kilidi
- Gruplar, davet kodu, üyelik ve yetki (sahip / üye)
- Harcama bölüşümü: eşit, yüzde, tam tutar, kalem bazlı (fişten)
- Borç netleştirme (en az ödemeyle kapatma), ödeme kaydı, geçmiş, etkinlik akışı
- Yapay zeka kullanılmadı; borç netleştirme tamamen algoritmik (kuruş tabanlı, kesin sonuç)
- Admin paneli: kullanıcı listesi, rol değiştirme (sunucu tarafında korunur)
- 50 test (tümünü geçer)

## Çalıştırma (yerel)

Gereksinim: Node.js 22.13+

```bash
# 1. Bağımlılıkları yükle (yalnızca backend'de paket var)
cd backend
npm install

# 2. Ortam değişkenlerini oluştur
cp .env.example .env   # istediğin değerleri doldur (ANTHROPIC_API_KEY isteğe bağlı)

# 3. Geliştirme sunucusunu başlat (backend port 3000, aynı zamanda arayüzü sunar)
npm run dev            # http://localhost:3000
```

Tarayıcıda `http://localhost:3000` aç. Backend hem API (`/api/*`) hem de arayüz dosyalarını (`/`) aynı porttan sunar, bu yüzden CORS sorunu yoktur.

Frontend'i ayrı bir sunucu ile çalıştırmak istersen:

```bash
# Backend
cd backend && npm run dev   # http://localhost:3000

# Frontend (kök dizinde)
npx serve -l 5173 frontend  # http://localhost:5173
```

Örnek veri yüklemek için:

```bash
cd backend
npm run seed            # şifre: demo12345 (ayse@example.com / admin@example.com)
npm run seed:reset      # mevcut veriyi silip yeniden doldur
npm test                # 50 test
```

## Yayına alma (tek link, ücretsiz)

Backend'in `server.js` `frontend/` klasörünü de statik olarak sunuyor, bu yüzden tek servis yeterli: **Render (uygulama) + Turso (veritabanı)**.
Render'ın ücretsiz planında disk kalıcı olmadığı için SQLite dosyası yerine Turso kullanılır; `TURSO_DATABASE_URL` tanımlıysa uygulama otomatik Turso'ya bağlanır, değilse yerel SQLite dosyasını kullanır.

1. **Turso:** hesap aç, bir veritabanı oluştur; adresini (`libsql://...`) ve belirtecini (token) al.
   (Turso CLI: `turso db create ortak-gider`, `turso db show ortak-gider --url`, `turso db tokens create ortak-gider`)
2. **Render:** *New → Blueprint* ile bu depoyu seç (kökteki `render.yaml` okunur). Panelde `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` ve (isteğe bağlı) `ADMIN_EMAIL` değerlerini gir.
3. İlk açılışta tablolar otomatik oluşturulur. Örnek veri istersen kendi bilgisayarında:
   `TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm --prefix backend run seed`

Ücretsiz Render servisi 15 dakika boşta kalınca uyur; ilk istek yaklaşık 1 dakika sürebilir. Diğer platformlarda: `npm --prefix backend install && npm start`; `PORT` ortam değişkenini platform verir.

`.env` dosyasını asla repoya ekleme; sadece `.env.example`'i paylaş.

## Hafta 8 – Ara Sürüm (Vize)

Bu depo **Hafta 8“Ara Sürüm” gerekliliklerini karşılıyor**:

| Gereklilik | Durum |
|------------|-------|
| Çalışan ara sürüm (modüller entegre) | ✅ Backend + frontend tek repoda, aynı porttan çalışıyor |
| Bilinen hatalar giderilmesi | ✅ 50 test hepsi geçiyor; kod temizlendi |
| Ara sürüm etiketleme (Git tag) | 👉 Aşağıdaki komutla yapılmalı |
| Kısa demo senaryosu | ✅ Aşağıda belirtilmiştir |
| AI kullanım günlüğü | ⚠️ AI entegrasyonu çıkarıldı, borç hesaplama algoritmik |

### Demo senaryosu (ara sürüm)

1. Terminalde backend klasörüne gir:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run dev
   ```
2. Tarayıcıda `http://localhost:3000` aç.
3. Kayıt ol / giriş yap (örnek: `ayse@example.com` / `demo12345`).
4. Yeni grup oluştur (örnek: “Ev Arkadaşları”).
5. Harcama ekle (örnek: “Market”, 124,85 ₺, eşit böl).
2. Başka bir üye davet koduyla gruba katıl.
3. “Kim kime ne kadar” bölümünde otomatik hesaplanan borçları gör.
4. Ödeme kaydı yap (`Ödedim` butonu) → bakiyeler sıfırlanır.

### Git tag ile ara sürüm etiketleme

Depo kök dizininde (`borc takibi/`):

```bash
git add .
git commit -m "Hafta 8: ara sürüm, tüm modüller entegre, AI kaldırıldı"
git tag -a v1.0.0-arasurum -m "Hafta 8 Vize: çalışan ara sürüm"
git push origin main --tags
```

## Eski depolar

Bu repo aşağıdaki iki depoyu birleştirir:

- `Ortak-Gider-Payla-m-Ve-Bor-Takibi-Frontand`
- `Ortak-Gider-Payla-m-Ve-Bor-Takibi-backand`

İki deposunun da geçmişi ayrı korunmak istenirse, bu klasörde yeni bir Git reposu başlatıp her iki eski depodan da içeri aktarılabilir. Aksi halde bu yapı sıfırdan tek rep olarak kullanılabilir.

## Lisans

İlk sürüm; açık geliştirmeye açıktır.
