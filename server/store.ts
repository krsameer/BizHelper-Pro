import { randomUUID } from 'node:crypto';
import type {
  Article,
  ArticleCategory,
  DashboardStats,
  Message,
  RequestCategory,
  RequestPriority,
  RequestStatus,
  ServiceRequest
} from './types';

const now = () => new Date();
const iso = (date: Date) => date.toISOString();
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const makeMessage = (sender: Message['sender'], author: string, body: string, createdAt: Date): Message => ({
  id: randomUUID(),
  sender,
  author,
  body,
  createdAt: iso(createdAt)
});

const makeRequest = (input: {
  referenceId: string;
  title: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  description: string;
  createdAt: Date;
  responseHours?: number;
  extraMessages?: Array<{ sender: Message['sender']; author: string; body: string; offsetHours: number }>;
}): ServiceRequest => {
  const messages: Message[] = [
    makeMessage('customer', 'Customer', input.description, input.createdAt)
  ];

  if (typeof input.responseHours === 'number') {
    messages.push(
      makeMessage(
        'agent',
        'BizHelper Support',
        'Thanks for the details. We are reviewing this and will update you shortly.',
        hoursAgo(Math.max(0, Math.round((Date.now() - input.createdAt.getTime()) / (60 * 60 * 1000)) - input.responseHours))
      )
    );
  }

  for (const extra of input.extraMessages ?? []) {
    messages.push(
      makeMessage(extra.sender, extra.author, extra.body, new Date(input.createdAt.getTime() + extra.offsetHours * 60 * 60 * 1000))
    );
  }

  return {
    id: randomUUID(),
    referenceId: input.referenceId,
    title: input.title,
    category: input.category,
    priority: input.priority,
    status: input.status,
    description: input.description,
    createdAt: iso(input.createdAt),
    updatedAt: iso(new Date(messages[messages.length - 1]?.createdAt ?? input.createdAt)),
    messages
  };
};

export const requests: ServiceRequest[] = [
  makeRequest({
    referenceId: 'BH-1001',
    title: 'Payment failed on the latest invoice',
    category: 'billing',
    priority: 'high',
    status: 'open',
    description: 'The customer reports that the latest invoice payment fails immediately after card submission.',
    createdAt: daysAgo(1),
    responseHours: 2,
    extraMessages: [
      {
        sender: 'customer',
        author: 'Alyssa',
        body: 'I confirmed the card is active and the bank has not flagged it.',
        offsetHours: 4
      }
    ]
  }),
  makeRequest({
    referenceId: 'BH-1002',
    title: 'Need onboarding help for new teammate',
    category: 'onboarding',
    priority: 'medium',
    status: 'pending',
    description: 'A new teammate needs access and a quick walkthrough for the dashboard setup.',
    createdAt: daysAgo(3),
    responseHours: 1.5,
    extraMessages: [
      {
        sender: 'customer',
        author: 'Daniel',
        body: 'I am trying to get her set up before Monday morning.',
        offsetHours: 2
      }
    ]
  }),
  makeRequest({
    referenceId: 'BH-1003',
    title: 'SSL certificate warning on checkout page',
    category: 'technical',
    priority: 'urgent',
    status: 'resolved',
    description: 'Browsers are showing a mixed-content warning on the checkout page after the latest deploy.',
    createdAt: daysAgo(12),
    responseHours: 5,
    extraMessages: [
      {
        sender: 'customer',
        author: 'Rina',
        body: 'The issue appears on both Chrome and Safari.',
        offsetHours: 1
      },
      {
        sender: 'agent',
        author: 'Maya',
        body: 'The asset URL was updated and the warning is cleared. Please retest when you can.',
        offsetHours: 8
      }
    ]
  }),
  makeRequest({
    referenceId: 'BH-1004',
    title: 'Update account email address',
    category: 'account',
    priority: 'low',
    status: 'closed',
    description: 'The customer wants their account email changed to a new business address.',
    createdAt: daysAgo(20),
    responseHours: 3,
    extraMessages: [
      {
        sender: 'customer',
        author: 'Marco',
        body: 'I can verify ownership if needed.',
        offsetHours: 2
      },
      {
        sender: 'agent',
        author: 'Jordan',
        body: 'The email has been updated and confirmation was sent to the new address.',
        offsetHours: 7
      }
    ]
  }),
  makeRequest({
    referenceId: 'BH-1005',
    title: 'Refund request after duplicate charge',
    category: 'billing',
    priority: 'urgent',
    status: 'open',
    description: 'A duplicate charge was recorded and the customer is requesting a refund confirmation.',
    createdAt: daysAgo(2),
    responseHours: 0.75,
    extraMessages: [
      {
        sender: 'customer',
        author: 'Jade',
        body: 'I only saw one successful receipt in my inbox.',
        offsetHours: 1
      }
    ]
  }),
  makeRequest({
    referenceId: 'BH-1006',
    title: 'Invite access for external contractor',
    category: 'onboarding',
    priority: 'medium',
    status: 'pending',
    description: 'The customer needs a short-term contractor added with limited project access.',
    createdAt: daysAgo(7),
    responseHours: 6,
    extraMessages: [
      {
        sender: 'agent',
        author: 'BizHelper Support',
        body: 'We can support that. Please confirm the contractor email and role.',
        offsetHours: 8
      }
    ]
  }),
  makeRequest({
    referenceId: 'BH-1007',
    title: 'API key returns 401 on staging',
    category: 'technical',
    priority: 'high',
    status: 'resolved',
    description: 'The team is seeing unauthorized responses when testing the API in staging.',
    createdAt: daysAgo(4),
    responseHours: 4,
    extraMessages: [
      {
        sender: 'customer',
        author: 'Priya',
        body: 'This only happens from the staging environment.',
        offsetHours: 2
      },
      {
        sender: 'agent',
        author: 'Maya',
        body: 'The new key has been whitelisted and the endpoint is working again.',
        offsetHours: 9
      }
    ]
  }),
  makeRequest({
    referenceId: 'BH-1008',
    title: 'Need to downgrade subscription plan',
    category: 'billing',
    priority: 'medium',
    status: 'open',
    description: 'The owner wants to move from the growth plan to the starter plan immediately.',
    createdAt: hoursAgo(6),
    responseHours: 1,
    extraMessages: [
      {
        sender: 'customer',
        author: 'Noah',
        body: 'Can the downgrade happen without losing invoices?',
        offsetHours: 1
      }
    ]
  })
];

export const articles: Article[] = [
  {
    id: randomUUID(),
    title: 'How billing refunds are processed',
    category: 'billing',
    body: 'Refunds are reviewed in the order they arrive. Approved refunds are posted back to the original payment method within 3 to 5 business days. If a duplicate charge is suspected, attach the invoice number and payment receipt to speed up the review.',
    tags: ['refunds', 'payments', 'invoices'],
    helpfulCount: 34,
    notHelpfulCount: 3,
    createdAt: iso(daysAgo(18))
  },
  {
    id: randomUUID(),
    title: 'Updating payment methods safely',
    category: 'billing',
    body: 'Open Billing Settings, choose Payment Methods, and replace the default card. If a charge is already pending, the old card may still appear on the invoice until settlement is complete. Always confirm the new card is set as primary before the next billing cycle.',
    tags: ['cards', 'billing settings', 'checkout'],
    helpfulCount: 27,
    notHelpfulCount: 2,
    createdAt: iso(daysAgo(14))
  },
  {
    id: randomUUID(),
    title: 'Onboarding checklist for new teammates',
    category: 'onboarding',
    body: 'Invite the teammate, assign a role, confirm workspace access, and send the welcome note. The checklist also includes a first-run tour and a recommended support contact so the user knows where to ask questions.',
    tags: ['setup', 'team', 'access'],
    helpfulCount: 41,
    notHelpfulCount: 4,
    createdAt: iso(daysAgo(12))
  },
  {
    id: randomUUID(),
    title: 'What to do when email invites do not arrive',
    category: 'onboarding',
    body: 'Check spam filters, confirm the domain allows incoming invites, and resend the invitation from the team management panel. If the recipient uses a forwarding alias, send the invite to their direct inbox first.',
    tags: ['invites', 'email', 'team'],
    helpfulCount: 29,
    notHelpfulCount: 1,
    createdAt: iso(daysAgo(9))
  },
  {
    id: randomUUID(),
    title: 'Fixing common API authentication issues',
    category: 'technical',
    body: 'Verify that the X-API-Key header is present, the value is current, and the request is hitting the correct environment. If a 401 persists, regenerate local credentials and test from a clean browser session before escalating.',
    tags: ['api', 'auth', '401'],
    helpfulCount: 52,
    notHelpfulCount: 5,
    createdAt: iso(daysAgo(16))
  },
  {
    id: randomUUID(),
    title: 'Why charts may load slowly on older devices',
    category: 'technical',
    body: 'Large DOM trees and frequent re-renders can slow down animated dashboards. Prefer motion values for highly dynamic numbers, keep list changes keyed, and avoid forcing layout on every scroll tick.',
    tags: ['performance', 'charts', 'motion'],
    helpfulCount: 22,
    notHelpfulCount: 3,
    createdAt: iso(daysAgo(8))
  },
  {
    id: randomUUID(),
    title: 'Managing account ownership changes',
    category: 'account',
    body: 'The current owner must approve the transfer. Once accepted, the new owner receives full billing and admin access while previous owner permissions are removed to prevent conflicts.',
    tags: ['ownership', 'permissions', 'admin'],
    helpfulCount: 38,
    notHelpfulCount: 2,
    createdAt: iso(daysAgo(20))
  },
  {
    id: randomUUID(),
    title: 'Resetting a locked support login',
    category: 'account',
    body: 'After three failed sign-ins, the account locks briefly for security. Use the reset link to regain access, then verify that the email provider is not delaying the reset message.',
    tags: ['login', 'security', 'reset'],
    helpfulCount: 19,
    notHelpfulCount: 1,
    createdAt: iso(daysAgo(6))
  }
];

const parseTime = (value: string) => new Date(value).getTime();

const sameMonth = (date: Date, baseline: Date) =>
  date.getFullYear() === baseline.getFullYear() && date.getMonth() === baseline.getMonth();

const getFirstAgentResponseHours = (request: ServiceRequest) => {
  const createdAt = new Date(request.createdAt).getTime();
  const reply = request.messages.find((message) => message.sender === 'agent');
  if (!reply) {
    return null;
  }
  return (parseTime(reply.createdAt) - createdAt) / (60 * 60 * 1000);
};

export const listRequests = (filters: {
  status?: RequestStatus;
  category?: RequestCategory;
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.max(1, Math.min(50, filters.limit ?? 10));
  const search = (filters.search ?? '').trim().toLowerCase();

  const filtered = requests
    .filter((request) => (filters.status ? request.status === filters.status : true))
    .filter((request) => (filters.category ? request.category === filters.category : true))
    .filter((request) => {
      if (!search) {
        return true;
      }
      return request.title.toLowerCase().includes(search) || request.referenceId.toLowerCase().includes(search);
    })
    .sort((left, right) => parseTime(right.updatedAt) - parseTime(left.updatedAt));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const items = filtered.slice((page - 1) * limit, (page - 1) * limit + limit);

  return { items, page, limit, total, totalPages };
};

export const getRequest = (id: string) => requests.find((request) => request.id === id || request.referenceId === id);

export const createRequest = (input: {
  title: string;
  category: RequestCategory;
  priority: RequestPriority;
  description: string;
}) => {
  const index = requests.length + 1001;
  const createdAt = now();
  const request: ServiceRequest = {
    id: randomUUID(),
    referenceId: `BH-${index}`,
    title: input.title,
    category: input.category,
    priority: input.priority,
    status: 'open',
    description: input.description,
    createdAt: iso(createdAt),
    updatedAt: iso(createdAt),
    messages: [makeMessage('customer', 'Customer', input.description, createdAt)]
  };

  requests.unshift(request);
  return request;
};

export const updateRequest = (
  id: string,
  input: Partial<Pick<ServiceRequest, 'title' | 'category' | 'priority' | 'status' | 'description'>>
) => {
  const request = getRequest(id);
  if (!request) {
    return null;
  }

  Object.assign(request, input, { updatedAt: iso(now()) });
  return request;
};

export const deleteRequest = (id: string) => {
  const index = requests.findIndex((request) => request.id === id || request.referenceId === id);
  if (index < 0) {
    return false;
  }
  requests.splice(index, 1);
  return true;
};

export const addRequestMessage = (id: string, input: { body: string; sender?: Message['sender']; author?: string }) => {
  const request = getRequest(id);
  if (!request) {
    return null;
  }

  const message: Message = makeMessage(input.sender ?? 'agent', input.author ?? 'BizHelper Support', input.body, now());
  request.messages.push(message);
  request.updatedAt = message.createdAt;
  return request;
};

export const listArticles = (filters: { category?: ArticleCategory; q?: string }) => {
  const q = (filters.q ?? '').trim().toLowerCase();
  return articles.filter((article) => {
    const categoryMatch = filters.category ? article.category === filters.category : true;
    const queryMatch = q
      ? article.title.toLowerCase().includes(q) || article.body.toLowerCase().includes(q) || article.tags.some((tag) => tag.toLowerCase().includes(q))
      : true;
    return categoryMatch && queryMatch;
  });
};

export const getArticle = (id: string) => articles.find((article) => article.id === id);

export const voteArticle = (id: string, helpful: boolean) => {
  const article = getArticle(id);
  if (!article) {
    return null;
  }
  if (helpful) {
    article.helpfulCount += 1;
  } else {
    article.notHelpfulCount += 1;
  }
  return article;
};

export const getDashboardStats = (): DashboardStats => {
  const baseline = now();
  const openRequests = requests.filter((request) => request.status === 'open' || request.status === 'pending').length;
  const resolvedThisMonth = requests.filter((request) => request.status === 'resolved' && sameMonth(new Date(request.updatedAt), baseline)).length;
  const responseTimes = requests.map(getFirstAgentResponseHours).filter((value): value is number => typeof value === 'number');
  const avgResponseHours = responseTimes.length ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length : 0;
  const resolutionRate = requests.length ? requests.filter((request) => request.status === 'resolved' || request.status === 'closed').length / requests.length : 0;
  const satisfactionScore = Math.max(
    1,
    Math.min(5, Number((4.1 + resolutionRate * 0.7 - Math.min(avgResponseHours / 24, 0.8) * 0.6).toFixed(1)))
  );

  const weeklyVolume = Array.from({ length: 7 }, (_, offset) => {
    const date = startOfDay(new Date(baseline.getTime() - (6 - offset) * 24 * 60 * 60 * 1000));
    const count = requests.filter((request) => {
      const created = new Date(request.createdAt);
      return startOfDay(created).getTime() === date.getTime();
    }).length;

    return {
      date: iso(date).slice(0, 10),
      count
    };
  });

  return {
    summary: {
      openRequests,
      resolvedThisMonth,
      avgResponseHours: Number(avgResponseHours.toFixed(1)),
      satisfactionScore
    },
    weeklyVolume
  };
};
