import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@api-discovery.com' },
    update: {
      role: 'ADMIN',
      passwordHash: adminPassword,
      enabled: true,
      credits: 10000,
    },
    create: {
      email: 'admin@api-discovery.com',
      username: 'admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
      credits: 10000,
      enabled: true,
    },
  });
  console.log(`✅ Created admin user: ${admin.email}`);

  // Create demo users
  const demoUsers = [
    {
      email: 'demo1@example.com',
      username: 'demo1',
      password: 'demo123',
      role: 'USER',
      isDemo: true,
    },
    {
      email: 'demo2@example.com',
      username: 'demo2',
      password: 'demo123',
      role: 'USER',
      isDemo: true,
    },
    {
      email: 'demo3@example.com',
      username: 'demo3',
      password: 'demo123',
      role: 'USER',
      isDemo: true,
    },
  ];

  for (const userData of demoUsers) {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        passwordHash,
        role: userData.role,
        isDemo: userData.isDemo,
        enabled: true,
        credits: 100,
      },
      create: {
        email: userData.email,
        username: userData.username,
        passwordHash,
        role: userData.role,
        isDemo: userData.isDemo,
        credits: 100,
        enabled: true,
      },
    });

    console.log(`✅ Created demo user: ${user.email}`);
  }

  // Create regular user
  const regularPassword = await bcrypt.hash('user123', 10);
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      passwordHash: regularPassword,
      role: 'USER',
      isDemo: false,
      enabled: true,
      credits: 100,
    },
    create: {
      email: 'user@example.com',
      username: 'regularuser',
      passwordHash: regularPassword,
      role: 'USER',
      isDemo: false,
      credits: 100,
      enabled: true,
    },
  });
  console.log(`✅ Created regular user: ${regularUser.email}`);

  console.log('\n📋 Seed Accounts Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👑 ADMIN:');
  console.log('   Email: admin@api-discovery.com');
  console.log('   Password: admin123');
  console.log('   Credits: 10,000');
  console.log('');
  console.log('👤 REGULAR USER:');
  console.log('   Email: user@example.com');
  console.log('   Password: user123');
  console.log('   Credits: 100');
  console.log('');
  console.log('🎮 DEMO USERS:');
  demoUsers.forEach((demo, idx) => {
    console.log(`   ${idx + 1}. Email: ${demo.email}`);
    console.log(`      Password: ${demo.password}`);
    console.log(`      Credits: 100`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
