#!/bin/bash

#############################################
# Laranode Panel Update Script
# Updates the Laranode hosting panel
#############################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PANEL_PATH="${LARANODE_PATH:-/home/laranode_ln/panel}"
BRANCH="${LARANODE_BRANCH:-main}"
BACKUP_DIR="${PANEL_PATH}/storage/backups/updates"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."

    # Check if running as root or laranode user
    if [[ $EUID -ne 0 ]] && [[ $(whoami) != "laranode_ln" ]]; then
        log_error "This script must be run as root or laranode_ln user"
        exit 1
    fi

    # Check if panel directory exists
    if [[ ! -d "$PANEL_PATH" ]]; then
        log_error "Panel directory not found: $PANEL_PATH"
        exit 1
    fi

    # Check for git
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed"
        exit 1
    fi

    # Check disk space (need at least 500MB)
    DISK_FREE=$(df -B1 "$PANEL_PATH" | tail -1 | awk '{print $4}')
    if [[ $DISK_FREE -lt 500000000 ]]; then
        log_error "Insufficient disk space. Need at least 500MB free."
        exit 1
    fi

    log_success "All requirements met"
}

create_backup() {
    log_info "Creating backup..."

    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
    BACKUP_FILE="${BACKUP_DIR}/pre-update-${TIMESTAMP}.tar.gz"

    cd "$PANEL_PATH"

    # Backup important files
    tar -czf "$BACKUP_FILE" \
        .env \
        config/laranode.php \
        storage/app \
        2>/dev/null || true

    log_success "Backup created: $BACKUP_FILE"

    # Keep only last 5 backups
    ls -t "${BACKUP_DIR}"/pre-update-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
}

check_for_updates() {
    log_info "Checking for updates..."

    cd "$PANEL_PATH"

    # Fetch latest
    git fetch origin "$BRANCH" --quiet

    # Get current and latest commits
    CURRENT_COMMIT=$(git rev-parse HEAD)
    LATEST_COMMIT=$(git rev-parse "origin/$BRANCH")

    if [[ "$CURRENT_COMMIT" == "$LATEST_COMMIT" ]]; then
        log_success "Already up to date!"
        exit 0
    fi

    # Show changelog
    COMMITS_BEHIND=$(git rev-list HEAD.."origin/$BRANCH" --count)
    log_info "Updates available: $COMMITS_BEHIND new commit(s)"
    echo ""
    echo "Changelog:"
    echo "----------"
    git log HEAD.."origin/$BRANCH" --oneline --no-decorate -n 10
    echo ""
}

perform_update() {
    log_info "Starting update process..."

    cd "$PANEL_PATH"

    # Enable maintenance mode
    log_info "Enabling maintenance mode..."
    php artisan down --refresh=15 2>/dev/null || true

    # Pull latest changes
    log_info "Pulling latest changes..."
    if ! git pull origin "$BRANCH"; then
        log_error "Git pull failed"
        php artisan up
        exit 1
    fi

    # Update composer dependencies
    log_info "Updating Composer dependencies..."
    COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader --no-interaction

    # Run migrations
    log_info "Running database migrations..."
    php artisan migrate --force

    # Build frontend assets
    log_info "Building frontend assets..."
    npm install --silent
    npm run build

    # Clear and rebuild caches
    log_info "Rebuilding caches..."
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    php artisan event:cache

    # Restart queue workers
    log_info "Restarting queue workers..."
    php artisan queue:restart 2>/dev/null || true

    # Disable maintenance mode
    log_info "Disabling maintenance mode..."
    php artisan up

    # Get new version
    NEW_VERSION=$(php artisan tinker --execute="echo config('laranode.version');" 2>/dev/null | tail -1)

    log_success "Update completed successfully!"
    echo ""
    echo "New version: $NEW_VERSION"
}

rollback() {
    log_warning "Starting rollback..."

    cd "$PANEL_PATH"

    # Find latest backup
    LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/pre-update-*.tar.gz 2>/dev/null | head -1)

    if [[ -z "$LATEST_BACKUP" ]]; then
        log_error "No backup found for rollback"
        exit 1
    fi

    log_info "Using backup: $LATEST_BACKUP"

    # Enable maintenance mode
    php artisan down

    # Reset to previous commit
    git reset --hard HEAD~1

    # Restore backup
    tar -xzf "$LATEST_BACKUP"

    # Reinstall dependencies
    COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader --no-interaction
    npm install --silent
    npm run build

    # Run migrations
    php artisan migrate --force

    # Rebuild caches
    php artisan config:cache
    php artisan route:cache

    # Disable maintenance mode
    php artisan up

    log_success "Rollback completed!"
}

show_help() {
    echo "Laranode Update Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  check     Check for available updates"
    echo "  update    Perform the update"
    echo "  rollback  Rollback to previous version"
    echo "  help      Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  LARANODE_PATH    Panel installation path (default: /home/laranode_ln/panel)"
    echo "  LARANODE_BRANCH  Git branch to use (default: main)"
}

# Main
case "${1:-update}" in
    check)
        check_requirements
        check_for_updates
        ;;
    update)
        check_requirements
        check_for_updates
        read -p "Do you want to proceed with the update? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            create_backup
            perform_update
        else
            log_info "Update cancelled"
        fi
        ;;
    rollback)
        check_requirements
        read -p "Are you sure you want to rollback? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rollback
        else
            log_info "Rollback cancelled"
        fi
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
