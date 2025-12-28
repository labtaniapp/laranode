#!/bin/bash

# Manage PHP-FPM service (enable/disable/restart)
# Usage: ./laranode-php-service.sh {action} {version}
# Example: ./laranode-php-service.sh enable 8.4

if [ $# -lt 2 ]; then
  echo "Usage: $0 {action: enable|disable|restart} {php version: example 8.4}"
  exit 1
fi

ACTION=$1
PHP_VERSION=$2

case $ACTION in
  enable)
    echo "Enabling PHP $PHP_VERSION-FPM service..."
    systemctl enable php${PHP_VERSION}-fpm
    systemctl start php${PHP_VERSION}-fpm
    ;;
  disable)
    echo "Disabling PHP $PHP_VERSION-FPM service..."
    systemctl stop php${PHP_VERSION}-fpm
    systemctl disable php${PHP_VERSION}-fpm
    ;;
  restart)
    echo "Restarting PHP $PHP_VERSION-FPM service..."
    systemctl restart php${PHP_VERSION}-fpm
    ;;
  *)
    echo "Invalid action: $ACTION"
    echo "Valid actions: enable, disable, restart"
    exit 1
    ;;
esac

if [ $? -eq 0 ]; then
    echo "Action '$ACTION' completed successfully for PHP $PHP_VERSION-FPM"
    exit 0
else
    echo "Failed to $ACTION PHP $PHP_VERSION-FPM"
    exit 1
fi
