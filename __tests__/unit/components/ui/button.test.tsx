import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Button from '@/components/ui/button';

describe('Button', () => {
  it('should render button with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDefined();
  });

  it('should apply primary variant by default', () => {
    render(<Button>Test</Button>);
    const button = screen.getByText('Test');
    expect(button.className).toContain('bg-primary');
  });

  it('should apply secondary variant', () => {
    render(<Button variant="secondary">Test</Button>);
    const button = screen.getByText('Test');
    expect(button.className).toContain('bg-gray-200');
  });

  it('should apply danger variant', () => {
    render(<Button variant="danger">Test</Button>);
    const button = screen.getByText('Test');
    expect(button.className).toContain('bg-error');
  });

  it('should apply size classes', () => {
    render(<Button size="lg">Test</Button>);
    const button = screen.getByText('Test');
    expect(button.className).toContain('text-lg');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Test</Button>);
    const button = screen.getByText('Test');
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});

