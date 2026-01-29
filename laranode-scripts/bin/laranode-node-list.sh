#!/bin/bash
# List all installed Node.js versions via nvm

export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Get installed versions
versions=$(nvm ls --no-colors 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | sort -V | uniq)

# Get default version
default_version=$(nvm alias default 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+')

# Get current version
current_version=$(node -v 2>/dev/null)

# Build JSON output
echo "["
first=true
for v in $versions; do
    major=$(echo $v | sed 's/v\([0-9]*\).*/\1/')

    if [ "$first" = true ]; then
        first=false
    else
        echo ","
    fi

    is_default="false"
    if [ "$v" = "$default_version" ]; then
        is_default="true"
    fi

    status="inactive"
    if [ "$v" = "$current_version" ]; then
        status="active"
    fi

    echo "  {"
    echo "    \"version\": \"$major\","
    echo "    \"full_version\": \"$v\","
    echo "    \"status\": \"$status\","
    echo "    \"is_default\": $is_default"
    echo -n "  }"
done
echo ""
echo "]"
