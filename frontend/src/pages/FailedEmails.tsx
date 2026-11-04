import React, { useState, useEffect } from 'react';
import { emailApi } from '../api/client';
import { Email } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmailDetailsModal } from '../components/email/EmailDetailsModal';
import {
  AlertTriangle,
  RotateCcw,
  Search,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

export const FailedEmails: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchFailed = async () => {
    setLoading(true);
    try {
      const res = await emailApi.getFailed({
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
      console.error('Failed to fetch failed emails:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailed();
  }, [page, search]);

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await emailApi.retry(id);
      fetchFailed();
      setSelectedEmail(null);
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Failed Deliveries</span>
            <span className="px-2.5 py-0.5 text-xs font-mono font-medium rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {totalCount} Issues
            </span>
          </h2>
          <p className="text-sm text-slate-400">
            Messages that exceeded the 3 BullMQ retry attempts or suffered SMTP transport faults
          </p>
        </div>

        <button
          onClick={fetchFailed}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </button>
      </div>

      {/* Search Bar */}
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
            placeholder="Search failed emails..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-950/80 border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Showing {emails.length} of {totalCount} records
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden border border-white/[0.07] bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Recipient & Subject</th>
                <th className="py-3.5 px-6">Error Reason</th>
                <th className="py-3.5 px-6">Attempts</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-sm">
              {emails.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                    <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    No delivery failures recorded. All emails processed cleanly!
                  </td>
                </tr>
              ) : (
                emails.map((email) => (
                  <tr
                    key={email.id}
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => setSelectedEmail(email)}
                  >
                    <td className="py-4 px-6 max-w-xs">
                      <div className="font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                        {email.subject}
                      </div>
                      <div className="text-xs text-slate-400 truncate">To: {email.recipient}</div>
                    </td>
                    <td className="py-4 px-6 max-w-md">
                      <div className="text-xs font-mono text-rose-400 truncate flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{email.errorMessage || 'Unknown delivery failure'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap font-mono text-xs text-slate-300">
                      {email.attempts} / 3 attempts
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <StatusBadge status={email.status} size="sm" />
                    </td>
                    <td
                      className="py-4 px-6 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRetry(email.id)}
                          disabled={retryingId === email.id}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3 h-3 ${retryingId === email.id ? 'animate-spin' : ''}`} />
                          <span>Retry</span>
                        </button>
                        <button
                          onClick={() => setSelectedEmail(email)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08]"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* Details modal */}
      <EmailDetailsModal
        email={selectedEmail}
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        onRetry={handleRetry}
      />
    </div>
  );
};

