import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../prisma/generated/client'

const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_TEST_URL || 'postgresql://aegis_user:aegis_pass@localhost:5433/aegis_test' 
})
const prisma = new PrismaClient({ adapter })

async function seedTestData() {
  console.log('🧪 Seeding test database...')

  // Clean up
  await prisma.user.deleteMany()
  await prisma.role.deleteMany()
  await prisma.product.deleteMany()

  // Create roles
  const [adminRole, userRole] = await Promise.all([
    prisma.role.create({ data: { name: 'admin', permissions: '["*"]' } }),
    prisma.role.create({ data: { name: 'user', permissions: '["read"]' } }),
  ])

  // Create test users (10)
  for (let i = 0; i < 10; i++) {
    await prisma.user.create({
      data: {
        email: `test-user-${i}@aegis.local`,
        username: `testuser${i}`,
        password: 'testpass123',
        firstName: `Test${i}`,
        lastName: `User${i}`,
        isActive: true,
        isVerified: true,
        roles: {
          create: [{ roleId: i === 0 ? adminRole.id : userRole.id }],
        },
      },
    })
  }

  console.log('✅ Test seed completed (10 users)')
}

seedTestData()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())