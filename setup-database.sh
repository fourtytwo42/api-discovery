#!/bin/bash
# One-command database setup
# Run with: bash setup-database.sh

echo "Setting up database user and database..."
echo "You may be prompted for your sudo password..."

sudo -u postgres psql <<EOF
-- Create user if it doesn't exist
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'api_discovery_user') THEN
        CREATE USER api_discovery_user WITH PASSWORD 'api_discovery_pass';
        RAISE NOTICE 'User api_discovery_user created';
    ELSE
        RAISE NOTICE 'User api_discovery_user already exists';
    END IF;
END
\$\$;

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE api_discovery OWNER api_discovery_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'api_discovery')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE api_discovery TO api_discovery_user;

-- Connect and grant schema privileges
\c api_discovery
GRANT ALL ON SCHEMA public TO api_discovery_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO api_discovery_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO api_discovery_user;

\q
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database user and database created successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Run: cd /home/hendo420/api-discovery && export \$(cat .env | xargs) && npm run db:reset"
    echo "2. Run: pm2 restart api-discovery --update-env"
    echo "3. Visit: http://localhost:3000/login"
else
    echo ""
    echo "❌ Failed to create database user. You may need to run manually:"
    echo "   sudo -u postgres psql"
    echo "   Then paste the SQL from scripts/create-db-user.sql"
fi

