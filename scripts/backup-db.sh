#!/bin/bash
# ============================================================
# backup-db.sh — Backup de la base de datos SQLite
# Agregar al cron: 0 2 * * * /opt/restaurante-ai/scripts/backup-db.sh
# ============================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/restaurante}"
CONTAINER="${CONTAINER:-restaurante-backend}"
DB_PATH="${DB_PATH:-/data/restaurante.db}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/backup-$DATE.db"
TMP_FILE="/tmp/restaurante-backup-$DATE.db"

echo "[$(date)] Iniciando backup..."

# Usar SQLite .backup para un backup consistente (safe con WAL mode)
docker exec "$CONTAINER" sqlite3 "$DB_PATH" ".backup '$TMP_FILE'"
docker cp "$CONTAINER:$TMP_FILE" "$BACKUP_FILE"
docker exec "$CONTAINER" rm -f "$TMP_FILE"

# Comprimir el backup
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup guardado: $BACKUP_FILE ($SIZE)"

# Eliminar backups más antiguos que $RETENTION_DAYS días
find "$BACKUP_DIR" -name "backup-*.db.gz" -mtime "+$RETENTION_DAYS" -delete
echo "[$(date)] Backups antiguos eliminados (retención: ${RETENTION_DAYS}d)"

echo "[$(date)] Backup completado exitosamente"
