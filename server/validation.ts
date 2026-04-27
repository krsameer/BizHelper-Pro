import { z } from 'zod';

const category = z.enum(['billing', 'onboarding', 'technical', 'account']);
const priority = z.enum(['low', 'medium', 'high', 'urgent']);
const status = z.enum(['open', 'pending', 'resolved', 'closed']);

export const createRequestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  category,
  priority,
  description: z.string().min(20, 'Description must be at least 20 characters')
});

export const updateRequestSchema = z
  .object({
    title: z.string().min(5, 'Title must be at least 5 characters').optional(),
    category: category.optional(),
    priority: priority.optional(),
    status: status.optional(),
    description: z.string().min(20, 'Description must be at least 20 characters').optional()
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const createMessageSchema = z.object({
  body: z.string().min(2, 'Message body is required'),
  sender: z.enum(['customer', 'agent']).optional(),
  author: z.string().min(1).optional()
});

export const feedbackSchema = z.object({
  helpful: z.boolean()
});
