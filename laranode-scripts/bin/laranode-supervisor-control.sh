#!/bin/bash

# Control a supervisor worker (start, stop, restart, status)
# Usage: laranode-supervisor-control.sh <action> <program_name>

ACTION="$1"
PROGRAM_NAME="$2"

if [ -z "$ACTION" ] || [ -z "$PROGRAM_NAME" ]; then
    echo "Error: Missing required parameters"
    echo "Usage: laranode-supervisor-control.sh <action> <program_name>"
    echo "Actions: start, stop, restart, status"
    exit 1
fi

case "$ACTION" in
    start)
        supervisorctl start "$PROGRAM_NAME:*"
        ;;
    stop)
        supervisorctl stop "$PROGRAM_NAME:*"
        ;;
    restart)
        supervisorctl restart "$PROGRAM_NAME:*"
        ;;
    status)
        supervisorctl status "$PROGRAM_NAME:*"
        ;;
    *)
        echo "Error: Invalid action '$ACTION'"
        echo "Valid actions: start, stop, restart, status"
        exit 1
        ;;
esac

exit 0
