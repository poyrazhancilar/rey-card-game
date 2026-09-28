# REY Card Game

> **REY’i hemen oynamak için:** [https://rey.cards](https://rey.cards)

REY; hafıza, sezgi, blöf ve risk yönetimini bir araya getiren, iki oyunculu çevrim içi bir kart oyunudur. Oyuncular kapalı kartlarını hatırlamaya, rakibinin hamlelerini okumaya ve mümkün olan en düşük skorla eli tamamlamaya çalışır.

Bu proje, **Google Developer Groups On Campus - Pamukkale Üniversitesi (GDGoC Denizli Pamukkale Üni) GameJam’i** adına geliştirilmiştir.

---

## Oyun Hakkında

Her oyuncu oyuna dört kapalı kartla başlar ve yalnızca seçtiği iki kartı kısa süreliğine görür. Oyunun devamında kart çekerek, kart değiştirerek, eşleşen kartları atarak ve doğru zamanda **“REY”** diyerek rakibinden daha düşük bir el oluşturmaya çalışır.

Bir parti toplam üç elden oluşur. Üçüncü elde kazanılan veya kaybedilen skorlar üç kat uygulanır.

## İlham Kaynakları

REY’in temel oyun fikri, kapalı kartları hatırlama ve en düşük el toplamına ulaşma üzerine kurulu olan **Cabo** oyunundan ilham alır.

Ayrıca benzer hafıza, risk ve düşük skor mekaniklerini kullanan **Rat-a-Tat Cat** de projenin ilham kaynaklarından biridir.

REY; bu oyunlardan aldığı temel fikirleri özel güçler, çiftleme sistemi, REY çağrısı, Kamikaze, üç ellik parti yapısı ve gerçek zamanlı çevrim içi oynanış gibi kendine özgü mekaniklerle genişletir.

> REY bağımsız bir projedir ve adı geçen oyunların yapımcıları veya hak sahipleriyle bağlantılı değildir.

---

## Temel Özellikler

- Gerçek zamanlı, iki oyunculu çevrim içi oynanış
- Altı haneli oda koduyla masa oluşturma ve masaya katılma
- QR kod ile oda paylaşma ve mobil cihazdan QR okutma
- Tek oyunculu pratik için bot desteği
- Mobil ve masaüstü uyumlu arayüz
- Optimize edilmiş yalancı izometrik oyun masası
- Özel hazırlanmış 0–13 kart görselleri
- Üç elden oluşan parti sistemi
- Çiftleme, üçleme ve dörtleme mekanikleri
- Röntgen, Casusluk ve El Değiştirme özel güçleri
- REY çağrısı ve Kamikaze mekanikleri
- Oyuncu başına 20 saniyelik sunucu kontrollü hamle süresi
- Son saniyelerde görsel ve sesli süre uyarısı
- Kısa süreli bağlantı kesintilerinde aynı oyuna ve koltuğa geri dönme
- Bağlantısı kopan oyuncu geri gelene kadar oyunu güvenli biçimde bekletme
- Web Audio API ile oluşturulan kart, sıra ve bildirim sesleri
- Canlı oyun oturumlarını izlemek için admin/debug paneli
- Admin panelinden oyuncu ve deste kartlarına müdahale edebilme
- Docker ile tek komut production kurulumu

---

## Oyun Akışı

### 1. İlk bakış

Her oyuncuya dört kapalı kart dağıtılır. Oyuncular kendi kartlarından iki tanesini seçerek kısa süreliğine görür ve kartların konumlarını ezberler.

### 2. Hamle yapmak

Sırası gelen oyuncunun hamlesini tamamlamak için 20 saniyesi vardır. Oyuncu:

- Desteden kart çekebilir.
- Ortadaki açık kartı alabilir.
- Çektiği kartı kendi kartlarından biriyle değiştirebilir.
- Uygun kartları çiftleyebilir, üçleyebilir veya dörtleyebilir.
- Uygun durumda özel güç kullanabilir.
- Elinin yeterince düşük olduğunu düşünüyorsa “REY” diyebilir.
- Gerekli kartlara sahipse Kamikaze yapabilir.

Süre dolduğunda tamamlanmamış hamle güvenli biçimde sonlandırılır ve sıra rakibe geçer.

### 3. REY çağrısı

Oyuncu elinin rakibinden daha düşük olduğunu düşünüyorsa “REY” diyebilir. Son hamleler tamamlandıktan sonra kartlar açılır ve eller karşılaştırılır.

### 4. Parti sonu

Bir parti üç elden oluşur. Üçüncü elde kazanılan ve kaybedilen tüm skorlar üç ile çarpılır. Parti sonunda toplam skoru daha düşük olan oyuncu kazanır.

---

## Özel Güçler

Özel güçler oyunun belirli aşamalarında sunucu tarafından olasılık kurallarına göre oluşturulur. Güçlerin çıkma ihtimalleri oyunculara gösterilmez.

### Röntgen

- **Seviye 1:** Kendi kartlarından birini gör.
- **Seviye 2:** Kendi kartlarından ikisini gör.
- **Seviye 3:** Kendi kartlarının tamamını ve desteden gelecek sıradaki kartı gör.

### Casusluk

- **Seviye 1:** Rakibin kartlarından birini gör.
- **Seviye 2:** Rakibin kartlarından ikisini gör.
- **Seviye 3:** Rakibin bütün kartlarını gör.

### El Değiştirme

Oyuncuların ellerindeki bütün kartlar karşılıklı olarak değiştirilir.

---

## Skor Sistemi

| Davranış | Skor |
|---|---:|
| Düşük el ile kazanmak | +40 |
| REY çağrısıyla düşük elden kazanmak | +60 |
| Başarılı çiftleme | +20 |
| Üst üste başarılı çiftleme | Ek +20 |
| Rakibin Kamikaze yapması | -20 |
| Kamikaze şansı varken kullanmamak | -20 |
| REY dedikten sonra elin yüksek çıkması | -10 |

Üçüncü eldeki bütün skor değişimleri üç kat uygulanır.

---

## Kullanılan Teknolojiler

### İstemci

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Socket.IO Client
- Lucide React
- QR Scanner
- QRCode React
- Canvas Confetti
- Web Audio API

### Sunucu

- Node.js
- TypeScript
- Express
- Socket.IO

### Dağıtım

- Docker
- Docker Compose
- Nginx
- Cloudflare

---

## Yerel Geliştirme

### Gereksinimler

- Node.js 20 veya üzeri
- npm

### Bağımlılıkları yükleme

```bash
npm --prefix client install
npm --prefix server install
```

### Geliştirme ortamını başlatma

```bash
npm run dev
```

Geliştirme sırasında:

- İstemci: [http://localhost:5173](http://localhost:5173)
- Sunucu: [http://localhost:3001](http://localhost:3001)

### Production build

```bash
npm run build
npm start
```

Production uygulaması varsayılan olarak aşağıdaki adresten sunulur:

```text
http://localhost:3001
```

---

## Ortam Değişkenleri

Proje kök dizininde bir `.env` dosyası oluşturun:

```env
ADMIN_PASSWORD=guvenli-admin-sifresi
ADMIN_SESSION_SECRET=uzun-ve-rastgele-bir-anahtar
APP_PORT=3001
RECONNECT_GRACE_MS=180000
TURN_DURATION_MS=20000
```

| Değişken | Açıklama |
|---|---|
| `ADMIN_PASSWORD` | Admin paneline giriş şifresi |
| `ADMIN_SESSION_SECRET` | Admin oturumlarının imzalanmasında kullanılan gizli anahtar |
| `APP_PORT` | Docker üzerinden dışarı açılacak port |
| `RECONNECT_GRACE_MS` | Bağlantısı kopan oyuncunun geri dönmesi için tanınan süre |
| `TURN_DURATION_MS` | Bir oyuncunun hamle süresi |

---

## Docker ile Çalıştırma

`.env` dosyasını hazırladıktan sonra client ve server’ı tek komutla başlatabilirsiniz:

```bash
docker compose up --build -d
```

Canlı logları görüntülemek için:

```bash
docker compose logs -f rey
```

Uygulamayı durdurmak için:

```bash
docker compose down
```

Varsayılan olarak servis yalnızca aşağıdaki yerel adrese bağlanır:

```text
127.0.0.1:3001
```

İnternete açık production kurulumunda uygulamanın önünde Nginx gibi bir reverse proxy ve HTTPS kullanılması önerilir.

---

## Admin Paneli

Admin paneli aktif oyun oturumlarının debug amacıyla izlenmesini sağlar.

Admin yetkilisi:

- Devam eden oyun oturumlarını görebilir.
- Her iki oyuncunun bütün kartlarını inceleyebilir.
- Destede gelecek kartları görebilir.
- Oyuncuların kartlarını değiştirebilir.
- Gelecek kartlara müdahale edebilir.
- Oyun durumunu ve aksiyon kayıtlarını takip edebilir.

Admin tarafından yapılan kart değişiklikleri canlı oyuna doğrudan uygulanır ve oyunculara admin müdahalesi bildirimi gösterilir.

---

## Proje Yapısı

```text
.
├── client/                 # React istemcisi
│   ├── public/
│   │   └── images/         # Kartlar, logo ve arka plan
│   └── src/
│       ├── audio/          # Web Audio ses motoru
│       ├── components/     # Oyun ve arayüz bileşenleri
│       ├── types/          # İstemci veri tipleri
│       └── utils/          # Yardımcı fonksiyonlar
├── server/
│   └── src/
│       ├── aiPlayer.ts     # Bot davranışları
│       ├── cards.ts        # Deste ve özel güç üretimi
│       ├── gameEngine.ts   # Sunucu otoriteli oyun motoru
│       ├── roomManager.ts  # Oda ve oyuncu yönetimi
│       └── server.ts       # Express ve Socket.IO sunucusu
├── deploy/                 # Nginx ve servis yapılandırmaları
├── Dockerfile
└── docker-compose.yml
```

---

## Katkı Sağlayanlar

- **Poyraz Hancılar**
- **Ali Arhan Çatalbaş**
- **Amanda Xhafaj**

---

## Etkinlik

Bu proje, **Google Developer Groups On Campus - Pamukkale Üniversitesi (GDGoC Denizli Pamukkale Üni) GameJam’i** adına yapılmıştır.

---

## Canlı Oyun

Oyunu herhangi bir kurulum yapmadan doğrudan tarayıcınızdan oynayabilirsiniz:

### [https://rey.cards](https://rey.cards)
