import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Wiping database...');

  // Delete in order to respect foreign key constraints
  await prisma.auditLog.deleteMany();
  await prisma.endpointDocumentation.deleteMany();
  await prisma.apiChange.deleteMany();
  await prisma.actionSequence.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.creditTransaction.deleteMany();
  await prisma.apiCall.deleteMany();
  await prisma.discoveredEndpoint.deleteMany();
  await prisma.endpoint.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database wiped!');
  console.log('🌱 Now run: npm run db:seed');
}

main()
  .catch((e) => {
    console.error('❌ Error wiping database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

