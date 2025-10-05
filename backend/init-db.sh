#!/bin/bash
set -e

# Create the expenses_db database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
    SELECT 'CREATE DATABASE expenses_db'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'expenses_db')\gexec
EOSQL

echo "Database expenses_db is ready!"
