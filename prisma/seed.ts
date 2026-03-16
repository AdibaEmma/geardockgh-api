import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const TENANT_ID = 'default';

const ADMINS = [
  { firstName: 'Admin', lastName: 'GearDockGH', email: 'admin@geardockgh.com', password: 'Admin@2026' },
  { firstName: 'Emmanuel', lastName: 'Abaagah', email: 'eabaagah@gmail.com', password: 'Firefury@4000' },
];

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

  for (const admin of ADMINS) {
    const existing = await prisma.customer.findUnique({
      where: { email_tenantId: { email: admin.email, tenantId: TENANT_ID } },
    });

    if (existing) {
      if (existing.role !== 'ADMIN') {
        await prisma.customer.update({
          where: { id: existing.id },
          data: { role: 'ADMIN' },
        });
        console.log(`Promoted ${admin.email} to ADMIN`);
      } else {
        console.log(`Admin already exists: ${admin.email}`);
      }
      continue;
    }

    const passwordHash = await bcrypt.hash(admin.password, 12);

    await prisma.customer.create({
      data: {
        tenantId: TENANT_ID,
        role: 'ADMIN',
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        passwordHash,
      },
    });

    console.log(`Admin created: ${admin.email}`);
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
