import { describe, it, expect, vi } from 'vitest';
import { shouldChargeCredits, getCreditsToCharge } from '@/lib/credits/validation';
import * as transactions from '@/lib/credits/transactions';

vi.mock('@/lib/credits/transactions', () => ({
  getFreeTierRemaining: vi.fn(),
}));

describe('Credit Validation', () => {
  it('should return true if free tier exhausted', async () => {
    vi.mocked(transactions.getFreeTierRemaining).mockResolvedValue(0);
    const result = await shouldChargeCredits('user-123');
    expect(result).toBe(true);
  });

  it('should return false if free tier available', async () => {
    vi.mocked(transactions.getFreeTierRemaining).mockResolvedValue(2);
    const result = await shouldChargeCredits('user-123');
    expect(result).toBe(false);
  });

  it('should return 0 credits if free tier available', async () => {
    vi.mocked(transactions.getFreeTierRemaining).mockResolvedValue(1);
    const result = await getCreditsToCharge('user-123');
    expect(result).toBe(0);
  });

  it('should return credits per URL if free tier exhausted', async () => {
    vi.mocked(transactions.getFreeTierRemaining).mockResolvedValue(0);
    const result = await getCreditsToCharge('user-123');
    expect(result).toBe(25); // Default CREDITS_PER_URL
  });
});

