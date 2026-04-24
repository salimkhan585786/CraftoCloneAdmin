const ACCESS_TOKEN_KEY = 'admin_access_token';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';
const ADMIN_KEY = 'admin_profile';
const AUTH_CHANGE_EVENT = 'auth-change';

export interface StoredAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function hasStoredSession() {
  return Boolean(getRefreshToken() && getStoredAdmin());
}

export function getStoredAdmin(): StoredAdmin | null {
  const value = localStorage.getItem(ADMIN_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredAdmin;
  } catch {
    clearAuthStorage();
    return null;
  }
}

export function setAuthSession(accessToken: string, refreshToken: string, admin: StoredAdmin) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function subscribeToAuthChanges(callback: () => void) {
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, callback);
}
