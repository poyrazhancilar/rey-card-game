#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_DOMAIN="rey.cards"
NGINX_SITE="/etc/nginx/sites-available/rey.cards"
NGINX_LINK="/etc/nginx/sites-enabled/rey.cards"
CF_CREDENTIALS="/etc/letsencrypt/cloudflare-rey.cards.ini"
ENV_FILE="${PROJECT_DIR}/.env"

blue='\033[1;34m'; green='\033[1;32m'; yellow='\033[1;33m'; red='\033[1;31m'; reset='\033[0m'
info() { printf '\n%b[REY]%b %s\n' "${blue}" "${reset}" "$*"; }
ok() { printf '%b[OK]%b %s\n' "${green}" "${reset}" "$*"; }
warn() { printf '%b[UYARI]%b %s\n' "${yellow}" "${reset}" "$*"; }
die() { printf '%b[HATA]%b %s\n' "${red}" "${reset}" "$*" >&2; exit 1; }

if [[ "${EUID}" -ne 0 ]]; then
  exec sudo bash "$0" "$@"
fi

[[ -f "${PROJECT_DIR}/docker-compose.yml" ]] || die "Script proje kökünde olmalı: docker-compose.yml bulunamadı."

printf 'Domain [%s]: ' "${DEFAULT_DOMAIN}"
read -r DOMAIN
DOMAIN="${DOMAIN:-${DEFAULT_DOMAIN}}"
[[ "${DOMAIN}" =~ ^[A-Za-z0-9.-]+$ ]] || die "Domain formatı geçersiz."

while true; do
  printf 'Let’s Encrypt e-posta adresi: '
  read -r CERTBOT_EMAIL
  [[ "${CERTBOT_EMAIL}" == *@*.* ]] && break
  warn "Geçerli bir e-posta adresi girin."
done

if [[ ! -f "${ENV_FILE}" ]] || ! grep -q '^ADMIN_PASSWORD=.' "${ENV_FILE}"; then
  while true; do
    printf 'Admin panel şifresi (boş bırakırsanız otomatik üretilir): '
    read -r -s ADMIN_PASSWORD_INPUT
    printf '\n'
    if [[ -z "${ADMIN_PASSWORD_INPUT}" ]]; then
      ADMIN_PASSWORD_INPUT="$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"
      printf 'Üretilen admin şifresi: %b%s%b\n' "${yellow}" "${ADMIN_PASSWORD_INPUT}" "${reset}"
      printf 'Şifreyi kaydettim, devam et (Enter): '
      read -r
    fi
    if [[ "${ADMIN_PASSWORD_INPUT}" == *"'"* ]]; then
      warn "Şifrede tek tırnak kullanmayın. Yeniden girin."
      continue
    fi
    break
  done
else
  ADMIN_PASSWORD_INPUT=""
  ok "Mevcut .env içindeki ADMIN_PASSWORD korunacak."
fi

command -v apt-get >/dev/null 2>&1 || die "Bu otomatik script Debian/Ubuntu (apt) sunucusu bekliyor."

info "Gerekli paketler kuruluyor"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx certbot python3-certbot-dns-cloudflare curl openssl ca-certificates

if ! command -v docker >/dev/null 2>&1; then
  info "Docker kuruluyor"
  apt-get install -y docker.io
fi
systemctl enable --now docker

if ! docker compose version >/dev/null 2>&1; then
  info "Docker Compose kuruluyor"
  if ! apt-get install -y docker-compose-v2; then
    apt-get install -y docker-compose-plugin
  fi
fi

info ".env hazırlanıyor"
touch "${ENV_FILE}"
chmod 600 "${ENV_FILE}"
if ! grep -q '^ADMIN_PASSWORD=.' "${ENV_FILE}"; then
  printf "ADMIN_PASSWORD='%s'\n" "${ADMIN_PASSWORD_INPUT}" >> "${ENV_FILE}"
fi
if ! grep -q '^ADMIN_SESSION_SECRET=.' "${ENV_FILE}"; then
  printf "ADMIN_SESSION_SECRET='%s'\n" "$(openssl rand -hex 32)" >> "${ENV_FILE}"
fi
if ! grep -q '^APP_PORT=.' "${ENV_FILE}"; then
  printf 'APP_PORT=3001\n' >> "${ENV_FILE}"
fi
APP_PORT="$(sed -n 's/^APP_PORT=//p' "${ENV_FILE}" | tail -n 1 | tr -d "'\"" || true)"
APP_PORT="${APP_PORT:-3001}"
if [[ ! "${APP_PORT}" =~ ^[0-9]+$ ]] || (( APP_PORT < 1 || APP_PORT > 65535 )); then
  warn ".env içindeki APP_PORT geçersiz: ${APP_PORT}"
  printf 'Kullanılacak lokal uygulama portu [3001]: '
  read -r APP_PORT
  APP_PORT="${APP_PORT:-3001}"
  [[ "${APP_PORT}" =~ ^[0-9]+$ ]] && (( APP_PORT >= 1 && APP_PORT <= 65535 )) || die "Port geçersiz."
  printf 'APP_PORT=%s\n' "${APP_PORT}" >> "${ENV_FILE}"
fi

info "Docker uygulaması build edilip başlatılıyor"
cd "${PROJECT_DIR}"
docker compose up --build -d

install -d -m 0700 /etc/letsencrypt
umask 077

while true; do
  printf 'Cloudflare API Token (Edit zone DNS şablonu, ekranda görünmez): '
  read -r -s CLOUDFLARE_API_TOKEN
  printf '\n'
  if [[ -z "${CLOUDFLARE_API_TOKEN}" ]]; then
    warn "Token boş olamaz."
    continue
  fi

  printf 'dns_cloudflare_api_token = %s\n' "${CLOUDFLARE_API_TOKEN}" > "${CF_CREDENTIALS}"
  chmod 600 "${CF_CREDENTIALS}"
  unset CLOUDFLARE_API_TOKEN

  info "Cloudflare DNS doğrulamasıyla ${DOMAIN} sertifikası alınıyor"
  if certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials "${CF_CREDENTIALS}" \
    --dns-cloudflare-propagation-seconds 45 \
    --cert-name "${DOMAIN}" \
    --domain "${DOMAIN}" \
    --email "${CERTBOT_EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --keep-until-expiring; then
    break
  fi

  warn "Sertifika alınamadı. Token'ın '${DOMAIN}' zone'u için Zone:Read ve DNS:Edit yetkisi olduğundan emin olun."
  printf 'Yeni token girmek için Enter, çıkmak için q: '
  read -r RETRY_CHOICE
  [[ "${RETRY_CHOICE,,}" != "q" ]] || die "Kurulum kullanıcı tarafından durduruldu."
done

info "Nginx Full Strict config doğrudan oluşturuluyor"
install -d -m 0755 /etc/nginx/sites-available /etc/nginx/sites-enabled

if [[ -f "${NGINX_SITE}" ]]; then
  cp -a "${NGINX_SITE}" "${NGINX_SITE}.backup.$(date +%Y%m%d%H%M%S)"
fi
if [[ -f /etc/nginx/conf.d/rey.cards.conf ]]; then
  mv /etc/nginx/conf.d/rey.cards.conf "/etc/nginx/conf.d/rey.cards.conf.disabled.$(date +%Y%m%d%H%M%S)"
fi

cat > "${NGINX_SITE}" <<'NGINX_CONFIG'
map $http_upgrade $rey_connection_upgrade {
    default upgrade;
    '' close;
}

map $http_cf_connecting_ip $rey_client_ip {
    default $http_cf_connecting_ip;
    '' $remote_addr;
}

server {
    listen 80;
    listen [::]:80;
    server_name __DOMAIN__;
    return 301 https://__DOMAIN__$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name __DOMAIN__;

    ssl_certificate /etc/letsencrypt/live/__DOMAIN__/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/__DOMAIN__/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    client_max_body_size 2m;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self), microphone=()" always;

    location /socket.io/ {
        proxy_pass http://127.0.0.1:__APP_PORT__;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $rey_connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $rey_client_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://127.0.0.1:__APP_PORT__;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $rey_client_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
NGINX_CONFIG

sed -i "s/__DOMAIN__/${DOMAIN}/g; s/__APP_PORT__/${APP_PORT}/g" "${NGINX_SITE}"
ln -sfn "${NGINX_SITE}" "${NGINX_LINK}"
rm -f /etc/nginx/sites-enabled/default

if ! nginx -t; then
  die "Üretilen Nginx config doğrulanamadı. Yedek dosya: ${NGINX_SITE}.backup.*"
fi
systemctl enable nginx
systemctl restart nginx

info "Otomatik sertifika yenileme ayarlanıyor"
install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'RENEW_HOOK'
#!/usr/bin/env bash
systemctl reload nginx
RENEW_HOOK
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
systemctl enable --now certbot.timer 2>/dev/null || true

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q '^Status: active'; then
  info "UFW üzerinde HTTP/HTTPS açılıyor"
  ufw allow 'Nginx Full'
fi

info "Kurulum test ediliyor"
docker compose ps
nginx -t
curl --fail --silent --show-error --retry 15 --retry-delay 2 \
  "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null
curl --fail --silent --show-error --resolve "${DOMAIN}:443:127.0.0.1" \
  "https://${DOMAIN}/api/health" >/dev/null

ok "Tüm kurulum ve yerel testler tamamlandı."
printf '\nCloudflare:\n'
printf '  DNS kaydı: Proxied (turuncu bulut)\n'
printf '  SSL/TLS: Full (strict)\n'
printf '  WebSockets: Açık\n'
printf '\nAdres: https://%s\n' "${DOMAIN}"
printf 'Sunucu sağlayıcısının firewall panelinde 80 ve 443 portları açık olmalı.\n'
