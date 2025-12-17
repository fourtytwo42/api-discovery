import { getFreeTierRemaining } from './transactions';

export async function shouldChargeCredits(userId: string): Promise<boolean> {
  const remaining = await getFreeTierRemaining(userId);
  return remaining <= 0;
}

export async function getCreditsToCharge(userId: string): Promise<number> {
  const shouldCharge = await shouldChargeCredits(userId);
  if (!shouldCharge) {
    return 0; // Free tier
  }
  return parseInt(process.env.CREDITS_PER_URL || '25', 10);
}

