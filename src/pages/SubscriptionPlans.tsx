import React, { useEffect, useMemo, useState } from 'react';
import { Crown, PencilLine, Plus, ShieldCheck } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { SubscriptionPlan, SubscriptionPlanPayload, SubscriptionStatus } from '../types';

const emptyForm: SubscriptionPlanPayload = {
  name: '',
  plan_type: 'PREMIUM',
  price_inr: 0,
  duration_days: 30,
  description: '',
  features: [],
};

function formatDate(value: string | null) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [form, setForm] = useState<SubscriptionPlanPayload>(emptyForm);
  const [featuresInput, setFeaturesInput] = useState('');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSubscriptionData = async () => {
      try {
        setIsLoading(true);
        setError('');
        const [plansData, statusData] = await Promise.all([
          subscriptionService.listPlans(),
          subscriptionService.getStatus(),
        ]);
        setPlans(plansData);
        setStatus(statusData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load subscription data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionData();
  }, []);

  const primaryPlanCount = useMemo(
    () => plans.filter((plan) => plan.plan_type === 'PREMIUM' && plan.is_active).length,
    [plans],
  );

  const resetForm = () => {
    setForm(emptyForm);
    setFeaturesInput('');
    setEditingPlanId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.description.trim()) {
      setError('Plan name and description are required.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        features: featuresInput
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      };

      if (editingPlanId) {
        const updatedPlan = await subscriptionService.updatePlan(editingPlanId, payload);
        setPlans((current) => current.map((plan) => (plan.id === editingPlanId ? updatedPlan : plan)));
      } else {
        const createdPlan = await subscriptionService.createPlan(payload);
        setPlans((current) => [createdPlan, ...current]);
      }

      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlanId(plan.id);
    setForm({
      name: plan.name,
      plan_type: plan.plan_type,
      price_inr: Number(plan.price_inr),
      duration_days: plan.duration_days,
      description: plan.description,
      features: plan.features,
    });
    setFeaturesInput(plan.features.join('\n'));
    setError('');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Subscription plans</h1>
          <p className="mt-1 text-zinc-500">Create and update pricing plans while keeping the current status visible.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Current status</p>
            <p className="mt-2 text-lg font-bold text-zinc-900">{status?.plan_type || '...'}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Active premium plans</p>
            <p className="mt-2 text-lg font-bold text-zinc-900">{primaryPlanCount}</p>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_1.2fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
              {editingPlanId ? <PencilLine size={20} /> : <Plus size={20} />}
            </div>
            <div>
              <h2 className="font-bold text-zinc-900">{editingPlanId ? 'Update plan' : 'Create plan'}</h2>
              <p className="text-sm text-zinc-500">Use one feature per line to keep the payload clean.</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <input
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              placeholder="Plan name"
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <select
                value={form.plan_type}
                onChange={(e) => setForm((current) => ({ ...current, plan_type: e.target.value }))}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              >
                <option value="FREE">FREE</option>
                <option value="PREMIUM">PREMIUM</option>
              </select>
              <input
                type="number"
                min="0"
                value={form.price_inr}
                onChange={(e) => setForm((current) => ({ ...current, price_inr: Number(e.target.value) }))}
                placeholder="Price in INR"
                className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              />
              <input
                type="number"
                min="1"
                value={form.duration_days}
                onChange={(e) => setForm((current) => ({ ...current, duration_days: Number(e.target.value) }))}
                placeholder="Duration in days"
                className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>

            <textarea
              value={form.description}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              placeholder="Plan description"
              rows={4}
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
            />

            <textarea
              value={featuresInput}
              onChange={(e) => setFeaturesInput(e.target.value)}
              placeholder={'Unlimited templates\nNo watermark\nPriority support'}
              rows={6}
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-2xl bg-zinc-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : editingPlanId ? 'Update plan' : 'Create plan'}
            </button>

            {editingPlanId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-zinc-200 px-5 py-3 font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="space-y-5">
          <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-violet-950 via-zinc-900 to-indigo-950 p-6 text-white shadow-xl shadow-zinc-200">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3 text-violet-200">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="font-bold">Subscription status</h2>
                <p className="text-sm text-zinc-300">Fetched from `/v1/subscriptions/status`.</p>
              </div>
            </div>
            <p className="mt-6 text-3xl font-bold">{status?.plan_type || 'Loading...'}</p>
            <p className="mt-2 text-sm text-zinc-300">
              {status?.is_active ? `Active until ${formatDate(status.expires_at)}` : 'Inactive subscription state'}
            </p>
          </div>

          <div className="space-y-4">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-zinc-900">{plan.name}</h3>
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                        {plan.plan_type}
                      </span>
                      {!plan.is_active && (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">{plan.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEdit(plan)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    <PencilLine size={16} />
                    Edit
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-zinc-50 p-3 border border-zinc-200">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Price</p>
                    <p className="mt-2 font-bold text-zinc-900">Rs. {plan.price_inr}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-3 border border-zinc-200">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Duration</p>
                    <p className="mt-2 font-bold text-zinc-900">{plan.duration_days} days</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-3 border border-zinc-200">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Created</p>
                    <p className="mt-2 font-bold text-zinc-900">{formatDate(plan.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {plan.features.map((feature) => (
                    <span key={feature} className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {!isLoading && plans.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
                No plans found yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
