import { API } from '../lib/api';
import { AdminTemplateSummary, AdminUser, AnalyticsDashboard, ApiEnvelope, PaginatedResponse } from '../types';
import { getErrorMessage } from './apiHelpers';

interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
}

async function getAnalytics() {
  try {
    const response = await API.get<ApiEnvelope<AnalyticsDashboard>>('/v1/admin/analytics');
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load analytics.'));
  }
}

async function getTopTemplates(limit = 5) {
  try {
    const response = await API.get<ApiEnvelope<AdminTemplateSummary[]>>('/v1/admin/templates/top', {
      params: { limit },
    });
    return response.data.data || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load top templates.'));
  }
}

async function listUsers(params: ListUsersParams = {}) {
  try {
    const response = await API.get<ApiEnvelope<PaginatedResponse<AdminUser>>>('/v1/admin/users', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        search: params.search?.trim() || undefined,
      },
    });

    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load users.'));
  }
}

export const adminService = {
  getAnalytics,
  getTopTemplates,
  listUsers,
};
