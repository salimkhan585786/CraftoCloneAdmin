import { useSyncExternalStore } from 'react';
import { API, refreshAccessToken } from '../lib/api';
import { clearAuthStorage, getAccessToken, getStoredAdmin, hasStoredSession, setAuthSession, subscribeToAuthChanges } from '../lib/authStorage';
import { getErrorMessage } from './apiHelpers';
import { ApiEnvelope } from '../types';

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  admin: AdminProfile;
}

async function login(email: string, password: string) {
  try {
    const response = await API.post<ApiEnvelope<LoginResponse>>('/v1/auth/admin/login', { email, password });
    setAuthSession(response.data.data.access_token, response.data.data.refresh_token, response.data.data.admin);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to login.'));
  }
}

async function logout() {
  try {
    const accessToken = getAccessToken();

    if (!accessToken && hasStoredSession()) {
      const nextAccessToken = await refreshAccessToken();

      if (!nextAccessToken) {
        return;
      }
    }

    await API.post('/v1/auth/logout', {}, { skipAuthRefresh: true, skipRequestRetry: true });
  } catch {
    // Clear local auth even if the remote session has already expired.
  } finally {
    clearAuthStorage();
  }
}

function isAuthenticated() {
  return Boolean(getAccessToken() || hasStoredSession());
}

function getCurrentAdmin() {
  return getStoredAdmin();
}

async function restoreSession() {
  if (getAccessToken()) {
    return true;
  }

  if (!hasStoredSession()) {
    return false;
  }

  const nextAccessToken = await refreshAccessToken();
  return Boolean(nextAccessToken);
}

function useAuthState() {
  return useSyncExternalStore(subscribeToAuthChanges, isAuthenticated, isAuthenticated);
}

export const authService = {
  login,
  logout,
  isAuthenticated,
  getCurrentAdmin,
  restoreSession,
  useAuthState,
};
