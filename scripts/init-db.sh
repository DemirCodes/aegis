#!/bin/bash
set -e

echo "Creating test database..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE aegis_test;
    GRANT ALL PRIVILEGES ON DATABASE aegis_test TO $POSTGRES_USER;
EOSQL

echo "Creating extensions..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "aegis_dev" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "aegis_test" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
EOSQL

echo "Databases initialized successfully"
EOF

chmod +x ../../scripts/init-db.sh

# 3. docker-compose.yml'de init-db.sh mount'unu KALDIR (sorun çıkarıyor olabilir)
# Şimdilik basit başlatalım, init-db.sh'siz
cat > docker-compose.yml << 'EOF'
services:
  postgres:
    image: postgres:15-alpine
    container_name: aegis-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: aegis_user
      POSTGRES_PASSWORD: aegis_pass
      POSTGRES_DB: aegis_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - aegis-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aegis_user -d aegis_dev"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  redis:
    image: redis:7-alpine
    container_name: aegis-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - aegis-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  grafana:
    image: grafana/grafana:latest
    container_name: aegis-grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - aegis-network

  prometheus:
    image: prom/prometheus:latest
    container_name: aegis-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - prometheus_data:/prometheus
    networks:
      - aegis-network

volumes:
  postgres_data:
  redis_data:
  grafana_data:
  prometheus_data:

networks:
  aegis-network:
    driver: bridge