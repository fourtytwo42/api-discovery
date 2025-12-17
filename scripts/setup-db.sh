#!/bin/bash
# Database setup script
# Run this as postgres user or with sudo

set -e

DB_USER="api_discovery_user"
DB_PASSWORD="api_discovery_pass"
DB_NAME="api_discovery"

echo "Setting up database..."

# Create user
psql -U postgres -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" 2>&1 | grep -v "already exists" || echo "User ${DB_USER} already exists"

# Create database
psql -U postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>&1 | grep -v "already exists" || echo "Database ${DB_NAME} already exists"

# Grant privileges
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

echo "Database setup complete!"
echo "Connection string: postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?schema=public"

