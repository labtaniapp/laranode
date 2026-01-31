#!/bin/bash

# LaraNode Git Rollback Script
# Usage: laranode-git-rollback.sh <deployment_id> <repository_id> <username> <target_release_path>

set -e

PANEL_PATH="/home/laranode_ln/panel"
LOG_FILE="/var/log/laranode-deploy.log"

DEPLOYMENT_ID="$1"
REPOSITORY_ID="$2"
USERNAME="$3"
TARGET_RELEASE_PATH="$4"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ROLLBACK: $1" >> "$LOG_FILE"
    update_deployment_log "$1"
}

update_deployment_log() {
    local message="$1"
    local timestamp=$(date '+%H:%M:%S')
    cd "$PANEL_PATH" || exit 1
    php artisan tinker --execute="
        \$d = \App\Models\Deployment::find($DEPLOYMENT_ID);
        \$d->log = (\$d->log ?? '') . '[$timestamp] $message' . \"\\n\";
        \$d->save();
    " 2>/dev/null
}

update_deployment_status() {
    local status="$1"
    cd "$PANEL_PATH" || exit 1
    php artisan tinker --execute="
        \$d = \App\Models\Deployment::find($DEPLOYMENT_ID);
        \$d->status = '$status';
        \$d->save();
    " 2>/dev/null
}

mark_deployment_completed() {
    cd "$PANEL_PATH" || exit 1
    php artisan tinker --execute="
        \$d = \App\Models\Deployment::find($DEPLOYMENT_ID);
        \$d->status = 'completed';
        \$d->release_path = '$TARGET_RELEASE_PATH';
        \$d->completed_at = now();
        \$d->duration = \$d->started_at ? \$d->started_at->diffInSeconds(now()) : null;
        \$d->save();
        \$d->gitRepository->update(['last_deployed_at' => now()]);
    " 2>/dev/null
}

mark_deployment_failed() {
    local error="$1"
    cd "$PANEL_PATH" || exit 1
    php artisan tinker --execute="
        \$d = \App\Models\Deployment::find($DEPLOYMENT_ID);
        \$d->status = 'failed';
        \$d->error_message = '$error';
        \$d->completed_at = now();
        \$d->save();
    " 2>/dev/null
}

get_website_info() {
    cd "$PANEL_PATH" || exit 1
    php artisan tinker --execute="
        \$r = \App\Models\GitRepository::find($REPOSITORY_ID);
        echo \$r->website->websiteRoot . '|' . \$r->framework;
    " 2>/dev/null | tail -1
}

main() {
    log "Starting rollback to release: $TARGET_RELEASE_PATH"

    # Mark as started
    cd "$PANEL_PATH" || exit 1
    php artisan tinker --execute="
        \$d = \App\Models\Deployment::find($DEPLOYMENT_ID);
        \$d->started_at = now();
        \$d->status = 'deploying';
        \$d->save();
    " 2>/dev/null

    # Check if target release exists
    if [ ! -d "$TARGET_RELEASE_PATH" ]; then
        log "ERROR: Target release path does not exist"
        mark_deployment_failed "Target release path does not exist"
        exit 1
    fi

    # Get website info
    WEBSITE_INFO=$(get_website_info)
    WEBSITE_ROOT=$(echo "$WEBSITE_INFO" | cut -d'|' -f1)
    FRAMEWORK=$(echo "$WEBSITE_INFO" | cut -d'|' -f2)

    if [ -z "$WEBSITE_ROOT" ]; then
        log "ERROR: Could not get website root"
        mark_deployment_failed "Could not get website root"
        exit 1
    fi

    log "Website root: $WEBSITE_ROOT"
    log "Framework: $FRAMEWORK"

    USER_HOME="/home/$USERNAME"
    SHARED_DIR="$USER_HOME/shared/$(basename $(dirname $TARGET_RELEASE_PATH))"

    # Sync release to website root
    log "Syncing release to website root"
    rsync -a --delete --exclude='.env' --exclude='storage' --exclude='.git' "$TARGET_RELEASE_PATH/" "$WEBSITE_ROOT/"

    # Handle Laravel specific
    if [ "$FRAMEWORK" == "laravel" ]; then
        log "Linking shared storage for Laravel"
        rm -rf "$WEBSITE_ROOT/storage"
        ln -s "$SHARED_DIR/storage" "$WEBSITE_ROOT/storage"
        if [ -f "$SHARED_DIR/.env" ]; then
            cp "$SHARED_DIR/.env" "$WEBSITE_ROOT/.env"
        fi

        # Clear caches
        cd "$WEBSITE_ROOT"
        sudo -u "$USERNAME" php artisan config:cache 2>/dev/null || true
        sudo -u "$USERNAME" php artisan route:cache 2>/dev/null || true
        sudo -u "$USERNAME" php artisan view:cache 2>/dev/null || true

        # Reload PHP-FPM
        systemctl reload php*-fpm 2>/dev/null || true
    fi

    # Restart Node.js processes
    if [ "$FRAMEWORK" == "nodejs" ] || [ "$FRAMEWORK" == "nuxt" ] || [ "$FRAMEWORK" == "nextjs" ]; then
        log "Restarting PM2 processes"
        sudo -u "$USERNAME" bash -c "source ~/.nvm/nvm.sh 2>/dev/null; cd $WEBSITE_ROOT && pm2 restart all 2>/dev/null || true"
    fi

    # Set permissions
    chown -R "$USERNAME:$USERNAME" "$WEBSITE_ROOT"

    # Update current symlink
    CURRENT_LINK="$USER_HOME/current/$(basename $(dirname $TARGET_RELEASE_PATH))"
    mkdir -p "$USER_HOME/current"
    ln -sfn "$TARGET_RELEASE_PATH" "${CURRENT_LINK}.new"
    mv -Tf "${CURRENT_LINK}.new" "$CURRENT_LINK" 2>/dev/null || ln -sfn "$TARGET_RELEASE_PATH" "$CURRENT_LINK"

    mark_deployment_completed
    log "Rollback completed successfully"
}

main 2>&1 || {
    log "ERROR: Rollback failed"
    mark_deployment_failed "Rollback script error"
    exit 1
}

exit 0
