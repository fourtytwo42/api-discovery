-- Run this as postgres superuser: sudo -u postgres psql -f scripts/create-db-user.sql

-- Create database user
CREATE USER api_discovery_user WITH PASSWORD 'api_discovery_pass';

-- Create database
CREATE DATABASE api_discovery OWNER api_discovery_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE api_discovery TO api_discovery_user;

-- Connect to the database and grant schema privileges
\c api_discovery
GRANT ALL ON SCHEMA public TO api_discovery_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO api_discovery_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO api_discovery_user;

\q

