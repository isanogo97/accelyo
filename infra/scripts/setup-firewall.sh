#!/usr/bin/env bash
# =================================================================
# Pare-feu (ufw) pour le serveur Accelyo.
# N'ouvre que SSH (22), HTTP (80) et HTTPS (443). Refuse le reste.
# Important: autorise SSH AVANT d'activer, pour ne pas se verrouiller.
#
# Note: Docker contourne ufw pour les ports qu'il publie sur 0.0.0.0.
# C'est pourquoi on ne publie publiquement que nginx (80/443); le
# dashboard est bind sur 127.0.0.1 et l'API n'est pas publiee.
# =================================================================
set -euo pipefail

sudo apt-get update -qq && sudo apt-get install -y ufw

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   comment 'SSH'
sudo ufw allow 80/tcp   comment 'HTTP (redirige vers HTTPS)'
sudo ufw allow 443/tcp  comment 'HTTPS'

sudo ufw --force enable
sudo ufw status verbose
