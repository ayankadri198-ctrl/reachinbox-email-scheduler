import React from 'react';
import { Email } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import {
  X,
  Calendar,
  Clock,
  Mail,
  User,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  Hash,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { format } from 'date-fns';

interface EmailDetailsModalProps {
  email: Email | null;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: (id: string) => void;
}

export const EmailDetailsModal: React.FC<EmailDetailsModalProps> = ({
  email,
  isOpen,
  onClose,
  onRetry,
}) => {
  if (!isOpen || !email) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl overflow-hidden glass-card border border-white/10 bg-[#0d111c] shadow-2xl rounded-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Email Inspection</h3>
              <p className="text-xs text-slate-400">BullMQ delayed job & delivery telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Top Banner Status */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-white/[0.06]">
            <div>
              <div className="text-xs font-medium text-slate-400">Current Lifecycle Status</div>
              <div className="mt-1">
                <StatusBadge status={email.status} size="md" />
              </div>
            </div>
            {email.previewUrl && (
              <a
                href={email.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View in Ethereal Mail
              </a>
            )}
            {email.status === 'FAILED' && onRetry && (
              <button
                onClick={() => onRetry(email.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry Delivery Now
              </button>
            )}
          </div>

          {/* Meta Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>Recipient</span>
              </div>
              <div className="text-sm font-medium text-slate-200 break-all">{email.recipient}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Hash className="w-3.5 h-3.5 text-blue-400" />
                <span>BullMQ Job ID</span>
              </div>
              <div className="text-xs font-mono text-slate-300 break-all">
                {email.bullJobId || email.id}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Scheduled Time</span>
              </div>
              <div className="text-sm font-medium text-slate-200">
                {format(new Date(email.scheduledAt), 'PPpp')}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Actual Sent Time</span>
              </div>
              <div className="text-sm font-medium text-slate-200">
                {email.sentAt ? format(new Date(email.sentAt), 'PPpp') : 'Pending delivery'}
              </div>
            </div>
          </div>

          {/* Error Message if Failed */}
          {email.errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                Error Telemetry
              </div>
              <p className="text-xs font-mono leading-relaxed">{email.errorMessage}</p>
              <div className="text-[11px] text-rose-400/80">
                Delivery attempts made: {email.attempts} / 3
              </div>
            </div>
          )}

          {/* Subject Line */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Subject Line
            </label>
            <div className="p-3 text-sm font-medium text-white rounded-xl bg-white/[0.03] border border-white/[0.08]">
              {email.subject}
            </div>
          </div>

          {/* Email Body Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Message Body Preview
            </label>
            <div
              className="p-4 text-sm text-slate-200 rounded-xl bg-slate-950/80 border border-white/[0.08] max-h-56 overflow-y-auto font-sans leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: email.body }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-white/[0.08] bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 transition-colors rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

