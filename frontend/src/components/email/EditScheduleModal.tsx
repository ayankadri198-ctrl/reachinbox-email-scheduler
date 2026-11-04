import React, { useState, useEffect } from 'react';
import { Email } from '../../types';
import { emailApi } from '../../api/client';
import { X, Calendar, Clock, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface EditScheduleModalProps {
  email: Email | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  email,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (email) {
      setRecipient(email.recipient);
      setSubject(email.subject);
      setBody(email.body);
      try {
        const d = new Date(email.scheduledAt);
        setDate(format(d, 'yyyy-MM-dd'));
        setTime(format(d, 'HH:mm'));
      } catch {
        setDate('');
        setTime('');
      }
      setError(null);
    }
  }, [email]);

  if (!isOpen || !email) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const scheduledDateTime = new Date(`${date}T${time}`);
    if (isNaN(scheduledDateTime.getTime())) {
      setError('Please choose a valid date and time');
      return;
    }

    if (scheduledDateTime.getTime() <= Date.now()) {
      setError('Scheduled time must be in the future');
      return;
    }

    setLoading(true);
    try {
      await emailApi.update(email.id, {
        recipient,
        subject,
        body,
        scheduledAt: scheduledDateTime.toISOString(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update scheduled email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl overflow-hidden glass-card border border-white/10 bg-[#0d111c] shadow-2xl rounded-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-900/40">
          <div>
            <h3 className="text-base font-semibold text-white">Edit Scheduled Email</h3>
            <p className="text-xs text-slate-400">Safely recalculate and update BullMQ delayed queue job</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 text-xs text-rose-300 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Recipient Email</label>
            <input
              type="email"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-900/80 border border-white/[0.1] text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-900/80 border border-white/[0.1] text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-900/80 border border-white/[0.1] text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-900/80 border border-white/[0.1] text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Message Body</label>
            <textarea
              rows={5}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-900/80 border border-white/[0.1] text-white focus:outline-none focus:border-purple-500 font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 transition-colors rounded-xl bg-white/[0.05] hover:bg-white/[0.1]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white transition-all rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save & Reschedule Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

