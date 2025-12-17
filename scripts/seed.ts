import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

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
      update: {},
      create: {
        email: userData.email,
        username: userData.username,
        passwordHash,
        role: userData.role,
        isDemo: userData.isDemo,
        credits: 100, // Free credits on signup
      },
    });

    console.log(`Created demo user: ${user.email}`);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

