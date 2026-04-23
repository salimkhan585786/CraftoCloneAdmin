import { API } from '../lib/api';
import { ApiEnvelope, SubscriptionPlan, SubscriptionPlanPayload, SubscriptionStatus } from '../types';
import { getErrorMessage } from './apiHelpers';

async function listPlans() {
  try {
    const response = await API.get<ApiEnvelope<SubscriptionPlan[]>>('/v1/subscriptions/plans');
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load subscription plans.'));
  }
}

async function createPlan(payload: SubscriptionPlanPayload) {
  try {
    const response = await API.post<ApiEnvelope<SubscriptionPlan>>('/v1/subscriptions/admin/plans', payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to create plan.'));
  }
}

async function updatePlan(id: string, payload: SubscriptionPlanPayload) {
  try {
    const response = await API.put<ApiEnvelope<SubscriptionPlan>>(`/v1/subscriptions/admin/plans/${id}`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update plan.'));
  }
}

async function getStatus() {
  try {
    const response = await API.get<ApiEnvelope<SubscriptionStatus>>('/v1/subscriptions/status');
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load subscription status.'));
  }
}

export const subscriptionService = {
  listPlans,
  createPlan,
  updatePlan,
  getStatus,
};
