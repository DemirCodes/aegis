#!/bin/bash

set -e

echo "🛡️  AEGIS - Setup Script"
echo "========================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}[1/7]${NC} Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js $NODE_VERSION found${NC}"
else
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Check pnpm
echo -e "${BLUE}[2/7]${NC} Checking pnpm..."
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm -v)
    echo -e "${GREEN}✅ pnpm $PNPM_VERSION found${NC}"
else
    echo -e "${YELLOW}⚠️  pnpm not found. Installing...${NC}"
    npm install -g pnpm@8.14.0
    echo -e "${GREEN}✅ pnpm installed${NC}"
fi

# Check Docker
echo -e "${BLUE}[3/7]${NC} Checking Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✅ $DOCKER_VERSION found${NC}"
else
    echo -e "${RED}❌ Docker not found. Please install Docker${NC}"
    exit 1
fi

# Check Docker Compose
echo -e "${BLUE}[4/7]${NC} Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    echo -e "${GREEN}✅ $COMPOSE_VERSION found${NC}"
else
    echo -e "${YELLOW}⚠️  docker-compose not found. Trying docker compose...${NC}"
    if docker compose version &> /dev/null; then
        echo -e "${GREEN}✅ docker compose found${NC}"
    else
        echo -e "${RED}❌ Docker Compose not found${NC}"
        exit 1
    fi
fi

# Install dependencies
echo -e "${BLUE}[5/7]${NC} Installing dependencies..."
pnpm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Setup environment files
echo -e "${BLUE}[6/7]${NC} Setting up environment files..."
if [ ! -f apps/demo/.env ]; then
    cp apps/demo/.env.example apps/demo/.env
    echo -e "${GREEN}✅ .env created from .env.example${NC}"
else
    echo -e "${YELLOW}⚠️  .env already exists, skipping${NC}"
fi

# Build packages
echo -e "${BLUE}[7/7]${NC} Building packages..."
pnpm run build
echo -e "${GREEN}✅ Packages built${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🛡️  AEGIS Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "  1. Start services:"
echo "     cd apps/demo && docker-compose up -d"
echo ""
echo "  2. Run database migrations:"
echo "     cd apps/demo && npx prisma migrate deploy"
echo ""
echo "  3. Seed database:"
echo "     cd apps/demo && npx prisma db seed"
echo ""
echo "  4. Start development server:"
echo "     pnpm run dev"
echo ""
echo "  5. Access services:"
echo "     - API:              http://localhost:3001"
echo "     - Grafana:          http://localhost:3000 (admin/admin)"
echo "     - Prometheus:       http://localhost:9090"
echo "     - PgAdmin:          http://localhost:5050 (admin@aegis.local/admin)"
echo "     - Redis Commander:  http://localhost:8081"
echo ""