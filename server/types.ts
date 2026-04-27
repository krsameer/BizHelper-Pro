export type RequestCategory = 'billing' | 'onboarding' | 'technical' | 'account';
export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RequestStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type ArticleCategory = 'billing' | 'onboarding' | 'technical' | 'account';

export interface Message {
  id: string;
  sender: 'customer' | 'agent';
  author: string;
  body: string;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  referenceId: string;
  title: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface Article {
  id: string;
  title: string;
  category: ArticleCategory;
  body: string;
  tags: string[];
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
}

export interface DashboardStats {
  summary: {
    openRequests: number;
    resolvedThisMonth: number;
    avgResponseHours: number;
    satisfactionScore: number;
  };
  weeklyVolume: Array<{ date: string; count: number }>;
}
