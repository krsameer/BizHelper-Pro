import type { Article, ArticleCategory, DashboardStats, PaginatedRequests, RequestCategory, RequestPriority, RequestStatus, ServiceRequest } from '../types';
import type { ApiErrorPayload } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
const API_KEY = 'dev-secret-2024';

export class ApiError extends Error {
  code: string;
  field?: string;
  details?: ApiErrorPayload['details'];

  constructor(payload: ApiErrorPayload) {
    super(payload.error);
    this.code = payload.code;
    this.field = payload.field;
    this.details = payload.details;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    throw new ApiError(
      payload ?? {
        error: 'Request failed',
        code: 'UNKNOWN_ERROR'
      }
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  getDashboardStats: () => requestJson<DashboardStats>('/dashboard/stats'),
  listRequests: (params: {
    status?: RequestStatus | '';
    category?: RequestCategory | '';
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.category) query.set('category', params.category);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    return requestJson<PaginatedRequests>(`/requests?${query.toString()}`);
  },
  getRequest: (id: string) => requestJson<ServiceRequest>(`/requests/${id}`),
  createRequest: (body: {
    title: string;
    category: RequestCategory;
    priority: RequestPriority;
    description: string;
  }) => requestJson<ServiceRequest>('/requests', { method: 'POST', body: JSON.stringify(body) }),
  updateRequest: (
    id: string,
    body: Partial<Pick<ServiceRequest, 'title' | 'category' | 'priority' | 'status' | 'description'>>
  ) => requestJson<ServiceRequest>(`/requests/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRequest: (id: string) => requestJson<void>(`/requests/${id}`, { method: 'DELETE' }),
  addMessage: (id: string, body: { body: string; sender?: 'customer' | 'agent'; author?: string }) =>
    requestJson<ServiceRequest>(`/requests/${id}/messages`, { method: 'POST', body: JSON.stringify(body) }),
  listArticles: (params: { category?: ArticleCategory | ''; q?: string }) => {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.q) query.set('q', params.q);
    return requestJson<{ items: Article[] }>(`/articles?${query.toString()}`);
  },
  getArticle: (id: string) => requestJson<Article>(`/articles/${id}`),
  sendFeedback: (id: string, helpful: boolean) => requestJson<Article>(`/articles/${id}/feedback`, { method: 'POST', body: JSON.stringify({ helpful }) })
};
