#!/bin/bash

# LaraNode Backup Creation Script
# Usage: laranode-backup-create.sh <backup_id> <website_id> <username> <include_files> <include_db> <storage> [s3_bucket] [s3_region] [s3_key] [s3_secret] [s3_path]

PANEL_PATH="/home/laranode_ln/panel"
LOG_FILE="/var/log/laranode-backup.log"

BACKUP_ID="$1"
WEBSITE_ID="$2"
USERNAME="$3"
INCLUDE_FILES="$4"
INCLUDE_DB="$5"
STORAGE="$6"
S3_BUCKET="$7"
S3_REGION="$8"
S3_KEY="$9"
S3_SECRET="${10}"
S3_PATH="${11}"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

update_backup_status() {
    local status="$1"
    local size="$2"
    local error="$3"

    cd "$PANEL_PATH" || exit 1

    if [ "$status" == "completed" ]; then
        php artisan tinker --execute="
            \$backup = \App\Models\Backup::find($BACKUP_ID);
            \$backup->status = 'completed';
            \$backup->size = $size;
            \$backup->completed_at = now();
            \$backup->save();
        " 2>/dev/null
    elif [ "$status" == "failed" ]; then
        php artisan tinker --execute="
            \$backup = \App\Models\Backup::find($BACKUP_ID);
            \$backup->status = 'failed';
            \$backup->error_message = '$error';
            \$backup->save();
        " 2>/dev/null
    else
        php artisan tinker --execute="
            \$backup = \App\Models\Backup::find($BACKUP_ID);
            \$backup->status = '$status';
            \$backup->save();
        " 2>/dev/null
    fi
}

log "Starting backup ID: $BACKUP_ID for website ID: $WEBSITE_ID"

# Update status to in_progress
update_backup_status "in_progress" 0 ""

# Get website info from database
WEBSITE_INFO=$(cd "$PANEL_PATH" && php artisan tinker --execute="
    \$w = \App\Models\Website::with('databases')->find($WEBSITE_ID);
    echo \$w->url . '|' . \$w->websiteRoot . '|' . (\$w->databases->first() ? \$w->databases->first()->name . ':' . \$w->databases->first()->db_user . ':' . \$w->databases->first()->driver : '');
" 2>/dev/null | tail -1)

WEBSITE_URL=$(echo "$WEBSITE_INFO" | cut -d'|' -f1)
WEBSITE_ROOT=$(echo "$WEBSITE_INFO" | cut -d'|' -f2)
DB_INFO=$(echo "$WEBSITE_INFO" | cut -d'|' -f3)

if [ -z "$WEBSITE_URL" ] || [ -z "$WEBSITE_ROOT" ]; then
    log "ERROR: Could not get website information"
    update_backup_status "failed" 0 "Could not get website information"
    exit 1
fi

# Create backup directory
BACKUP_DIR="/home/$USERNAME/backups"
mkdir -p "$BACKUP_DIR"
chown "$USERNAME:$USERNAME" "$BACKUP_DIR"

TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
BACKUP_FILENAME="${WEBSITE_URL}_${TIMESTAMP}.tar.gz"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"
TEMP_DIR=$(mktemp -d)

log "Backup directory: $BACKUP_DIR"
log "Website root: $WEBSITE_ROOT"

# Backup files
if [ "$INCLUDE_FILES" == "1" ]; then
    log "Backing up files..."
    if [ -d "$WEBSITE_ROOT" ]; then
        cp -r "$WEBSITE_ROOT" "$TEMP_DIR/files"
        log "Files backup completed"
    else
        log "WARNING: Website root not found: $WEBSITE_ROOT"
    fi
fi

# Backup database
if [ "$INCLUDE_DB" == "1" ] && [ -n "$DB_INFO" ]; then
    log "Backing up database..."
    DB_NAME=$(echo "$DB_INFO" | cut -d':' -f1)
    DB_USER=$(echo "$DB_INFO" | cut -d':' -f2)
    DB_DRIVER=$(echo "$DB_INFO" | cut -d':' -f3)

    mkdir -p "$TEMP_DIR/database"

    if [ "$DB_DRIVER" == "mysql" ]; then
        mysqldump --single-transaction "$DB_NAME" > "$TEMP_DIR/database/$DB_NAME.sql" 2>/dev/null
        if [ $? -eq 0 ]; then
            log "MySQL database backup completed"
        else
            log "WARNING: MySQL backup failed"
        fi
    elif [ "$DB_DRIVER" == "pgsql" ]; then
        sudo -u postgres pg_dump "$DB_NAME" > "$TEMP_DIR/database/$DB_NAME.sql" 2>/dev/null
        if [ $? -eq 0 ]; then
            log "PostgreSQL database backup completed"
        else
            log "WARNING: PostgreSQL backup failed"
        fi
    fi
fi

# Create backup metadata
cat > "$TEMP_DIR/backup-info.json" <<EOF
{
    "backup_id": $BACKUP_ID,
    "website_id": $WEBSITE_ID,
    "website_url": "$WEBSITE_URL",
    "website_root": "$WEBSITE_ROOT",
    "username": "$USERNAME",
    "created_at": "$(date -Iseconds)",
    "includes_files": $INCLUDE_FILES,
    "includes_database": $INCLUDE_DB,
    "database_info": "$DB_INFO"
}
EOF

# Create tar.gz archive
log "Creating archive..."
cd "$TEMP_DIR" || exit 1
tar -czf "$BACKUP_PATH" .

if [ $? -ne 0 ]; then
    log "ERROR: Failed to create archive"
    update_backup_status "failed" 0 "Failed to create archive"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Get backup size
BACKUP_SIZE=$(stat -c%s "$BACKUP_PATH")
log "Backup size: $BACKUP_SIZE bytes"

# Upload to S3 if needed
if [ "$STORAGE" == "s3" ] && [ -n "$S3_BUCKET" ]; then
    log "Uploading to S3..."

    # Install AWS CLI if not present
    if ! command -v aws &> /dev/null; then
        apt-get install -y awscli > /dev/null 2>&1
    fi

    export AWS_ACCESS_KEY_ID="$S3_KEY"
    export AWS_SECRET_ACCESS_KEY="$S3_SECRET"
    export AWS_DEFAULT_REGION="$S3_REGION"

    S3_DEST="s3://$S3_BUCKET"
    if [ -n "$S3_PATH" ]; then
        S3_DEST="$S3_DEST/$S3_PATH"
    fi
    S3_DEST="$S3_DEST/$BACKUP_FILENAME"

    aws s3 cp "$BACKUP_PATH" "$S3_DEST" 2>/dev/null

    if [ $? -eq 0 ]; then
        log "S3 upload completed"
        # Remove local file after successful S3 upload
        rm -f "$BACKUP_PATH"
    else
        log "ERROR: S3 upload failed"
        update_backup_status "failed" 0 "S3 upload failed"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
fi

# Set permissions
if [ -f "$BACKUP_PATH" ]; then
    chown "$USERNAME:$USERNAME" "$BACKUP_PATH"
    chmod 640 "$BACKUP_PATH"
fi

# Cleanup
rm -rf "$TEMP_DIR"

# Update backup record
update_backup_status "completed" "$BACKUP_SIZE" ""

log "Backup completed successfully: $BACKUP_FILENAME"

exit 0
