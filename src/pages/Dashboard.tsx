import React, { useEffect, useState } from 'react';
import { ArrowRight, Clock3, Crown, Image as ImageIcon, Layers, Quote, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { adminService } from '../services/adminService';
import { subscriptionService } from '../services/subscriptionService';
import { AdminTemplateSummary, AnalyticsDashboard, SubscriptionStatus } from '../types';

const metricCards = [
  { key: 'dau', label: 'Daily Active Users', icon: Users, accent: 'bg-sky-50 text-sky-600' },
  { key: 'total_users', label: 'Total Users', icon: Users, accent: 'bg-indigo-50 text-indigo-600' },
  { key: 'total_templates', label: 'Total Templates', icon: Layers, accent: 'bg-amber-50 text-amber-600' },
  { key: 'total_quotes', label: 'Total Quotes', icon: Quote, accent: 'bg-rose-50 text-rose-600' },
  { key: 'media_generated', label: 'Media Generated', icon: Sparkles, accent: 'bg-emerald-50 text-emerald-600' },
  { key: 'pending_media_jobs', label: 'Pending Jobs', icon: Clock3, accent: 'bg-orange-50 text-orange-600' },
  { key: 'premium_subscribers', label: 'Premium Subscribers', icon: Crown, accent: 'bg-violet-50 text-violet-600' },
] as const;

const quickLinks = [
  {
    title: 'Review users',
    description: 'Search admins’ full user list and check subscription coverage.',
    to: '/users',
  },
  {
    title: 'Manage languages',
    description: 'Add supported languages for template generation and quotes.',
    to: '/languages',
  },
  {
    title: 'Edit plans',
    description: 'Create or update premium plans without leaving the admin flow.',
    to: '/subscriptions',
  },
];

function formatDate(value: string | null) {
  if (!value) {
    return 'Not active';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value);
}

function TemplateRow({ template }: { template: AdminTemplateSummary }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
      <img
        src={template.thumbnail_url}
        alt={template.name}
        className="h-16 w-16 rounded-2xl object-cover border border-zinc-200 bg-white"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-zinc-900 truncate">{template.name}</h3>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-500 border border-zinc-200">
            {template.type}
          </span>
          {template.is_premium && (
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
              Premium
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500 mt-1">{template.category?.name || 'Uncategorized'}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-zinc-900">{formatNumber(template.usage_count)}</p>
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Uses</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [topTemplates, setTopTemplates] = useState<AdminTemplateSummary[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setError('');

        const [analyticsData, topTemplatesData, statusData] = await Promise.all([
          adminService.getAnalytics(),
          adminService.getTopTemplates(5),
          subscriptionService.getStatus(),
        ]);

        setAnalytics(analyticsData);
        setTopTemplates(topTemplatesData);
        setStatus(statusData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-zinc-200 bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 px-8 py-8 text-white shadow-xl shadow-zinc-200">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-200">Admin overview</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Crafto performance at a glance</h1>
            <p className="mt-3 text-sm text-zinc-300">
              Core analytics, template momentum, and subscription health now live in one dashboard.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Current subscription status</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="rounded-2xl bg-violet-500/15 p-3 text-violet-200">
                <Crown size={20} />
              </div>
              <div>
                <p className="text-lg font-semibold">{status?.plan_type || 'Loading...'}</p>
                <p className="text-sm text-zinc-300">
                  {status?.is_active ? `Active until ${formatDate(status.expires_at)}` : 'Currently inactive'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card, index) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500">{card.label}</p>
                <p className="mt-3 text-3xl font-bold text-zinc-950">
                  {isLoading || !analytics ? '...' : formatNumber(analytics[card.key] as number)}
                </p>
              </div>
              <div className={`rounded-2xl p-3 ${card.accent}`}>
                <card.icon size={20} />
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Top templates</h2>
              <p className="mt-1 text-sm text-zinc-500">Pulled from the dedicated usage ranking endpoint.</p>
            </div>
            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {topTemplates.length} entries
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {(topTemplates.length ? topTemplates : analytics?.top_templates || []).map((template) => (
              <TemplateRow key={template.id} template={template} />
            ))}

            {!isLoading && topTemplates.length === 0 && !(analytics?.top_templates.length) && (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
                No template usage data is available yet.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <ImageIcon size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Generation pipeline</h2>
                <p className="text-sm text-zinc-500">Monitor output volume and backlog.</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-zinc-50 p-4 border border-zinc-200">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Generated</p>
                <p className="mt-2 text-2xl font-bold text-zinc-950">
                  {analytics ? formatNumber(analytics.media_generated) : '...'}
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4 border border-zinc-200">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Pending</p>
                <p className="mt-2 text-2xl font-bold text-zinc-950">
                  {analytics ? formatNumber(analytics.pending_media_jobs) : '...'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900">Quick actions</h2>
            <div className="mt-5 space-y-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 px-4 py-4 transition-all hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <div>
                    <p className="font-semibold text-zinc-900">{item.title}</p>
                    <p className="mt-1 text-sm text-zinc-500">{item.description}</p>
                  </div>
                  <ArrowRight className="shrink-0 text-zinc-400" size={18} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
