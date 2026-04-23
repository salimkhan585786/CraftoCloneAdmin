import axios from 'axios';
import Config from '../config';
import { clearAuthStorage, getAccessToken, getRefreshToken, getStoredAdmin, setAuthSession } from './authStorage';

interface RefreshResponse {
  status: boolean;
  message: string;
  data: {
    access_token: string;
    refresh_token: string;
    admin?: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  };
}

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

export const API = axios.create({
  baseURL: Config.BASE_URL,
  timeout: Config.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': Config.API_KEY,
  },
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  const existingAdmin = getStoredAdmin();

  if (!refreshToken || !existingAdmin) {
    clearAuthStorage();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = API.post<RefreshResponse>(
      '/v1/auth/refresh',
      {},
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      },
    )
      .then((response) => {
        const nextAdmin = response.data.data.admin || existingAdmin;
        setAuthSession(response.data.data.access_token, response.data.data.refresh_token, nextAdmin);
        return response.data.data.access_token;
      })
      .catch(() => {
        clearAuthStorage();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

API.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const nextAccessToken = await refreshAccessToken();

    if (!nextAccessToken) {
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
    return API(originalRequest);
  },
);
