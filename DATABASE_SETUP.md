# Database Setup Instructions

## Current Issue
The database user `api_discovery_user` needs to be created or the password needs to be reset.

## Quick Fix

Run these commands as the postgres superuser:

```bash
# Option 1: If you have sudo access
sudo -u postgres psql

# Then in psql:
CREATE USER api_discovery_user WITH PASSWORD 'api_discovery_pass';
CREATE DATABASE api_discovery OWNER api_discovery_user;
GRANT ALL PRIVILEGES ON DATABASE api_discovery TO api_discovery_user;
\q
```

## Alternative: Use Existing PostgreSQL User

If you have an existing PostgreSQL user that can access the database, update `.env`:

```bash
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/api_discovery"
```

## Verify Connection

After setting up, test the connection:

```bash
export $(cat .env | xargs)
npm run db:reset
```

## Current .env Configuration

The `.env` file is configured with:
- User: `api_discovery_user`
- Password: `api_discovery_pass`
- Database: `api_discovery`
- Host: `localhost`
- Port: `5432`

