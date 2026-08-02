import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.product.deleteMany();

  // Create roles
  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
      description: 'Administrator',
      permissions: ['*'],
    },
  });

  const userRole = await prisma.role.create({
    data: {
      name: 'user',
      description: 'Regular user',
      permissions: ['read'],
    },
  });

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: 'admin@aegis.local',
      username: 'admin',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      isVerified: true,
      roles: {
        create: [{ roleId: adminRole.id }],
      },
    },
  });

  console.log('✅ Seed completed');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
