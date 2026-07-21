import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding local development database...');

  // Create Organization
  const org = await prisma.organization.upsert({
    where: { id: 'local-org-1' },
    update: {},
    create: {
      id: 'local-org-1',
      name: 'Local Dev Organization',
      domain: 'localhost',
    },
  });

  console.log(`Organization created: ${org.name}`);

  // Create Main Admin User
  // Password is 'admin123'
  const adminPassword = 'admin123';
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { phone: '1234567890' },
    update: {
      cognitoSub: 'local-admin-sub',
      hashedPassword: hashedAdminPassword,
      plainTextPassword: adminPassword,
    },
    create: {
      cognitoSub: 'local-admin-sub',
      phone: '1234567890',
      email: 'admin@localhost.com',
      role: UserRole.MAIN_ADMIN,
      organizationId: org.id,
      passwordSetAt: new Date(),
      hashedPassword: hashedAdminPassword,
      plainTextPassword: adminPassword,
    },
  });

  console.log(`Admin User created: ${admin.email} (Password: ${adminPassword})`);

  // Create Location
  const location = await prisma.location.upsert({
    where: { id: 'local-loc-1' },
    update: {},
    create: {
      id: 'local-loc-1',
      name: 'Local Test City',
    },
  });

  // Create Hostel
  const hostel = await prisma.hostel.upsert({
    where: { id: 'local-hostel-1' },
    update: {},
    create: {
      id: 'local-hostel-1',
      name: 'Local Dev Hostel',
      accommodationType: 'MENS',
      address: '123 Dev Street',
      organizationId: org.id,
      locationId: location.id,
    },
  });

  console.log(`Hostel created: ${hostel.name}`);

  console.log('Local dev seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
