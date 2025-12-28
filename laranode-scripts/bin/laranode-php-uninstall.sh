#!/bin/bash

# Uninstall a PHP-FPM version
# Usage: ./laranode-php-uninstall.sh {version}
# Example: ./laranode-php-uninstall.sh 8.4

if [ $# -lt 1 ]; then
  echo "Usage: $0 {php version: example 8.4}"
  exit 1
fi

PHP_VERSION=$1

echo "Uninstalling PHP $PHP_VERSION-FPM..."

# Stop the service
systemctl stop php${PHP_VERSION}-fpm

# Disable the service
systemctl disable php${PHP_VERSION}-fpm

# Remove PHP packages
apt-get remove -y php${PHP_VERSION}-* 

# Purge configuration files
apt-get purge -y php${PHP_VERSION}-*

# Clean up
apt-get autoremove -y

if [ $? -eq 0 ]; then
    echo "PHP $PHP_VERSION uninstalled successfully"
    exit 0
else
    echo "Failed to uninstall PHP $PHP_VERSION"
    exit 1
fi
