import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
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
  export interface AxiosRequestConfig {
    _retry?: boolean;
    _retryCount?: number;
    skipAuthRefresh?: boolean;
    skipRequestRetry?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
    _retryCount?: number;
    skipAuthRefresh?: boolean;
    skipRequestRetry?: boolean;
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
const MAX_REQUEST_RETRIES = 2;
const RETRY_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

function isRefreshRequest(config?: InternalAxiosRequestConfig) {
  return config?.url?.includes('/v1/auth/refresh');
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function shouldRetryRequest(error: AxiosError) {
  const config = error.config;

  if (!config || config.skipRequestRetry || isRefreshRequest(config)) {
    return false;
  }

  if (config.method?.toLowerCase() === 'post') {
    return false;
  }

  if (error.code === 'ECONNABORTED' || !error.response) {
    return true;
  }

  return RETRY_STATUS_CODES.has(error.response.status);
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  const existingAdmin = getStoredAdmin();

  if (!refreshToken || !existingAdmin) {
    clearAuthStorage();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = API.post<RefreshResponse>('/v1/auth/refresh', {}, {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
      skipAuthRefresh: true,
      skipRequestRetry: true,
    })
      .then(({ data }) => {
        const nextAdmin = data.data.admin || existingAdmin;
        setAuthSession(data.data.access_token, data.data.refresh_token, nextAdmin);
        return data.data.access_token;
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
  const headers = AxiosHeaders.from(config.headers);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  config.headers = headers;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const axiosError = error as AxiosError;
    const originalRequest = axiosError.config;

    if (originalRequest && shouldRetryRequest(axiosError)) {
      originalRequest._retryCount = (originalRequest._retryCount ?? 0) + 1;

      if (originalRequest._retryCount <= MAX_REQUEST_RETRIES) {
        await delay(300 * originalRequest._retryCount);
        return API(originalRequest);
      }
    }

    if (
      axiosError.response?.status !== 401 ||
      originalRequest?._retry ||
      originalRequest?.skipAuthRefresh ||
      isRefreshRequest(originalRequest)
    ) {
      return Promise.reject(axiosError);
    }

    originalRequest._retry = true;
    const nextAccessToken = await refreshAccessToken();

    if (!nextAccessToken) {
      return Promise.reject(axiosError);
    }

    const headers = AxiosHeaders.from(originalRequest.headers);
    headers.set('Authorization', `Bearer ${nextAccessToken}`);
    originalRequest.headers = headers;
    return API(originalRequest);
  },
);
