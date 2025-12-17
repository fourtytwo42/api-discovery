import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Input from '@/components/ui/input';

describe('Input', () => {
  it('should render input', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDefined();
  });

  it('should render with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeDefined();
  });

  it('should show error message', () => {
    render(<Input error="Invalid input" />);
    expect(screen.getByText('Invalid input')).toBeDefined();
  });

  it('should apply error styling when error present', () => {
    render(<Input error="Error" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-error');
  });
});

