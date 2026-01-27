#!/bin/bash
# Add Nginx static site configuration
# Usage: laranode-add-nginx-static.sh {system_user} {domain} {document_root} {template_file_path}

set -e

SYSTEM_USER="$1"
DOMAIN="$2"
DOCUMENT_ROOT="$3"
TEMPLATE_FILE="$4"

if [ -z "$SYSTEM_USER" ] || [ -z "$DOMAIN" ] || [ -z "$DOCUMENT_ROOT" ] || [ -z "$TEMPLATE_FILE" ]; then
    echo "Usage: $0 {system_user} {domain} {document_root} {template_file_path}"
    exit 1
fi

# Verify template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Error: Template file not found: $TEMPLATE_FILE"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p "/home/$SYSTEM_USER/logs"
chown "$SYSTEM_USER:$SYSTEM_USER" "/home/$SYSTEM_USER/logs"

# Generate Nginx config from template
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN.conf"

sed -e "s|{user}|$SYSTEM_USER|g" \
    -e "s|{domain}|$DOMAIN|g" \
    -e "s|{document_root}|$DOCUMENT_ROOT|g" \
    "$TEMPLATE_FILE" > "$NGINX_CONFIG"

# Enable the site
ln -sf "$NGINX_CONFIG" "/etc/nginx/sites-enabled/$DOMAIN.conf"

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

echo "Nginx static site configuration created for $DOMAIN"
