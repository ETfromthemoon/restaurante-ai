#!/bin/bash
# ============================================================
# init-vps.sh — Setup inicial del VPS para restaurante-ai
# Ejecutar como root en Ubuntu 22.04 / Debian 12
# ============================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/TU_USUARIO/restaurante-ai.git}"
APP_DIR="${APP_DIR:-/opt/restaurante-ai}"
DOMAIN="${DOMAIN:-tu-dominio.com}"

echo "======================================================"
echo "  Restaurante AI — Setup VPS"
echo "  Dominio: $DOMAIN"
echo "======================================================"

# 1. Actualizar sistema
echo "[1/7] Actualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq

# 2. Instalar Docker
echo "[2/7] Instalando Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# 3. Instalar Docker Compose v2
echo "[3/7] Verificando Docker Compose..."
docker compose version || (echo "Docker Compose v2 no disponible"; exit 1)

# 4. Instalar nginx y certbot
echo "[4/7] Instalando nginx + certbot..."
apt-get install -y -qq nginx certbot python3-certbot-nginx

# 5. Clonar repo
echo "[5/7] Clonando repositorio..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi

# 6. Crear archivo .env desde .env.production
echo "[6/7] Configurando variables de entorno..."
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.production" "$APP_DIR/.env"
  # Generar JWT_SECRET aleatorio
  JWT_SECRET=$(openssl rand -hex 64)
  sed -i "s/CHANGE_ME_STRONG_SECRET_HERE/$JWT_SECRET/" "$APP_DIR/.env"
  sed -i "s/tu-dominio.com/$DOMAIN/" "$APP_DIR/.env"
  echo ""
  echo "⚠️  IMPORTANTE: Edita $APP_DIR/.env y añade tu ANTHROPIC_API_KEY"
  echo ""
fi

# 7. Configurar nginx
echo "[7/7] Configurando nginx..."
envsubst '${DOMAIN}' < "$APP_DIR/nginx/conf.d/restaurante.conf" \
  > /etc/nginx/conf.d/restaurante.conf
nginx -t && systemctl reload nginx

# SSL con certbot
echo ""
echo "Ejecuta para obtener SSL:"
echo "  certbot --nginx -d $DOMAIN"
echo ""

# Arrancar containers
echo "Iniciando containers..."
cd "$APP_DIR"
docker compose pull 2>/dev/null || true
docker compose up -d --build

echo ""
echo "======================================================"
echo "  Setup completado!"
echo "  - App en: https://$DOMAIN"
echo "  - Logs: docker compose logs -f"
echo "  - Backup: bash $APP_DIR/scripts/backup-db.sh"
echo "======================================================"
