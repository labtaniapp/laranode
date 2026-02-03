#!/bin/bash

# Reload mail services
# Usage: laranode-mail-reload.sh

echo "Reloading Postfix..."
systemctl reload postfix 2>/dev/null || systemctl restart postfix

echo "Reloading Dovecot..."
systemctl reload dovecot 2>/dev/null || systemctl restart dovecot

echo "Reloading OpenDKIM..."
systemctl reload opendkim 2>/dev/null || systemctl restart opendkim

echo "Mail services reloaded"
exit 0
