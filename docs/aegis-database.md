# 🛡️ AEGIS - Database Schema & Test Setup

---

# 📊 Database Architecture

## Overview

```
┌─────────────────────────────────────────┐
│     PostgreSQL (Primary Database)       │
├─────────────────────────────────────────┤
│                                         │
│  Core Tables:                           │
│  ├─ users (authentication, profiles)    │
│  ├─ user_roles (role-based access)      │
│  └─ user_sessions (active sessions)     │
│                                         │
│  Audit Tables (aegis-audit):           │
│  ├─ audit_logs (all operations)        │
│  ├─ audit_metadata (extra context)     │
│  └─ soft_delete_registry                │
│                                         │
│  Security Tables (aegis-security):     │
│  ├─ rate_limits (rate limit tracking)  │
│  ├─ ip_blacklist (blocked IPs)         │
│  └─ token_blacklist (revoked tokens)   │
│                                         │
│  Queue Tables (aegis-queue):           │
│  ├─ queue_jobs (job metadata)          │
│  └─ queue_dlq (dead letter queue)      │
│                                         │
│  Business Tables (Demo App):           │
│  ├─ products (product catalog)         │
│  ├─ orders (customer orders)           │
│  ├─ order_items (order details)        │
│  └─ payments (payment records)         │
│                                         │
│  Observability Tables:                 │
│  ├─ metrics (custom metrics)           │
│  └─ anomaly_alerts (detected anomalies)│
│                                         │
└─────────────────────────────────────────┘
```

---

# 🎯 Prisma Schema

## Installation & Setup

```bash
# Install Prisma
npm install @prisma/client
npm install -D prisma

# Initialize
npx prisma init

# Paste schema below into prisma/schema.prisma
```

---

## Complete Schema

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ============================================
// CORE TABLES
// ============================================

/// User entity with authentication
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  username      String    @unique
  password      String    // Hashed with bcrypt
  firstName     String?
  lastName      String?
  phone         String?
  avatar        String?
  
  // Account status
  isActive      Boolean   @default(true)
  isVerified    Boolean   @default(false)
  verifiedAt    DateTime?
  
  // Metadata
  lastLoginAt   DateTime?
  loginAttempts Int       @default(0)
  lockedUntil   DateTime?
  
  // Relations
  roles         UserRole[]
  sessions      UserSession[]
  auditLogs     AuditLog[]      @relation("user_actions")
  riskEvents    RiskEvent[]
  
  // Timestamps
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime? // Soft delete for GDPR
  
  @@index([email])
  @@index([username])
  @@index([isActive])
  @@index([deletedAt])
}

/// User roles (RBAC)
model Role {
  id            String    @id @default(uuid())
  name          String    @unique
  description   String?
  permissions   String[]  // JSON array of permission codes
  
  users         UserRole[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([name])
}

/// Junction table for User-Role relationship
model UserRole {
  id            String    @id @default(uuid())
  
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  roleId        String
  role          Role      @relation(fields: [roleId], references: [id], onDelete: Cascade)
  
  grantedAt     DateTime  @default(now())
  grantedBy     String?   // Admin who granted this role
  
  @@unique([userId, roleId])
  @@index([userId])
  @@index([roleId])
}

/// Active sessions (JWT refresh tokens stored here)
model UserSession {
  id            String    @id @default(uuid())
  
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  refreshToken  String    @unique
  accessToken   String?
  
  ipAddress     String?
  userAgent     String?
  deviceId      String?
  
  isActive      Boolean   @default(true)
  expiresAt     DateTime
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([userId])
  @@index([refreshToken])
  @@index([expiresAt])
}

// ============================================
// AUDIT TABLES (aegis-audit)
// ============================================

/// Complete audit trail for compliance
model AuditLog {
  id            String    @id @default(uuid())
  
  userId        String
  user          User      @relation("user_actions", fields: [userId], references: [id], onDelete: SetNull)
  
  entityType    String    // 'User', 'Product', 'Order', etc.
  entityId      String    // ID of changed entity
  action        String    // 'CREATE', 'UPDATE', 'DELETE'
  
  // Changes tracking
  changes       Json      // { fieldName: { old: value, new: value } }
  changesSummary String?   // Human-readable summary
  
  // Metadata
  ipAddress     String?
  userAgent     String?
  correlationId String?   // Request trace ID
  metadata      Json?
  
  // Status
  status        String    @default("completed") // 'completed', 'failed'
  errorMessage  String?
  
  timestamp     DateTime  @default(now())
  
  @@index([userId])
  @@index([entityType])
  @@index([entityId])
  @@index([action])
  @@index([timestamp])
  @@index([correlationId])
}

/// Soft delete registry (GDPR)
model SoftDeleteRegistry {
  id            String    @id @default(uuid())
  
  entityType    String    // 'User', 'Product', etc.
  entityId      String
  
  // Original data (for recovery)
  originalData  Json
  
  // Deletion info
  deletedBy     String?   // User who deleted
  deletionReason String?   // Why deleted
  isHardDeleted Boolean   @default(false) // Permanently deleted?
  hardDeletedAt DateTime?
  
  createdAt     DateTime  @default(now())
  
  @@unique([entityType, entityId])
  @@index([entityType])
  @@index([createdAt])
}

// ============================================
// SECURITY TABLES (aegis-security)
// ============================================

/// Rate limiting records
model RateLimit {
  id            String    @id @default(uuid())
  
  key           String    // 'user:123' or 'ip:192.168.1.1'
  endpoint      String?   // '/api/users', null for global
  
  requests      Int       @default(0)
  limit         Int       @default(100)
  window        Int       // ms
  
  resetAt       DateTime
  createdAt     DateTime  @default(now())
  
  @@unique([key, endpoint])
  @@index([key])
  @@index([resetAt])
}

/// Blacklisted IPs
model IpBlacklist {
  id            String    @id @default(uuid())
  
  ip            String    @unique
  reason        String?
  severity      String    @default("medium") // 'low', 'medium', 'high', 'critical'
  
  addedBy       String?   // Admin user ID
  expiresAt     DateTime? // Null = permanent
  
  createdAt     DateTime  @default(now())
  
  @@index([ip])
  @@index([expiresAt])
}

/// Revoked JWT tokens
model TokenBlacklist {
  id            String    @id @default(uuid())
  
  token         String    @unique
  tokenType     String    // 'access', 'refresh'
  
  userId        String?
  reason        String?   // 'logout', 'password_change', 'token_rotation'
  
  revokedAt     DateTime  @default(now())
  expiresAt     DateTime  // Token's original expiry
  
  @@index([token])
  @@index([expiresAt])
  @@index([userId])
}

/// Risk scoring history
model RiskEvent {
  id            String    @id @default(now())
  
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  eventType     String    // 'multiple_failed_logins', 'unusual_location', 'bulk_download'
  severity      String    // 'low', 'medium', 'high', 'critical'
  riskScore     Int       // 0-100
  
  context       Json?
  {
    ipAddress?: string
    userAgent?: string
    location?: string
    previousActivity?: any
  }
  
  requiresStepUp Boolean  @default(false)
  resolved      Boolean  @default(false)
  resolvedAt    DateTime?
  
  timestamp     DateTime  @default(now())
  
  @@index([userId])
  @@index([eventType])
  @@index([timestamp])
}

// ============================================
// QUEUE TABLES (aegis-queue metadata)
// ============================================

/// Job metadata (BullMQ tracks jobs in Redis, but we store metadata here)
model QueueJob {
  id            String    @id @default(uuid())
  
  externalId    String    @unique // BullMQ job ID
  queueName     String
  
  data          Json      // Job payload
  status        String    // 'pending', 'active', 'completed', 'failed'
  
  attempts      Int       @default(0)
  maxAttempts   Int       @default(3)
  
  result        Json?     // Job result
  error         String?   // Error message if failed
  
  priority      Int?      // Job priority
  
  scheduledAt   DateTime?
  startedAt     DateTime?
  completedAt   DateTime?
  failedAt      DateTime?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([queueName])
  @@index([status])
  @@index([createdAt])
}

/// Dead Letter Queue (failed jobs)
model QueueDLQ {
  id            String    @id @default(uuid())
  
  jobId         String
  queueName     String
  
  data          Json
  error         String
  errorType     String    // 'retriable', 'permanent', 'unknown'
  
  attempts      Int
  lastAttemptAt DateTime
  
  archived      Boolean   @default(false)
  archivedAt    DateTime?
  
  createdAt     DateTime  @default(now())
  
  @@index([queueName])
  @@index([errorType])
  @@index([archived])
}

// ============================================
// BUSINESS TABLES (Demo App)
// ============================================

/// Product catalog
model Product {
  id            String    @id @default(uuid())
  
  sku           String    @unique
  name          String
  description   String?
  
  price         Decimal   @db.Decimal(10, 2)
  cost          Decimal   @db.Decimal(10, 2)
  
  stock         Int       @default(0)
  lowStockAlert Int       @default(10)
  
  isActive      Boolean   @default(true)
  
  orderItems    OrderItem[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime? // Soft delete
  
  @@index([sku])
  @@index([isActive])
}

/// Customer orders
model Order {
  id            String    @id @default(uuid())
  
  orderNumber   String    @unique
  
  userId        String    // Nullable if deleted user's order
  
  status        String    @default("pending") // 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
  
  subtotal      Decimal   @db.Decimal(10, 2) @default(0)
  tax           Decimal   @db.Decimal(10, 2) @default(0)
  total         Decimal   @db.Decimal(10, 2) @default(0)
  
  // Shipping
  shippingAddress String?
  shippingMethod  String?
  shippedAt       DateTime?
  deliveredAt     DateTime?
  
  // Tracking
  trackingNumber  String?
  
  items         OrderItem[]
  payment       Payment?
  
  notes         String?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([orderNumber])
  @@index([userId])
  @@index([status])
  @@index([createdAt])
}

/// Order line items
model OrderItem {
  id            String    @id @default(uuid())
  
  orderId       String
  order         Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  productId     String
  product       Product   @relation(fields: [productId], references: [id])
  
  quantity      Int
  unitPrice     Decimal   @db.Decimal(10, 2)
  subtotal      Decimal   @db.Decimal(10, 2)
  
  createdAt     DateTime  @default(now())
  
  @@unique([orderId, productId])
  @@index([orderId])
  @@index([productId])
}

/// Payment records
model Payment {
  id            String    @id @default(uuid())
  
  orderId       String    @unique
  order         Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  amount        Decimal   @db.Decimal(10, 2)
  currency      String    @default("USD")
  
  status        String    @default("pending") // 'pending', 'completed', 'failed', 'refunded'
  
  method        String    // 'credit_card', 'paypal', 'bank_transfer'
  paymentRef    String?   // External payment reference (transaction ID)
  
  processedAt   DateTime?
  refundedAt    DateTime?
  refundAmount  Decimal   @db.Decimal(10, 2)?
  
  errorMessage  String?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([orderId])
  @@index([status])
  @@index([createdAt])
}

// ============================================
// OBSERVABILITY TABLES
// ============================================

/// Custom business metrics
model Metric {
  id            String    @id @default(uuid())
  
  name          String    // 'payment_latency', 'error_rate', etc.
  value         Float
  unit          String    // 'ms', '%', 'count'
  
  tags          Json?     // { endpoint: '/api/users', method: 'POST' }
  
  timestamp     DateTime  @default(now())
  
  @@index([name])
  @@index([timestamp])
}

/// Detected anomalies
model AnomalyAlert {
  id            String    @id @default(uuid())
  
  metricName    String
  baselineValue Float
  currentValue  Float
  changePercent Float
  
  severity      String    // 'low', 'medium', 'high', 'critical'
  isResolved    Boolean   @default(false)
  
  resolvedAt    DateTime?
  resolvedNotes String?
  
  timestamp     DateTime  @default(now())
  
  @@index([metricName])
  @@index([timestamp])
}
```

---

# 📁 Database Files Structure

```
prisma/
├── schema.prisma          # ← Yukarıdaki schema
├── seed.ts                # Seed data (production'da da çalışabilir)
├── seed.test.ts           # Test data (test env'de)
└── migrations/
    ├── migration_lock.toml
    └── [timestamp]_initial/
        └── migration.sql
```

---

# 🚀 Database Setup Commands

## 1. Environment Setup

```bash
# .env.local (Development)
DATABASE_URL="postgresql://aegis_user:aegis_pass@localhost:5432/aegis_dev"
DATABASE_TEST_URL="postgresql://aegis_user:aegis_pass@localhost:5432/aegis_test"
```

---

## 2. Create Database

```bash
# Development database
createdb -U postgres aegis_dev

# Test database
createdb -U postgres aegis_test

# Verify
psql -U postgres -l | grep aegis
```

---

## 3. Generate Prisma Client

```bash
npx prisma generate
```

---

## 4. Run Migrations

```bash
# Development
npx prisma migrate dev --name initial

# Production
npx prisma migrate deploy

# Test (isolated DB)
npx prisma migrate deploy --skip-generate
```

---

## 5. Seed Data

```bash
# Development seed
npx prisma db seed

# Test seed (separate script)
npx ts-node prisma/seed.test.ts
```

---

# 🌱 Seed Data Scripts

## `prisma/seed.ts` (Production/Development)

```typescript
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean up
  await prisma.user.deleteMany()
  await prisma.role.deleteMany()
  await prisma.product.deleteMany()

  // Create roles
  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
      description: 'Administrator with full access',
      permissions: [
        'users:read',
        'users:write',
        'users:delete',
        'products:read',
        'products:write',
        'products:delete',
        'orders:read',
        'orders:write',
        'audit:read',
      ],
    },
  })

  const userRole = await prisma.role.create({
    data: {
      name: 'user',
      description: 'Regular user',
      permissions: [
        'products:read',
        'orders:read',
        'orders:write:own',
      ],
    },
  })

  // Create admin user
  const adminPassword = await hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@aegis.local',
      username: 'admin',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      isVerified: true,
      verifiedAt: new Date(),
      roles: {
        create: [{ roleId: adminRole.id }],
      },
    },
  })

  // Create test user
  const userPassword = await hash('user123', 10)
  const user = await prisma.user.create({
    data: {
      email: 'user@aegis.local',
      username: 'testuser',
      password: userPassword,
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      isVerified: true,
      verifiedAt: new Date(),
      roles: {
        create: [{ roleId: userRole.id }],
      },
    },
  })

  // Create sample products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: 'PROD-001',
        name: 'Laptop Pro',
        description: 'High-performance laptop',
        price: 1299.99,
        cost: 800,
        stock: 50,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'PROD-002',
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse',
        price: 29.99,
        cost: 15,
        stock: 200,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'PROD-003',
        name: 'USB-C Cable',
        description: 'Fast charging USB-C cable',
        price: 14.99,
        cost: 5,
        stock: 500,
        isActive: true,
      },
    }),
  ])

  console.log('✅ Seed completed')
  console.log(`Created admin: ${admin.email}`)
  console.log(`Created user: ${user.email}`)
  console.log(`Created ${products.length} products`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

---

## `prisma/seed.test.ts` (Test-Only Data)

```typescript
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_TEST_URL,
    },
  },
})

async function seedTestData() {
  console.log('🧪 Seeding test database...')

  // Clean up everything
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Role" CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Product" CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Order" CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "AuditLog" CASCADE')

  // Create roles
  const roles = await Promise.all([
    prisma.role.create({
      data: {
        name: 'admin',
        permissions: ['*'],
      },
    }),
    prisma.role.create({
      data: {
        name: 'user',
        permissions: ['read'],
      },
    }),
  ])

  // Create test users (10)
  const users = await Promise.all(
    Array.from({ length: 10 }).map((_, i) =>
      prisma.user.create({
        data: {
          email: `test-user-${i}@aegis.local`,
          username: `testuser${i}`,
          password: await hash('testpass123', 10),
          firstName: `Test${i}`,
          lastName: `User${i}`,
          isActive: true,
          isVerified: true,
          verifiedAt: new Date(),
          roles: {
            create: [
              {
                roleId: i === 0 ? roles[0].id : roles[1].id, // First user is admin
              },
            ],
          },
        },
      })
    )
  )

  // Create test products (20)
  const products = await Promise.all(
    Array.from({ length: 20 }).map((_, i) =>
      prisma.product.create({
        data: {
          sku: `TEST-PROD-${String(i + 1).padStart(3, '0')}`,
          name: `Test Product ${i + 1}`,
          description: `Description for test product ${i + 1}`,
          price: 10 + i * 5,
          cost: 5 + i * 2,
          stock: (i + 1) * 10,
          isActive: true,
        },
      })
    )
  )

  // Create test orders (50)
  for (let i = 0; i < 50; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)]
    const randomProduct = products[Math.floor(Math.random() * products.length)]

    await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-${String(i + 1).padStart(5, '0')}`,
        userId: randomUser.id,
        status: ['pending', 'confirmed', 'shipped', 'delivered'][
          Math.floor(Math.random() * 4)
        ],
        subtotal: randomProduct.price,
        total: randomProduct.price * 1.1,
        items: {
          create: [
            {
              productId: randomProduct.id,
              quantity: Math.floor(Math.random() * 5) + 1,
              unitPrice: randomProduct.price,
              subtotal: randomProduct.price,
            },
          ],
        },
      },
    })
  }

  // Create test audit logs (100)
  for (let i = 0; i < 100; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)]
    await prisma.auditLog.create({
      data: {
        userId: randomUser.id,
        entityType: ['User', 'Product', 'Order'][Math.floor(Math.random() * 3)],
        entityId: randomUser.id,
        action: ['CREATE', 'UPDATE', 'DELETE'][Math.floor(Math.random() * 3)],
        changes: {
          field: { old: 'oldvalue', new: 'newvalue' },
        },
        status: 'completed',
      },
    })
  }

  console.log('✅ Test database seeded')
  console.log(`Created ${users.length} test users`)
  console.log(`Created ${products.length} test products`)
  console.log(`Created 50 test orders`)
  console.log(`Created 100 test audit logs`)
}

seedTestData()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

---

# 🐳 Docker Compose Setup

```yaml
# docker-compose.yml

version: '3.8'

services:
  # Development Database
  postgres:
    image: postgres:15-alpine
    container_name: aegis-postgres
    environment:
      POSTGRES_USER: aegis_user
      POSTGRES_PASSWORD: aegis_pass
      POSTGRES_DB: aegis_dev
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=en_US.UTF-8"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh
    networks:
      - aegis-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aegis_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Test Database (Separate Instance)
  postgres-test:
    image: postgres:15-alpine
    container_name: aegis-postgres-test
    environment:
      POSTGRES_USER: aegis_user
      POSTGRES_PASSWORD: aegis_pass
      POSTGRES_DB: aegis_test
    ports:
      - "5433:5432"
    volumes:
      - postgres_test_data:/var/lib/postgresql/data
    networks:
      - aegis-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aegis_user"]
      interval: 10s
      timeout: 5s
      retries: 5
    profiles:
      - test  # Only run with: docker-compose --profile test up

  # Redis (for caching, sessions, queues)
  redis:
    image: redis:7-alpine
    container_name: aegis-redis
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

  # PgAdmin (Database Management UI)
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: aegis-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@aegis.local
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    networks:
      - aegis-network
    depends_on:
      - postgres

  # Redis Commander (Redis UI)
  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: aegis-redis-commander
    environment:
      REDIS_HOSTS: default:redis:6379
    ports:
      - "8081:8081"
    networks:
      - aegis-network
    depends_on:
      - redis

volumes:
  postgres_data:
  postgres_test_data:
  redis_data:

networks:
  aegis-network:
    driver: bridge
```

---

# 📜 Database Initialization Script

```bash
# scripts/init-db.sh

#!/bin/bash

set -e

# Create test database in development container (if needed)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE aegis_test;
    GRANT ALL PRIVILEGES ON DATABASE aegis_test TO $POSTGRES_USER;
EOSQL

echo "✅ Test database created successfully"
```

---

# 🎯 Database Setup Workflow

## Step 1: Start Services

```bash
# Start development database
docker-compose up postgres redis pgadmin redis-commander -d

# Start test database (separate instance)
docker-compose --profile test up postgres-test -d

# Wait for health checks
sleep 10
```

---

## Step 2: Run Migrations

```bash
# Development migrations
npx prisma migrate deploy

# Test migrations
DATABASE_URL=$DATABASE_TEST_URL npx prisma migrate deploy
```

---

## Step 3: Seed Data

```bash
# Development seed
npx prisma db seed

# Test seed
DATABASE_URL=$DATABASE_TEST_URL npx ts-node prisma/seed.test.ts
```

---

## Step 4: Verify Setup

```bash
# Check development data
npx prisma studio

# Query test data
psql -U aegis_user -d aegis_test -c "SELECT COUNT(*) FROM \"User\";"
```

---

# 🧪 Testing Database Strategy

## Isolation Levels

### Option 1: Separate Database Instances
```
aegis_dev   → Development (local changes)
aegis_test  → Testing (clean for each test suite)
```

### Option 2: Database Transactions (Rollback after test)
```typescript
// jest.setup.ts
beforeEach(async () => {
  await db.$transaction(async (prisma) => {
    // All test operations in transaction
    // Automatically rolled back after test
  })
})
```

### Option 3: Docker Compose with Volumes
```bash
# Recommended for CI/CD
docker-compose --profile test down -v  # Clean volumes
docker-compose --profile test up -d    # Fresh database
npx jest                               # Run tests
```

---

# 📊 Database Schema Diagram

```
┌────────────────────────────────────────┐
│             USER MANAGEMENT             │
├────────────────────────────────────────┤
│  User                                  │
│  ├─ id (PK)                           │
│  ├─ email (UNIQUE)                    │
│  ├─ username (UNIQUE)                 │
│  ├─ password                          │
│  ├─ firstName, lastName               │
│  ├─ isActive, isVerified              │
│  ├─ lastLoginAt                       │
│  └─ deletedAt (soft delete)           │
│                                        │
│  Role                                  │
│  ├─ id (PK)                           │
│  ├─ name (UNIQUE)                     │
│  ├─ permissions (JSON array)          │
│                                        │
│  UserRole (Many-to-Many)              │
│  ├─ userId (FK)                       │
│  ├─ roleId (FK)                       │
│                                        │
│  UserSession                          │
│  ├─ id (PK)                           │
│  ├─ userId (FK)                       │
│  ├─ refreshToken (UNIQUE)             │
│  ├─ expiresAt                         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│          AUDIT & COMPLIANCE             │
├────────────────────────────────────────┤
│  AuditLog                              │
│  ├─ id (PK)                           │
│  ├─ userId (FK)                       │
│  ├─ entityType, entityId              │
│  ├─ action (CREATE/UPDATE/DELETE)    │
│  ├─ changes (JSON)                    │
│  ├─ timestamp                         │
│  ├─ correlationId (for tracing)       │
│                                        │
│  SoftDeleteRegistry                   │
│  ├─ id (PK)                           │
│  ├─ entityType, entityId              │
│  ├─ originalData (JSON)               │
│  ├─ deletedBy, deletionReason         │
│  ├─ hardDeletedAt (GDPR)              │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│          SECURITY MANAGEMENT            │
├────────────────────────────────────────┤
│  RateLimit                             │
│  ├─ id (PK)                           │
│  ├─ key (UNIQUE with endpoint)        │
│  ├─ requests, limit                   │
│  ├─ resetAt                           │
│                                        │
│  IpBlacklist                          │
│  ├─ id (PK)                           │
│  ├─ ip (UNIQUE)                       │
│  ├─ reason, severity                  │
│  ├─ expiresAt (null = permanent)      │
│                                        │
│  TokenBlacklist                       │
│  ├─ id (PK)                           │
│  ├─ token (UNIQUE)                    │
│  ├─ userId, reason                    │
│  ├─ expiresAt                         │
│                                        │
│  RiskEvent                            │
│  ├─ id (PK)                           │
│  ├─ userId (FK)                       │
│  ├─ eventType, severity               │
│  ├─ riskScore (0-100)                 │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│            BUSINESS DATA                │
├────────────────────────────────────────┤
│  Product                               │
│  ├─ id (PK)                           │
│  ├─ sku (UNIQUE)                      │
│  ├─ name, description                 │
│  ├─ price, cost                       │
│  ├─ stock, lowStockAlert              │
│                                        │
│  Order                                 │
│  ├─ id (PK)                           │
│  ├─ orderNumber (UNIQUE)              │
│  ├─ userId (FK)                       │
│  ├─ status, total                     │
│  ├─ shippingAddress, trackingNumber   │
│                                        │
│  OrderItem (Many-to-Many)             │
│  ├─ orderId (FK)                      │
│  ├─ productId (FK)                    │
│  ├─ quantity, unitPrice               │
│                                        │
│  Payment                              │
│  ├─ id (PK)                           │
│  ├─ orderId (FK, UNIQUE)              │
│  ├─ amount, status                    │
│  ├─ method, paymentRef                │
│  ├─ refundAmount, refundedAt          │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│        QUEUE & OBSERVABILITY            │
├────────────────────────────────────────┤
│  QueueJob                              │
│  ├─ id (PK)                           │
│  ├─ externalId (BullMQ job ID)        │
│  ├─ queueName                         │
│  ├─ status, attempts                  │
│  ├─ result, error                     │
│                                        │
│  QueueDLQ                             │
│  ├─ id (PK)                           │
│  ├─ jobId, queueName                  │
│  ├─ error, errorType                  │
│  ├─ archived                          │
│                                        │
│  Metric                               │
│  ├─ id (PK)                           │
│  ├─ name, value, unit                 │
│  ├─ tags (JSON)                       │
│  ├─ timestamp                         │
│                                        │
│  AnomalyAlert                         │
│  ├─ id (PK)                           │
│  ├─ metricName                        │
│  ├─ baselineValue, currentValue       │
│  ├─ severity, isResolved              │
└────────────────────────────────────────┘
```

---

# 🔧 Database Maintenance Commands

```bash
# View database
npx prisma studio

# Generate migrations
npx prisma migrate dev --name add_new_column

# Reset development database (warning: deletes data)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# Format schema
npx prisma format

# Validate schema
npx prisma validate

# Generate types
npx prisma generate
```

---

# ✅ Quick Start

```bash
# 1. Clone/setup
git clone <repo>
cd aegis
npm install

# 2. Start services
docker-compose up postgres redis -d

# 3. Setup database
npx prisma migrate deploy
npx prisma db seed

# 4. Start dev server
npm run dev

# 5. Access UIs
- API: http://localhost:3000
- Prisma Studio: npx prisma studio
- PgAdmin: http://localhost:5050 (admin@aegis.local / admin)
- Redis Commander: http://localhost:8081
```

---

## 📝 Environment Variables

```bash
# .env.development
DATABASE_URL="postgresql://aegis_user:aegis_pass@localhost:5432/aegis_dev"
DATABASE_TEST_URL="postgresql://aegis_user:aegis_pass@localhost:5433/aegis_test"
REDIS_URL="redis://localhost:6379"
```

---

**Database schema'nı ve test setup'ını tamamladık! Şimdi her şeyi test edebilecek ortamın var.** 🚀