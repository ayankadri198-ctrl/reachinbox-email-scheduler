export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Email {
  id: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  bullJobId: string | null;
  attempts: number;
  errorMessage: string | null;
  previewUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  total: number;
  scheduled: number;
  sent: number;
  failed: number;
  cancelled: number;
  successRate: number;
  upcoming24h: number;
}

export interface ActivityDataPoint {
  date: string;
  isoDate: string;
  scheduled: number;
  sent: number;
  failed: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  errors?: any;
}

