import axios from "axios";

// In-memory access token — never touches localStorage
let _accessToken = null;
let _onLogout = null;

export function setAccessToken(token) {
  _accessToken = token;
}

export function setLogoutHandler(fn) {
  _onLogout = fn;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // needed to send/receive httpOnly refresh cookie
});

// Attach bearer token from memory
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// 401 → refresh → retry, with queue for concurrent requests
let _isRefreshing = false;
let _pendingQueue = [];

function _flushQueue(error, token = null) {
  _pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  _pendingQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Don't intercept auth endpoints (avoids infinite loops)
    const isAuthUrl = original?.url?.includes("/auth/");
    const already = original?._retry;

    if (error.response?.status !== 401 || isAuthUrl || already) {
      return Promise.reject(error);
    }

    // Queue concurrent requests while a refresh is in flight
    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
        _pendingQueue.push({ resolve, reject });
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      });
    }

    original._retry = true;
    _isRefreshing = true;

    try {
      const { data } = await api.post("/auth/refresh/");
      _accessToken = data.access;
      _flushQueue(null, _accessToken);
      original.headers.Authorization = `Bearer ${_accessToken}`;
      return api(original);
    } catch (refreshError) {
      _flushQueue(refreshError);
      _accessToken = null;
      if (_onLogout) _onLogout();
      return Promise.reject(refreshError);
    } finally {
      _isRefreshing = false;
    }
  }
);

export default api;
