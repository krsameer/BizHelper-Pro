import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  addRequestMessage,
  createRequest,
  deleteRequest,
  getArticle,
  getDashboardStats,
  getRequest,
  listArticles,
  listRequests,
  voteArticle,
  updateRequest
} from './store';
import { createMessageSchema, createRequestSchema, feedbackSchema, updateRequestSchema } from './validation';

const app = express();
const port = Number(process.env.PORT ?? 3002);
const apiKey = 'dev-secret-2024';

app.use(
  cors({
    origin: true,
    allowedHeaders: ['Content-Type', 'X-API-Key']
  })
);
app.use(express.json());
app.use('/api', rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false }));

app.use('/api', (req, res, next) => {
  if (req.header('X-API-Key') !== apiKey) {
    return res.status(401).json({ error: 'Missing or invalid API key', code: 'UNAUTHORIZED' });
  }
  return next();
});

const sendValidationError = (res: Response, issues: Array<{ field: string; message: string }>) => {
  return res.status(400).json({
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: issues.map((issue) => ({ error: issue.message, field: issue.field, code: 'INVALID_FIELD' }))
  });
};

const handleZod = (res: Response, error: unknown) => {
  if (error && typeof error === 'object' && 'issues' in error) {
    const issues = (error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues.map((issue) => ({
      field: String(issue.path[0] ?? 'body'),
      message: issue.message
    }));
    return sendValidationError(res, issues);
  }
  return null;
};

app.get('/api/dashboard/stats', (_req, res) => {
  res.json(getDashboardStats());
});

app.get('/api/requests', (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const result = listRequests({
    status: typeof req.query.status === 'string' ? (req.query.status as any) : undefined,
    category: typeof req.query.category === 'string' ? (req.query.category as any) : undefined,
    page,
    limit,
    search: typeof req.query.search === 'string' ? req.query.search : undefined
  });
  res.json(result);
});

app.get('/api/requests/:id', (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found', code: 'NOT_FOUND' });
  }
  return res.json(request);
});

app.post('/api/requests', (req, res) => {
  const parsed = createRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return handleZod(res, parsed.error);
  }
  const request = createRequest(parsed.data);
  return res.status(201).json(request);
});

app.put('/api/requests/:id', (req, res) => {
  const parsed = updateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return handleZod(res, parsed.error);
  }
  const request = updateRequest(req.params.id, parsed.data);
  if (!request) {
    return res.status(404).json({ error: 'Request not found', code: 'NOT_FOUND' });
  }
  return res.json(request);
});

app.delete('/api/requests/:id', (req, res) => {
  const removed = deleteRequest(req.params.id);
  if (!removed) {
    return res.status(404).json({ error: 'Request not found', code: 'NOT_FOUND' });
  }
  return res.status(204).send();
});

app.post('/api/requests/:id/messages', (req, res) => {
  const parsed = createMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return handleZod(res, parsed.error);
  }
  const request = addRequestMessage(req.params.id, parsed.data);
  if (!request) {
    return res.status(404).json({ error: 'Request not found', code: 'NOT_FOUND' });
  }
  return res.status(201).json(request);
});

app.get('/api/articles', (req, res) => {
  const articles = listArticles({
    category: typeof req.query.category === 'string' ? (req.query.category as any) : undefined,
    q: typeof req.query.q === 'string' ? req.query.q : undefined
  });
  res.json({ items: articles });
});

app.get('/api/articles/:id', (req, res) => {
  const article = getArticle(req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found', code: 'NOT_FOUND' });
  }
  return res.json(article);
});

app.post('/api/articles/:id/feedback', (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return handleZod(res, parsed.error);
  }
  const article = voteArticle(req.params.id, parsed.data.helpful);
  if (!article) {
    return res.status(404).json({ error: 'Article not found', code: 'NOT_FOUND' });
  }
  return res.status(201).json(article);
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'An unexpected error occurred', code: 'INTERNAL_SERVER_ERROR' });
});

app.listen(port, () => {
  console.log(`BizHelper Pro API listening on http://localhost:${port}`);
});
