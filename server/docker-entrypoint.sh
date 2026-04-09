#!/bin/sh
set -e

# Auto-generate ENCRYPTION_KEY on first boot if not set
if [ -z "$ENCRYPTION_KEY" ]; then
  KEY_FILE="/data/.encryption_key"
  if [ -f "$KEY_FILE" ]; then
    export ENCRYPTION_KEY=$(cat "$KEY_FILE")
    echo "Loaded ENCRYPTION_KEY from $KEY_FILE"
  else
    export ENCRYPTION_KEY=$(openssl rand -hex 32)
    mkdir -p /data
    echo "$ENCRYPTION_KEY" > "$KEY_FILE"
    echo "Generated new ENCRYPTION_KEY and saved to $KEY_FILE"
  fi
fi

# Run database migrations
echo "Running database migrations..."
bun node-pg-migrate up --database-url-var DATABASE_URL --migrations-dir migrations

# Start the server
exec bun dist/index.js
