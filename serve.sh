#!/usr/bin/env bash
# Lance le serveur local pour Guardians of Gold.
cd "$(dirname "$0")"
PORT="${1:-8777}"
echo "Guardians of Gold -> http://localhost:${PORT}"
python3 -m http.server "$PORT" --bind 0.0.0.0
