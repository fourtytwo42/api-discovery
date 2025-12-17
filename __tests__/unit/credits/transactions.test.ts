import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkCredits, deductCredits, addCredits, getFreeTierRemaining } from '@/lib/credits/transactions';
import { prisma } from '@/lib/database/prisma';
import { AppError } from '@/lib/utils/errors';

vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    creditTransaction: {
      create: vi.fn(),
    },
    endpoint: {
      count: vi.fn(),
    },
  },
}));

describe('Credit Transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkCredits', () => {
    it('should return true if user has sufficient credits', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        credits: 100,
      } as any);

      const result = await checkCredits('user-123', 50);
      expect(result).toBe(true);
    });

    it('should return false if user has insufficient credits', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        credits: 20,
      } as any);

      const result = await checkCredits('user-123', 50);
      expect(result).toBe(false);
    });

    it('should throw if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(checkCredits('user-123', 50)).rejects.toThrow(AppError);
    });
  });

  describe('deductCredits', () => {
    it('should deduct credits successfully', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        credits: 100,
      } as any);
      vi.mocked(prisma.creditTransaction.create).mockResolvedValue({} as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const result = await deductCredits('user-123', 25, 'Test deduction');
      expect(result.success).toBe(true);
      expect(result.balanceAfter).toBe(75);
    });

    it('should throw if insufficient credits', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        credits: 20,
      } as any);

      await expect(deductCredits('user-123', 50, 'Test')).rejects.toThrow('Insufficient credits');
    });
  });

  describe('addCredits', () => {
    it('should add credits successfully', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        credits: 100,
      } as any);
      vi.mocked(prisma.creditTransaction.create).mockResolvedValue({} as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const result = await addCredits('user-123', 50, 'Test addition');
      expect(result.success).toBe(true);
      expect(result.balanceAfter).toBe(150);
    });
  });

  describe('getFreeTierRemaining', () => {
    it('should calculate remaining free endpoints', async () => {
      vi.mocked(prisma.endpoint.count).mockResolvedValue(2);

      const result = await getFreeTierRemaining('user-123');
      // 100 free credits / 25 per endpoint = 4 free endpoints
      // 2 already used, so 2 remaining
      expect(result).toBe(2);
    });
  });
});

