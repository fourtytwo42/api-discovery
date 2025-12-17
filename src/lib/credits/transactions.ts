import { prisma } from '../database/prisma';
import { AppError } from '../utils/errors';

export async function checkCredits(userId: string, required: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user.credits >= required;
}

export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  endpointId?: string
): Promise<{ success: boolean; balanceAfter: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.credits < amount) {
    throw new AppError('Insufficient credits', 400);
  }

  const balanceAfter = user.credits - amount;

  // Create transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: -amount,
      balanceAfter,
      type: 'ENDPOINT',
      description,
      endpointId,
    },
  });

  // Update user credits
  await prisma.user.update({
    where: { id: userId },
    data: { credits: balanceAfter },
  });

  return { success: true, balanceAfter };
}

export async function addCredits(
  userId: string,
  amount: number,
  description: string,
  paymentId?: string
): Promise<{ success: boolean; balanceAfter: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const balanceAfter = user.credits + amount;

  // Create transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount,
      balanceAfter,
      type: 'PURCHASE',
      description,
      paymentId,
    },
  });

  // Update user credits
  await prisma.user.update({
    where: { id: userId },
    data: { credits: balanceAfter },
  });

  return { success: true, balanceAfter };
}

export async function getFreeTierRemaining(userId: string): Promise<number> {
  const freeCreditsOnSignup = parseInt(process.env.FREE_CREDITS_ON_SIGNUP || '100', 10);
  const creditsPerUrl = parseInt(process.env.CREDITS_PER_URL || '25', 10);
  const freeEndpoints = Math.floor(freeCreditsOnSignup / creditsPerUrl);

  // Count endpoints created by user
  const endpointCount = await prisma.endpoint.count({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
  });

  return Math.max(0, freeEndpoints - endpointCount);
}

