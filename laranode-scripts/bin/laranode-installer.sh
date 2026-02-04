#!/bin/bash

# Exit on any error
# set -e

export DEBIAN_FRONTEND=noninteractive

# ============================================
# CONFIGURATION
# ============================================
LARANODE_REPO_BASE="github.com/labtaniapp/laranode.git"
LARANODE_BRANCH="${LARANODE_BRANCH:-main}"

# Support for private repos with GITHUB_TOKEN
# Usage: curl -sL https://example.com/install.sh | GITHUB_TOKEN=ghp_xxx bash
if [ -n "$GITHUB_TOKEN" ]; then
    LARANODE_REPO="https://${GITHUB_TOKEN}@${LARANODE_REPO_BASE}"
    echo -e "\033[32m[INFO] Using authenticated GitHub access\033[0m"
else
    LARANODE_REPO="https://${LARANODE_REPO_BASE}"
    echo -e "\033[32m[INFO] Using public GitHub access\033[0m"
fi
# ============================================

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing software-properties-common and git"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

apt update
apt install -y software-properties-common git

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing Apache Web Server"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

apt install -y apache2

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing Nginx Web Server (for Node.js & Static sites)"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

apt install -y nginx

# Configure Nginx to listen on port 8080 (Apache uses 80)
# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Create a custom nginx.conf snippet for port 8080 default
cat > /etc/nginx/sites-available/default-8080 << 'NGINX_DEFAULT'
server {
    listen 8080 default_server;
    listen [::]:8080 default_server;

    root /var/www/html;
    index index.html index.htm;

    server_name _;

    location / {
        try_files $uri $uri/ =404;
    }
}
NGINX_DEFAULT

ln -sf /etc/nginx/sites-available/default-8080 /etc/nginx/sites-enabled/default-8080

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Enabling and starting nginx"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

systemctl enable nginx
systemctl start nginx

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing Sysstat"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

apt-get install -y sysstat
sed -i 's/ENABLED="false"/ENABLED="true"/' /etc/default/sysstat
systemctl restart sysstat
systemctl enable sysstat


echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Enabling and starting apache2"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

systemctl enable apache2
systemctl start apache2

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing MySQL Server"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

apt install -y mysql-server
systemctl enable mysql
systemctl start mysql


echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Creating Laranode MySQL User & Database"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

LARANODE_RANDOM_PASS=$(openssl rand -base64 12)
ROOT_RANDOM_PASS=$(openssl rand -base64 12)

mysql -u root -e "CREATE USER 'laranode'@'localhost' IDENTIFIED BY '$LARANODE_RANDOM_PASS';"
mysql -u root -e "GRANT ALL PRIVILEGES ON *.* TO 'laranode'@'localhost' WITH GRANT OPTION;"
mysql -u root -e "FLUSH PRIVILEGES;"
mysql -u root -e "CREATE DATABASE laranode;"
mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '$ROOT_RANDOM_PASS';"

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing PostgreSQL Server"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Creating Laranode PostgreSQL User"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

POSTGRES_RANDOM_PASS=$(openssl rand -base64 12)

sudo -u postgres psql -c "CREATE USER laranode WITH PASSWORD '$POSTGRES_RANDOM_PASS' SUPERUSER CREATEDB CREATEROLE;"

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Adding ppa:ondrej/php"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"
add-apt-repository -y ppa:ondrej/php

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Running apt update"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"
apt update

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing php8.4 and required extensions"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"
apt install -y php8.4 php8.4-fpm php8.4-cli php8.4-common php8.4-curl php8.4-mbstring \
               php8.4-xml php8.4-bcmath php8.4-zip php8.4-mysql php8.4-sqlite3 php8.4-pgsql \
               php8.4-gd php8.4-imagick php8.4-intl php8.4-readline php8.4-tokenizer php8.4-fileinfo \
               php8.4-soap php8.4-opcache unzip curl


echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Enabling and starting PHP-FPM"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

systemctl enable php8.4-fpm
systemctl start php8.4-fpm

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Enabling proxy_fcgi apache module"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"
a2enmod proxy_fcgi

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Enabling rewrite_module apache module"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"
a2enmod rewrite

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Enabling setenvif apache module"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"
a2enmod setenvif


echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Enabling headers apache module"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"
a2enmod headers

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Enabling ssl apache module"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"
a2enmod ssl

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing certbot"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"
apt -y install certbot python3-certbot-apache python3-certbot-nginx

# Setup SSL auto-renewal cron job
echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Setting up SSL auto-renewal"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"
$LARANODE_PATH/laranode-scripts/bin/laranode-ssl-manager.sh setup-renewal

# Create .well-known directory for ACME challenges
mkdir -p /var/www/html/.well-known/acme-challenge
chmod -R 755 /var/www/html/.well-known

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Enabling php8.4-fpm apache configuration"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"
a2enconf php8.4-fpm

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Restarting apache2"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

systemctl restart apache2

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Adding www-data to sudoers and allowing to run laranode scripts"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

echo "www-data ALL=(ALL) NOPASSWD: /home/laranode_ln/panel/laranode-scripts/bin/*.sh, /usr/sbin/a2dissite, /bin/rm /etc/apache2/sites-available/*.conf, /usr/sbin/nginx, /bin/systemctl reload nginx, /bin/systemctl restart nginx, /bin/rm /etc/nginx/sites-available/*, /bin/rm /etc/nginx/sites-enabled/*, /usr/bin/supervisorctl, /bin/rm /etc/supervisor/conf.d/laranode/*" >> /etc/sudoers

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing Composer"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing NodeJS"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing PM2 (Node.js Process Manager)"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

npm install -g pm2

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing Supervisor (Process Manager for PHP workers)"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

apt install -y supervisor
systemctl enable supervisor
systemctl start supervisor

# Create directory for Laranode supervisor configs
mkdir -p /etc/supervisor/conf.d/laranode

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing Postfix (Mail Transfer Agent)"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

# Pre-configure postfix to avoid interactive prompts
debconf-set-selections <<< "postfix postfix/mailname string $(hostname -f)"
debconf-set-selections <<< "postfix postfix/main_mailer_type string 'Internet Site'"

apt install -y postfix postfix-mysql

systemctl enable postfix
systemctl start postfix

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing Dovecot (IMAP/POP3 Server)"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

apt install -y dovecot-core dovecot-imapd dovecot-pop3d dovecot-lmtpd dovecot-mysql

systemctl enable dovecot
systemctl start dovecot

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Creating vmail user for mail storage"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

# Create vmail user and group for virtual mailboxes
groupadd -g 5000 vmail 2>/dev/null || true
useradd -g vmail -u 5000 vmail -d /var/vmail -m 2>/dev/null || true
mkdir -p /var/vmail
chown -R vmail:vmail /var/vmail
chmod -R 770 /var/vmail

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing OpenDKIM (Email Signing)"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

apt install -y opendkim opendkim-tools

# Create OpenDKIM directories
mkdir -p /etc/opendkim/keys
chown -R opendkim:opendkim /etc/opendkim
chmod 700 /etc/opendkim/keys

systemctl enable opendkim
systemctl start opendkim

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing SpamAssassin (Antispam)"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

apt install -y spamassassin spamc

# Create spamd user
groupadd spamd 2>/dev/null || true
useradd -g spamd -s /bin/false -d /var/lib/spamassassin spamd 2>/dev/null || true
mkdir -p /var/lib/spamassassin
chown -R spamd:spamd /var/lib/spamassassin

# Enable SpamAssassin service
sed -i 's/ENABLED=0/ENABLED=1/' /etc/default/spamassassin
sed -i 's/CRON=0/CRON=1/' /etc/default/spamassassin

# Configure SpamAssassin
cat > /etc/spamassassin/local.cf << 'SPAMCF'
# SpamAssassin configuration
rewrite_header Subject [SPAM]
report_safe 0
required_score 5.0
use_bayes 1
bayes_auto_learn 1
skip_rbl_checks 0
use_razor2 0
use_pyzor 0
SPAMCF

systemctl enable spamassassin
systemctl start spamassassin

# Update SpamAssassin rules
sa-update || true

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing ClamAV (Antivirus)"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

apt install -y clamav clamav-daemon clamav-freshclam

# Stop freshclam temporarily to update database
systemctl stop clamav-freshclam || true

# Update virus definitions (this may take a while)
freshclam || true

# Configure ClamAV
sed -i 's/^Foreground.*/Foreground false/' /etc/clamav/clamd.conf || true
sed -i 's/^LocalSocket.*/LocalSocket \/var\/run\/clamav\/clamd.ctl/' /etc/clamav/clamd.conf || true

systemctl enable clamav-daemon
systemctl enable clamav-freshclam
systemctl start clamav-freshclam
systemctl start clamav-daemon || true

# Create mail quarantine directory
mkdir -p /var/quarantine/mail
chown clamav:clamav /var/quarantine/mail
chmod 750 /var/quarantine/mail

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing Roundcube Webmail"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

# Generate random password for Roundcube database
ROUNDCUBE_DB_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)

# Install Roundcube
apt install -y roundcube roundcube-mysql roundcube-plugins

# Create Roundcube database and user
mysql -u root -e "CREATE DATABASE IF NOT EXISTS roundcube CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -e "CREATE USER IF NOT EXISTS 'roundcube'@'localhost' IDENTIFIED BY '${ROUNDCUBE_DB_PASS}';"
mysql -u root -e "GRANT ALL PRIVILEGES ON roundcube.* TO 'roundcube'@'localhost';"
mysql -u root -e "FLUSH PRIVILEGES;"

# Import Roundcube schema
mysql -u roundcube -p"${ROUNDCUBE_DB_PASS}" roundcube < /usr/share/roundcube/SQL/mysql.initial.sql 2>/dev/null || true

# Configure Roundcube
cat > /etc/roundcube/config.inc.php << RCCONFIG
<?php
\$config['db_dsnw'] = 'mysql://roundcube:${ROUNDCUBE_DB_PASS}@localhost/roundcube';
\$config['imap_host'] = 'localhost:143';
\$config['smtp_host'] = 'localhost:587';
\$config['smtp_user'] = '%u';
\$config['smtp_pass'] = '%p';
\$config['support_url'] = '';
\$config['product_name'] = 'Webmail';
\$config['skin'] = 'elastic';
\$config['plugins'] = ['archive', 'zipdownload', 'managesieve', 'password'];
\$config['session_lifetime'] = 30;
\$config['force_https'] = true;
\$config['use_https'] = true;
\$config['login_autocomplete'] = 0;
\$config['ip_check'] = true;
\$config['des_key'] = '$(openssl rand -base64 24)';
RCCONFIG

# Create Apache configuration for Roundcube
cat > /etc/apache2/conf-available/roundcube.conf << 'RCAPACHE'
Alias /webmail /var/lib/roundcube/public_html

<Directory /var/lib/roundcube/public_html>
    Options +FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>

<Directory /var/lib/roundcube/config>
    Options -FollowSymLinks
    AllowOverride None
    Require all denied
</Directory>
RCAPACHE

a2enconf roundcube
systemctl reload apache2

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Creating Laranode User"
useradd -m -s /bin/bash laranode_ln
usermod -aG laranode_ln www-data
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Cloning Laranode"
echo -e "\033[0m"

git clone -b "$LARANODE_BRANCH" "$LARANODE_REPO" /home/laranode_ln/panel
echo "--------------------------------------------------------------------------------"


echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Installing Laranode"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

cd /home/laranode_ln/panel
composer install
cp .env.example .env
sed -i "s#DB_PASSWORD=.*#DB_PASSWORD=\"$LARANODE_RANDOM_PASS\"#" ".env"
sed -i "s#PG_PASSWORD=.*#PG_PASSWORD=\"$POSTGRES_RANDOM_PASS\"#" ".env"
sed -i "s#APP_URL=.*#APP_URL=\"http://$(curl -4 icanhazip.com)\"#" ".env"

php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan storage:link
php artisan reverb:install

sed -i "s#VITE_REVERB_HOST=.*#VITE_REVERB_HOST=$(curl -4 icanhazip.com)#" ".env"
sed -i "s#REVERB_HOST=.*#REVERB_HOST=$(curl -4 icanhazip.com)#" ".env"

cp /home/laranode_ln/panel/laranode-scripts/templates/apache2-default.template /etc/apache2/sites-available/000-default.conf

echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Hold tight, pouring node_modules with npm install & compiling assets"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"
npm install
npm run build


echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Adding systemd services (queue worker and reverb)"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"

cp /home/laranode_ln/panel/laranode-scripts/templates/laranode-queue-worker.service /etc/systemd/system/laranode-queue-worker.service
cp /home/laranode_ln/panel/laranode-scripts/templates/laranode-reverb.service /etc/systemd/system/laranode-reverb.service


echo -e"\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Adding default UFW rules for SSH | HTTP | HTTPS | REVERB | MAIL"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 8080
# Mail ports
ufw allow 25    # SMTP
ufw allow 465   # SMTPS
ufw allow 587   # Submission
ufw allow 993   # IMAPS
ufw allow 995   # POP3S


echo -e "\033[34m"
echo "--------------------------------------------------------------------------------"
echo "Setting permissions"
echo "--------------------------------------------------------------------------------"
echo -e "\033[0m"
mkdir -p /home/laranode_ln/logs
chown -R laranode_ln:laranode_ln /home/laranode_ln
find /home/laranode_ln -type d -exec chmod 770 {} \;
find /home/laranode_ln -type f -exec chmod 660 {} \;
find /home/laranode_ln/panel/laranode-scripts/bin -type f -exec chmod 100 {} \;
find /home/laranode_ln/panel/storage /home/laranode_ln/panel/bootstrap -type d -exec chmod 775 {} \;


systemctl daemon-reload
systemctl enable laranode-queue-worker.service
systemctl enable laranode-reverb.service
systemctl start laranode-queue-worker.service
systemctl start laranode-reverb.service
systemctl restart apache2
systemctl restart php8.4-fpm


echo "================================================================================"
echo "================================================================================"
echo -e "\033[32m --- NOTES ---\033[0m"

echo "MySQL Root Password: $ROOT_RANDOM_PASS"
echo "Laranode MySQL Username: laranode"
echo "Laranode MySQL Password: $LARANODE_RANDOM_PASS"
echo ""
echo "PostgreSQL Username: laranode"
echo "PostgreSQL Password: $POSTGRES_RANDOM_PASS"

echo -e "\033[32m --- ADMIN LOGIN ---\033[0m"
echo "Email: admin@expertiseablo.com"
echo "Password: Myadmin.10"
echo -e "\033[31m IMPORTANT: Change your password after first login! \033[0m"

echo "================================================================================"
echo "================================================================================"
