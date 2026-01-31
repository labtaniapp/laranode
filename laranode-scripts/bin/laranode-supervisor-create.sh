#!/bin/bash

# Create or update a supervisor worker configuration
# Usage: laranode-supervisor-create.sh <program_name> <command> <directory> <user> <numprocs> <autostart> <autorestart> <startsecs> <stopwaitsecs> <stdout_logfile> <stderr_logfile>

PROGRAM_NAME="$1"
COMMAND="$2"
DIRECTORY="$3"
USER="$4"
NUMPROCS="$5"
AUTOSTART="$6"
AUTORESTART="$7"
STARTSECS="$8"
STOPWAITSECS="$9"
STDOUT_LOGFILE="${10}"
STDERR_LOGFILE="${11}"

if [ -z "$PROGRAM_NAME" ] || [ -z "$COMMAND" ] || [ -z "$DIRECTORY" ]; then
    echo "Error: Missing required parameters"
    echo "Usage: laranode-supervisor-create.sh <program_name> <command> <directory> <user> <numprocs> <autostart> <autorestart> <startsecs> <stopwaitsecs> <stdout_logfile> <stderr_logfile>"
    exit 1
fi

# Set defaults
USER="${USER:-www-data}"
NUMPROCS="${NUMPROCS:-1}"
AUTOSTART="${AUTOSTART:-true}"
AUTORESTART="${AUTORESTART:-true}"
STARTSECS="${STARTSECS:-1}"
STOPWAITSECS="${STOPWAITSECS:-10}"

# Ensure log directory exists
LOG_DIR=$(dirname "$STDOUT_LOGFILE")
if [ ! -d "$LOG_DIR" ]; then
    mkdir -p "$LOG_DIR"
    chown "$USER:$USER" "$LOG_DIR"
fi

# Ensure supervisor laranode directory exists
mkdir -p /etc/supervisor/conf.d/laranode

# Create the supervisor config
CONFIG_FILE="/etc/supervisor/conf.d/laranode/${PROGRAM_NAME}.conf"

cat > "$CONFIG_FILE" << EOF
[program:${PROGRAM_NAME}]
command=${COMMAND}
directory=${DIRECTORY}
user=${USER}
numprocs=${NUMPROCS}
autostart=${AUTOSTART}
autorestart=${AUTORESTART}
startsecs=${STARTSECS}
stopwaitsecs=${STOPWAITSECS}
stdout_logfile=${STDOUT_LOGFILE}
stderr_logfile=${STDERR_LOGFILE}
stdout_logfile_maxbytes=10MB
stderr_logfile_maxbytes=10MB
EOF

# Add process_name if multiple processes
if [ "$NUMPROCS" -gt 1 ]; then
    echo "process_name=%(program_name)s_%(process_num)02d" >> "$CONFIG_FILE"
fi

# Reread and update supervisor
supervisorctl reread
supervisorctl update

echo "Worker $PROGRAM_NAME created successfully"
exit 0
