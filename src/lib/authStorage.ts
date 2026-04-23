const ACCESS_TOKEN_KEY = 'admin_access_token';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';
const ADMIN_KEY = 'admin_profile';

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
}

export function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}
