#!/bin/bash
# ============================================================
# init-vps.sh — Setup inicial del VPS para restaurante-ai SaaS
# Ejecutar como root en Ubuntu 22.04 / Debian 12
# ============================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/TU_USUARIO/restaurante-ai.git}"
APP_DIR="${APP_DIR:-/opt/restaurante-ai}"
DOMAIN="${DOMAIN:-miapp.com}"
CLOUDFLARE_EMAIL="${CLOUDFLARE_EMAIL:-tu@email.com}"
CLOUDFLARE_TOKEN="${CLOUDFLARE_TOKEN:-}"

echo "======================================================"
echo "  Restaurante AI — Setup VPS (SaaS Multi-Tenant)"
echo "  Dominio base: $DOMAIN"
echo "======================================================"

# 1. Actualizar sistema
echo "[1/8] Actualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq

# 2. Instalar Docker
echo "[2/8] Instalando Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# 3. Instalar Docker Compose v2
echo "[3/8] Verificando Docker Compose..."
docker compose version || (echo "Docker Compose v2 no disponible"; exit 1)

# 4. Instalar nginx + certbot con plugin Cloudflare DNS
echo "[4/8] Instalando nginx + certbot (DNS Cloudflare)..."
apt-get install -y -qq nginx certbot python3-certbot-dns-cloudflare

# Configurar credenciales Cloudflare para DNS challenge
mkdir -p /etc/certbot
cat > /etc/certbot/cloudflare.ini <<EOF
dns_cloudflare_email = ${CLOUDFLARE_EMAIL}
dns_cloudflare_api_key = ${CLOUDFLARE_TOKEN}
EOF
chmod 600 /etc/certbot/cloudflare.ini

# 5. Clonar repo
echo "[5/8] Clonando repositorio..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi

# 6. Crear directorio de datos para tenants
echo "[6/8] Creando estructura de datos..."
mkdir -p /data/tenants
# Docker volume se monta en /data, pero también creamos la carpeta host
# para que el volumen se inicialice correctamente

# 7. Configurar variables de entorno
echo "[7/8] Configurando variables de entorno..."
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.production" "$APP_DIR/.env" 2>/dev/null || \
    echo "Copia .env.production manualmente a $APP_DIR/.env"

  # Generar secrets aleatorios
  JWT_SECRET=$(openssl rand -hex 64)
  WM_SECRET=$(openssl rand -hex 64)
  sed -i "s/CHANGE_ME_STRONG_SECRET_HERE/$JWT_SECRET/" "$APP_DIR/.env"
  sed -i "s/CHANGE_ME_WEBMASTER_SECRET_HERE/$WM_SECRET/" "$APP_DIR/.env"
  sed -i "s/miapp\.com/$DOMAIN/g" "$APP_DIR/.env"

  echo ""
  echo "⚠️  IMPORTANTE: Edita $APP_DIR/.env y completa:"
  echo "    - ANTHROPIC_API_KEY"
  echo "    - WEBMASTER_PASSWORD"
  echo "    - DODO_WEBHOOK_SECRET (desde dashboard.dodopayments.com)"
  echo "    - DODO_API_KEY"
  echo ""
fi

# 8. Obtener wildcard SSL + configurar nginx
echo "[8/8] Obteniendo certificado wildcard SSL..."
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/certbot/cloudflare.ini \
  -d "${DOMAIN}" \
  -d "*.${DOMAIN}" \
  --non-interactive \
  --agree-tos \
  -m "${CLOUDFLARE_EMAIL}" \
  || echo "⚠️  SSL cert ya existe o falló. Verifica con: certbot certificates"

# Instalar config nginx (sin envsubst — config usa regex, no variables de shell)
cp "$APP_DIR/nginx/conf.d/restaurante.conf" /etc/nginx/conf.d/restaurante.conf
# Reemplazar 'miapp.com' con el dominio real si es diferente
if [ "$DOMAIN" != "miapp.com" ]; then
  sed -i "s/miapp\.com/$DOMAIN/g" /etc/nginx/conf.d/restaurante.conf
fi
nginx -t && systemctl reload nginx

# Renovación automática SSL
echo "0 12 * * * root certbot renew --quiet" > /etc/cron.d/certbot-renew

# Arrancar containers
echo "Iniciando containers Docker..."
cd "$APP_DIR"
docker compose pull 2>/dev/null || true
docker compose up -d --build

echo ""
echo "======================================================"
echo "  Setup completado!"
echo ""
echo "  Panel webmaster: https://webmaster.${DOMAIN}"
echo "  Ejemplo tenant:  https://demo.${DOMAIN}"
echo ""
echo "  Logs:   docker compose logs -f"
echo "  Backup: bash $APP_DIR/scripts/backup-db.sh"
echo "======================================================"
