import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Modal from '@/components/ui/modal';

describe('Modal', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('should not render when closed', () => {
    render(<Modal isOpen={false} onClose={() => {}}>Content</Modal>);
    expect(screen.queryByText('Content')).toBeNull();
  });

  it('should render when open', () => {
    render(<Modal isOpen={true} onClose={() => {}}>Content</Modal>);
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('should render with title', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="Modal Title">Content</Modal>);
    expect(screen.getByText('Modal Title')).toBeDefined();
  });
});

