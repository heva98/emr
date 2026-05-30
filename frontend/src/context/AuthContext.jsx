import { createContext, useContext, useState, useEffect } from "react";
import api, { setAccessToken, setLogoutHandler } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Wire up the axios logout callback immediately (before any requests fire)
  useEffect(() => {
    setLogoutHandler(() => {
      setToken(null);
      setUser(null);
    });
  }, []);

  // Keep the axios module-level token in sync with state
  useEffect(() => {
    setAccessToken(token);
  }, [token]);

  // Silent refresh on mount: try to get a new access token using the httpOnly cookie
  useEffect(() => {
    async function silentRefresh() {
      try {
        const { data } = await api.post("/auth/refresh/");
        setToken(data.access);
        // Fetch profile with the new token (interceptor will attach it via _accessToken)
        setAccessToken(data.access);
        const { data: profile } = await api.get("/auth/me/");
        setUser(profile);
      } catch {
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    silentRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(username, password) {
    const { data } = await api.post("/auth/login/", { username, password });
    setToken(data.access);
    setUser(data.user);
  }

  async function logout() {
    try {
      await api.post("/auth/logout/");
    } catch {
      // ignore — clear state regardless
    } finally {
      setToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: Boolean(token),
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
