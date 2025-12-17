#!/bin/bash
# Fix database connection - creates user if needed
# This script needs to be run with appropriate PostgreSQL access

echo "Checking database connection..."

# Try to connect with different methods
# Method 1: Try with postgres user (if peer auth works)
if psql -U postgres -d postgres -c "\q" 2>/dev/null; then
    echo "✅ Can connect as postgres user"
    echo "Creating database user if needed..."
    psql -U postgres -c "CREATE USER api_discovery_user WITH PASSWORD 'api_discovery_pass';" 2>&1 | grep -v "already exists" || echo "User exists"
    psql -U postgres -c "CREATE DATABASE api_discovery OWNER api_discovery_user;" 2>&1 | grep -v "already exists" || echo "Database exists"
    psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE api_discovery TO api_discovery_user;"
    echo "✅ Database user created/verified"
    exit 0
fi

# Method 2: Check if we can connect to the database directly
if psql -d api_discovery -c "\q" 2>/dev/null; then
    echo "✅ Can connect to api_discovery database"
    echo "Current connection info:"
    psql -d api_discovery -c "\conninfo"
    exit 0
fi

echo "❌ Cannot connect to database. You may need to:"
echo "1. Run: sudo -u postgres psql"
echo "2. Then run: CREATE USER api_discovery_user WITH PASSWORD 'api_discovery_pass';"
echo "3. Then run: CREATE DATABASE api_discovery OWNER api_discovery_user;"
echo "4. Then run: GRANT ALL PRIVILEGES ON DATABASE api_discovery TO api_discovery_user;"

