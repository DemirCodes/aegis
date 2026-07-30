#!/bin/bash
set -e

echo "🐳 Setting up Docker services..."
docker-compose up -d
echo "⏳ Waiting for services to be healthy..."
sleep 10
echo "✅ Docker services running"