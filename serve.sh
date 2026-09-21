#!/usr/bin/env sh
# Local HTTP server (the game needs HTTP; file:// will not work).
cd "$(dirname "$0")"
PORT="${1:-8777}"
echo "Serving on http://localhost:${PORT}"
python3 -m http.server "$PORT" --bind 0.0.0.0
