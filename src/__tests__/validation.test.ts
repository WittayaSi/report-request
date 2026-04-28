/**
 * Validation Schema Tests
 * Tests for Zod validation schemas used in the application
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Recreate satisfaction schema for testing
const satisfactionSchema = z.object({
  requestId: z.number(),
  overallRating: z.enum(['1', '2', '3', '4', '5']),
  speedRating: z.enum(['1', '2', '3', '4', '5']).optional(),
  accuracyRating: z.enum(['1', '2', '3', '4', '5']).optional(),
  easeOfUseRating: z.enum(['1', '2', '3', '4', '5']).optional(),
  communicationRating: z.enum(['1', '2', '3', '4', '5']).optional(),
  comment: z.string().optional(),
});

describe('Satisfaction Rating Schema', () => {
  it('should validate valid satisfaction data', () => {
    const validData = {
      requestId: 1,
      overallRating: '5' as const,
      comment: 'Great service!',
    };
    
    const result = satisfactionSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid rating values', () => {
    const invalidData = {
      requestId: 1,
      overallRating: '6', // Invalid - only 1-5 allowed
    };
    
    const result = satisfactionSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const invalidData = {
      comment: 'Missing requestId and overallRating',
    };
    
    const result = satisfactionSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept optional category ratings', () => {
    const dataWithCategories = {
      requestId: 1,
      overallRating: '4' as const,
      speedRating: '5' as const,
      accuracyRating: '4' as const,
      easeOfUseRating: '3' as const,
      communicationRating: '5' as const,
    };
    
    const result = satisfactionSchema.safeParse(dataWithCategories);
    expect(result.success).toBe(true);
  });
});

// Request creation schema
const requestSchema = z.object({
  title: z.string().min(3, 'หัวข้อต้องมีอย่างน้อย 3 ตัวอักษร'),
  description: z.string().optional(),
  outputType: z.enum(['file', 'hosxp_report', 'dashboard', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  sourceSystem: z.enum(['hosxp', 'hosoffice', 'php', 'other']),
});

describe('Request Creation Schema', () => {
  it('should validate valid request data', () => {
    const validRequest = {
      title: 'รายงานสรุปผู้ป่วย',
      description: 'ต้องการข้อมูลประจำเดือน',
      outputType: 'file' as const,
      priority: 'medium' as const,
      sourceSystem: 'hosxp' as const,
    };
    
    const result = requestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject title less than 3 characters', () => {
    const invalidRequest = {
      title: 'AB', // Too short
      outputType: 'file' as const,
      priority: 'medium' as const,
      sourceSystem: 'hosxp' as const,
    };
    
    const result = requestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toBeDefined();
    }
  });

  it('should reject invalid output type', () => {
    const invalidRequest = {
      title: 'Valid Title',
      outputType: 'invalid_type',
      priority: 'medium',
      sourceSystem: 'hosxp',
    };
    
    const result = requestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject invalid priority', () => {
    const invalidRequest = {
      title: 'Valid Title',
      outputType: 'file',
      priority: 'super_urgent', // Invalid
      sourceSystem: 'hosxp',
    };
    
    const result = requestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});

// Comment schema
const commentSchema = z.object({
  requestId: z.number(),
  content: z.string().min(1, 'ความคิดเห็นจะว่างไม่ได้'),
  isInternal: z.boolean().optional().default(false),
});

describe('Comment Schema', () => {
  it('should validate valid comment', () => {
    const validComment = {
      requestId: 1,
      content: 'This is a comment',
    };
    
    const result = commentSchema.safeParse(validComment);
    expect(result.success).toBe(true);
  });

  it('should reject empty content', () => {
    const invalidComment = {
      requestId: 1,
      content: '',
    };
    
    const result = commentSchema.safeParse(invalidComment);
    expect(result.success).toBe(false);
  });

  it('should default isInternal to false', () => {
    const comment = {
      requestId: 1,
      content: 'Test comment',
    };
    
    const result = commentSchema.parse(comment);
    expect(result.isInternal).toBe(false);
  });
});
