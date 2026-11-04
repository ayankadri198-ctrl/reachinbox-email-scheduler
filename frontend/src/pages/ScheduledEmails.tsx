import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { emailApi } from '../api/client';
import { Email } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmailDetailsModal } from '../components/email/EmailDetailsModal';
import { EditScheduleModal } from '../components/email/EditScheduleModal';
import {
  Clock,
  Search,
  Filter,
  CalendarPlus,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { format } from 'date-fns';

export const ScheduledEmails: React.FC = () => {
  const navigate = useNavigate();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [inspectEmail, setInspectEmail] = useState<Email | null>(null);
  const [editingEmail, setEditingEmail] = useState<Email | null>(null);
  const [cancellingEmail, setCancellingEmail] = useState<Email | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchScheduled = async () => {
    setLoading(true);
    try {
      const res = await emailApi.getScheduled({
        page,
        limit: 10,
        search: search.trim() || undefined,
      });
      setEmails(res.data);
      if (res.meta) {
        setTotalPages(res.meta.totalPages);
        setTotalCount(res.meta.total);
      }
    } catch (err) {
      console.error('Failed to fetch scheduled emails:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduled();
    const interval = window.setInterval(fetchScheduled, 10000);
    return () => window.clearInterval(interval);
  }, [page, search]);

  const handleCancel = async () => {
    if (!cancellingEmail) return;
    setActionLoading(true);
    try {
      await emailApi.cancel(cancellingEmail.id);
      setCancellingEmail(null);
      fetchScheduled();
    } catch (err) {
      console.error('Failed to cancel scheduled email:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Scheduled Emails</span>
            <span className="px-2.5 py-0.5 text-xs font-mono font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {totalCount} Active
            </span>
          </h2>
          <p className="text-sm text-slate-400">
            Pending delayed jobs persisted in BullMQ and Redis storage
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchScheduled}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => navigate('/schedule')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white transition-all rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-glow"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Schedule New</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card p-4 border border-white/[0.07] bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute w-4 h-4 text-slate-500 -translate-y-1/2 left-3.5 top-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search recipient or subject..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-950/80 border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Showing {emails.length} of {totalCount} scheduled
        </div>
      </div>

      {/* Scheduled Emails Table / Cards */}
      <div className="glass-card overflow-hidden border border-white/[0.07] bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Recipient & Subject</th>
                <th className="py-3.5 px-6">Scheduled Dispatch</th>
                <th className="py-3.5 px-6">BullMQ Job ID</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-sm">
              {emails.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                    <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    No scheduled emails found in queue
                  </td>
                </tr>
              ) : (
                emails.map((email) => (
                  <tr
                    key={email.id}
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => setInspectEmail(email)}
                  >
                    <td className="py-4 px-6 max-w-xs">
                      <div className="font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                        {email.subject}
                      </div>
                      <div className="text-xs text-slate-400 truncate">To: {email.recipient}</div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="text-xs font-medium text-slate-200">
                        {format(new Date(email.scheduledAt), 'PPp')}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Created: {format(new Date(email.createdAt), 'MMM d, HH:mm')}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap font-mono text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        <span>{email.bullJobId?.substring(0, 10) || email.id.substring(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <StatusBadge status={email.status} size="sm" />
                    </td>
                    <td
                      className="py-4 px-6 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectEmail(email)}
                          title="Inspect Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingEmail(email)}
                          title="Edit / Reschedule"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCancellingEmail(email)}
                          title="Cancel Schedule"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] bg-slate-950/20 text-xs">
            <span className="text-slate-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancellingEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-card max-w-md w-full p-6 border border-white/10 bg-[#0e121d] rounded-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Cancel Scheduled Email?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently cancel the scheduled dispatch to{' '}
              <strong className="text-white">{cancellingEmail.recipient}</strong> and purge the
              corresponding delayed job from the BullMQ queue.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCancellingEmail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 rounded-xl bg-white/[0.05] hover:bg-white/[0.1]"
              >
                Nevermind
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-white rounded-xl bg-rose-600 hover:bg-rose-500 shadow-glow disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspection Modal */}
      <EmailDetailsModal
        email={inspectEmail}
        isOpen={!!inspectEmail}
        onClose={() => setInspectEmail(null)}
      />

      {/* Edit / Reschedule Modal */}
      <EditScheduleModal
        email={editingEmail}
        isOpen={!!editingEmail}
        onClose={() => setEditingEmail(null)}
        onSuccess={() => {
          fetchScheduled();
        }}
      />
    </div>
  );
};

