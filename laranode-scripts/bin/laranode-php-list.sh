#!/bin/bash

# List all installed PHP-FPM versions with their systemctl status
# Output: JSON array of PHP versions with status

# Get all installed php*-fpm packages
php_versions=$(dpkg -l | grep -E 'php[0-9]+\.[0-9]+-fpm' | awk '{print $2}' | sed 's/php\(.*\)-fpm/\1/')

echo "["
first=true

for version in $php_versions; do
    # Get systemctl status
    if systemctl is-active --quiet "php${version}-fpm"; then
        status="active"
    else
        status="inactive"
    fi
    
    # Get systemctl enabled status
    if systemctl is-enabled --quiet "php${version}-fpm" 2>/dev/null; then
        enabled="true"
    else
        enabled="false"
    fi
    
    # Output JSON object
    if [ "$first" = true ]; then
        first=false
    else
        echo ","
    fi
    
    echo -n "  {\"version\": \"$version\", \"status\": \"$status\", \"enabled\": $enabled}"
done

echo ""
echo "]"
