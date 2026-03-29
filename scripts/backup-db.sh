#!/bin/bash
# ============================================================
# backup-db.sh — Backup de todas las DBs SQLite (multi-tenant)
# Agregar al cron: 0 2 * * * /opt/restaurante-ai/scripts/backup-db.sh
#
# Hace backup de:
#   - /data/master.db                         (tenants + webmaster_users)
#   - /data/tenants/{slug}/restaurante.db     (una por restaurante)
# ============================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/restaurante}"
CONTAINER="${CONTAINER:-restaurante-backend}"
DATA_DIR="${DATA_DIR:-/data}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

echo "[$(date)] Iniciando backup multi-tenant..."

# ── 1. Backup master.db ──────────────────────────────────────────────────────
MASTER_DB="$DATA_DIR/master.db"
MASTER_BACKUP="$BACKUP_DIR/master-$DATE.db"
TMP_MASTER="/tmp/backup-master-$DATE.db"

docker exec "$CONTAINER" sqlite3 "$MASTER_DB" ".backup '$TMP_MASTER'" 2>/dev/null && \
  docker cp "$CONTAINER:$TMP_MASTER" "$MASTER_BACKUP" && \
  docker exec "$CONTAINER" rm -f "$TMP_MASTER" && \
  gzip "$MASTER_BACKUP" && \
  echo "[$(date)] master.db → ${MASTER_BACKUP}.gz" || \
  echo "[WARN] No se pudo respaldar master.db"

# ── 2. Backup de cada tenant ─────────────────────────────────────────────────
TENANT_DIR="$DATA_DIR/tenants"

# Listar slugs desde el directorio dentro del container
SLUGS=$(docker exec "$CONTAINER" sh -c "ls $TENANT_DIR 2>/dev/null" | tr '\n' ' ') || SLUGS=""

for SLUG in $SLUGS; do
  TENANT_DB="$TENANT_DIR/$SLUG/restaurante.db"
  TENANT_BACKUP_DIR="$BACKUP_DIR/$SLUG"
  mkdir -p "$TENANT_BACKUP_DIR"

  BACKUP_FILE="$TENANT_BACKUP_DIR/backup-$DATE.db"
  TMP_FILE="/tmp/backup-$SLUG-$DATE.db"

  docker exec "$CONTAINER" sqlite3 "$TENANT_DB" ".backup '$TMP_FILE'" 2>/dev/null && \
    docker cp "$CONTAINER:$TMP_FILE" "$BACKUP_FILE" && \
    docker exec "$CONTAINER" rm -f "$TMP_FILE" && \
    gzip "$BACKUP_FILE" && \
    SIZE=$(du -sh "${BACKUP_FILE}.gz" | cut -f1) && \
    echo "[$(date)] $SLUG → ${BACKUP_FILE}.gz ($SIZE)" || \
    echo "[WARN] No se pudo respaldar tenant: $SLUG"
done

# ── 3. Eliminar backups antiguos ──────────────────────────────────────────────
find "$BACKUP_DIR" -name "*.db.gz" -mtime "+$RETENTION_DAYS" -delete
echo "[$(date)] Backups antiguos eliminados (retención: ${RETENTION_DAYS}d)"

echo "[$(date)] Backup completado exitosamente"
