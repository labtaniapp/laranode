#!/bin/bash
# Remove Nginx proxy configuration
# Usage: laranode-remove-nginx-proxy.sh {domain}

set -e

DOMAIN="$1"

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 {domain}"
    exit 1
fi

# Remove the site configuration
rm -f "/etc/nginx/sites-enabled/$DOMAIN.conf"
rm -f "/etc/nginx/sites-available/$DOMAIN.conf"

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

echo "Nginx proxy configuration removed for $DOMAIN"
