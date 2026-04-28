/**
 * Integration Tests
 * Tests for component interactions and data flow
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';

// Mock Button component
function Button({ 
  children, 
  onClick, 
  disabled, 
  variant = 'default',
  type = 'button'
}: { 
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'destructive';
  type?: 'button' | 'submit';
}) {
  const variantClasses = {
    default: 'bg-primary text-primary-foreground',
    outline: 'border border-input',
    destructive: 'bg-destructive text-destructive-foreground',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

// Mock form with validation
function RequestForm({ onSubmit }: { onSubmit: (data: { title: string; priority: string }) => void }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (title.length < 3) {
      setError('หัวข้อต้องมีอย่างน้อย 3 ตัวอักษร');
      return;
    }

    setIsSubmitting(true);
    await onSubmit({ title, priority });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} data-testid="request-form">
      <div>
        <label htmlFor="title">หัวข้อ</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="title-input"
        />
        {error && <span className="text-red-500" data-testid="error-message">{error}</span>}
      </div>
      <div>
        <label htmlFor="priority">ความเร่งด่วน</label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          data-testid="priority-select"
        >
          <option value="low">ต่ำ</option>
          <option value="medium">ปกติ</option>
          <option value="high">สูง</option>
          <option value="urgent">เร่งด่วน</option>
        </select>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'กำลังส่ง...' : 'ส่งคำขอ'}
      </Button>
    </form>
  );
}

describe('RequestForm Integration', () => {
  it('should render form elements', () => {
    render(<RequestForm onSubmit={() => {}} />);
    
    expect(screen.getByTestId('title-input')).toBeInTheDocument();
    expect(screen.getByTestId('priority-select')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should show error for short title', async () => {
    render(<RequestForm onSubmit={() => {}} />);
    
    const input = screen.getByTestId('title-input');
    const button = screen.getByRole('button');

    await userEvent.type(input, 'AB');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('หัวข้อต้องมีอย่างน้อย 3 ตัวอักษร');
    });
  });

  it('should call onSubmit with form data', async () => {
    const handleSubmit = vi.fn();
    render(<RequestForm onSubmit={handleSubmit} />);
    
    const input = screen.getByTestId('title-input');
    const select = screen.getByTestId('priority-select');
    const button = screen.getByRole('button');

    await userEvent.type(input, 'รายงานประจำเดือน');
    fireEvent.change(select, { target: { value: 'high' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        title: 'รายงานประจำเดือน',
        priority: 'high',
      });
    });
  });

  it('should disable button during submission', async () => {
    const handleSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<RequestForm onSubmit={handleSubmit} />);
    
    const input = screen.getByTestId('title-input');
    const button = screen.getByRole('button');

    await userEvent.type(input, 'Valid Title');
    fireEvent.click(button);

    expect(button).toBeDisabled();
  });
});

// Comment section mock
function CommentSection({ 
  comments,
  onAddComment 
}: { 
  comments: { id: number; content: string; author: string }[];
  onAddComment: (content: string) => void;
}) {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment);
      setNewComment('');
    }
  };

  return (
    <div data-testid="comment-section">
      <ul data-testid="comment-list">
        {comments.map((comment) => (
          <li key={comment.id} data-testid={`comment-${comment.id}`}>
            <strong>{comment.author}:</strong> {comment.content}
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="เพิ่มความคิดเห็น..."
          data-testid="comment-input"
        />
        <Button type="submit">ส่ง</Button>
      </form>
    </div>
  );
}

describe('CommentSection Integration', () => {
  const mockComments = [
    { id: 1, content: 'First comment', author: 'User A' },
    { id: 2, content: 'Second comment', author: 'User B' },
  ];

  it('should render existing comments', () => {
    render(<CommentSection comments={mockComments} onAddComment={() => {}} />);
    
    expect(screen.getByTestId('comment-1')).toBeInTheDocument();
    expect(screen.getByTestId('comment-2')).toBeInTheDocument();
  });

  it('should call onAddComment when form is submitted', async () => {
    const handleAddComment = vi.fn();
    render(<CommentSection comments={[]} onAddComment={handleAddComment} />);
    
    const input = screen.getByTestId('comment-input');
    await userEvent.type(input, 'New comment');
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleAddComment).toHaveBeenCalledWith('New comment');
  });

  it('should clear input after submission', async () => {
    render(<CommentSection comments={[]} onAddComment={() => {}} />);
    
    const input = screen.getByTestId('comment-input') as HTMLInputElement;
    await userEvent.type(input, 'Test comment');
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(input.value).toBe('');
  });

  it('should not submit empty comments', async () => {
    const handleAddComment = vi.fn();
    render(<CommentSection comments={[]} onAddComment={handleAddComment} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleAddComment).not.toHaveBeenCalled();
  });
});
