# Quick Database Fix

## The Problem
The database user `api_discovery_user` doesn't exist or has the wrong password.

## The Solution (Run This)

```bash
sudo -u postgres psql -f /home/hendo420/api-discovery/scripts/create-db-user.sql
```

Or manually:

```bash
sudo -u postgres psql
```

Then paste:

```sql
CREATE USER api_discovery_user WITH PASSWORD 'api_discovery_pass';
CREATE DATABASE api_discovery OWNER api_discovery_user;
GRANT ALL PRIVILEGES ON DATABASE api_discovery TO api_discovery_user;
\c api_discovery
GRANT ALL ON SCHEMA public TO api_discovery_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO api_discovery_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO api_discovery_user;
\q
```

## Then Seed the Database

```bash
cd /home/hendo420/api-discovery
export $(cat .env | xargs)
npm run db:reset
```

## Restart PM2

```bash
pm2 restart api-discovery --update-env
```

## Test Login

Visit: http://localhost:3000/login

Click any seed account button to auto-fill and log in!

