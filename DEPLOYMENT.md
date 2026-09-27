# rey.cards — Cloudflare Full (Strict)

Full (Strict), origin sunucunun 443 portunda geçerli ve `rey.cards` alan adıyla eşleşen bir sertifika sunmasını zorunlu tutar. Bu kurulum sertifika dosyalarını elle yönetmez; Certbot üretir, Nginx kullanır ve otomatik yeniler.

## Tek komut kurulum

En kolay yöntem, Cloudflare'da **Edit zone DNS** şablonuyla yalnızca `rey.cards` zone'una erişen bir API token oluşturmaktır. Ardından tek script tüm kurulumu yapar; DNS kaydını gri buluta almaya gerek yoktur:

```bash
cd /opt/rey.cards/rey-card-game-private
sudo bash reycardsetup.sh
```

Script e-posta, Cloudflare API token ve `.env` içinde yoksa admin şifresini etkileşimli olarak sorar. Docker uygulamasını başlatır, DNS doğrulamasıyla sertifikayı alır, Nginx Full Strict config'ini kurar, otomatik yenilemeyi ve healthcheck'i ayarlar.

Cloudflare tarafında DNS kaydı **Proxied**, SSL/TLS **Full (strict)** ve WebSockets açık kalabilir. DNS-01 doğrulaması kullanıldığı için proxy'yi geçici kapatmak gerekmez.

## Kontrol

```bash
sudo nginx -t
sudo ss -ltnp | grep -E ':80|:443'
docker compose ps
curl -fsS https://rey.cards/api/health
sudo certbot renew --dry-run
```

## Süreç yönetimi

PM2 kullanılmaz. Uygulama Docker Compose ile çalışır; `restart: unless-stopped` yeniden başlatmayı yönetir. İstenirse `deploy/systemd/rey-cards.service` ile Compose ayrıca systemd'ye bağlanabilir.
