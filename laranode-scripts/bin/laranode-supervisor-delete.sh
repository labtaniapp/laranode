#!/bin/bash

# Delete a supervisor worker
# Usage: laranode-supervisor-delete.sh <program_name>

PROGRAM_NAME="$1"

if [ -z "$PROGRAM_NAME" ]; then
    echo "Error: Missing program name"
    echo "Usage: laranode-supervisor-delete.sh <program_name>"
    exit 1
fi

CONFIG_FILE="/etc/supervisor/conf.d/laranode/${PROGRAM_NAME}.conf"

# Stop the worker first
supervisorctl stop "$PROGRAM_NAME:*" 2>/dev/null

# Remove the config file
if [ -f "$CONFIG_FILE" ]; then
    rm -f "$CONFIG_FILE"
fi

# Reread and update supervisor
supervisorctl reread
supervisorctl update

echo "Worker $PROGRAM_NAME deleted successfully"
exit 0
