#!/bin/bash

# Add a mail account
# Usage: laranode-mail-account-add.sh <email> <domain>

EMAIL="$1"
DOMAIN="$2"
LOCAL_PART="${EMAIL%%@*}"

if [ -z "$EMAIL" ] || [ -z "$DOMAIN" ]; then
    echo "Error: Email and domain are required"
    echo "Usage: laranode-mail-account-add.sh <email> <domain>"
    exit 1
fi

# Create maildir for this account
MAIL_DIR="/var/vmail/${DOMAIN}/${LOCAL_PART}"
mkdir -p "${MAIL_DIR}/cur"
mkdir -p "${MAIL_DIR}/new"
mkdir -p "${MAIL_DIR}/tmp"
mkdir -p "${MAIL_DIR}/.Sent/cur"
mkdir -p "${MAIL_DIR}/.Sent/new"
mkdir -p "${MAIL_DIR}/.Sent/tmp"
mkdir -p "${MAIL_DIR}/.Drafts/cur"
mkdir -p "${MAIL_DIR}/.Drafts/new"
mkdir -p "${MAIL_DIR}/.Drafts/tmp"
mkdir -p "${MAIL_DIR}/.Trash/cur"
mkdir -p "${MAIL_DIR}/.Trash/new"
mkdir -p "${MAIL_DIR}/.Trash/tmp"
mkdir -p "${MAIL_DIR}/.Spam/cur"
mkdir -p "${MAIL_DIR}/.Spam/new"
mkdir -p "${MAIL_DIR}/.Spam/tmp"

# Set proper ownership
chown -R vmail:vmail "${MAIL_DIR}"
chmod -R 700 "${MAIL_DIR}"

# Create subscriptions file
echo -e "Sent\nDrafts\nTrash\nSpam" > "${MAIL_DIR}/subscriptions"
chown vmail:vmail "${MAIL_DIR}/subscriptions"

echo "Mail account ${EMAIL} created successfully"
exit 0
