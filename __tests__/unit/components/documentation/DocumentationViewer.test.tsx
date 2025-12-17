import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DocumentationViewer from '@/components/documentation/DocumentationViewer';

// Mock fetch
global.fetch = vi.fn();

describe('DocumentationViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<DocumentationViewer endpointId="ep-123" />);
    expect(screen.getByText('Loading documentation...')).toBeDefined();
  });

  it('should render error state', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Failed to load'));

    render(<DocumentationViewer endpointId="ep-123" />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load/)).toBeDefined();
    });
  });

  it('should render documentation', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        documentation: {
          markdown: '# API Documentation',
          openApiSpec: '{}',
          typescriptTypes: 'export interface Test {}',
        },
      }),
    } as Response);

    render(<DocumentationViewer endpointId="ep-123" />);
    await waitFor(() => {
      expect(screen.getByText('# API Documentation')).toBeDefined();
    });
  });
});

