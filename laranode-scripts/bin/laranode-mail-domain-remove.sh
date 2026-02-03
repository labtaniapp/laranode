#!/bin/bash

# Remove a mail domain
# Usage: laranode-mail-domain-remove.sh <domain>

DOMAIN="$1"

if [ -z "$DOMAIN" ]; then
    echo "Error: Domain is required"
    echo "Usage: laranode-mail-domain-remove.sh <domain>"
    exit 1
fi

# Remove mail directory for domain
MAIL_DIR="/var/vmail/${DOMAIN}"
if [ -d "$MAIL_DIR" ]; then
    rm -rf "$MAIL_DIR"
fi

# Remove DKIM directory for domain
DKIM_DIR="/etc/opendkim/keys/${DOMAIN}"
if [ -d "$DKIM_DIR" ]; then
    rm -rf "$DKIM_DIR"
fi

# Remove from OpenDKIM signing table
SIGNING_TABLE="/etc/opendkim/signing.table"
if [ -f "$SIGNING_TABLE" ]; then
    sed -i "/^*@${DOMAIN}/d" "$SIGNING_TABLE"
fi

# Remove from OpenDKIM key table
KEY_TABLE="/etc/opendkim/key.table"
if [ -f "$KEY_TABLE" ]; then
    sed -i "/^mail._domainkey.${DOMAIN}/d" "$KEY_TABLE"
fi

# Remove from OpenDKIM trusted hosts
TRUSTED_HOSTS="/etc/opendkim/trusted.hosts"
if [ -f "$TRUSTED_HOSTS" ]; then
    sed -i "/^${DOMAIN}$/d" "$TRUSTED_HOSTS"
fi

# Reload OpenDKIM
systemctl reload opendkim 2>/dev/null || true

echo "Mail domain ${DOMAIN} removed successfully"
exit 0
