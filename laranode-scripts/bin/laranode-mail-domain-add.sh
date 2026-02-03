#!/bin/bash

# Add a mail domain
# Usage: laranode-mail-domain-add.sh <domain>

DOMAIN="$1"

if [ -z "$DOMAIN" ]; then
    echo "Error: Domain is required"
    echo "Usage: laranode-mail-domain-add.sh <domain>"
    exit 1
fi

# Create mail directory for domain
MAIL_DIR="/var/vmail/${DOMAIN}"
mkdir -p "$MAIL_DIR"
chown -R vmail:vmail "$MAIL_DIR"
chmod -R 770 "$MAIL_DIR"

# Create DKIM directory for domain
DKIM_DIR="/etc/opendkim/keys/${DOMAIN}"
mkdir -p "$DKIM_DIR"

# Generate DKIM key if it doesn't exist
if [ ! -f "${DKIM_DIR}/mail.private" ]; then
    opendkim-genkey -b 2048 -d "$DOMAIN" -D "$DKIM_DIR" -s mail -v
    chown -R opendkim:opendkim "$DKIM_DIR"
    chmod 600 "${DKIM_DIR}/mail.private"
fi

# Add domain to OpenDKIM signing table
SIGNING_TABLE="/etc/opendkim/signing.table"
if ! grep -q "^*@${DOMAIN}" "$SIGNING_TABLE" 2>/dev/null; then
    echo "*@${DOMAIN} mail._domainkey.${DOMAIN}" >> "$SIGNING_TABLE"
fi

# Add domain to OpenDKIM key table
KEY_TABLE="/etc/opendkim/key.table"
if ! grep -q "^mail._domainkey.${DOMAIN}" "$KEY_TABLE" 2>/dev/null; then
    echo "mail._domainkey.${DOMAIN} ${DOMAIN}:mail:${DKIM_DIR}/mail.private" >> "$KEY_TABLE"
fi

# Add domain to OpenDKIM trusted hosts
TRUSTED_HOSTS="/etc/opendkim/trusted.hosts"
if ! grep -q "^${DOMAIN}$" "$TRUSTED_HOSTS" 2>/dev/null; then
    echo "$DOMAIN" >> "$TRUSTED_HOSTS"
fi

# Reload OpenDKIM
systemctl reload opendkim 2>/dev/null || true

echo "Mail domain ${DOMAIN} added successfully"
echo "DKIM public key: ${DKIM_DIR}/mail.txt"
exit 0
