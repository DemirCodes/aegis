#!/bin/bash

set -e

echo "🗄️  Initializing AEGIS databases..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    -- Create test database
    CREATE DATABASE aegis_test;
    GRANT ALL PRIVILEGES ON DATABASE aegis_test TO $POSTGRES_USER;
    
    -- Create extensions
    \c aegis_dev;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
    
    \c aegis_test;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
EOSQL

echo "✅ Databases initialized successfully"

