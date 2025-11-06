# NovaGet Browser Extensions

Düzenli ve temiz klasör yapısı ile her tarayıcı için ayrı extension build'leri.

## 📁 Klasör Yapısı

```
extension/
├── common/              # Ortak dosyalar (tüm tarayıcılar)
│   ├── popup.html      # Extension popup UI
│   ├── popup.js        # Popup logic (browser API uyumlu)
│   ├── options.html    # Ayarlar sayfası
│   ├── options.js      # Ayarlar logic
│   └── icons/          # Extension icon'ları
│
├── chrome/              # Chrome/Edge özel
│   ├── manifest.json   # Manifest V3
│   ├── background.js   # Service worker
│   └── [common files]  # Ortak dosyaların kopyaları
│
├── firefox/             # Firefox özel
│   ├── manifest.json   # Manifest V2
│   ├── background.js   # Background script (browser API)
│   └── [common files]  # Ortak dosyaların kopyaları
│
├── safari/              # Safari özel (macOS)
│   ├── manifest.json   # Manifest V2
│   ├── background.js   # Background script (HTTP only)
│   └── [common files]  # Ortak dosyaların kopyaları
│
├── dist/                # Build çıktıları
│   ├── chrome/         # Chrome için hazır extension
│   ├── firefox/        # Firefox için hazır extension
│   └── safari/         # Safari için hazır extension
│
├── build.js             # Build script
├── README.md            # Bu dosya
└── SAFARI-SETUP.md      # Safari kurulum rehberi
```

**Not:** Eski dosyalar temizlendi. Artık sadece gerekli dosyalar var!

## 🚀 Hızlı Başlangıç

### 1. Extension'ları Build Et

```cmd
cd C:\Users\meade\Documents\Code\DownloadManager
npm run build:extension
```

Veya sadece bir tarayıcı için:
```cmd
npm run build:extension:chrome
npm run build:extension:firefox
```

### 2. Chrome'da Yükle

1. `chrome://extensions/` aç
2. **Developer mode** aç
3. **"Load unpacked"** tıkla
4. `extension/dist/chrome` klasörünü seç

### 3. Firefox'ta Yükle

1. `about:debugging#/runtime/this-firefox` aç
2. **"Load Temporary Add-on"** tıkla
3. `extension/dist/firefox/manifest.json` seç

### 4. Safari'de Yükle (macOS gerekli)

Safari için özel kurulum gerekir. Detaylar için: `SAFARI-SETUP.md`

Kısaca:
1. macOS'ta Terminal aç
2. `xcrun safari-web-extension-converter dist/safari`
3. Xcode'da build et ve çalıştır

## 🔧 Geliştirme

### Ortak Dosyaları Düzenle

`common/` klasöründeki dosyaları düzenle, sonra build et:

```cmd
npm run build:extension
```

### Tarayıcı-Özel Dosyaları Düzenle

- Chrome için: `chrome/` klasöründeki dosyaları düzenle
- Firefox için: `firefox/` klasöründeki dosyaları düzenle

### Değişiklikleri Test Et

1. Build et: `npm run build:extension`
2. Tarayıcıda extension'ı yenile
3. Test et

## 📝 Dosya Açıklamaları

### common/popup.js
- **Browser API uyumlu**: Hem `chrome` hem `browser` API'sini destekler
- Firefox ve Chrome'da çalışır
- Extension ID otomatik kaydı (sadece Chrome)

### chrome/background.js
- Manifest V3 service worker
- `chrome` API kullanır
- Context menu, download interception

### firefox/background.js
- Manifest V2 background script
- `browser` API kullanır (Firefox native)
- Daha detaylı console logging
- Firefox-specific error handling

## 🎯 Özellikler

### Otomatik
- ✅ Browser API detection (Firefox vs Chrome)
- ✅ Extension ID otomatik kayıt (Chrome)
- ✅ Ortak dosyaların her build'e kopyalanması
- ✅ Temiz dist/ klasörü

### Manuel
- Extension ID güncelleme: `npm run update:extension-id`
- Native host kurulum: `npm run setup:browsers`

## 🔄 Build Süreci

1. `common/` dosyaları her iki tarayıcıya kopyalanır
2. Tarayıcı-özel dosyalar eklenir
3. `dist/` klasörüne hazır extension'lar oluşturulur

## 📦 Komutlar

```cmd
# Tüm extension'ları build et
npm run build:extension

# Sadece Chrome
npm run build:extension:chrome

# Sadece Firefox
npm run build:extension:firefox

# Native host kur (her iki tarayıcı)
npm run setup:browsers

# Chrome extension ID güncelle
npm run update:extension-id
```

## 🐛 Sorun Giderme

### "Can't access property 'id'" (Firefox)
✅ Çözüldü: `popup.js` artık `browser` API kullanıyor

### Extension yüklenmiyor
1. Build et: `npm run build:extension`
2. `dist/` klasöründen yükle (kaynak klasörlerden değil!)

### Connection failed
1. Desktop app çalışıyor mu? `npm run dev`
2. Native host kurulu mu? `npm run setup:browsers`

## 📚 Daha Fazla Bilgi

- Chrome kurulum: `../CHROME-SETUP.md`
- Firefox debug: `../FIREFOX-DEBUG.md`
- Hızlı başlangıç: `../QUICK-START.md`
