#!/bin/bash

# LaraNode Backup Restore Script
# Usage: laranode-backup-restore.sh <backup_id> <website_id> <username> <restore_files> <restore_db>

PANEL_PATH="/home/laranode_ln/panel"
LOG_FILE="/var/log/laranode-backup.log"

BACKUP_ID="$1"
WEBSITE_ID="$2"
USERNAME="$3"
RESTORE_FILES="$4"
RESTORE_DB="$5"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - RESTORE - $1" >> "$LOG_FILE"
}

log "Starting restore for backup ID: $BACKUP_ID"

# Get backup info from database
BACKUP_INFO=$(cd "$PANEL_PATH" && php artisan tinker --execute="
    \$b = \App\Models\Backup::find($BACKUP_ID);
    echo \$b->path . '|' . \$b->filename . '|' . \$b->storage;
" 2>/dev/null | tail -1)

BACKUP_PATH=$(echo "$BACKUP_INFO" | cut -d'|' -f1)
BACKUP_FILENAME=$(echo "$BACKUP_INFO" | cut -d'|' -f2)
BACKUP_STORAGE=$(echo "$BACKUP_INFO" | cut -d'|' -f3)

BACKUP_FILE="$BACKUP_PATH/$BACKUP_FILENAME"

# Get website info
WEBSITE_INFO=$(cd "$PANEL_PATH" && php artisan tinker --execute="
    \$w = \App\Models\Website::with('databases')->find($WEBSITE_ID);
    echo \$w->websiteRoot . '|' . (\$w->databases->first() ? \$w->databases->first()->name . ':' . \$w->databases->first()->driver : '');
" 2>/dev/null | tail -1)

WEBSITE_ROOT=$(echo "$WEBSITE_INFO" | cut -d'|' -f1)
DB_INFO=$(echo "$WEBSITE_INFO" | cut -d'|' -f2)

if [ -z "$WEBSITE_ROOT" ]; then
    log "ERROR: Could not get website information"
    exit 1
fi

# If S3 storage, download first
if [ "$BACKUP_STORAGE" == "s3" ]; then
    log "Downloading backup from S3..."

    # Get S3 settings
    S3_SETTINGS=$(cd "$PANEL_PATH" && php artisan tinker --execute="
        \$b = \App\Models\Backup::find($BACKUP_ID);
        \$s = \App\Models\BackupSettings::where('user_id', \$b->user_id)->first();
        echo \$s->s3_bucket . '|' . \$s->s3_region . '|' . \$s->s3_access_key . '|' . \$s->s3_secret_key_decrypted . '|' . \$s->s3_path;
    " 2>/dev/null | tail -1)

    S3_BUCKET=$(echo "$S3_SETTINGS" | cut -d'|' -f1)
    S3_REGION=$(echo "$S3_SETTINGS" | cut -d'|' -f2)
    S3_KEY=$(echo "$S3_SETTINGS" | cut -d'|' -f3)
    S3_SECRET=$(echo "$S3_SETTINGS" | cut -d'|' -f4)
    S3_PATH=$(echo "$S3_SETTINGS" | cut -d'|' -f5)

    export AWS_ACCESS_KEY_ID="$S3_KEY"
    export AWS_SECRET_ACCESS_KEY="$S3_SECRET"
    export AWS_DEFAULT_REGION="$S3_REGION"

    S3_SRC="s3://$S3_BUCKET"
    if [ -n "$S3_PATH" ]; then
        S3_SRC="$S3_SRC/$S3_PATH"
    fi
    S3_SRC="$S3_SRC/$BACKUP_FILENAME"

    TEMP_BACKUP="/tmp/$BACKUP_FILENAME"
    aws s3 cp "$S3_SRC" "$TEMP_BACKUP" 2>/dev/null

    if [ $? -ne 0 ]; then
        log "ERROR: Failed to download from S3"
        exit 1
    fi

    BACKUP_FILE="$TEMP_BACKUP"
    log "S3 download completed"
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Create temp directory for extraction
TEMP_DIR=$(mktemp -d)
log "Extracting backup to: $TEMP_DIR"

tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

if [ $? -ne 0 ]; then
    log "ERROR: Failed to extract backup"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Restore files
if [ "$RESTORE_FILES" == "1" ] && [ -d "$TEMP_DIR/files" ]; then
    log "Restoring files..."

    # Create backup of current files
    CURRENT_BACKUP="/tmp/pre-restore-$(date +%s)"
    if [ -d "$WEBSITE_ROOT" ]; then
        cp -r "$WEBSITE_ROOT" "$CURRENT_BACKUP"
    fi

    # Remove current files and restore
    rm -rf "$WEBSITE_ROOT"/*
    cp -r "$TEMP_DIR/files/"* "$WEBSITE_ROOT/"

    # Fix permissions
    chown -R "$USERNAME:$USERNAME" "$WEBSITE_ROOT"
    find "$WEBSITE_ROOT" -type d -exec chmod 755 {} \;
    find "$WEBSITE_ROOT" -type f -exec chmod 644 {} \;

    log "Files restored successfully"
fi

# Restore database
if [ "$RESTORE_DB" == "1" ] && [ -d "$TEMP_DIR/database" ] && [ -n "$DB_INFO" ]; then
    log "Restoring database..."
    DB_NAME=$(echo "$DB_INFO" | cut -d':' -f1)
    DB_DRIVER=$(echo "$DB_INFO" | cut -d':' -f2)

    # Find SQL file
    SQL_FILE=$(find "$TEMP_DIR/database" -name "*.sql" | head -1)

    if [ -n "$SQL_FILE" ] && [ -f "$SQL_FILE" ]; then
        if [ "$DB_DRIVER" == "mysql" ]; then
            mysql "$DB_NAME" < "$SQL_FILE" 2>/dev/null
            if [ $? -eq 0 ]; then
                log "MySQL database restored successfully"
            else
                log "WARNING: MySQL restore failed"
            fi
        elif [ "$DB_DRIVER" == "pgsql" ]; then
            # Drop and recreate database
            sudo -u postgres psql -c "DROP DATABASE IF EXISTS \"$DB_NAME\"" 2>/dev/null
            sudo -u postgres psql -c "CREATE DATABASE \"$DB_NAME\"" 2>/dev/null
            sudo -u postgres psql "$DB_NAME" < "$SQL_FILE" 2>/dev/null
            if [ $? -eq 0 ]; then
                log "PostgreSQL database restored successfully"
            else
                log "WARNING: PostgreSQL restore failed"
            fi
        fi
    else
        log "WARNING: No SQL file found in backup"
    fi
fi

# Cleanup
rm -rf "$TEMP_DIR"
if [ "$BACKUP_STORAGE" == "s3" ] && [ -f "$TEMP_BACKUP" ]; then
    rm -f "$TEMP_BACKUP"
fi

log "Restore completed for backup ID: $BACKUP_ID"

exit 0
