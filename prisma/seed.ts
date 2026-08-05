import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../prisma/generated/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL || 'postgresql://aegis_user:aegis_pass@localhost:5432/aegis_dev' })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  await prisma.user.deleteMany()
  await prisma.role.deleteMany()

  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
      description: 'Administrator',
      permissions: '["*"]',
    },
  })

  const userRole = await prisma.role.create({
    data: {
      name: 'user',
      description: 'Regular user',
      permissions: '["read"]',
    },
  })

  await prisma.user.create({
    data: {
      email: 'admin@aegis.local',
      username: 'admin',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      isVerified: true,
      roles: {
        create: [{ roleId: adminRole.id }],
      },
    },
  })

  console.log('✅ Seed completed')
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())