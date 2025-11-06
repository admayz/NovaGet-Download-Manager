# Implementation Plan

- [x] 1. Proje yapısını ve temel konfigürasyonu oluştur
  - Electron + Next.js monorepo yapısını kur
  - TypeScript konfigürasyonunu ayarla
  - TailwindCSS ve gerekli UI kütüphanelerini ekle
  - ESLint ve Prettier konfigürasyonunu yap
  - _Requirements: 1.1, 14.1_

- [x] 2. SQLite veritabanı ve DatabaseService'i implement et

  - [x] 2.1 Database şemasını oluştur
    - Downloads, Segments, Settings ve SpeedHistory tablolarını oluştur
    - Index'leri ve foreign key constraint'leri ekle
    - Migration sistemi kur
    - _Requirements: 9.1, 14.1_
  
  - [x] 2.2 DatabaseService class'ını implement et
    - CRUD operasyonları için metodları yaz
    - Segment progress kaydetme/okuma metodlarını implement et
    - Settings get/set metodlarını yaz
    - İstatistik hesaplama metodlarını ekle
    - _Requirements: 9.1, 9.3, 14.1, 14.4_
  
  - [ ]* 2.3 DatabaseService için unit testler yaz
    - CRUD operasyonlarını test et
    - Transaction rollback senaryolarını test et
    - Concurrent access testleri yaz
    - _Requirements: 9.1, 14.1_

- [-] 3. Download Engine core bileşenlerini implement et

  - [x] 3.1 Segment class'ını implement et
    - HTTP Range request ile segment indirme
    - Resume desteği için progress tracking
    - Temp file yönetimi
    - _Requirements: 1.3, 2.3_
  
  - [x] 3.2 SpeedLimiter class'ını implement et
    - Token bucket algoritması ile rate limiting
    - Global ve per-download hız sınırlama
    - Dinamik hız ayarlama
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 3.3 Download class'ını implement et
    - Segment initialization ve yönetimi
    - Paralel segment indirme koordinasyonu
    - Segment birleştirme (merge) işlemi
    - Pause/resume mekanizması
    - Retry logic ve error handling
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 15.4_
  
  - [x] 3.4 DownloadManager class'ını implement et
    - Download queue yönetimi
    - Concurrent download limiti kontrolü
    - Download lifecycle yönetimi (add, pause, resume, cancel)
    - Progress tracking ve event emission
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 15.3_
  
  - [ ]* 3.5 Download Engine için unit testler yaz
    - Segment indirme testleri (mocked HTTP)
    - SpeedLimiter algoritma testleri
    - Download pause/resume testleri
    - DownloadManager queue testleri
    - _Requirements: 1.1, 2.1, 3.1_

- [x] 4. Scheduler servisini implement et

  - [x] 4.1 SchedulerService class'ını oluştur
    - Planlanan indirmeleri kontrol eden timer
    - Scheduled time geldiğinde download başlatma
    - Missed schedule handling (sistem kapalıyken)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ]* 4.2 Scheduler için unit testler yaz
    - Zamanlama logic testleri
    - Missed schedule testleri
    - _Requirements: 4.1, 4.2, 4.4_

- [x] 5. AI Service'i implement et

  - [x] 5.1 AIService class'ını oluştur
    - Pollinations.ai API client
    - Categorization endpoint entegrasyonu
    - Smart naming endpoint entegrasyonu
    - Tagging endpoint entegrasyonu
    - Response parsing ve error handling
    - _Requirements: 6.1, 6.2, 7.1, 7.2, 8.1, 8.2_
  

  - [x] 5.2 AI caching mekanizmasını implement et
    - In-memory cache (Map)
    - Cache expiration logic
    - Cache hit/miss tracking
    - _Requirements: 6.4, 7.4, 8.4_
  
  - [x] 5.3 Rate limiter ekle
    - API rate limit kontrolü (10 req/min)
    - Request queue yönetimi
    - _Requirements: 6.3, 7.4, 8.4_
  
  - [ ]* 5.4 AI Service için testler yaz
    - API çağrılarını mock'la ve test et
    - Cache mekanizmasını test et
    - Rate limiter testleri
    - Fallback logic testleri
    - _Requirements: 6.1, 6.4, 7.1, 8.1_

- [x] 6. IPC Bridge'i implement et

  - [x] 6.1 Main process IPC handler'larını yaz
    - download:add, pause, resume, cancel handler'ları
    - download:getAll handler'ı
    - settings:get, settings:set handler'ları
    - _Requirements: 1.1, 2.1, 14.2, 14.3_
  
  - [x] 6.2 Event emission sistemini kur
    - Progress update events
    - Download complete events
    - Error events
    - _Requirements: 1.1, 11.3, 13.1_
  
  - [x] 6.3 Preload script'i oluştur
    - contextBridge ile güvenli API expose et
    - TypeScript type definitions
    - _Requirements: 1.1, 2.1_
  
  - [ ]* 6.4 IPC integration testleri yaz
    - Main-renderer communication testleri
    - Event emission testleri
    - _Requirements: 1.1, 2.1_

- [x] 7. Electron main process'i kur

  - [x] 7.1 Main window oluşturma ve yönetimi
    - BrowserWindow konfigürasyonu
    - Window state persistence
    - Deep linking support
    - _Requirements: 1.1_
  
  - [x] 7.2 System tray entegrasyonu
    - Tray icon ve menu
    - Minimize to tray
    - Quick actions (pause all, resume all)
    - _Requirements: 11.1, 11.2, 11.4_
  
  - [x] 7.3 Notification sistemi
    - Download complete notifications
    - Error notifications
    - _Requirements: 11.3_
  
  - [x] 7.4 App lifecycle yönetimi
    - Graceful shutdown
    - Download state persistence
    - Settings loading
    - _Requirements: 14.4, 15.4_

- [x] 8. Clipboard watcher'ı implement et

  - [x] 8.1 ClipboardWatcher class'ını oluştur
    - Clipboard polling (2 saniye interval)
    - URL detection regex
    - User confirmation dialog
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [x] 8.2 Protocol support ekle
    - HTTP/HTTPS/FTP URL validation
    - _Requirements: 12.4_

- [x] 9. Browser Extension'ı implement et

  - [x] 9.1 Chrome Extension (MV3) oluştur
    - manifest.json konfigürasyonu
    - Background service worker
    - Download interception
    - _Requirements: 5.1, 5.2_
  
  - [x] 9.2 Native messaging host'u implement et
    - Node.js native host script
    - Message parsing ve handling
    - Electron app ile iletişim
    - _Requirements: 5.3, 5.4_
  
  - [x] 9.3 Installation script'leri yaz
    - Windows registry setup
    - Chrome/Edge manifest installation
    - _Requirements: 5.1_

- [x] 10. Next.js UI foundation'ı kur

  - [x] 10.1 App Router yapısını oluştur
    - Layout component
    - Page routing (dashboard, downloads, settings, history)
    - Navigation component
    - _Requirements: 1.1, 9.2_
  
  - [x] 10.2 TailwindCSS tema sistemini kur
    - Mor/lacivert color palette
    - Dark/light mode support
    - Custom component styles
    - _Requirements: 14.2_
  
  - [x] 10.3 Zustand store'u implement et
    - Download state management
    - Settings state management
    - IPC event listeners
    - _Requirements: 1.1, 9.2, 14.3_

- [x] 11. Core UI component'lerini implement et

  - [x] 11.1 DownloadCard component
    - Download bilgilerini göster
    - Progress bar
    - Action buttons (pause, resume, cancel)
    - _Requirements: 1.1, 2.1, 9.2_
  
  - [x] 11.2 ProgressBar component
    - Percentage gösterimi
    - Segment progress visualization
    - _Requirements: 1.1, 13.3_
  
  - [x] 11.3 AddDownloadDialog component
    - URL input
    - Directory picker
    - Advanced options (segments, speed limit, schedule)
    - _Requirements: 1.1, 3.3, 4.1_
  
  - [x] 11.4 SpeedChart component
    - Real-time speed graph (son 60 saniye)
    - Chart.js veya Recharts entegrasyonu
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [x] 11.5 DownloadList component

    - Filtreleme (status, category)
    - Sıralama (date, size, speed)
    - Bulk actions
    - _Requirements: 9.2, 10.3_

- [x] 12. Dashboard page'i implement et

  - [x] 12.1 Active downloads section
    - Aktif indirmeleri listele
    - Quick stats (total speed, remaining time)
    - _Requirements: 1.1, 1.2, 13.1_
  
  - [x] 12.2 Quick actions section
    - Add download button
    - Pause all / Resume all buttons
    - _Requirements: 1.1, 2.1_
  
  - [x] 12.3 Statistics cards
    - Total downloads
    - Total data downloaded
    - Average speed
    - _Requirements: 9.3_

- [x] 13. Downloads page'i implement et

  - [x] 13.1 Download list view
    - Tüm indirmeleri göster
    - Status filter (all, downloading, paused, completed, failed)
    - Category filter
    - _Requirements: 9.2, 10.3_
  
  - [x] 13.2 Download detail view
    - Detaylı bilgiler
    - Segment progress
    - Speed chart
    - AI suggestions (category, tags, name)
    - _Requirements: 6.1, 7.2, 8.1, 13.2_
  
  - [x] 13.3 Bulk actions
    - Select multiple downloads
    - Pause/resume/cancel selected
    - Delete selected
    - _Requirements: 2.1, 15.3_

- [x] 14. History page'i implement et

  - [x] 14.1 Completed downloads listesi
    - Tarih sıralı liste
    - Search functionality
    - _Requirements: 9.2_
  
  - [x] 14.2 Statistics dashboard
    - Grafikler (günlük/haftalık/aylık)
    - Category breakdown
    - _Requirements: 9.3_

  - [x] 14.3 Export functionality
    - CSV export
    - _Requirements: 9.2_

- [x] 15. Settings page'i implement et

  - [x] 15.1 General settings
    - Default download directory picker
    - Max concurrent downloads slider
    - Segments per download slider
    - _Requirements: 14.2, 14.3_
  
  - [x] 15.2 Speed settings
    - Global speed limit input
    - Enable/disable speed limiting
    - _Requirements: 3.1, 3.2_
  
  - [x] 15.3 AI settings
    - Enable/disable auto categorization
    - Enable/disable smart naming
    - Enable/disable auto tagging
    - _Requirements: 6.1, 7.1, 8.1_
  
  - [x] 15.4 Appearance settings
    - Theme toggle (light/dark)
    - Language selection (future)
    - _Requirements: 14.2_
  
  - [x] 15.5 Advanced settings
    - Enable/disable clipboard watching
    - Enable/disable system tray
    - Notification preferences
    - _Requirements: 11.4, 12.1_

- [x] 16. Category management sistemini implement et

  - [x] 16.1 Category detection logic
    - AI response parsing
    - Fallback kategorileri (extension-based)
    - _Requirements: 6.1, 6.2, 6.4_
  
  - [x] 16.2 Auto folder organization
    - Category-based folder creation
    - File moving logic
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 16.3 Category filter UI
    - Category tabs/chips
    - Category icons
    - _Requirements: 10.3_

- [x] 17. Error handling ve recovery sistemini implement et

  - [x] 17.1 Global error boundary
    - React error boundary
    - Error logging
    - User-friendly error messages
    - _Requirements: 15.1, 15.2_
  
  - [x] 17.2 Network error handling
    - Connection loss detection
    - Auto-pause on disconnect
    - Auto-resume on reconnect
    - _Requirements: 15.4_
  
  - [x] 17.3 Retry mechanism
    - Exponential backoff
    - Max retry limit
    - _Requirements: 1.5, 15.3_
  
  - [x] 17.4 Error notification system
    - Toast notifications
    - Error details modal
    - _Requirements: 15.2_

- [x] 18. Performance optimizasyonları yap

  - [x] 18.1 UI performance
    - Progress update throttling
    - Virtual scrolling for large lists
    - Memoization for expensive computations
    - _Requirements: 13.1_
  
  - [x] 18.2 Database performance
    - Batch operations
    - Prepared statements
    - Index optimization
    - _Requirements: 9.1_
  
  - [x] 18.3 Memory management
    - Stream-based file operations
    - Segment buffer cleanup
    - _Requirements: 1.3_

- [x] 19. Security measures implement et

  - [x] 19.1 URL validation
    - Protocol whitelist
    - Malicious URL detection
    - _Requirements: 12.4_
  
  - [x] 19.2 Path sanitization
    - Directory traversal prevention
    - Safe filename generation
    - _Requirements: 10.2_
  
  - [x] 19.3 Electron security
    - contextIsolation enable
    - nodeIntegration disable
    - CSP headers
    - _Requirements: 1.1_

- [x] 20. Çoklu dil desteği (i18n) implement et

  - [x] 20.1 i18nService class'ını oluştur
    - JSON dosyalarından dil çevirilerini yükleme
    - Dil değiştirme fonksiyonu
    - Çeviri anahtarlarını çözümleme (nested keys)
    - Parametre interpolasyonu ({{variable}} formatı)
    - Fallback mekanizması (İngilizce)
    - _Requirements: 16.1, 16.2, 16.3_
  
  - [x] 20.2 Dil dosyalarını oluştur
    - locales/tr.json dosyası (Türkçe çeviriler)
    - locales/en.json dosyası (İngilizce çeviriler)
    - Tüm UI metinlerini kapsayan çeviri anahtarları
    - Common, download, settings, error kategorileri
    - _Requirements: 16.1, 16.3_
  
  - [x] 20.3 IPC handler'larını ekle
    - i18n:setLanguage handler'ı
    - i18n:getLanguage handler'ı
    - i18n:translate handler'ı
    - Dil değişikliğini SQLite_Database'e kaydetme
    - _Requirements: 16.2, 16.4_
  
  - [x] 20.4 React hook'unu implement et
    - useTranslation hook'u
    - Zustand store ile dil state yönetimi
    - t() fonksiyonu (çeviri fonksiyonu)
    - Dil değiştirme fonksiyonu
    - _Requirements: 16.2, 16.5_
  
  - [x] 20.5 UI component'lerini güncelle
    - Tüm hard-coded metinleri t() ile değiştir
    - Settings page'e dil seçici ekle
    - Dil değişikliğinde UI'ı yeniden render et
    - _Requirements: 16.2, 16.5_
  
  - [ ]* 20.6 i18n testleri yaz
    - Dil yükleme testleri
    - Çeviri çözümleme testleri
    - Fallback mekanizması testleri
    - Parametre interpolasyonu testleri
    - _Requirements: 16.1, 16.3_

- [x] 21. VirusTotal entegrasyonu ile güvenlik kontrolü

  - [x] 21.1 VirusTotalService class'ını oluştur
    - VirusTotal API v3 client
    - File hash (SHA256) hesaplama
    - URL/file scan endpoint entegrasyonu
    - Scan sonuçlarını parse etme
    - Rate limiting (4 req/min free tier)
    - _Requirements: 1.1, 15.1_
  
  - [x] 21.2 Pre-download güvenlik kontrolü
    - İndirme başlamadan önce URL'i VirusTotal'e gönder
    - Scan sonucunu bekle (max 30 saniye timeout)
    - Pozitif tespit varsa kullanıcıya uyarı göster
    - Kullanıcı onayı ile indirmeye devam et veya iptal et
    - _Requirements: 1.1, 15.1, 15.2_
  
  - [x] 21.3 Post-download dosya kontrolü
    - İndirme tamamlandıktan sonra dosyanın SHA256 hash'ini hesapla
    - Hash'i VirusTotal'e gönder ve sonuç al
    - Virüs tespit edilirse kullanıcıya bildirim göster
    - Kullanıcıya dosyayı silme veya karantinaya alma seçeneği sun
    - _Requirements: 1.1, 15.1, 15.2_
  
  - [x] 21.4 Güvenlik ayarları UI'ı
    - Settings page'e VirusTotal API key input ekle
    - Otomatik virüs taraması enable/disable toggle
    - Pre-download vs post-download tarama seçeneği
    - Güvenlik geçmişi ve istatistikleri
    - _Requirements: 14.2, 15.1_
  
  - [x] 21.5 Güvenlik bildirimleri ve dialog'ları
    - Virüs tespit edildiğinde warning dialog
    - Kullanıcı onay dialog'u (devam et/iptal et)
    - Karantina klasörü yönetimi
    - Güvenlik logları
    - _Requirements: 11.3, 15.2_
  
  - [ ]* 21.6 VirusTotal servis testleri
    - API çağrılarını mock'la ve test et
    - Hash hesaplama testleri
    - Rate limiter testleri
    - Timeout ve error handling testleri
    - _Requirements: 15.1_

- [ ] 22. Modern Browser Extension UI'ı implement et

  - [ ] 22.1 Extension popup component'ini oluştur
    - React ile modern popup UI yaz
    - Bağlantı durumu göstergesi ekle
    - Auto-intercept toggle ekle
    - Test connection butonu ekle
    - Dil seçici dropdown ekle (Türkçe/İngilizce)
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [ ] 22.2 Extension styling'i yap
    - Mor/lacivert gradient tema uygula
    - Responsive tasarım (min 320px)
    - Smooth animations ekle
    - Modern card-based layout
    - _Requirements: 17.1, 17.4, 17.5_
  
  - [ ] 22.3 Extension settings sayfası oluştur
    - Options page için UI
    - Minimum file size ayarı
    - Whitelist/blacklist domain yönetimi
    - Dil tercihi ayarı
    - _Requirements: 17.3, 18.4_
  
  - [ ] 22.4 Extension i18n desteği ekle
    - Extension için dil dosyaları oluştur (tr.json, en.json)
    - chrome.i18n API entegrasyonu
    - Dil değişikliğinde UI güncelleme
    - _Requirements: 16.1, 17.1_
  
  - [ ] 22.5 Extension build sistemi kur
    - React build konfigürasyonu
    - Webpack/Vite setup
    - Manifest v3 uyumluluğu
    - _Requirements: 17.1_

- [ ] 23. Otomatik indirme engelleme sistemini implement et

  - [ ] 23.1 Download interception logic'i yaz
    - chrome.downloads.onCreated listener
    - Download cancel mekanizması
    - Minimum file size kontrolü (1 MB)
    - _Requirements: 18.1, 18.2, 18.4_
  
  - [ ] 23.2 Download bilgilerini NovaGet'e ilet
    - Native messaging ile veri gönderimi
    - Download metadata (URL, filename, referrer)
    - Error handling
    - _Requirements: 18.3_
  
  - [ ] 23.3 User preferences yönetimi
    - Auto-intercept enable/disable
    - Domain whitelist/blacklist
    - File type filters
    - _Requirements: 18.5_
  
  - [ ] 23.4 Background service worker'ı güncelle
    - Download event handling
    - State management
    - Connection monitoring
    - _Requirements: 18.1, 18.2_

- [ ] 24. Sosyal medya indirme özelliğini implement et

  - [ ] 24.1 SocialMediaService class'ını oluştur
    - Platform detection (YouTube, Instagram, TikTok, Google)
    - yt-dlp entegrasyonu
    - Media info extraction
    - Quality parsing
    - _Requirements: 19.1, 19.4_
  
  - [ ] 24.2 Content script'i yaz
    - MediaDetector class
    - Platform-specific button injection
    - DOM observer
    - _Requirements: 19.1, 19.6_
  
  - [ ] 24.3 Download button component'i oluştur
    - Floating download button
    - Hover animations
    - Sağ alt köşe positioning
    - _Requirements: 19.6_
  
  - [ ] 24.4 Quality selector modal'ı implement et
    - Quality options listesi
    - Format ve size bilgileri
    - Download başlatma
    - _Requirements: 19.2, 19.3, 19.5_
  
  - [ ] 24.5 Platform-specific injector'ları yaz
    - YouTube video player injection
    - Instagram post/story injection
    - TikTok video injection
    - Google Images injection
    - _Requirements: 19.1, 19.4_
  
  - [ ] 24.6 Background message handler'ları ekle
    - getMediaQualities handler
    - startDownload handler
    - Platform API çağrıları
    - _Requirements: 19.2, 19.3_
  
  - [ ] 24.7 yt-dlp binary'sini bundle'a
    - Platform-specific binaries (Windows, macOS, Linux)
    - Auto-update mekanizması
    - Path resolution
    - _Requirements: 19.4_
  
  - [ ]* 24.8 Sosyal medya indirme testleri yaz
    - Platform detection testleri
    - Media extraction testleri
    - Quality parsing testleri
    - _Requirements: 19.1, 19.4_

- [ ] 25. Speedtest özelliğini implement et

  - [ ] 25.1 SpeedtestService class'ını oluştur
    - Ping measurement
    - Download speed measurement
    - Upload speed measurement
    - Jitter calculation
    - _Requirements: 20.1, 20.2, 20.3, 20.4_
  
  - [ ] 25.2 Database schema'yı güncelle
    - speedtest_results tablosu oluştur
    - Index'leri ekle
    - Migration script'i yaz
    - _Requirements: 20.5_
  
  - [ ] 25.3 IPC handler'larını ekle
    - speedtest:run handler
    - speedtest:getHistory handler
    - speedtest:delete handler
    - _Requirements: 20.1, 20.5_
  
  - [ ] 25.4 SpeedtestPanel component'ini oluştur
    - Start test button
    - Testing indicator (spinner)
    - Result cards (download, upload, ping, jitter)
    - _Requirements: 20.1, 20.2, 20.3, 20.4_
  
  - [ ] 25.5 Speedtest history UI'ı implement et
    - History table
    - Chart visualization (line chart)
    - Date filtering
    - _Requirements: 20.6_
  
  - [ ] 25.6 SpeedtestChart component'ini oluştur
    - Line chart for speed history
    - Multiple series (download, upload)
    - Time-based x-axis
    - _Requirements: 20.6_
  
  - [ ] 25.7 Speedtest timeout handling
    - 30 saniye timeout
    - Progress indicator
    - Cancel functionality
    - _Requirements: 20.7_
  
  - [ ]* 25.8 Speedtest testleri yaz
    - Speed measurement testleri (mocked)
    - Timeout testleri
    - Database persistence testleri
    - _Requirements: 20.1, 20.5_

- [ ] 26. Build ve packaging sistemini kur
  - [ ] 26.1 Build scripts
    - Next.js production build
    - Electron build
    - Asset optimization
    - _Requirements: 1.1_
  
  - [ ] 26.2 Electron-builder konfigürasyonu
    - Windows NSIS installer
    - macOS DMG
    - Linux AppImage ve DEB
    - _Requirements: 1.1_
  
  - [ ] 26.3 Auto-updater entegrasyonu
    - Update check on startup
    - Download and install updates
    - Release notes display
    - _Requirements: 1.1_

- [ ]* 27. Integration testleri yaz
  - Complete download flow testi
  - Pause/resume flow testi
  - Settings persistence testi
  - AI integration testi
  - VirusTotal integration testi
  - Extension integration testi
  - _Requirements: 1.1, 2.1, 6.1, 14.3, 15.1, 17.1_

- [ ]* 28. E2E testleri yaz
  - Playwright ile UI testleri
  - Browser extension integration testi
  - Multi-download scenario testleri
  - Security warning flow testleri
  - Social media download testleri
  - _Requirements: 1.1, 5.1, 15.1, 19.1_

- [ ] 29. Extension ve sosyal medya entegrasyonunu test et

  - [ ] 29.1 Extension UI testleri
    - Popup rendering testleri
    - Connection status testleri
    - Toggle functionality testleri
    - Dil değiştirme testleri
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [ ] 29.2 Download interception testleri
    - Auto-intercept flow testleri
    - Minimum size filter testleri
    - Domain whitelist/blacklist testleri
    - _Requirements: 18.1, 18.2, 18.4, 18.5_
  
  - [ ] 29.3 Sosyal medya integration testleri
    - YouTube video detection testleri
    - Instagram media detection testleri
    - Quality selector testleri
    - Download başlatma testleri
    - _Requirements: 19.1, 19.2, 19.3_

- [ ] 30. Documentation yaz
  - [ ] 30.1 README.md
    - Proje açıklaması
    - Installation guide
    - Usage guide
    - VirusTotal API key setup
    - Extension kurulum rehberi
    - _Requirements: 1.1, 17.1_
  
  - [ ] 30.2 API documentation
    - IPC API reference
    - Component API reference
    - VirusTotal integration guide
    - Social media service guide
    - _Requirements: 1.1, 19.1_
  
  - [ ] 30.3 User guide
    - Feature walkthrough
    - Troubleshooting
    - FAQ
    - Security features guide
    - Extension kullanım kılavuzu
    - _Requirements: 1.1, 17.1_

- [ ] 31. Final polish ve bug fixes
  - [ ] 31.1 UI/UX refinements
    - Animation polish
    - Responsive design fixes
    - Accessibility improvements
    - Extension UI polish
    - _Requirements: 1.1, 17.1_
  
  - [ ] 31.2 Performance profiling
    - Memory leak checks
    - CPU usage optimization
    - Speedtest performance optimization
    - _Requirements: 1.1, 20.7_
  
  - [ ] 31.3 Cross-platform testing
    - Windows testing
    - macOS testing
    - Linux testing
    - Extension cross-browser testing (Chrome, Edge, Brave)
    - _Requirements: 1.1, 17.1_
