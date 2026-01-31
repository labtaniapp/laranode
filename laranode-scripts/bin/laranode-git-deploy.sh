#!/bin/bash

# LaraNode Git Deployment Script
# Usage: laranode-git-deploy.sh <deployment_id> <repository_id> <website_id> <username> <repo_url> <branch> <framework> <zero_downtime> <keep_releases> <deploy_script_base64> <deploy_key_base64>

set -e

PANEL_PATH="/home/laranode_ln/panel"
LOG_FILE="/var/log/laranode-deploy.log"

DEPLOYMENT_ID="$1"
REPOSITORY_ID="$2"
WEBSITE_ID="$3"
USERNAME="$4"
REPO_URL="$5"
BRANCH="$6"
FRAMEWORK="$7"
ZERO_DOWNTIME="$8"
KEEP_RELEASES="$9"
DEPLOY_SCRIPT_BASE64="${10}"
DEPLOY_KEY_BASE64="${11}"

# Decode base64 parameters
DEPLOY_SCRIPT=$(echo "$DEPLOY_SCRIPT_BASE64" | base64 -d 2>/dev/null || echo "")
DEPLOY_KEY=$(echo "$DEPLOY_KEY_BASE64" | base64 -d 2>/dev/null || echo "")

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    update_deployment_log "$1"
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

mark_deployment_completed() {
    local release_path="$1"
    cd "$PANEL_PATH" || exit 1
    php artisan tinker --execute="
        \$d = \App\Models\Deployment::find($DEPLOYMENT_ID);
        \$d->status = 'completed';
        \$d->release_path = '$release_path';
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
        \$d->duration = \$d->started_at ? \$d->started_at->diffInSeconds(now()) : null;
        \$d->save();
    " 2>/dev/null
}

update_commit_info() {
    local hash="$1"
    local message="$2"
    local author="$3"
    # Escape single quotes
    message=$(echo "$message" | sed "s/'/''/g" | head -c 200)
    author=$(echo "$author" | sed "s/'/''/g" | head -c 100)
    cd "$PANEL_PATH" || exit 1
    php artisan tinker --execute="
        \$d = \App\Models\Deployment::find($DEPLOYMENT_ID);
        \$d->commit_hash = '$hash';
        \$d->commit_message = '$message';
        \$d->commit_author = '$author';
        \$d->save();
    " 2>/dev/null
}

# Get website info
get_website_info() {
    cd "$PANEL_PATH" || exit 1
    php artisan tinker --execute="
        \$w = \App\Models\Website::find($WEBSITE_ID);
        echo \$w->websiteRoot;
    " 2>/dev/null | tail -1
}

# Setup SSH for deploy key
setup_ssh() {
    if [ -n "$DEPLOY_KEY" ]; then
        SSH_DIR="/home/$USERNAME/.ssh"
        KEY_FILE="$SSH_DIR/deploy_key_$REPOSITORY_ID"

        mkdir -p "$SSH_DIR"
        echo "$DEPLOY_KEY" > "$KEY_FILE"
        chmod 600 "$KEY_FILE"
        chown -R "$USERNAME:$USERNAME" "$SSH_DIR"

        # Create SSH wrapper
        SSH_WRAPPER="/tmp/ssh_wrapper_$DEPLOYMENT_ID.sh"
        echo "#!/bin/bash" > "$SSH_WRAPPER"
        echo "ssh -i $KEY_FILE -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \"\$@\"" >> "$SSH_WRAPPER"
        chmod +x "$SSH_WRAPPER"

        export GIT_SSH="$SSH_WRAPPER"
        log "SSH deploy key configured"
    fi
}

# Cleanup SSH
cleanup_ssh() {
    if [ -f "/tmp/ssh_wrapper_$DEPLOYMENT_ID.sh" ]; then
        rm -f "/tmp/ssh_wrapper_$DEPLOYMENT_ID.sh"
    fi
}

# Detect framework from project files
detect_framework() {
    local path="$1"

    if [ -f "$path/artisan" ] && [ -f "$path/composer.json" ]; then
        echo "laravel"
    elif [ -f "$path/nuxt.config.js" ] || [ -f "$path/nuxt.config.ts" ]; then
        echo "nuxt"
    elif [ -f "$path/next.config.js" ] || [ -f "$path/next.config.mjs" ]; then
        echo "nextjs"
    elif [ -f "$path/package.json" ]; then
        echo "nodejs"
    else
        echo "static"
    fi
}

# Get default build commands based on framework
get_build_commands() {
    local framework="$1"
    local path="$2"

    case "$framework" in
        laravel)
            echo "cd $path"
            echo "composer install --no-dev --optimize-autoloader --no-interaction"
            if [ -f "$path/package.json" ]; then
                if [ -f "$path/package-lock.json" ]; then
                    echo "npm ci"
                else
                    echo "npm install"
                fi
                echo "npm run build 2>/dev/null || npm run production 2>/dev/null || true"
            fi
            echo "php artisan migrate --force"
            echo "php artisan config:cache"
            echo "php artisan route:cache"
            echo "php artisan view:cache"
            echo "php artisan storage:link 2>/dev/null || true"
            ;;
        nuxt)
            echo "cd $path"
            if [ -f "$path/package-lock.json" ]; then
                echo "npm ci"
            elif [ -f "$path/yarn.lock" ]; then
                echo "yarn install --frozen-lockfile"
            elif [ -f "$path/pnpm-lock.yaml" ]; then
                echo "pnpm install --frozen-lockfile"
            else
                echo "npm install"
            fi
            echo "npm run build"
            ;;
        nextjs)
            echo "cd $path"
            if [ -f "$path/package-lock.json" ]; then
                echo "npm ci"
            elif [ -f "$path/yarn.lock" ]; then
                echo "yarn install --frozen-lockfile"
            elif [ -f "$path/pnpm-lock.yaml" ]; then
                echo "pnpm install --frozen-lockfile"
            else
                echo "npm install"
            fi
            echo "npm run build"
            ;;
        nodejs)
            echo "cd $path"
            if [ -f "$path/package-lock.json" ]; then
                echo "npm ci"
            elif [ -f "$path/yarn.lock" ]; then
                echo "yarn install --frozen-lockfile"
            elif [ -f "$path/pnpm-lock.yaml" ]; then
                echo "pnpm install --frozen-lockfile"
            else
                echo "npm install"
            fi
            # Check for common build scripts
            if grep -q '"build"' "$path/package.json" 2>/dev/null; then
                echo "npm run build"
            fi
            ;;
        static)
            echo "cd $path"
            if [ -f "$path/package.json" ]; then
                if [ -f "$path/package-lock.json" ]; then
                    echo "npm ci"
                else
                    echo "npm install"
                fi
                if grep -q '"build"' "$path/package.json" 2>/dev/null; then
                    echo "npm run build"
                fi
            fi
            ;;
    esac
}

# Main deployment logic
main() {
    log "Starting deployment #$DEPLOYMENT_ID"

    # Mark as started
    cd "$PANEL_PATH" || exit 1
    php artisan tinker --execute="
        \$d = \App\Models\Deployment::find($DEPLOYMENT_ID);
        \$d->started_at = now();
        \$d->status = 'cloning';
        \$d->save();
    " 2>/dev/null

    # Get website root
    WEBSITE_ROOT=$(get_website_info)
    if [ -z "$WEBSITE_ROOT" ]; then
        log "ERROR: Could not get website root"
        mark_deployment_failed "Could not get website root"
        exit 1
    fi

    log "Website root: $WEBSITE_ROOT"

    # Setup paths
    USER_HOME="/home/$USERNAME"
    RELEASES_DIR="$USER_HOME/releases/$WEBSITE_ID"
    SHARED_DIR="$USER_HOME/shared/$WEBSITE_ID"
    TIMESTAMP=$(date '+%Y%m%d%H%M%S')
    RELEASE_PATH="$RELEASES_DIR/$TIMESTAMP"

    # Create directories
    mkdir -p "$RELEASES_DIR"
    mkdir -p "$SHARED_DIR"
    mkdir -p "$SHARED_DIR/storage" 2>/dev/null || true
    chown -R "$USERNAME:$USERNAME" "$USER_HOME/releases" "$USER_HOME/shared" 2>/dev/null || true

    # Setup SSH if deploy key provided
    setup_ssh

    # Clone repository
    log "Cloning repository from $REPO_URL (branch: $BRANCH)"
    update_deployment_status "cloning"

    if [ -n "$DEPLOY_KEY" ]; then
        sudo -u "$USERNAME" GIT_SSH="$GIT_SSH" git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$RELEASE_PATH" 2>&1 | while read line; do log "$line"; done
    else
        sudo -u "$USERNAME" git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$RELEASE_PATH" 2>&1 | while read line; do log "$line"; done
    fi

    if [ $? -ne 0 ] || [ ! -d "$RELEASE_PATH" ]; then
        log "ERROR: Failed to clone repository"
        mark_deployment_failed "Failed to clone repository"
        cleanup_ssh
        exit 1
    fi

    log "Repository cloned successfully"

    # Get commit info
    cd "$RELEASE_PATH"
    COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null)
    COMMIT_MESSAGE=$(git log -1 --pretty=format:'%s' 2>/dev/null)
    COMMIT_AUTHOR=$(git log -1 --pretty=format:'%an' 2>/dev/null)
    update_commit_info "$COMMIT_HASH" "$COMMIT_MESSAGE" "$COMMIT_AUTHOR"
    log "Commit: $COMMIT_HASH - $COMMIT_MESSAGE"

    # Auto-detect framework if set to custom
    if [ "$FRAMEWORK" == "custom" ] || [ -z "$FRAMEWORK" ]; then
        DETECTED_FRAMEWORK=$(detect_framework "$RELEASE_PATH")
        log "Detected framework: $DETECTED_FRAMEWORK"
        FRAMEWORK="$DETECTED_FRAMEWORK"
    fi

    # Building phase
    log "Building application (framework: $FRAMEWORK)"
    update_deployment_status "building"

    # Link shared directories for Laravel
    if [ "$FRAMEWORK" == "laravel" ]; then
        # Create shared storage structure
        mkdir -p "$SHARED_DIR/storage/app/public"
        mkdir -p "$SHARED_DIR/storage/framework/cache"
        mkdir -p "$SHARED_DIR/storage/framework/sessions"
        mkdir -p "$SHARED_DIR/storage/framework/views"
        mkdir -p "$SHARED_DIR/storage/logs"

        # Remove release storage and link to shared
        rm -rf "$RELEASE_PATH/storage"
        ln -s "$SHARED_DIR/storage" "$RELEASE_PATH/storage"

        # Copy .env if exists in shared
        if [ -f "$SHARED_DIR/.env" ]; then
            cp "$SHARED_DIR/.env" "$RELEASE_PATH/.env"
        elif [ -f "$WEBSITE_ROOT/.env" ]; then
            cp "$WEBSITE_ROOT/.env" "$RELEASE_PATH/.env"
            cp "$WEBSITE_ROOT/.env" "$SHARED_DIR/.env"
        fi

        chown -R "$USERNAME:$USERNAME" "$SHARED_DIR"
    fi

    # Run build commands
    if [ -n "$DEPLOY_SCRIPT" ]; then
        log "Running custom deploy script"
        cd "$RELEASE_PATH"

        # Execute deploy script as user
        echo "$DEPLOY_SCRIPT" | while IFS= read -r cmd; do
            if [ -n "$cmd" ] && [[ ! "$cmd" =~ ^# ]]; then
                log "Running: $cmd"
                sudo -u "$USERNAME" bash -c "cd $RELEASE_PATH && source ~/.nvm/nvm.sh 2>/dev/null; $cmd" 2>&1 | while read line; do log "  $line"; done
                if [ ${PIPESTATUS[0]} -ne 0 ]; then
                    log "WARNING: Command may have failed: $cmd"
                fi
            fi
        done
    else
        log "Running auto-detected build commands"
        BUILD_COMMANDS=$(get_build_commands "$FRAMEWORK" "$RELEASE_PATH")

        echo "$BUILD_COMMANDS" | while IFS= read -r cmd; do
            if [ -n "$cmd" ]; then
                log "Running: $cmd"
                sudo -u "$USERNAME" bash -c "source ~/.nvm/nvm.sh 2>/dev/null; $cmd" 2>&1 | while read line; do log "  $line"; done
            fi
        done
    fi

    # Set permissions
    chown -R "$USERNAME:$USERNAME" "$RELEASE_PATH"

    # Deploying phase - swap symlink
    log "Deploying release"
    update_deployment_status "deploying"

    if [ "$ZERO_DOWNTIME" == "1" ]; then
        # Zero-downtime deployment using symlink swap
        CURRENT_LINK="$USER_HOME/current/$WEBSITE_ID"
        mkdir -p "$USER_HOME/current"

        # Create new symlink atomically
        ln -sfn "$RELEASE_PATH" "${CURRENT_LINK}.new"
        mv -Tf "${CURRENT_LINK}.new" "$CURRENT_LINK"

        # Update website root to point to current link if needed
        # For now, we'll copy files to the actual website root
        log "Syncing to website root: $WEBSITE_ROOT"
        rsync -a --delete --exclude='.env' --exclude='storage' --exclude='.git' "$RELEASE_PATH/" "$WEBSITE_ROOT/"

        # Link storage for Laravel
        if [ "$FRAMEWORK" == "laravel" ]; then
            rm -rf "$WEBSITE_ROOT/storage"
            ln -s "$SHARED_DIR/storage" "$WEBSITE_ROOT/storage"
            if [ -f "$SHARED_DIR/.env" ]; then
                cp "$SHARED_DIR/.env" "$WEBSITE_ROOT/.env"
            fi
        fi

        chown -R "$USERNAME:$USERNAME" "$WEBSITE_ROOT"
    else
        # Direct deployment (overwrites existing files)
        log "Direct deployment to: $WEBSITE_ROOT"
        rsync -a --delete --exclude='.env' --exclude='storage' --exclude='.git' "$RELEASE_PATH/" "$WEBSITE_ROOT/"

        if [ "$FRAMEWORK" == "laravel" ]; then
            rm -rf "$WEBSITE_ROOT/storage"
            ln -s "$SHARED_DIR/storage" "$WEBSITE_ROOT/storage"
        fi

        chown -R "$USERNAME:$USERNAME" "$WEBSITE_ROOT"
    fi

    # Restart services based on framework
    if [ "$FRAMEWORK" == "nodejs" ] || [ "$FRAMEWORK" == "nuxt" ] || [ "$FRAMEWORK" == "nextjs" ]; then
        log "Restarting PM2 processes"
        sudo -u "$USERNAME" bash -c "source ~/.nvm/nvm.sh 2>/dev/null; cd $WEBSITE_ROOT && pm2 restart all 2>/dev/null || true"
    fi

    # Reload PHP-FPM for Laravel/PHP sites
    if [ "$FRAMEWORK" == "laravel" ]; then
        log "Reloading PHP-FPM"
        systemctl reload php*-fpm 2>/dev/null || true
    fi

    # Cleanup old releases
    if [ "$KEEP_RELEASES" -gt 0 ]; then
        log "Cleaning up old releases (keeping last $KEEP_RELEASES)"
        cd "$RELEASES_DIR"
        ls -1t | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
    fi

    # Cleanup
    cleanup_ssh

    # Mark as completed
    mark_deployment_completed "$RELEASE_PATH"
    log "Deployment completed successfully"
}

# Run main with error handling
main 2>&1 || {
    log "ERROR: Deployment failed"
    mark_deployment_failed "Deployment script error"
    cleanup_ssh
    exit 1
}

exit 0
