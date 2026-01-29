#!/bin/bash
# Set default Node.js version via nvm

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <major_version>"
    echo "Example: $0 20"
    exit 1
fi

export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Get the full version number for this major version
full_version=$(nvm ls --no-colors 2>/dev/null | grep -oE "v${VERSION}\.[0-9]+\.[0-9]+" | head -1)

if [ -z "$full_version" ]; then
    echo "Node.js $VERSION is not installed"
    exit 1
fi

echo "Setting Node.js $full_version as default..."

nvm alias default $full_version

if [ $? -eq 0 ]; then
    echo "Node.js $VERSION set as default completed successfully"
    exit 0
else
    echo "Failed to set Node.js $VERSION as default"
    exit 1
fi
