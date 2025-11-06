# Requirements Document

## Introduction

NovaGet, Internet Download Manager benzeri, tamamen lokalde çalışan modern bir indirme yöneticisidir. Electron.js ve Next.js teknolojileri üzerine inşa edilen uygulama, segmentli indirme, pause/resume desteği, hız kontrolü ve AI destekli akıllı dosya organizasyonu sunar. Tüm veriler SQLite veritabanında saklanır ve hiçbir sunucu bağlantısı gerektirmez. Pollinations.ai entegrasyonu ile dosyalar otomatik olarak kategorize edilir, isimlendirilir ve etiketlenir.

## Glossary

- **NovaGet_System**: Electron.js ve Next.js tabanlı masaüstü indirme yöneticisi uygulaması
- **Download_Engine**: Segmentli indirme işlemlerini yöneten Node.js modülü
- **AI_Service**: Pollinations.ai API'sini kullanarak dosya analizi yapan servis
- **SQLite_Database**: Lokal olarak indirme geçmişi, ayarlar ve metadata saklayan veritabanı
- **Browser_Extension**: Tarayıcıdan indirme linklerini yakalayan Chrome/Edge eklentisi
- **Segment**: İndirme işleminin paralel olarak gerçekleştirilen bir parçası
- **IPC_Bridge**: Electron main process ile Next.js renderer process arasındaki iletişim katmanı
- **User**: NovaGet uygulamasını kullanan son kullanıcı
- **Download_Item**: Sistemde kayıtlı bir indirme işlemi
- **Category**: AI tarafından belirlenen dosya türü sınıflandırması (Video, Yazılım, Belge, vb.)

## Requirements

### Requirement 1

**User Story:** Bir kullanıcı olarak, birden fazla bağlantıyı aynı anda hızlı bir şekilde indirmek istiyorum, böylece zamanımı verimli kullanabilirim.

#### Acceptance Criteria

1. WHEN User bir indirme URL'i eklediğinde, THE NovaGet_System SHALL Download_Item'ı kuyruğa eklemeli
2. WHILE Download_Engine aktif olduğunda, THE NovaGet_System SHALL en fazla 5 eşzamanlı indirme işlemini desteklemeli
3. WHEN bir dosya indirilirken, THE Download_Engine SHALL dosyayı en az 4 segmente bölerek paralel indirme yapmalı
4. WHEN tüm segmentler tamamlandığında, THE Download_Engine SHALL segmentleri birleştirerek tek bir dosya oluşturmalı
5. WHEN indirme başarısız olduğunda, THE NovaGet_System SHALL otomatik olarak en fazla 3 kez yeniden deneme yapmalı

### Requirement 2

**User Story:** Bir kullanıcı olarak, indirme işlemlerini duraklatıp devam ettirebilmek istiyorum, böylece bant genişliğimi ihtiyacıma göre yönetebilirim.

#### Acceptance Criteria

1. WHEN User bir Download_Item üzerinde pause komutu verdiğinde, THE NovaGet_System SHALL indirme işlemini 2 saniye içinde durdurmalı
2. WHEN pause komutu verildiğinde, THE Download_Engine SHALL mevcut segment ilerlemesini SQLite_Database'e kaydetmeli
3. WHEN User bir duraklatılmış Download_Item üzerinde resume komutu verdiğinde, THE NovaGet_System SHALL indirmeyi kaldığı yerden devam ettirmeli
4. WHEN resume komutu verildiğinde, THE Download_Engine SHALL SQLite_Database'den segment bilgilerini okuyarak indirmeye devam etmeli

### Requirement 3

**User Story:** Bir kullanıcı olarak, indirme hızını kontrol edebilmek istiyorum, böylece diğer internet aktivitelerim etkilenmesin.

#### Acceptance Criteria

1. THE NovaGet_System SHALL global hız sınırı ayarını 100 KB/s ile 100 MB/s arasında desteklemeli
2. WHEN User global hız sınırı belirlediğinde, THE Download_Engine SHALL tüm aktif indirmelere bu sınırı uygulamalı
3. WHERE User indirme başına hız sınırı belirlediğinde, THE Download_Engine SHALL o Download_Item için özel hız sınırını uygulamalı
4. WHEN hız sınırı değiştirildiğinde, THE NovaGet_System SHALL yeni ayarı 1 saniye içinde aktif etmeli

### Requirement 4

**User Story:** Bir kullanıcı olarak, indirmelerimi belirli zamanlarda başlatabilmek istiyorum, böylece gece saatlerinde veya uygun zamanlarda indirme yapabilirim.

#### Acceptance Criteria

1. WHEN User bir Download_Item için gelecek bir tarih ve saat belirlediğinde, THE NovaGet_System SHALL bu bilgiyi SQLite_Database'e kaydetmeli
2. WHEN planlanan zaman geldiğinde, THE NovaGet_System SHALL Download_Item'ı otomatik olarak başlatmalı
3. THE NovaGet_System SHALL planlanan indirmeleri her 30 saniyede bir kontrol etmeli
4. WHEN sistem kapalıyken planlanan bir indirme zamanı geçtiyse, THE NovaGet_System SHALL açılışta bu indirmeyi otomatik olarak başlatmalı

### Requirement 5

**User Story:** Bir kullanıcı olarak, tarayıcıdan indirme linklerini kolayca yakalamak istiyorum, böylece manuel olarak URL kopyalamak zorunda kalmayayım.

#### Acceptance Criteria

1. WHEN User Browser_Extension'ı yüklediğinde, THE Browser_Extension SHALL tarayıcıda indirme olaylarını dinlemeye başlamalı
2. WHEN tarayıcıda bir indirme başlatıldığında, THE Browser_Extension SHALL indirme URL'ini NovaGet_System'e iletmeli
3. WHEN Browser_Extension bir URL ilettiğinde, THE NovaGet_System SHALL tarayıcı indirmesini iptal edip kendi Download_Engine'i ile indirmeyi başlatmalı
4. THE Browser_Extension SHALL NovaGet_System ile native messaging protokolü üzerinden iletişim kurmalı

### Requirement 6

**User Story:** Bir kullanıcı olarak, indirilen dosyaların otomatik olarak kategorize edilmesini istiyorum, böylece dosyalarımı daha kolay bulabilirim.

#### Acceptance Criteria

1. WHEN bir Download_Item tamamlandığında, THE AI_Service SHALL dosya adını ve uzantısını Pollinations.ai API'sine göndermeli
2. WHEN AI_Service yanıt aldığında, THE NovaGet_System SHALL dosyaya bir Category atamalı
3. THE AI_Service SHALL dosya kategorisini 10 saniye içinde belirlemelidir
4. IF AI_Service yanıt vermezse, THEN THE NovaGet_System SHALL dosya uzantısına göre varsayılan bir Category atamalı
5. THE NovaGet_System SHALL en az şu kategorileri desteklemeli: Video, Müzik, Yazılım, Belge, Arşiv, Resim, Diğer

### Requirement 7

**User Story:** Bir kullanıcı olarak, indirilen dosyaların akıllıca isimlendirilmesini istiyorum, böylece dosya adları daha anlaşılır olsun.

#### Acceptance Criteria

1. WHEN bir Download_Item tamamlandığında, THE AI_Service SHALL orijinal dosya adını Pollinations.ai API'sine göndermeli
2. WHEN AI_Service bir öneri aldığında, THE NovaGet_System SHALL kullanıcıya yeni dosya adını göstermeli
3. WHERE User otomatik isimlendirmeyi etkinleştirdiyse, THE NovaGet_System SHALL dosyayı önerilen isimle kaydetmeli
4. THE AI_Service SHALL dosya adı önerisini 10 saniye içinde üretmelidir

### Requirement 8

**User Story:** Bir kullanıcı olarak, indirilen dosyalara otomatik etiket eklenmesini istiyorum, böylece dosyalarımı anahtar kelimelerle arayabilirim.

#### Acceptance Criteria

1. WHEN bir Download_Item tamamlandığında, THE AI_Service SHALL dosya adından en fazla 5 anahtar etiket çıkarmalı
2. WHEN etiketler oluşturulduğunda, THE NovaGet_System SHALL bu etiketleri SQLite_Database'e kaydetmeli
3. THE NovaGet_System SHALL kullanıcının etiketlere göre arama yapmasına izin vermeli
4. THE AI_Service SHALL etiketleri 10 saniye içinde üretmelidir

### Requirement 9

**User Story:** Bir kullanıcı olarak, indirme geçmişimi ve istatistiklerimi görmek istiyorum, böylece ne kadar veri indirdiğimi takip edebilirim.

#### Acceptance Criteria

1. THE NovaGet_System SHALL tüm Download_Item kayıtlarını SQLite_Database'de saklamalı
2. WHEN User geçmiş sayfasını açtığında, THE NovaGet_System SHALL tüm indirmeleri tarih sırasına göre göstermeli
3. THE NovaGet_System SHALL toplam indirilen veri miktarını, ortalama hızı ve toplam indirme sayısını hesaplamalı
4. WHEN User bir Download_Item'ı sildiğinde, THE NovaGet_System SHALL kaydı SQLite_Database'den kaldırmalı ancak dosyayı diskte bırakmalı

### Requirement 10

**User Story:** Bir kullanıcı olarak, indirme klasörlerini kategoriye göre otomatik organize etmek istiyorum, böylece dosyalarım düzenli kalsın.

#### Acceptance Criteria

1. WHERE User otomatik klasörleme özelliğini etkinleştirdiyse, THE NovaGet_System SHALL her Category için ayrı bir alt klasör oluşturmalı
2. WHEN bir Download_Item tamamlandığında ve Category atandığında, THE NovaGet_System SHALL dosyayı ilgili Category klasörüne kaydetmeli
3. THE NovaGet_System SHALL kullanıcının varsayılan indirme klasörünü değiştirmesine izin vermeli
4. WHEN varsayılan klasör değiştirildiğinde, THE NovaGet_System SHALL yeni ayarı SQLite_Database'e kaydetmeli

### Requirement 11

**User Story:** Bir kullanıcı olarak, sistem tepsisinden uygulamayı hızlıca kontrol etmek istiyorum, böylece ana pencereyi açmadan indirme durumunu görebilirim.

#### Acceptance Criteria

1. WHEN NovaGet_System başlatıldığında, THE NovaGet_System SHALL sistem tepsisinde bir simge göstermeli
2. WHEN User sistem tepsisi simgesine tıkladığında, THE NovaGet_System SHALL aktif indirmelerin özet bilgisini göstermeli
3. WHEN bir indirme tamamlandığında, THE NovaGet_System SHALL sistem tepsisinden bir bildirim göndermeli
4. THE NovaGet_System SHALL kullanıcının pencereyi kapatınca uygulamayı sistem tepsisine minimize etmesine izin vermeli

### Requirement 12

**User Story:** Bir kullanıcı olarak, clipboard'dan URL'leri otomatik yakalamak istiyorum, böylece bir link kopyaladığımda otomatik olarak indirme başlasın.

#### Acceptance Criteria

1. WHERE User clipboard izleme özelliğini etkinleştirdiyse, THE NovaGet_System SHALL clipboard içeriğini her 2 saniyede bir kontrol etmeli
2. WHEN clipboard'da geçerli bir indirme URL'i algılandığında, THE NovaGet_System SHALL kullanıcıya indirme onayı sormalı
3. WHEN User onayladığında, THE NovaGet_System SHALL Download_Item'ı kuyruğa eklemeli
4. THE NovaGet_System SHALL HTTP, HTTPS ve FTP protokollerini desteklemeli

### Requirement 13

**User Story:** Bir kullanıcı olarak, indirme sırasında hız grafiğini görmek istiyorum, böylece anlık performansı takip edebilirim.

#### Acceptance Criteria

1. WHEN bir Download_Item aktif olduğunda, THE NovaGet_System SHALL anlık indirme hızını her saniye güncellemeli
2. THE NovaGet_System SHALL son 60 saniyenin hız verilerini grafik olarak göstermeli
3. WHEN User bir Download_Item seçtiğinde, THE NovaGet_System SHALL o indirmeye özel hız grafiğini göstermeli
4. THE NovaGet_System SHALL hız verilerini KB/s, MB/s veya GB/s birimlerinde göstermeli

### Requirement 14

**User Story:** Bir kullanıcı olarak, uygulama ayarlarını özelleştirebilmek istiyorum, böylece NovaGet'i ihtiyaçlarıma göre yapılandırabilirim.

#### Acceptance Criteria

1. THE NovaGet_System SHALL kullanıcı ayarlarını SQLite_Database'de saklamalı
2. THE NovaGet_System SHALL en az şu ayarları desteklemeli: tema (açık/koyu), varsayılan indirme klasörü, maksimum eşzamanlı indirme sayısı, segment sayısı, otomatik AI özellikleri
3. WHEN User bir ayarı değiştirdiğinde, THE NovaGet_System SHALL değişikliği anında uygulamalı
4. WHEN NovaGet_System başlatıldığında, THE NovaGet_System SHALL ayarları SQLite_Database'den yüklemeli

### Requirement 15

**User Story:** Bir kullanıcı olarak, indirme hatalarını görmek ve yönetmek istiyorum, böylece başarısız indirmeleri tekrar deneyebilirim.

#### Acceptance Criteria

1. WHEN bir indirme başarısız olduğunda, THE NovaGet_System SHALL hata mesajını SQLite_Database'e kaydetmeli
2. WHEN User hatalı bir Download_Item'ı seçtiğinde, THE NovaGet_System SHALL hata detaylarını göstermeli
3. THE NovaGet_System SHALL kullanıcının başarısız indirmeleri yeniden başlatmasına izin vermeli
4. IF ağ bağlantısı kesilirse, THEN THE NovaGet_System SHALL tüm aktif indirmeleri otomatik olarak duraklatmalı ve bağlantı geri geldiğinde devam ettirmeli

### Requirement 16

**User Story:** Bir kullanıcı olarak, uygulamayı kendi dilimde kullanabilmek istiyorum, böylece arayüzü daha rahat anlayabilirim.

#### Acceptance Criteria

1. THE NovaGet_System SHALL en az Türkçe ve İngilizce dillerini desteklemeli
2. WHEN User dil ayarını değiştirdiğinde, THE NovaGet_System SHALL tüm arayüz metinlerini seçilen dile çevirmeli
3. THE NovaGet_System SHALL dil çevirilerini JSON formatında dosyalardan yüklemeli
4. WHEN NovaGet_System başlatıldığında, THE NovaGet_System SHALL kullanıcının son seçtiği dil ayarını SQLite_Database'den yüklemeli
5. THE NovaGet_System SHALL dil değişikliğini 1 saniye içinde uygulamalı

### Requirement 17

**User Story:** Bir kullanıcı olarak, modern ve kullanıcı dostu bir browser extension arayüzü kullanmak istiyorum, böylece indirme ayarlarını kolayca yönetebilirim.

#### Acceptance Criteria

1. THE Browser_Extension SHALL modern bir popup UI göstermeli
2. THE Browser_Extension SHALL bağlantı durumunu (NovaGet_System'e bağlı/bağlı değil) görsel olarak göstermeli
3. THE Browser_Extension SHALL otomatik indirme yakalama özelliğini açıp kapatma toggle'ı sunmalı
4. WHEN User extension popup'ını açtığında, THE Browser_Extension SHALL 1 saniye içinde yüklenmeli
5. THE Browser_Extension SHALL responsive tasarıma sahip olmalı ve en az 320px genişlikte çalışmalı

### Requirement 18

**User Story:** Bir kullanıcı olarak, tarayıcıdan başlatılan indirmelerin otomatik olarak NovaGet'e yönlendirilmesini istiyorum, böylece manuel müdahale gerekmeden hızlı indirme yapabilirim.

#### Acceptance Criteria

1. WHEN tarayıcıda bir dosya indirme başlatıldığında, THE Browser_Extension SHALL indirmeyi yakalamalı
2. WHEN Browser_Extension bir indirme yakaladığında, THE Browser_Extension SHALL tarayıcının varsayılan indirmesini iptal etmeli
3. WHEN indirme yakalandığında, THE Browser_Extension SHALL indirme bilgilerini NovaGet_System'e iletmeli
4. THE Browser_Extension SHALL minimum 1 MB boyutundaki dosyalar için otomatik yakalamayı uygulamalı
5. WHERE User otomatik yakalama özelliğini devre dışı bıraktıysa, THE Browser_Extension SHALL indirmelere müdahale etmemeli

### Requirement 19

**User Story:** Bir kullanıcı olarak, YouTube, Instagram, TikTok ve diğer sosyal medya platformlarından video ve fotoğraf indirebilmek istiyorum, böylece içerikleri offline izleyebilirim.

#### Acceptance Criteria

1. WHEN User YouTube, Instagram, TikTok veya Google'da bir medya içeriği görüntülediğinde, THE Browser_Extension SHALL içerik üzerinde indirme logosu göstermeli
2. WHEN User indirme logosuna tıkladığında, THE Browser_Extension SHALL mevcut kalite seçeneklerini göstermeli
3. WHEN User bir kalite seçtiğinde, THE NovaGet_System SHALL seçilen medyayı indirmeye başlamalı
4. THE NovaGet_System SHALL en az şu platformları desteklemeli: YouTube, Instagram, TikTok, Google Images
5. WHEN bir video için birden fazla kalite seçeneği varsa, THE Browser_Extension SHALL tüm seçenekleri (360p, 720p, 1080p, vb.) listelemeli
6. THE Browser_Extension SHALL medya indirme logosunu içeriğin sağ alt köşesinde göstermeli

### Requirement 20

**User Story:** Bir kullanıcı olarak, internet bağlantı hızımı test edebilmek istiyorum, böylece indirme performansımı değerlendirebilirim.

#### Acceptance Criteria

1. THE NovaGet_System SHALL kullanıcıya speedtest başlatma seçeneği sunmalı
2. WHEN User speedtest başlattığında, THE NovaGet_System SHALL download ve upload hızlarını ölçmeli
3. THE NovaGet_System SHALL speedtest sonuçlarını Mbps cinsinden göstermeli
4. THE NovaGet_System SHALL ping/latency değerini milisaniye cinsinden göstermeli
5. WHEN speedtest tamamlandığında, THE NovaGet_System SHALL sonuçları SQLite_Database'e kaydetmeli
6. THE NovaGet_System SHALL speedtest geçmişini grafik olarak göstermeli
7. THE NovaGet_System SHALL speedtest işlemini 30 saniye içinde tamamlamalı
