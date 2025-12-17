import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navbar from '@/components/layout/Navbar';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Navbar', () => {
  it('should render navigation links', () => {
    render(<Navbar />);
    expect(screen.getByText('API Discovery')).toBeDefined();
  });
});

