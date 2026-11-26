#!/bin/sh
# Consistent copy of the live SQLite database, saved in deploy/backups. Keeps the newest 14.
set -eu
cd "$(dirname "$0")"
name="shakeslip-$(date -u +%Y-%m-%dT%H%M%SZ).db"
mkdir -p backups
docker compose exec -T app bun -e "import {Database} from 'bun:sqlite'; new Database('/data/shakeslip.db').run(\"VACUUM INTO '/tmp/$name'\")"
docker compose cp "app:/tmp/$name" "backups/$name"
docker compose exec -T app rm "/tmp/$name"
chmod 600 "backups/$name"
ls -1t backups/shakeslip-*.db | tail -n +15 | xargs -r rm --
echo "Saved backups/$name"
