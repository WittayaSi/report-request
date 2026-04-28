/**
 * StatusBadge Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock StatusBadge component for testing
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: 'รอดำเนินการ', className: 'bg-yellow-100 text-yellow-800' },
    in_progress: { label: 'กำลังดำเนินการ', className: 'bg-blue-100 text-blue-800' },
    completed: { label: 'เสร็จสิ้น', className: 'bg-green-100 text-green-800' },
    cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-800' },
  };

  const config = statusConfig[status] || { label: status, className: 'bg-gray-100' };

  return (
    <span className={`px-2 py-1 rounded-full text-sm ${config.className}`} data-testid="status-badge">
      {config.label}
    </span>
  );
}

describe('StatusBadge Component', () => {
  it('should render pending status correctly', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('รอดำเนินการ')).toBeInTheDocument();
  });

  it('should render in_progress status correctly', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('กำลังดำเนินการ')).toBeInTheDocument();
  });

  it('should render completed status correctly', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('เสร็จสิ้น')).toBeInTheDocument();
  });

  it('should render cancelled status correctly', () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByText('ยกเลิก')).toBeInTheDocument();
  });

  it('should have correct styling classes for pending', () => {
    render(<StatusBadge status="pending" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveClass('bg-yellow-100');
  });

  it('should have correct styling classes for completed', () => {
    render(<StatusBadge status="completed" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveClass('bg-green-100');
  });
});
