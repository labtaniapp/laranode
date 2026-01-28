#!/bin/bash
# Remove Nginx site configuration (works for both proxy and static)
# Usage: laranode-remove-nginx-site.sh {domain}

set -e

DOMAIN="$1"

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 {domain}"
    exit 1
fi

# Remove the site configuration
rm -f "/etc/nginx/sites-enabled/$DOMAIN.conf"
rm -f "/etc/nginx/sites-available/$DOMAIN.conf"

# Test Nginx configuration (only reload if test passes)
if nginx -t 2>/dev/null; then
    systemctl reload nginx
    echo "Nginx configuration removed and reloaded for $DOMAIN"
else
    echo "Warning: Nginx configuration removed for $DOMAIN but reload skipped due to config errors"
fi
