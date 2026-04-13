#!/usr/bin/env bash
# Find the first available port >= 8000 and start the container on it.
set -e

find_port() {
  local port=8000
  while [ "$port" -le 9000 ]; do
    if ! ss -tlnH "sport = :$port" 2>/dev/null | grep -q ":$port" && \
       ! docker ps --format '{{.Ports}}' 2>/dev/null | grep -q "0.0.0.0:$port"; then
      echo "$port"
      return
    fi
    port=$((port + 1))
  done
  echo "No available port found between 8000-9000" >&2
  exit 1
}

# Stop the existing service first so its port is freed before scanning
docker compose down 2>/dev/null || true

PORT=$(find_port)
export HP_PORT="$PORT"

docker compose up -d --build

echo ""
echo "HelperPage running at http://localhost:${PORT}"
