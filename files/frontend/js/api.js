/**
 * Auction Hub - API Client Module (api.js)
 * Clean fetch wrapper for REST backend with JWT handling
 * Authoritative implementation per 02_Technical_Requirement_Documentation.md
 */

const API = (() => {
  const BASE_URL = window.location.origin.includes(':8000') || window.location.origin.includes(':3000') || window.location.origin.includes(':5500')
    ? 'http://127.0.0.1:8000'
    : '';

  const TOKEN_KEY = 'auction_hub_access_token';
  const REFRESH_TOKEN_KEY = 'auction_hub_refresh_token';
  const USER_KEY = 'auction_hub_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  function setTokens(accessToken, refreshToken) {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new CustomEvent('auth:change', { detail: { user: null } }));
  }

  function getStoredUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function setStoredUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
    window.dispatchEvent(new CustomEvent('auth:change', { detail: { user } }));
  }

  async function request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      
      // If 401 Unauthorized, try refreshing token once if we have a refresh token
      if (response.status === 401 && getRefreshToken() && !options._retry && !endpoint.includes('/auth/')) {
        options._retry = true;
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${getToken()}`;
          return request(endpoint, options);
        } else {
          clearAuth();
        }
      }

      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const errorCode = data?.error?.code || `HTTP_${response.status}`;
        const errorMessage = data?.error?.message || data?.detail || response.statusText || 'An unexpected error occurred';
        const error = new Error(errorMessage);
        error.code = errorCode;
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        const netErr = new Error('Unable to connect to server. Please check your connection.');
        netErr.code = 'NETWORK_ERROR';
        throw netErr;
      }
      throw err;
    }
  }

  async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (res.ok) {
        const data = await res.json();
        setTokens(data.access_token, data.refresh_token || refreshToken);
        return true;
      }
    } catch {
      // Refresh failed
    }
    return false;
  }

  return {
    // Core HTTP methods
    get(endpoint, params = {}) {
      const query = new URLSearchParams(params).toString();
      const url = query ? `${endpoint}?${query}` : endpoint;
      return request(url, { method: 'GET' });
    },

    post(endpoint, body = {}) {
      return request(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    put(endpoint, body = {}) {
      return request(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
    },

    delete(endpoint) {
      return request(endpoint, { method: 'DELETE' });
    },

    // Auth helpers
    async register(payload) {
      const data = await this.post('/api/auth/register', payload);
      if (data.access_token) {
        setTokens(data.access_token, data.refresh_token);
        if (data.user) setStoredUser(data.user);
      }
      return data;
    },

    async login(email, password) {
      const data = await this.post('/api/auth/login', { email, password });
      if (data.access_token) {
        setTokens(data.access_token, data.refresh_token);
        if (data.user) setStoredUser(data.user);
      }
      return data;
    },

    async fetchCurrentUser() {
      if (!getToken()) return null;
      try {
        const user = await this.get('/api/auth/me');
        setStoredUser(user);
        return user;
      } catch (err) {
        if (err.status === 401) {
          clearAuth();
        }
        return null;
      }
    },

    logout() {
      clearAuth();
      window.location.href = '/';
    },

    getUser: getStoredUser,
    getToken,
    isAuthenticated: () => !!getToken(),
    clearAuth
  };
})();

// Export globally for browser scripts
window.API = API;
