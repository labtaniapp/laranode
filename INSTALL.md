# Installation Laranode

## Pré-requis

- Ubuntu 22.04 ou 24.04 (fresh install)
- Accès root
- Minimum 1GB RAM

## Installation

### Repo Public
```bash
curl -sL https://raw.githubusercontent.com/labtaniapp/laranode/main/laranode-scripts/bin/laranode-installer.sh | bash
```

### Repo Privé (avec token)
```bash
curl -sL https://raw.githubusercontent.com/labtaniapp/laranode/main/laranode-scripts/bin/laranode-installer.sh | GITHUB_TOKEN=ghp_votre_token bash
```

## Après l'installation

Créer le compte admin:
```bash
cd /home/laranode_ln/panel && php artisan laranode:create-admin
```

## Accès

- **Panel:** http://VOTRE_IP
- **Port 80:** Apache (PHP)
- **Port 8080:** Nginx (Node.js/Static)

## Identifiants (affichés à la fin de l'installation)

- MySQL root password
- MySQL laranode password
- PostgreSQL laranode password

**Gardez ces identifiants en lieu sûr!**
