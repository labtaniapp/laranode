#!/bin/bash

# LaraNode Asset Rebuild Script
# This script rebuilds the frontend assets after configuration changes

PANEL_PATH="/home/laranode_ln/panel"
LOG_FILE="/var/log/laranode-rebuild.log"

echo "$(date): Starting asset rebuild..." >> "$LOG_FILE"

cd "$PANEL_PATH" || exit 1

# Clear Laravel caches
echo "$(date): Clearing Laravel caches..." >> "$LOG_FILE"
php artisan config:clear >> "$LOG_FILE" 2>&1
php artisan cache:clear >> "$LOG_FILE" 2>&1
php artisan view:clear >> "$LOG_FILE" 2>&1

# Rebuild frontend assets
echo "$(date): Running npm run build..." >> "$LOG_FILE"
npm run build >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "$(date): Asset rebuild completed successfully" >> "$LOG_FILE"
else
    echo "$(date): Asset rebuild failed" >> "$LOG_FILE"
    exit 1
fi

# Restart Reverb for WebSocket changes
echo "$(date): Restarting Reverb service..." >> "$LOG_FILE"
systemctl restart laranode-reverb >> "$LOG_FILE" 2>&1

# Restart queue worker
echo "$(date): Restarting queue worker..." >> "$LOG_FILE"
systemctl restart laranode-queue-worker >> "$LOG_FILE" 2>&1

echo "$(date): All services restarted successfully" >> "$LOG_FILE"

exit 0
