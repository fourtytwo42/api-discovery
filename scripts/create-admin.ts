import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@api-discovery.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const username = process.env.ADMIN_USERNAME || 'admin';

  console.log(`Creating admin user: ${email}`);

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
      passwordHash,
      enabled: true,
    },
    create: {
      email,
      username,
      passwordHash,
      role: 'ADMIN',
      credits: 10000, // Admin gets plenty of credits
      enabled: true,
    },
  });

  console.log('\n✅ Admin user created successfully!');
  console.log(`\n📧 Email: ${admin.email}`);
  console.log(`👤 Username: ${admin.username}`);
  console.log(`🔑 Password: ${password}`);
  console.log(`👑 Role: ${admin.role}`);
  console.log(`💰 Credits: ${admin.credits}`);
}

main()
  .catch((e) => {
    console.error('Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

