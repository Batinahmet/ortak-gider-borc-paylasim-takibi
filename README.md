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
- Yapay zeka: fiş okuma ve borç özeti (Anthropic; anahtar yoksa bu uçlar kapalı)
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

## Yayına alma (tek link)

Backend'in `server.js` zaten `frontend/` klasörünü statik olarak sunuyor, bu yüzden sadece backend'i dağıtman yeterli:

- **Render:** `render.yaml` zaten backend'de var. `npm start` komutu ile çalışır.
- **Diğer platformlar:** `npm install && npm start` çalıştırılmalı; `PORT` ortam değişkeni sunucu tarafından verilir.

`.env` dosyasını asla repoya ekleme; sadece `.env.example`'i paylaş.

## Eski depolar

Bu repo aşağıdaki iki depoyu birleştirir:

- `Ortak-Gider-Payla-m-Ve-Bor-Takibi-Frontand`
- `Ortak-Gider-Payla-m-Ve-Bor-Takibi-backand`

İki deposunun da geçmişi ayrı korunmak istenirse, bu klasörde yeni bir Git reposu başlatıp her iki eski depodan da içeri aktarılabilir. Aksi halde bu yapı sıfırdan tek rep olarak kullanılabilir.

## Lisans

İlk sürüm; açık geliştirmeye açıktır.
