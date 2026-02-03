#!/bin/bash

# SSL Certificate Manager for Laranode
# This script handles SSL certificate generation and management using Let's Encrypt
# Supports Apache (PHP), Nginx (Node.js), and Static sites

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
WEBROOT_PATH="/var/www/html"
CERTBOT_PATH="/usr/bin/certbot"
APACHE_SITES_PATH="/etc/apache2/sites-available"
APACHE_ENABLED_PATH="/etc/apache2/sites-enabled"
NGINX_SITES_PATH="/etc/nginx/sites-available"
NGINX_ENABLED_PATH="/etc/nginx/sites-enabled"
SSL_CERTS_PATH="/etc/letsencrypt/live"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if certbot is installed
check_certbot() {
    if ! command -v certbot &> /dev/null; then
        print_error "Certbot is not installed. Please install it first:"
        echo "sudo apt update && sudo apt install certbot python3-certbot-apache python3-certbot-nginx"
        exit 1
    fi
}

# Function to check if domain is accessible
check_domain_accessibility() {
    local domain=$1
    print_status "Checking if domain $domain is accessible..."

    # Try both HTTP and check DNS
    if ! host "$domain" > /dev/null 2>&1; then
        print_warning "Domain $domain DNS might not be configured yet"
    fi

    print_status "Proceeding with SSL generation for $domain"
}

# Function to generate SSL certificate
generate_ssl_certificate() {
    local domain=$1
    local email=$2
    local document_root=$3
    local webroot_path

    # Prefer provided document root; fallback to default WEBROOT_PATH
    if [ -n "$document_root" ] && [ -d "$document_root" ]; then
        webroot_path="$document_root"
    else
        webroot_path="$WEBROOT_PATH"
    fi

    print_status "Generating SSL certificate for $domain..."

    # Check if certificate already exists
    if [ -d "$SSL_CERTS_PATH/$domain" ]; then
        print_warning "SSL certificate for $domain already exists"
        return 0
    fi

    # Create .well-known directory if needed
    mkdir -p "$webroot_path/.well-known/acme-challenge"
    chmod -R 755 "$webroot_path/.well-known"

    # Generate certificate using certbot with webroot
    if certbot certonly \
        --webroot \
        --webroot-path="$webroot_path" \
        --email "$email" \
        --agree-tos \
        --no-eff-email \
        --domains "$domain" \
        --non-interactive; then
        print_status "SSL certificate generated successfully for $domain"
        return 0
    else
        print_error "Failed to generate SSL certificate for $domain"
        return 1
    fi
}

# Function to create SSL-enabled Apache virtual host for PHP sites
create_ssl_vhost_php() {
    local domain=$1
    local document_root=$2

    print_status "Creating SSL-enabled Apache virtual host for PHP site: $domain..."

    local non_ssl_vhost="$APACHE_SITES_PATH/$domain.conf"
    local vhost_file="$APACHE_SITES_PATH/$domain-ssl.conf"

    if [[ ! -f "$non_ssl_vhost" ]]; then
        print_error "Non-SSL vhost file not found: $non_ssl_vhost"
        return 1
    fi

    # Extract everything between <VirtualHost> and </VirtualHost>
    local inner_content
    inner_content=$(awk '
        /<VirtualHost/{flag=1; next}
        /<\/VirtualHost>/{flag=0}
        flag
    ' "$non_ssl_vhost")

    {
        echo "<VirtualHost *:443>"
        echo
        echo "    SSLEngine on"
        echo "    SSLCertificateFile $SSL_CERTS_PATH/$domain/fullchain.pem"
        echo "    SSLCertificateKeyFile $SSL_CERTS_PATH/$domain/privkey.pem"
        echo
        echo "    # Modern SSL configuration"
        echo "    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1"
        echo "    SSLHonorCipherOrder off"
        echo "    SSLSessionTickets off"
        echo
        echo "$inner_content" | sed 's/^/    /'
        echo "</VirtualHost>"
    } > "$vhost_file"

    # Update non-SSL vhost to redirect to HTTPS
    create_http_redirect "$domain"

    # Enable the SSL site
    a2ensite "$domain-ssl.conf" > /dev/null 2>&1

    # Test Apache configuration
    if apache2ctl configtest 2>/dev/null; then
        systemctl reload apache2
        print_status "SSL virtual host created and enabled for $domain"
        return 0
    else
        print_error "Apache configuration test failed"
        return 1
    fi
}

# Function to create SSL-enabled Apache virtual host for Node.js sites (proxy to Nginx)
create_ssl_vhost_nodejs() {
    local domain=$1
    local user=$2
    local port=$3

    print_status "Creating SSL-enabled Apache virtual host for Node.js site: $domain..."

    local vhost_file="$APACHE_SITES_PATH/$domain-ssl.conf"

    {
        echo "<VirtualHost *:443>"
        echo "    ServerName $domain"
        echo "    ServerAlias www.$domain"
        echo
        echo "    SSLEngine on"
        echo "    SSLCertificateFile $SSL_CERTS_PATH/$domain/fullchain.pem"
        echo "    SSLCertificateKeyFile $SSL_CERTS_PATH/$domain/privkey.pem"
        echo
        echo "    # Modern SSL configuration"
        echo "    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1"
        echo "    SSLHonorCipherOrder off"
        echo "    SSLSessionTickets off"
        echo
        echo "    # Proxy to Nginx on port 8080"
        echo "    ProxyPreserveHost On"
        echo "    ProxyPass / http://127.0.0.1:8080/"
        echo "    ProxyPassReverse / http://127.0.0.1:8080/"
        echo
        echo "    # WebSocket support"
        echo "    RewriteEngine On"
        echo "    RewriteCond %{HTTP:Upgrade} websocket [NC]"
        echo "    RewriteCond %{HTTP:Connection} upgrade [NC]"
        echo "    RewriteRule ^/?(.*) \"ws://127.0.0.1:8080/\$1\" [P,L]"
        echo
        echo "    # Pass real IP to backend"
        echo "    RequestHeader set X-Forwarded-Proto \"https\""
        echo "    RequestHeader set X-Forwarded-Ssl on"
        echo
        echo "    # Logs"
        echo "    ErrorLog /home/$user/logs/ssl-error.log"
        echo "    CustomLog /home/$user/logs/ssl-access.log combined"
        echo "</VirtualHost>"
    } > "$vhost_file"

    # Enable required Apache modules
    a2enmod proxy proxy_http proxy_wstunnel rewrite headers ssl > /dev/null 2>&1 || true

    # Create HTTP redirect
    create_http_redirect "$domain"

    # Enable the SSL site
    a2ensite "$domain-ssl.conf" > /dev/null 2>&1

    # Test Apache configuration
    if apache2ctl configtest 2>/dev/null; then
        systemctl reload apache2
        print_status "SSL virtual host created and enabled for Node.js site: $domain"
        return 0
    else
        print_error "Apache configuration test failed"
        cat "$vhost_file"
        return 1
    fi
}

# Function to create SSL-enabled Apache virtual host for Static sites
create_ssl_vhost_static() {
    local domain=$1
    local document_root=$2
    local user=$3

    print_status "Creating SSL-enabled Apache virtual host for Static site: $domain..."

    local vhost_file="$APACHE_SITES_PATH/$domain-ssl.conf"

    {
        echo "<VirtualHost *:443>"
        echo "    ServerName $domain"
        echo "    ServerAlias www.$domain"
        echo "    DocumentRoot $document_root"
        echo
        echo "    SSLEngine on"
        echo "    SSLCertificateFile $SSL_CERTS_PATH/$domain/fullchain.pem"
        echo "    SSLCertificateKeyFile $SSL_CERTS_PATH/$domain/privkey.pem"
        echo
        echo "    # Modern SSL configuration"
        echo "    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1"
        echo "    SSLHonorCipherOrder off"
        echo "    SSLSessionTickets off"
        echo
        echo "    <Directory $document_root>"
        echo "        Options -Indexes +FollowSymLinks"
        echo "        AllowOverride All"
        echo "        Require all granted"
        echo "    </Directory>"
        echo
        echo "    # Security headers"
        echo "    Header always set X-Frame-Options \"SAMEORIGIN\""
        echo "    Header always set X-Content-Type-Options \"nosniff\""
        echo "    Header always set X-XSS-Protection \"1; mode=block\""
        echo
        echo "    # Static file caching"
        echo "    <FilesMatch \"\.(ico|pdf|flv|jpg|jpeg|png|gif|js|css|swf|woff|woff2|ttf|svg|eot)$\">"
        echo "        Header set Cache-Control \"max-age=2592000, public\""
        echo "    </FilesMatch>"
        echo
        echo "    # Compression"
        echo "    <IfModule mod_deflate.c>"
        echo "        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json"
        echo "    </IfModule>"
        echo
        echo "    # Logs"
        echo "    ErrorLog /home/$user/logs/ssl-error.log"
        echo "    CustomLog /home/$user/logs/ssl-access.log combined"
        echo "</VirtualHost>"
    } > "$vhost_file"

    # Enable required Apache modules
    a2enmod headers ssl deflate > /dev/null 2>&1 || true

    # Create HTTP redirect
    create_http_redirect "$domain"

    # Enable the SSL site
    a2ensite "$domain-ssl.conf" > /dev/null 2>&1

    # Test Apache configuration
    if apache2ctl configtest 2>/dev/null; then
        systemctl reload apache2
        print_status "SSL virtual host created and enabled for Static site: $domain"
        return 0
    else
        print_error "Apache configuration test failed"
        return 1
    fi
}

# Function to create HTTP to HTTPS redirect
create_http_redirect() {
    local domain=$1
    local redirect_file="$APACHE_SITES_PATH/$domain-redirect.conf"

    print_status "Creating HTTP to HTTPS redirect for $domain..."

    {
        echo "<VirtualHost *:80>"
        echo "    ServerName $domain"
        echo "    ServerAlias www.$domain"
        echo
        echo "    # Allow ACME challenge for certificate renewal"
        echo "    Alias /.well-known/acme-challenge/ /var/www/html/.well-known/acme-challenge/"
        echo "    <Directory /var/www/html/.well-known/acme-challenge/>"
        echo "        Options None"
        echo "        AllowOverride None"
        echo "        Require all granted"
        echo "    </Directory>"
        echo
        echo "    # Redirect all other traffic to HTTPS"
        echo "    RewriteEngine On"
        echo "    RewriteCond %{REQUEST_URI} !^/.well-known/acme-challenge/"
        echo "    RewriteRule ^(.*)$ https://%{HTTP_HOST}\$1 [R=301,L]"
        echo "</VirtualHost>"
    } > "$redirect_file"

    a2enmod rewrite > /dev/null 2>&1 || true
    a2ensite "$domain-redirect.conf" > /dev/null 2>&1

    # Disable old non-SSL conf if it conflicts
    if [ -f "$APACHE_SITES_PATH/$domain.conf" ]; then
        # Check if the old conf listens on port 80
        if grep -q "<VirtualHost \*:80>" "$APACHE_SITES_PATH/$domain.conf"; then
            a2dissite "$domain.conf" > /dev/null 2>&1 || true
        fi
    fi
}

# Function to remove SSL certificate and configuration
remove_ssl_certificate() {
    local domain=$1

    print_status "Removing SSL certificate for $domain..."

    # Disable and remove SSL site
    if [ -f "$APACHE_SITES_PATH/$domain-ssl.conf" ]; then
        a2dissite "$domain-ssl.conf" > /dev/null 2>&1 || true
        rm -f "$APACHE_SITES_PATH/$domain-ssl.conf"
    fi

    # Disable and remove redirect
    if [ -f "$APACHE_SITES_PATH/$domain-redirect.conf" ]; then
        a2dissite "$domain-redirect.conf" > /dev/null 2>&1 || true
        rm -f "$APACHE_SITES_PATH/$domain-redirect.conf"
    fi

    # Re-enable original non-SSL conf
    if [ -f "$APACHE_SITES_PATH/$domain.conf" ]; then
        a2ensite "$domain.conf" > /dev/null 2>&1 || true
    fi

    # Remove certificate files
    if [ -d "$SSL_CERTS_PATH/$domain" ]; then
        certbot delete --cert-name "$domain" --non-interactive 2>/dev/null || true
        print_status "SSL certificate removed for $domain"
    else
        print_warning "No SSL certificate found for $domain"
    fi

    # Reload Apache
    systemctl reload apache2
    print_status "SSL configuration removed for $domain"
}

# Function to check SSL certificate status
check_ssl_status() {
    local domain=$1

    if [ -d "$SSL_CERTS_PATH/$domain" ]; then
        # Check if certificate is valid and not expired
        local cert_file="$SSL_CERTS_PATH/$domain/fullchain.pem"
        if [ -f "$cert_file" ]; then
            local expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2)
            if [ -n "$expiry_date" ]; then
                local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null)
                local current_timestamp=$(date +%s)

                if [ -n "$expiry_timestamp" ] && [ $expiry_timestamp -gt $current_timestamp ]; then
                    echo "active"
                    return 0
                else
                    echo "expired"
                    return 1
                fi
            fi
        fi
    fi

    echo "inactive"
    return 1
}

# Function to get certificate expiry date
get_expiry_date() {
    local domain=$1
    local cert_file="$SSL_CERTS_PATH/$domain/fullchain.pem"

    if [ -f "$cert_file" ]; then
        openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2
    else
        echo ""
    fi
}

# Function to renew SSL certificates
renew_ssl_certificates() {
    print_status "Renewing SSL certificates..."

    # Create .well-known directory in default webroot
    mkdir -p /var/www/html/.well-known/acme-challenge
    chmod -R 755 /var/www/html/.well-known

    if certbot renew --quiet --webroot -w /var/www/html; then
        # Reload both Apache and Nginx
        systemctl reload apache2 2>/dev/null || true
        systemctl reload nginx 2>/dev/null || true
        print_status "SSL certificates renewed successfully"
        return 0
    else
        print_error "Failed to renew SSL certificates"
        return 1
    fi
}

# Function to list all certificates
list_certificates() {
    print_status "Listing all SSL certificates..."

    if [ -d "$SSL_CERTS_PATH" ]; then
        for domain_dir in "$SSL_CERTS_PATH"/*/; do
            if [ -d "$domain_dir" ]; then
                local domain=$(basename "$domain_dir")
                local status=$(check_ssl_status "$domain")
                local expiry=$(get_expiry_date "$domain")
                echo "$domain|$status|$expiry"
            fi
        done
    fi
}

# Function to setup auto-renewal cron job
setup_auto_renewal() {
    print_status "Setting up automatic SSL renewal..."

    local cron_file="/etc/cron.d/laranode-ssl-renewal"

    # Create cron job to run twice daily (recommended by Let's Encrypt)
    {
        echo "# Laranode SSL Certificate Auto-Renewal"
        echo "# Runs twice daily at random minutes to avoid load spikes"
        echo "SHELL=/bin/bash"
        echo "PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin"
        echo ""
        echo "0 3,15 * * * root certbot renew --quiet --webroot -w /var/www/html --post-hook \"systemctl reload apache2 && systemctl reload nginx\" >> /var/log/laranode-ssl-renewal.log 2>&1"
    } > "$cron_file"

    chmod 644 "$cron_file"

    print_status "Auto-renewal cron job created at $cron_file"
    print_status "Certificates will be renewed automatically at 3:00 AM and 3:00 PM daily"
}

# Main script logic
case "$1" in
    "generate")
        if [ $# -lt 4 ]; then
            echo "Usage: $0 generate <domain> <email> <document_root> <site_type> [user] [port]"
            echo "  site_type: php, nodejs, static"
            exit 1
        fi

        domain=$2
        email=$3
        document_root=$4
        site_type=${5:-php}
        user=${6:-www-data}
        port=${7:-3000}

        check_certbot
        check_domain_accessibility "$domain"
        generate_ssl_certificate "$domain" "$email" "$document_root"

        case "$site_type" in
            "php")
                create_ssl_vhost_php "$domain" "$document_root"
                ;;
            "nodejs")
                create_ssl_vhost_nodejs "$domain" "$user" "$port"
                ;;
            "static")
                create_ssl_vhost_static "$domain" "$document_root" "$user"
                ;;
            *)
                print_error "Unknown site type: $site_type. Use php, nodejs, or static"
                exit 1
                ;;
        esac
        ;;

    "remove")
        if [ $# -ne 2 ]; then
            echo "Usage: $0 remove <domain>"
            exit 1
        fi

        domain=$2
        remove_ssl_certificate "$domain"
        ;;

    "status")
        if [ $# -ne 2 ]; then
            echo "Usage: $0 status <domain>"
            exit 1
        fi

        domain=$2
        status=$(check_ssl_status "$domain")
        echo "$status"
        ;;

    "expiry")
        if [ $# -ne 2 ]; then
            echo "Usage: $0 expiry <domain>"
            exit 1
        fi

        domain=$2
        get_expiry_date "$domain"
        ;;

    "list")
        list_certificates
        ;;

    "renew")
        renew_ssl_certificates
        ;;

    "setup-renewal")
        setup_auto_renewal
        ;;

    *)
        echo "Usage: $0 {generate|remove|status|expiry|list|renew|setup-renewal}"
        echo ""
        echo "Commands:"
        echo "  generate <domain> <email> <doc_root> <type> [user] [port]"
        echo "                                    - Generate SSL certificate"
        echo "                                      type: php, nodejs, static"
        echo "  remove <domain>                   - Remove SSL certificate"
        echo "  status <domain>                   - Check SSL certificate status"
        echo "  expiry <domain>                   - Get certificate expiry date"
        echo "  list                              - List all certificates"
        echo "  renew                             - Renew all SSL certificates"
        echo "  setup-renewal                     - Setup automatic renewal cron"
        exit 1
        ;;
esac
