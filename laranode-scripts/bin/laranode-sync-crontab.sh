#!/bin/bash
# Sync crontab for a user from a temp file
# Usage: laranode-sync-crontab.sh <username> <temp_file_path>

USERNAME=$1
TEMP_FILE=$2

if [ -z "$USERNAME" ] || [ -z "$TEMP_FILE" ]; then
    echo "Usage: $0 <username> <temp_file_path>"
    exit 1
fi

if [ ! -f "$TEMP_FILE" ]; then
    echo "Temp file not found: $TEMP_FILE"
    exit 1
fi

# Check if user exists
if ! id "$USERNAME" &>/dev/null; then
    echo "User $USERNAME does not exist"
    exit 1
fi

# Install the crontab for the user
crontab -u "$USERNAME" "$TEMP_FILE"

if [ $? -eq 0 ]; then
    echo "Crontab synced successfully for user $USERNAME"
    exit 0
else
    echo "Failed to sync crontab for user $USERNAME"
    exit 1
fi
