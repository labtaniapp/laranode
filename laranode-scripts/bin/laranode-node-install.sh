#!/bin/bash
# Install Node.js version via nvm

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <major_version>"
    echo "Example: $0 20"
    exit 1
fi

export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Check if nvm is installed
if ! command -v nvm &> /dev/null; then
    echo "nvm is not installed. Installing nvm first..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="/root/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

echo "Installing Node.js $VERSION..."

# Install the specified major version (latest minor/patch)
nvm install $VERSION

if [ $? -eq 0 ]; then
    # Install PM2 globally if not already installed
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2 process manager..."
        npm install -g pm2
    fi

    echo "Node.js $VERSION installed successfully"
    exit 0
else
    echo "Failed to install Node.js $VERSION"
    exit 1
fi
