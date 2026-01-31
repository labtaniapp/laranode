#!/bin/bash

# Get logs for a supervisor worker
# Usage: laranode-supervisor-logs.sh <log_file> [lines]

LOG_FILE="$1"
LINES="${2:-100}"

if [ -z "$LOG_FILE" ]; then
    echo "Error: Missing log file path"
    echo "Usage: laranode-supervisor-logs.sh <log_file> [lines]"
    exit 1
fi

if [ ! -f "$LOG_FILE" ]; then
    echo "Log file not found: $LOG_FILE"
    exit 1
fi

# Output the last N lines
tail -n "$LINES" "$LOG_FILE"

exit 0
