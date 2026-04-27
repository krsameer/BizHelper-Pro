import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AnimatePresence, Reorder, motion, useReducedMotion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AnimatedButton } from './components/AnimatedButton';
import { EmptyState } from './components/EmptyState';
import { Modal } from './components/Modal';
import { PageWrapper } from './components/PageWrapper';
import { SkeletonLoader } from './components/SkeletonLoader';
import { StatusBadge } from './components/StatusBadge';
import { ThemeToggle } from './components/ThemeToggle';
import { ToastStack, type ToastState } from './components/Toast';
import { api, ApiError } from './lib/api';
import { useCountUp, useDebouncedValue, useThemeMode } from './lib/hooks';
import type { Article, ArticleCategory, DashboardStats, Message, PaginatedRequests, RequestCategory, RequestPriority, RequestStatus, ServiceRequest } from './types';

type View = 'dashboard' | 'requests' | 'knowledge';
type RequestView = 'list' | 'detail';

const categories: RequestCategory[] = ['billing', 'onboarding', 'technical', 'account'];
const articleCategories: ArticleCategory[] = ['billing', 'onboarding', 'technical', 'account'];

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: spring }
};
const leftItemVariants = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22 } }
};
const modalVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
  exit: { opacity: 0, y: 20, scale: 0.97, transition: { duration: 0.18 } }
};
const pageVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.16 } }
};
const shellVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.04 } }
};
const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: spring }
};
const navButtonVariants = {
  idle: { scale: 1 },
  active: { scale: 1.02 }
};
const floatVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 0.52, scale: 1, transition: { duration: 0.4 } },
  drift: { y: [0, -14, 0], x: [0, 10, 0], transition: { duration: 10, repeat: Infinity, ease: 'easeInOut' as const } }
};

const themeTokens = {
  light: {
    background: '#f2f5f2',
    panel: 'rgba(255, 255, 255, 0.78)',
    panelStrong: '#ffffff',
    text: '#10221a',
    muted: '#52625b',
    border: 'rgba(16, 34, 26, 0.1)',
    accent: '#0f766e',
    accentSoft: '#dcfce7'
  },
  dark: {
    background: '#08120f',
    panel: 'rgba(10, 24, 19, 0.84)',
    panelStrong: '#0f1f19',
    text: '#edf7f2',
    muted: '#9eb4aa',
    border: 'rgba(172, 197, 187, 0.14)',
    accent: '#34d399',
    accentSoft: 'rgba(52, 211, 153, 0.12)'
  }
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));

const formatCategory = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const formatHours = (value: number) => `${value.toFixed(1)}h`;

const iconByCategory: Record<ArticleCategory, string> = {
  billing: '◌',
  onboarding: '△',
  technical: '⌁',
  account: '◈'
};

const validateRequestForm = (form: RequestFormState) => {
  const errors: Partial<Record<keyof RequestFormState, string>> = {};
  if (form.title.trim().length < 5) {
    errors.title = 'Title must be at least 5 characters';
  }
  if (form.description.trim().length < 20) {
    errors.description = 'Description must be at least 20 characters';
  }
  return errors;
};

type RequestFormState = {
  title: string;
  category: RequestCategory;
  priority: RequestPriority;
  description: string;
};

const createTempRequest = (form: RequestFormState): ServiceRequest => ({
  id: `temp-${crypto.randomUUID()}`,
  referenceId: 'PENDING',
  title: form.title,
  category: form.category,
  priority: form.priority,
  status: 'open',
  description: form.description,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [
    {
      id: `temp-msg-${crypto.randomUUID()}`,
      sender: 'customer',
      author: 'Customer',
      body: form.description,
      createdAt: new Date().toISOString()
    }
  ]
});

function App() {
  const reducedMotion = useReducedMotion();
  const { theme, toggleTheme } = useThemeMode();
  const tokens = themeTokens[theme];
  const [view, setView] = useState<View>('dashboard');
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([]);

  const [requestView, setRequestView] = useState<RequestView>('list');
  const [requestList, setRequestList] = useState<ServiceRequest[]>([]);
  const [requestLoading, setRequestLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestPage, setRequestPage] = useState<PaginatedRequests>({ items: [], page: 1, limit: 8, total: 0, totalPages: 1 });
  const [requestFilters, setRequestFilters] = useState({ status: '' as RequestStatus | '', category: '' as RequestCategory | '', search: '', page: 1, limit: 8 });
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMessage, setDetailMessage] = useState('');
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [requestForm, setRequestForm] = useState<RequestFormState>({
    title: '',
    category: 'billing',
    priority: 'medium',
    description: ''
  });
  const [requestFormErrors, setRequestFormErrors] = useState<Partial<Record<keyof RequestFormState, string>>>({});
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [dragOrder, setDragOrder] = useState<ServiceRequest[]>([]);

  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [articleCategory, setArticleCategory] = useState<ArticleCategory | ''>('');
  const [articleQuery, setArticleQuery] = useState('');
  const debouncedArticleQuery = useDebouncedValue(articleQuery, 300);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  const [displayedArticles, setDisplayedArticles] = useState<Article[]>([]);

  const notify = (title: string, body?: string) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, title, body }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 2800);
  };

  const updateRequestInState = (updated: ServiceRequest) => {
    setRequestList((current) => current.map((request) => (request.id === updated.id ? updated : request)));
    setDragOrder((current) => current.map((request) => (request.id === updated.id ? updated : request)));
    setRecentRequests((current) => current.map((request) => (request.id === updated.id ? updated : request)));
    setSelectedRequest((current) => (current && current.id === updated.id ? updated : current));
  };

  const removeRequestFromState = (id: string) => {
    setRequestList((current) => current.filter((request) => request.id !== id));
    setDragOrder((current) => current.filter((request) => request.id !== id));
    setRecentRequests((current) => current.filter((request) => request.id !== id));
    setSelectedRequest((current) => (current && current.id === id ? null : current));
  };

  useEffect(() => {
    let cancelled = false;
    const loadDashboard = async () => {
      setDashboardLoading(true);
      setDashboardError(null);
      try {
        const [stats, recent] = await Promise.all([
          api.getDashboardStats(),
          api.listRequests({ page: 1, limit: 5 })
        ]);
        if (cancelled) return;
        setDashboardStats(stats);
        setRecentRequests(recent.items);
      } catch (error) {
        if (cancelled) return;
        setDashboardError(error instanceof Error ? error.message : 'Unable to load dashboard data');
      } finally {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      }
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadRequests = async () => {
      setRequestLoading(true);
      setRequestError(null);
      try {
        const response = await api.listRequests({
          status: requestFilters.status,
          category: requestFilters.category,
          page: requestFilters.page,
          limit: requestFilters.limit,
          search: requestFilters.search.trim()
        });
        if (cancelled) return;
        setRequestPage(response);
        setRequestList(response.items);
        setDragOrder(response.items);
        if (selectedRequestId && !response.items.some((request) => request.id === selectedRequestId)) {
          setSelectedRequestId(null);
          setSelectedRequest(null);
          setRequestView('list');
        }
      } catch (error) {
        if (cancelled) return;
        setRequestError(error instanceof Error ? error.message : 'Unable to load service requests');
      } finally {
        if (!cancelled) {
          setRequestLoading(false);
        }
      }
    };

    loadRequests();
    return () => {
      cancelled = true;
    };
  }, [requestFilters.category, requestFilters.limit, requestFilters.page, requestFilters.search, requestFilters.status, selectedRequestId]);

  useEffect(() => {
    let cancelled = false;
    const loadArticles = async () => {
      setArticlesLoading(true);
      setArticlesError(null);
      try {
        const response = await api.listArticles({
          category: articleCategory,
          q: debouncedArticleQuery.trim()
        });
        if (cancelled) return;
        setArticles(response.items);
        setDisplayedArticles(response.items);
      } catch (error) {
        if (cancelled) return;
        setArticlesError(error instanceof Error ? error.message : 'Unable to load knowledge base');
      } finally {
        if (!cancelled) {
          setArticlesLoading(false);
        }
      }
    };

    loadArticles();
    return () => {
      cancelled = true;
    };
  }, [articleCategory, debouncedArticleQuery]);

  useEffect(() => {
    if (selectedRequestId) {
      setDetailLoading(true);
      api
        .getRequest(selectedRequestId)
        .then((request) => {
          setSelectedRequest(request);
          setDetailMessage('');
        })
        .catch((error: unknown) => {
          notify('Could not open request', error instanceof Error ? error.message : 'Unknown error');
          setRequestView('list');
          setSelectedRequestId(null);
          setSelectedRequest(null);
        })
        .finally(() => setDetailLoading(false));
    }
  }, [selectedRequestId]);

  useEffect(() => {
    if (view !== 'requests') {
      setRequestView('list');
    }
  }, [view]);

  const dashboardCards = useMemo(() => {
    if (!dashboardStats) {
      return [];
    }
    return [
      { label: 'Open Requests', value: dashboardStats.summary.openRequests, suffix: '' },
      { label: 'Resolved This Month', value: dashboardStats.summary.resolvedThisMonth, suffix: '' },
      { label: 'Avg. Response Time', value: dashboardStats.summary.avgResponseHours, suffix: 'h', decimals: 1 },
      { label: 'Satisfaction Score', value: dashboardStats.summary.satisfactionScore, suffix: '', decimals: 1 }
    ];
  }, [dashboardStats]);

  const groupedArticles = useMemo(() => {
    return articleCategories
      .map((category) => ({
        category,
        items: displayedArticles.filter((article) => article.category === category)
      }))
      .filter((group) => group.items.length > 0);
  }, [displayedArticles]);

  const currentTheme = themeTokens[theme];
  const pageTransition = reducedMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 28 };
  const shellStyle = {
    backgroundColor: currentTheme.background,
    color: currentTheme.text,
    ['--panel' as never]: currentTheme.panel,
    ['--panel-strong' as never]: currentTheme.panelStrong,
    ['--text' as never]: currentTheme.text,
    ['--muted' as never]: currentTheme.muted,
    ['--border' as never]: currentTheme.border,
    ['--accent' as never]: currentTheme.accent,
    ['--accent-soft' as never]: currentTheme.accentSoft
  } as CSSProperties;

  const renderDashboard = () => (
    <PageWrapper key="dashboard">
      <motion.div className="page-grid" variants={shellVariants} initial="hidden" animate="show">
        <motion.section className="panel hero-panel" variants={sectionVariants}>
          <div className="hero-copy">
            <p className="eyebrow">Client dashboard</p>
            <h1>BizHelper Pro keeps requests, insights, and support in motion.</h1>
            <p>
              A lightweight CRM-meets-help-desk built for business owners who need a clear view of the queue without losing the human side of support.
            </p>
          </div>
          <div className="hero-actions">
            <AnimatedButton className="primary-button" onClick={() => setRequestFormOpen(true)}>
              Create new request
            </AnimatedButton>
            <AnimatedButton className="secondary-button" onClick={() => setView('requests')}>
              Open service portal
            </AnimatedButton>
          </div>
        </motion.section>

        <motion.section className="stat-grid" variants={containerVariants} initial="hidden" animate="show">
          {dashboardLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <motion.article key={index} className="panel stat-card" variants={itemVariants}>
                  <SkeletonLoader height={18} />
                  <SkeletonLoader height={42} />
                </motion.article>
              ))
            : dashboardCards.map((card) => (
                <motion.article key={card.label} className="panel stat-card" variants={itemVariants}>
                  <p>{card.label}</p>
                  <StatCount value={card.value} decimals={card.decimals ?? 0} suffix={card.suffix} reducedMotion={reducedMotion} />
                </motion.article>
              ))}
        </motion.section>

        <motion.div className="dashboard-columns" variants={shellVariants} initial="hidden" animate="show">
          <motion.section className="panel chart-panel" variants={sectionVariants}>
            <div className="panel-header">
              <div>
                <p className="eyebrow">7-day request volume</p>
                <h2>Recent demand trend</h2>
              </div>
            </div>
            {dashboardLoading ? (
              <SkeletonLoader height={250} />
            ) : dashboardStats ? (
              <motion.div initial={{ opacity: 0, scaleY: 0.96 }} animate={{ opacity: 1, scaleY: 1 }} transition={spring} style={{ transformOrigin: 'top' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboardStats.weeklyVolume} margin={{ top: 10, right: 0, bottom: 0, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatShortDate} axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(45, 212, 191, 0.08)' }}
                      contentStyle={{
                        background: currentTheme.panelStrong,
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: 18,
                        color: currentTheme.text
                      }}
                    />
                    <Bar dataKey="count" radius={[12, 12, 4, 4]} fill={currentTheme.accent} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            ) : null}
          </motion.section>

          <motion.section className="panel activity-panel" variants={sectionVariants}>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Recent activity</p>
                <h2>Last five service requests</h2>
              </div>
            </div>
            {dashboardLoading ? (
              <div className="stack">
                <SkeletonLoader />
                <SkeletonLoader />
                <SkeletonLoader />
                <SkeletonLoader />
                <SkeletonLoader />
              </div>
            ) : (
              <motion.ul className="activity-feed" variants={containerVariants} initial="hidden" animate="show">
                {recentRequests.map((request) => (
                  <motion.li key={request.id} variants={leftItemVariants}>
                    <div>
                      <strong>{request.title}</strong>
                      <span>
                        {formatDateTime(request.updatedAt)} · {formatCategory(request.category)}
                      </span>
                    </div>
                    <StatusBadge status={request.status} />
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </motion.section>
        </motion.div>

        {dashboardError ? <EmptyState title="Dashboard unavailable">{dashboardError}</EmptyState> : null}
      </motion.div>
    </PageWrapper>
  );

  const saveRequest = async () => {
    const errors = validateRequestForm(requestForm);
    setRequestFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const temp = createTempRequest(requestForm);
    setCreatingRequest(true);
    setRequestFormOpen(false);
    setRequestList((current) => [temp, ...current]);
    setDragOrder((current) => [temp, ...current]);
    setRecentRequests((current) => [temp, ...current].slice(0, 5));

    try {
      const created = await api.createRequest(requestForm);
      setRequestList((current) => current.map((request) => (request.id === temp.id ? created : request)));
      setDragOrder((current) => current.map((request) => (request.id === temp.id ? created : request)));
      setRecentRequests((current) => current.map((request) => (request.id === temp.id ? created : request)));
      notify('Request created', created.referenceId);
    } catch (error) {
      removeRequestFromState(temp.id);
      const message = error instanceof ApiError && error.details?.[0]?.error ? error.details[0].error : error instanceof Error ? error.message : 'Unable to create request';
      notify('Creation failed', message);
    } finally {
      setCreatingRequest(false);
      setRequestForm({ title: '', category: 'billing', priority: 'medium', description: '' });
      setRequestFormErrors({});
      setRequestFilters((current) => ({ ...current, page: 1 }));
    }
  };

  const submitReply = async () => {
    if (!selectedRequest || detailMessage.trim().length < 2) {
      return;
    }
    const nextMessage: Message = {
      id: crypto.randomUUID(),
      sender: 'agent',
      author: 'BizHelper Support',
      body: detailMessage.trim(),
      createdAt: new Date().toISOString()
    };
    const optimistic = {
      ...selectedRequest,
      messages: [...selectedRequest.messages, nextMessage],
      updatedAt: nextMessage.createdAt
    };
    setSelectedRequest(optimistic);
    updateRequestInState(optimistic);
    setDetailMessage('');
    try {
      const updated = await api.addMessage(selectedRequest.id, { body: nextMessage.body, sender: nextMessage.sender, author: nextMessage.author });
      updateRequestInState(updated);
      setSelectedRequest(updated);
      notify('Reply sent', 'Thread updated successfully');
    } catch (error) {
      notify('Reply failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const openRequestDetail = async (request: ServiceRequest) => {
    setRequestView('detail');
    setSelectedRequestId(request.id);
    setSelectedRequest(request);
  };

  const resolveRequest = async (request: ServiceRequest) => {
    try {
      const updated = await api.updateRequest(request.id, { status: 'resolved' });
      removeRequestFromState(request.id);
      if (selectedRequestId === request.id) {
        setSelectedRequest(updated);
      }
      notify('Request resolved', request.referenceId);
    } catch (error) {
      notify('Update failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const deleteRequestById = async (request: ServiceRequest) => {
    try {
      await api.deleteRequest(request.id);
      removeRequestFromState(request.id);
      setRequestView('list');
      setSelectedRequestId(null);
      notify('Request removed', request.referenceId);
    } catch (error) {
      notify('Delete failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const renderRequestList = () => (
    <PageWrapper key="requests">
      <motion.div className="panel request-toolbar" variants={sectionVariants} initial="hidden" animate="show">
        <div className="toolbar-copy">
          <p className="eyebrow">Service request portal</p>
          <h1>Track, search, and resolve client requests in one flow.</h1>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <AnimatedButton className="primary-button" onClick={() => setRequestFormOpen(true)}>
            New request
          </AnimatedButton>
        </motion.div>
      </motion.div>

      <motion.div className="filters-row panel" variants={sectionVariants} initial="hidden" animate="show">
        <label>
          <span>Search</span>
          <input
            value={requestFilters.search}
            onChange={(event) => setRequestFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
            placeholder="Search by title or reference ID"
          />
        </label>
        <label>
          <span>Status</span>
          <select value={requestFilters.status} onChange={(event) => setRequestFilters((current) => ({ ...current, status: event.target.value as RequestStatus | '', page: 1 }))}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label>
          <span>Category</span>
          <select value={requestFilters.category} onChange={(event) => setRequestFilters((current) => ({ ...current, category: event.target.value as RequestCategory | '', page: 1 }))}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {formatCategory(category)}
              </option>
            ))}
          </select>
        </label>
      </motion.div>

      <AnimatePresence mode="wait">
        {requestView === 'list' ? (
          <motion.section key="request-list" className="panel list-panel" variants={sectionVariants} initial="hidden" animate="show" exit="exit">
            {requestLoading ? (
              <div className="stack">
                <SkeletonLoader height={92} />
                <SkeletonLoader height={92} />
                <SkeletonLoader height={92} />
              </div>
            ) : requestError ? (
              <EmptyState title="Unable to load requests">{requestError}</EmptyState>
            ) : requestList.length === 0 ? (
              <EmptyState title="No requests match these filters">Try broadening the search or clear one of the filters.</EmptyState>
            ) : (
              <Reorder.Group axis="y" values={dragOrder} onReorder={setDragOrder} className="request-list">
                <AnimatePresence initial={false}>
                  {dragOrder.map((request) => (
                    <Reorder.Item
                      key={request.id}
                      value={request}
                      className="request-card"
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                      transition={spring}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <button className="request-card__body" onClick={() => openRequestDetail(request)}>
                        <div className="request-card__topline">
                          <div>
                            <strong>{request.title}</strong>
                            <span>{request.referenceId}</span>
                          </div>
                          <StatusBadge status={request.status} />
                        </div>
                        <p>{request.description}</p>
                        <div className="request-card__meta">
                          <span>{formatCategory(request.category)}</span>
                          <span>{formatCategory(request.priority)}</span>
                          <span>{formatDateTime(request.updatedAt)}</span>
                        </div>
                      </button>
                      <div className="request-card__actions">
                        <AnimatedButton className="ghost-button" onClick={() => resolveRequest(request)}>
                          Resolve
                        </AnimatedButton>
                        <AnimatedButton className="ghost-button danger" onClick={() => deleteRequestById(request)}>
                          Delete
                        </AnimatedButton>
                      </div>
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}
            <div className="pagination-row">
              <button className="ghost-button" disabled={requestPage.page <= 1} onClick={() => setRequestFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}>
                Previous
              </button>
              <span>
                Page {requestPage.page} of {requestPage.totalPages}
              </span>
              <button className="ghost-button" disabled={requestPage.page >= requestPage.totalPages} onClick={() => setRequestFilters((current) => ({ ...current, page: Math.min(requestPage.totalPages, current.page + 1) }))}>
                Next
              </button>
            </div>
          </motion.section>
        ) : null}

        {requestView === 'detail' && selectedRequest ? (
          <motion.section key="request-detail" className="panel detail-panel" variants={pageVariants} initial="hidden" animate="show" exit="exit">
            {detailLoading ? (
              <SkeletonLoader height={320} />
            ) : (
              <>
                <div className="detail-header">
                  <AnimatedButton className="ghost-button" onClick={() => setRequestView('list')}>
                    Back to list
                  </AnimatedButton>
                  <StatusBadge status={selectedRequest.status} />
                </div>
                <div className="detail-title">
                  <p>{selectedRequest.referenceId}</p>
                  <h2>{selectedRequest.title}</h2>
                  <span>
                    {formatCategory(selectedRequest.category)} · {formatCategory(selectedRequest.priority)} · {formatDateTime(selectedRequest.updatedAt)}
                  </span>
                </div>
                <p className="detail-description">{selectedRequest.description}</p>
                <div className="detail-actions">
                  <AnimatedButton className="primary-button" onClick={() => resolveRequest(selectedRequest)}>
                    Mark resolved
                  </AnimatedButton>
                  <AnimatedButton className="ghost-button danger" onClick={() => deleteRequestById(selectedRequest)}>
                    Delete request
                  </AnimatedButton>
                </div>

                <div className="thread-panel">
                  <h3>Thread</h3>
                  <div className="thread-list">
                    <AnimatePresence initial={false}>
                      {selectedRequest.messages.map((message) => (
                        <motion.article
                          key={message.id}
                          className={`message ${message.sender}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.18 }}
                        >
                          <div className="message__meta">
                            <strong>{message.author}</strong>
                            <span>{formatDateTime(message.createdAt)}</span>
                          </div>
                          <p>{message.body}</p>
                        </motion.article>
                      ))}
                    </AnimatePresence>
                  </div>
                  <div className="reply-box">
                    <textarea
                      value={detailMessage}
                      onChange={(event) => setDetailMessage(event.target.value)}
                      placeholder="Add a reply to the thread"
                      rows={4}
                    />
                    <AnimatedButton className="primary-button" onClick={submitReply} disabled={detailMessage.trim().length < 2}>
                      Send reply
                    </AnimatedButton>
                  </div>
                </div>
              </>
            )}
          </motion.section>
        ) : null}
      </AnimatePresence>
    </PageWrapper>
  );

  const renderKnowledge = () => (
    <PageWrapper key="knowledge">
      <motion.section className="panel request-toolbar" variants={sectionVariants} initial="hidden" animate="show">
        <div className="toolbar-copy">
          <p className="eyebrow">Knowledge base</p>
          <h1>Answers that feel immediate when the queue is moving.</h1>
        </div>
      </motion.section>

      <motion.div className="filters-row panel" variants={sectionVariants} initial="hidden" animate="show">
        <label>
          <span>Search articles</span>
          <input value={articleQuery} onChange={(event) => setArticleQuery(event.target.value)} placeholder="Search billing, onboarding, or technical help" />
        </label>
        <label>
          <span>Category</span>
          <select value={articleCategory} onChange={(event) => setArticleCategory(event.target.value as ArticleCategory | '')}>
            <option value="">All categories</option>
            {articleCategories.map((category) => (
              <option key={category} value={category}>
                {formatCategory(category)}
              </option>
            ))}
          </select>
        </label>
      </motion.div>

      {articlesLoading ? (
        <div className="stack panel">
          <SkeletonLoader height={96} />
          <SkeletonLoader height={96} />
          <SkeletonLoader height={96} />
        </div>
      ) : articlesError ? (
        <EmptyState title="Knowledge base unavailable">{articlesError}</EmptyState>
      ) : groupedArticles.length === 0 ? (
        <EmptyState title="No articles found">Try a different query or category to surface matching help articles.</EmptyState>
      ) : (
        <motion.div className="article-groups" variants={shellVariants} initial="hidden" animate="show">
          {groupedArticles.map((group) => (
            <motion.section key={group.category} className="article-group panel" variants={sectionVariants}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">{formatCategory(group.category)}</p>
                  <h2>{group.items.length} articles</h2>
                </div>
              </div>
              <motion.div className="article-list" layout variants={containerVariants} initial="hidden" animate="show">
                <AnimatePresence>
                  {group.items.map((article) => {
                    const open = expandedArticleId === article.id;
                    return (
                      <motion.article key={article.id} className="article-card" layout variants={itemVariants} exit={{ opacity: 0, y: 8, transition: { duration: 0.16 } }}>
                        <button className="article-card__trigger" onClick={() => setExpandedArticleId((current) => (current === article.id ? null : article.id))}>
                          <div>
                            <span className="article-icon">{iconByCategory[article.category]}</span>
                            <strong>{article.title}</strong>
                            <p>{article.tags.join(' · ')}</p>
                          </div>
                          <span className="article-score">
                            {article.helpfulCount} helpful · {article.notHelpfulCount} not helpful
                          </span>
                        </button>
                        <motion.div className="article-body" initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} transition={spring} style={{ overflow: 'hidden' }}>
                          <div className="article-body__inner">
                            <p>{article.body}</p>
                            <div className="feedback-row">
                              <AnimatedButton
                                className="ghost-button"
                                onClick={async () => {
                                  try {
                                    const updated = await api.sendFeedback(article.id, true);
                                    setArticles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
                                    setDisplayedArticles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
                                    notify('Feedback recorded', 'Thanks for the helpful vote');
                                  } catch (error) {
                                    notify('Could not save vote', error instanceof Error ? error.message : 'Unknown error');
                                  }
                                }}
                              >
                                Was helpful
                              </AnimatedButton>
                              <AnimatedButton
                                className="ghost-button"
                                onClick={async () => {
                                  try {
                                    const updated = await api.sendFeedback(article.id, false);
                                    setArticles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
                                    setDisplayedArticles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
                                    notify('Feedback recorded', 'Your vote has been sent');
                                  } catch (error) {
                                    notify('Could not save vote', error instanceof Error ? error.message : 'Unknown error');
                                  }
                                }}
                              >
                                Not helpful
                              </AnimatedButton>
                            </div>
                          </div>
                        </motion.div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </motion.section>
          ))}
        </motion.div>
      )}
    </PageWrapper>
  );

  return (
    <motion.div
      className="app-shell"
      style={shellStyle}
      animate={{ backgroundColor: currentTheme.background, color: currentTheme.text }}
      transition={{ duration: 0.28 }}
    >
      <motion.div className="ambient ambient-one" variants={floatVariants} initial="hidden" animate={reducedMotion ? 'show' : ['show', 'drift']} />
      <motion.div className="ambient ambient-two" variants={floatVariants} initial="hidden" animate={reducedMotion ? 'show' : ['show', 'drift']} />

      <motion.header className="topbar panel" variants={sectionVariants} initial="hidden" animate="show">
        <div>
          <p className="eyebrow">BizHelper Pro</p>
          <h2>Business productivity and support.</h2>
        </div>
        <div className="topbar-actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <nav className="nav-tabs" aria-label="Primary navigation">
            <motion.button className={view === 'dashboard' ? 'active' : ''} variants={navButtonVariants} animate={view === 'dashboard' ? 'active' : 'idle'} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => setView('dashboard')}>
              Dashboard
            </motion.button>
            <motion.button className={view === 'requests' ? 'active' : ''} variants={navButtonVariants} animate={view === 'requests' ? 'active' : 'idle'} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => setView('requests')}>
              Requests
            </motion.button>
            <motion.button className={view === 'knowledge' ? 'active' : ''} variants={navButtonVariants} animate={view === 'knowledge' ? 'active' : 'idle'} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => setView('knowledge')}>
              Knowledge Base
            </motion.button>
          </nav>
        </div>
      </motion.header>

      <main>
        <AnimatePresence mode="wait" initial={false}>
          {view === 'dashboard' ? renderDashboard() : view === 'requests' ? renderRequestList() : renderKnowledge()}
        </AnimatePresence>
      </main>

      <Modal
        open={requestFormOpen}
        onClose={() => setRequestFormOpen(false)}
        title="Create service request"
        width={760}
      >
        <div className="form-grid">
          <label>
            <span>Title</span>
            <input
              value={requestForm.title}
              onChange={(event) => {
                const next = { ...requestForm, title: event.target.value };
                setRequestForm(next);
                setRequestFormErrors(validateRequestForm(next));
              }}
              onBlur={() => setRequestFormErrors(validateRequestForm(requestForm))}
              placeholder="Short summary of the issue"
            />
            {requestFormErrors.title ? <small className="field-error">{requestFormErrors.title}</small> : null}
          </label>
          <label>
            <span>Category</span>
            <select value={requestForm.category} onChange={(event) => setRequestForm((current) => ({ ...current, category: event.target.value as RequestCategory }))}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {formatCategory(category)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Priority</span>
            <select value={requestForm.priority} onChange={(event) => setRequestForm((current) => ({ ...current, priority: event.target.value as RequestPriority }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="full-width">
            <span>Description</span>
            <textarea
              value={requestForm.description}
              onChange={(event) => {
                const next = { ...requestForm, description: event.target.value };
                setRequestForm(next);
                setRequestFormErrors(validateRequestForm(next));
              }}
              onBlur={() => setRequestFormErrors(validateRequestForm(requestForm))}
              rows={6}
              placeholder="Describe the issue clearly so the support agent can reply quickly"
            />
            {requestFormErrors.description ? <small className="field-error">{requestFormErrors.description}</small> : null}
          </label>
          <div className="attachment-placeholder full-width">
            <span>Attachment placeholder</span>
            <p>Drop files here in a future upload step. The backend slice remains focused on the request lifecycle.</p>
          </div>
        </div>
        <div className="modal-actions">
          <AnimatedButton className="ghost-button" onClick={() => setRequestFormOpen(false)}>
            Cancel
          </AnimatedButton>
          <AnimatedButton className="primary-button" onClick={saveRequest} disabled={creatingRequest}>
            {creatingRequest ? 'Saving…' : 'Create request'}
          </AnimatedButton>
        </div>
      </Modal>

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </motion.div>
  );
}

function StatCount({ value, suffix, decimals = 0, reducedMotion }: { value: number; suffix?: string; decimals?: number; reducedMotion: boolean | null }) {
  const count = useCountUp(value, reducedMotion ? 0 : 900);
  const display = decimals > 0 ? count.toFixed(decimals) : String(count);
  return (
    <motion.h3 key={display} initial={{ opacity: 0.7, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
      {display}
      {suffix}
    </motion.h3>
  );
}

export default App;
