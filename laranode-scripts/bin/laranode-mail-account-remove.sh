#!/bin/bash

# Remove a mail account
# Usage: laranode-mail-account-remove.sh <email> <domain>

EMAIL="$1"
DOMAIN="$2"
LOCAL_PART="${EMAIL%%@*}"

if [ -z "$EMAIL" ] || [ -z "$DOMAIN" ]; then
    echo "Error: Email and domain are required"
    echo "Usage: laranode-mail-account-remove.sh <email> <domain>"
    exit 1
fi

# Remove maildir for this account
MAIL_DIR="/var/vmail/${DOMAIN}/${LOCAL_PART}"
if [ -d "$MAIL_DIR" ]; then
    rm -rf "$MAIL_DIR"
    echo "Mail account ${EMAIL} removed successfully"
else
    echo "Mail directory not found for ${EMAIL}"
fi

exit 0
