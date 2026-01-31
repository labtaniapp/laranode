#!/bin/bash

# Get status of all laranode supervisor workers or a specific one
# Usage: laranode-supervisor-status.sh [program_name]

PROGRAM_NAME="$1"

if [ -z "$PROGRAM_NAME" ]; then
    # Get all laranode workers
    supervisorctl status | grep "^laranode-"
else
    # Get specific worker status
    supervisorctl status "$PROGRAM_NAME:*"
fi

exit 0
