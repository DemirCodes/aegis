import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://aegis_user:aegis_pass@localhost:5432/aegis_dev',
  },
});
