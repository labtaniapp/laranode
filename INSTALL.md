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

## Accès Panel

- **URL:** http://VOTRE_IP
- **Email:** admin@expertiseablo.com
- **Password:** Myadmin.10

**Changez votre mot de passe après la première connexion!**

## Ports

- **80:** Apache (PHP)
- **8080:** Nginx (Node.js/Static)

## Identifiants Base de Données

Les mots de passe MySQL et PostgreSQL sont affichés à la fin de l'installation.

**Gardez ces identifiants en lieu sûr!**
