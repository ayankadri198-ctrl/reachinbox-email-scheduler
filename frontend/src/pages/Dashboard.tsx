import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, emailApi } from '../api/client';
import { DashboardStats, ActivityDataPoint, Email } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmailDetailsModal } from '../components/email/EmailDetailsModal';
import {
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  CalendarPlus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Eye,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityDataPoint[]>([]);
  const [recentEmails, setRecentEmails] = useState<Email[]>([]);
  const [upcomingEmails, setUpcomingEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes, recentRes, scheduledRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getActivity(7),
        emailApi.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        emailApi.getScheduled({ limit: 4 }),
      ]);

      setStats(statsRes.data);
      setActivity(activityRes.data);
      setRecentEmails(recentRes.data);
      setUpcomingEmails(scheduledRes.data);
    } catch (error) {
      console.error('Failed to load dashboard telemetry:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 10 seconds to show dynamic status updates when worker delivers emails!
    const interval = window.setInterval(fetchDashboardData, 10000);
    return () => window.clearInterval(interval);
  }, []);

  const pieData = stats
    ? [
        { name: 'Sent', value: stats.sent, color: '#10B981' },
        { name: 'Scheduled', value: stats.scheduled, color: '#3B82F6' },
        { name: 'Failed', value: stats.failed, color: '#F43F5E' },
        { name: 'Cancelled', value: stats.cancelled, color: '#64748B' },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Dashboard</h2>
          <p className="text-sm text-slate-400">
            Real-time telemetry and BullMQ persistent delayed queue metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
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
            <span>Schedule Email</span>
          </button>
        </div>
      </div>

      {/* Top Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Emails */}
        <div className="glass-card p-5 border border-white/[0.07] bg-slate-900/60 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Processed
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-white">
            {stats?.total ?? 0}
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-400 gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Lifetime tracked emails</span>
          </div>
        </div>

        {/* Scheduled In Queue */}
        <div className="glass-card p-5 border border-white/[0.07] bg-slate-900/60 relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              BullMQ In Queue
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-blue-400">
            {stats?.scheduled ?? 0}
          </div>
          <div className="mt-2 flex items-center text-xs text-blue-300/80 gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>{stats?.upcoming24h ?? 0} due in next 24 hours</span>
          </div>
        </div>

        {/* Successfully Sent */}
        <div className="glass-card p-5 border border-white/[0.07] bg-slate-900/60 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Successfully Sent
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-emerald-400">
            {stats?.sent ?? 0}
          </div>
          <div className="mt-2 flex items-center text-xs text-emerald-300/80 gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{stats?.successRate ?? 100}% Delivery Success Rate</span>
          </div>
        </div>

        {/* Failed Emails */}
        <div className="glass-card p-5 border border-white/[0.07] bg-slate-900/60 relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Failed Deliveries
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-rose-400">
            {stats?.failed ?? 0}
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-400 gap-1.5">
            <span>{stats?.cancelled ?? 0} schedules cancelled</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Area Chart */}
        <div className="lg:col-span-2 glass-card p-6 border border-white/[0.07] bg-slate-900/60">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Email Dispatch Activity</h3>
              <p className="text-xs text-slate-400">7-day timeline of scheduled and sent messages</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                Scheduled
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                Delivered
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="scheduled"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorScheduled)"
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Status Distribution */}
        <div className="glass-card p-6 border border-white/[0.07] bg-slate-900/60 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Status Breakdown</h3>
            <p className="text-xs text-slate-400">Queue distribution breakdown</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center my-2">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">No emails dispatched yet</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-400">Sent:</span>
              <span className="font-bold text-white ml-auto">{stats?.sent ?? 0}</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-slate-400">Queue:</span>
              <span className="font-bold text-white ml-auto">{stats?.scheduled ?? 0}</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-400">Failed:</span>
              <span className="font-bold text-white ml-auto">{stats?.failed ?? 0}</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span className="text-slate-400">Cancelled:</span>
              <span className="font-bold text-white ml-auto">{stats?.cancelled ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming & Recent Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Scheduled Emails */}
        <div className="glass-card p-6 border border-white/[0.07] bg-slate-900/60 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-semibold text-white">Upcoming Delayed Jobs</h3>
              <p className="text-xs text-slate-400">Pending BullMQ scheduled executions</p>
            </div>
            <button
              onClick={() => navigate('/scheduled')}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 mt-4 space-y-3">
            {upcomingEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400">No scheduled emails in queue</p>
                <button
                  onClick={() => navigate('/schedule')}
                  className="mt-3 text-xs font-semibold text-purple-400 hover:underline"
                >
                  Schedule your first email &rarr;
                </button>
              </div>
            ) : (
              upcomingEmails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-all cursor-pointer group"
                >
                  <div className="space-y-1 overflow-hidden pr-3">
                    <div className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                      {email.subject}
                    </div>
                    <div className="text-xs text-slate-400 truncate">To: {email.recipient}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-mono text-purple-300">
                      {format(new Date(email.scheduledAt), 'MMM d, p')}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      BullMQ Job #{email.bullJobId?.substring(0, 8)}...
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Dispatches */}
        <div className="glass-card p-6 border border-white/[0.07] bg-slate-900/60 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-semibold text-white">Recent Activity</h3>
              <p className="text-xs text-slate-400">Latest email delivery transitions</p>
            </div>
            <button
              onClick={() => navigate('/sent')}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              Sent History <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 mt-4 space-y-3">
            {recentEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Mail className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400">No email history found</p>
              </div>
            ) : (
              recentEmails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-all cursor-pointer group"
                >
                  <div className="space-y-1 overflow-hidden pr-3">
                    <div className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                      {email.subject}
                    </div>
                    <div className="text-xs text-slate-400 truncate">To: {email.recipient}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={email.status} size="sm" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEmail(email);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Email Details Modal */}
      <EmailDetailsModal
        email={selectedEmail}
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
      />
    </div>
  );
};

