import { AxiosError } from 'axios';
import { API } from '../lib/api';
import { clearAuthStorage, getAccessToken, getStoredAdmin, setAuthSession } from '../lib/authStorage';

interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    return (error.response?.data as { message?: string } | undefined)?.message || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
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
    await API.post('/v1/auth/logout');
  } catch {
    // Clear local auth even if the remote session has already expired.
  } finally {
    clearAuthStorage();
  }
}

function isAuthenticated() {
  return Boolean(getAccessToken());
}

function getCurrentAdmin() {
  return getStoredAdmin();
}

export const authService = {
  login,
  logout,
  isAuthenticated,
  getCurrentAdmin,
};
