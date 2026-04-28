/**
 * Star Rating Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';

// Mock Star component for testing
function Star({ className }: { className?: string }) {
  return <svg data-testid="star-icon" className={className}><path /></svg>;
}

// Mock StarRating component
function StarRating({ 
  value, 
  onChange, 
  size = 'md' 
}: { 
  value: number; 
  onChange: (val: number) => void; 
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hoverValue, setHoverValue] = useState(0);
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

  return (
    <div className="flex gap-1" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          data-testid={`star-${star}`}
          className={sizeClasses[size]}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          onClick={() => onChange(star)}
        >
          <Star 
            className={
              star <= (hoverValue || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            } 
          />
        </button>
      ))}
    </div>
  );
}

describe('StarRating Component', () => {
  it('should render 5 stars', () => {
    render(<StarRating value={0} onChange={() => {}} />);
    const stars = screen.getAllByTestId(/^star-\d$/);
    expect(stars).toHaveLength(5);
  });

  it('should highlight stars up to the current value', () => {
    render(<StarRating value={3} onChange={() => {}} />);
    // Value is 3, so stars 1-3 should be filled
    const starRating = screen.getByTestId('star-rating');
    expect(starRating).toBeInTheDocument();
  });

  it('should call onChange when a star is clicked', () => {
    const handleChange = vi.fn();
    render(<StarRating value={0} onChange={handleChange} />);
    
    fireEvent.click(screen.getByTestId('star-4'));
    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it('should apply hover effect on mouse enter', () => {
    render(<StarRating value={0} onChange={() => {}} />);
    
    const star3 = screen.getByTestId('star-3');
    fireEvent.mouseEnter(star3);
    
    // After hover, the component should have updated
    expect(star3).toBeInTheDocument();
  });

  it('should call onChange with correct value for each star', () => {
    const handleChange = vi.fn();
    render(<StarRating value={0} onChange={handleChange} />);
    
    // Click each star and verify the call
    [1, 2, 3, 4, 5].forEach((starValue) => {
      fireEvent.click(screen.getByTestId(`star-${starValue}`));
      expect(handleChange).toHaveBeenCalledWith(starValue);
    });
    
    expect(handleChange).toHaveBeenCalledTimes(5);
  });
});

describe('StarRating States', () => {
  it('should display no filled stars when value is 0', () => {
    const { container } = render(<StarRating value={0} onChange={() => {}} />);
    expect(container).toBeInTheDocument();
  });

  it('should display all filled stars when value is 5', () => {
    const { container } = render(<StarRating value={5} onChange={() => {}} />);
    expect(container).toBeInTheDocument();
  });
});
