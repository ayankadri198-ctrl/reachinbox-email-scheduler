import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { emailApi } from '../api/client';
import {
  Calendar,
  Clock,
  Mail,
  Send,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Globe,
  FileText,
  Eye,
  Edit3,
} from 'lucide-react';
import { format, addMinutes, addHours, setHours, setMinutes, startOfTomorrow } from 'date-fns';

export const ScheduleEmail: React.FC = () => {
  const navigate = useNavigate();
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(
    `<h2>Hello, Amazing Person! ✨</h2>\n<p>Some moments deserve a little extra attention, and this is one of them!</p>\n<p>We believe great things start with small interactions, meaningful connections, and a little curiosity.</p>\n<p>So, here's a friendly reminder to keep exploring, keep growing, and keep making amazing things happen. 🚀</p>\n<p>Stay curious. Stay inspired. Keep shining!</p>\n<p>Warm regards,<br/>\n<strong>Team ReachInbox 💙</strong></p>`
  );

  // Default to 5 minutes in future
  const initialDate = addMinutes(new Date(), 5);
  const [date, setDate] = useState(format(initialDate, 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(initialDate, 'HH:mm'));
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [calculatedDelay, setCalculatedDelay] = useState<string>('');

  // Update calculated delay whenever date or time changes
  useEffect(() => {
    try {
      const scheduledDateTime = new Date(`${date}T${time}`);
      const diffMs = scheduledDateTime.getTime() - Date.now();

      if (isNaN(diffMs)) {
        setCalculatedDelay('');
        return;
      }

      if (diffMs <= 0) {
        setCalculatedDelay('⚠️ Selected time is in the past');
      } else {
        const diffSeconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(diffSeconds / 60);
        const seconds = diffSeconds % 60;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        let delayStr = '';
        if (hours > 0) {
          delayStr = `Will execute in ${hours} hour(s) and ${remainingMinutes} minute(s)`;
        } else if (minutes > 0) {
          delayStr = `Will execute in ${minutes} minute(s) and ${seconds} second(s)`;
        } else {
          delayStr = `Will execute in ${seconds} second(s) (BullMQ delayed job)`;
        }

        setCalculatedDelay(delayStr);
      }
    } catch {
      setCalculatedDelay('');
    }
  }, [date, time]);

  const applyPreset = (targetDate: Date) => {
    setDate(format(targetDate, 'yyyy-MM-dd'));
    setTime(format(targetDate, 'HH:mm'));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const scheduledDateTime = new Date(`${date}T${time}`);

    if (isNaN(scheduledDateTime.getTime())) {
      setError('Please select a valid scheduled date and time');
      return;
    }

    if (scheduledDateTime.getTime() <= Date.now()) {
      setError('Cannot schedule emails in the past. Please select a future date and time.');
      return;
    }

    setLoading(true);

    try {
      const res = await emailApi.schedule({
        recipient,
        subject,
        body,
        scheduledAt: scheduledDateTime.toISOString(),
        timezone,
      });

      setSuccessMessage(`Email successfully enqueued in BullMQ! (Job ID: ${res.data.bullJobId || res.data.id})`);
      setTimeout(() => {
        navigate('/scheduled');
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message || 'Failed to schedule email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Schedule New Email</h2>
          <p className="text-sm text-slate-400">
            Enqueue a persistent BullMQ delayed job backed by Redis AOF storage
          </p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 border border-white/[0.08] bg-slate-900/60 space-y-6">
        {/* Recipient */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Recipient Email Address <span className="text-purple-400">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute w-4 h-4 text-slate-500 -translate-y-1/2 left-3.5 top-1/2" />
            <input
              type="email"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. client@reachinbox.test"
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-950/80 border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Delivered via Ethereal SMTP with real-time test preview URLs generated.
          </p>
        </div>

        {/* Subject */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Subject Line <span className="text-purple-400">*</span>
            </label>
            <span className="text-[11px] font-mono text-slate-500">{subject.length} / 255</span>
          </div>
          <input
            type="text"
            required
            maxLength={255}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Welcome to ReachInbox Smart Platform"
            className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-950/80 border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Scheduling Presets & Pickers */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              Scheduling Delivery Time <span className="text-purple-400">*</span>
            </label>
            {calculatedDelay && (
              <span
                className={`text-xs font-mono font-medium ${
                  calculatedDelay.includes('past') ? 'text-rose-400' : 'text-purple-300'
                }`}
              >
                {calculatedDelay}
              </span>
            )}
          </div>

          {/* Quick timing presets */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset(addMinutes(new Date(), 1))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-colors"
            >
              ⚡ In 1 minute (Fast Demo)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(addMinutes(new Date(), 5))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition-colors"
            >
              In 5 minutes
            </button>
            <button
              type="button"
              onClick={() => applyPreset(addMinutes(new Date(), 30))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition-colors"
            >
              In 30 minutes
            </button>
            <button
              type="button"
              onClick={() => applyPreset(addHours(new Date(), 2))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition-colors"
            >
              In 2 hours
            </button>
            <button
              type="button"
              onClick={() => applyPreset(setHours(setMinutes(startOfTomorrow(), 0), 9))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition-colors"
            >
              Tomorrow 9:00 AM
            </button>
          </div>

          {/* Date, Time and Timezone Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Date</label>
              <div className="relative">
                <input
                  type="date"
                  required
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-950/80 border border-white/[0.1] text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Time (24h)</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-950/80 border border-white/[0.1] text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Timezone</label>
              <div className="relative">
                <Globe className="absolute w-3.5 h-3.5 text-slate-500 -translate-y-1/2 left-3 top-1/2" />
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-950/80 border border-white/[0.1] text-slate-300 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Email Body Composer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Email Content (HTML & Text supported) <span className="text-purple-400">*</span>
            </label>
            <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-white/[0.08] text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                  activeTab === 'write' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                Write
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                  activeTab === 'preview' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                Preview
              </button>
            </div>
          </div>

          {activeTab === 'write' ? (
            <textarea
              rows={8}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email body or paste rich HTML markup..."
              className="w-full p-4 text-sm rounded-xl bg-slate-950/80 border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
            />
          ) : (
            <div
              className="p-4 text-sm text-slate-200 rounded-xl bg-slate-950/80 border border-white/[0.1] min-h-[200px] max-h-96 overflow-y-auto font-sans leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || calculatedDelay.includes('past')}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white transition-all rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-glow disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enqueue BullMQ Delayed Job</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

