import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import EndpointList from '@/components/endpoints/EndpointList';

// Mock fetch
global.fetch = vi.fn();
// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('EndpointList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<EndpointList />);
    expect(screen.getByText('Loading endpoints...')).toBeDefined();
  });

  it('should render empty state', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ endpoints: [] }),
    } as Response);

    render(<EndpointList />);
    await waitFor(() => {
      expect(screen.getByText('No endpoints yet')).toBeDefined();
    });
  });

  it('should render endpoints', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        endpoints: [
          {
            id: 'ep-123',
            name: 'Test Endpoint',
            destinationUrl: 'https://api.example.com',
            proxyUrl: '/proxy/ep-123',
            status: 'ACTIVE',
            creditsUsed: 25,
            createdAt: new Date().toISOString(),
            lastUsedAt: null,
          },
        ],
      }),
    } as Response);

    render(<EndpointList />);
    await waitFor(() => {
      expect(screen.getByText('Test Endpoint')).toBeDefined();
    });
  });
});

