import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = 'admin@geardockgh.com';
const ADMIN_PASSWORD = 'Admin@2026';
const TENANT_ID = 'default';

async function main() {
  // Ensure default tenant exists
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    await prisma.tenant.create({
      data: { id: TENANT_ID, name: 'GearDockGH' },
    });
    console.log(`Tenant created: ${TENANT_ID}`);
  } else {
    console.log(`Tenant already exists: ${TENANT_ID}`);
  }

  const existing = await prisma.customer.findUnique({
    where: { email_tenantId: { email: ADMIN_EMAIL, tenantId: TENANT_ID } },
  });

  if (existing) {
    if (existing.role !== 'ADMIN') {
      await prisma.customer.update({
        where: { id: existing.id },
        data: { role: 'ADMIN' },
      });
      console.log(`Promoted ${ADMIN_EMAIL} to ADMIN`);
    } else {
      console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await prisma.customer.create({
    data: {
      tenantId: TENANT_ID,
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'GearDockGH',
      email: ADMIN_EMAIL,
      passwordHash,
    },
  });

  console.log(`Admin user created:`);
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
