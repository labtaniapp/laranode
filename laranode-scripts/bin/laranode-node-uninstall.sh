#!/bin/bash
# Uninstall Node.js version via nvm

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <major_version>"
    echo "Example: $0 20"
    exit 1
fi

export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Uninstalling Node.js $VERSION..."

# Get the full version number for this major version
full_version=$(nvm ls --no-colors 2>/dev/null | grep -oE "v${VERSION}\.[0-9]+\.[0-9]+" | head -1)

if [ -z "$full_version" ]; then
    echo "Node.js $VERSION is not installed"
    exit 1
fi

# Uninstall the version
nvm uninstall $full_version

if [ $? -eq 0 ]; then
    echo "Node.js $VERSION uninstalled successfully"
    exit 0
else
    echo "Failed to uninstall Node.js $VERSION"
    exit 1
fi
