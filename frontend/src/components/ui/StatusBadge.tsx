import React from 'react';
import { EmailStatus } from '../../types';
import { Clock, Send, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: EmailStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case 'SCHEDULED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 ${sizeClasses}`}
        >
          <Clock className="w-3.5 h-3.5" />
          Scheduled
        </span>
      );
    case 'PROCESSING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 ${sizeClasses}`}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Processing
        </span>
      );
    case 'SENT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${sizeClasses}`}
        >
          <Send className="w-3.5 h-3.5" />
          Sent
        </span>
      );
    case 'FAILED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 ${sizeClasses}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Failed
        </span>
      );
    case 'CANCELLED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 ${sizeClasses}`}
        >
          <XCircle className="w-3.5 h-3.5" />
          Cancelled
        </span>
      );
    default:
      return null;
  }
};

