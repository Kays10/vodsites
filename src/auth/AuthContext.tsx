import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AuthUser } from '../types';

const TOKEN_KEY = 'vod_auth_token';
const USER_KEY = 'vod_auth_user';
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsPassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithMagicToken: (accessToken: string, refreshToken: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const logoutRef = useRef<() => Promise<void>>();

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Failed to restore auth session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    let data: any = {};
    try { data = await res.json(); } catch {}

    if (!res.ok) {
      throw new Error(
        typeof data?.error === 'string' && data.error.trim()
          ? data.error
          : `Login failed (HTTP ${res.status})`
      );
    }
    if (!data?.token || !data?.user) {
      throw new Error('Login failed: invalid response from server');
    }

    setToken(data.token);
    setUser(data.user);
    setNeedsPassword(false);
    try {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch { /* ignore */ }
  }, []);

  // Called after magic link callback — exchanges Supabase token for our app JWT
  const loginWithMagicToken = useCallback(async (accessToken: string, refreshToken: string) => {
    const res = await fetch('/api/auth/verify-magic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
    });

    let data: any = {};
    try { data = await res.json(); } catch {}

    if (!res.ok) {
      throw new Error(
        typeof data?.error === 'string' && data.error.trim()
          ? data.error
          : `Magic link verification failed (HTTP ${res.status})`
      );
    }
    if (!data?.token || !data?.user) {
      throw new Error('Magic link verification failed: invalid response');
    }

    setToken(data.token);
    setUser(data.user);
    setNeedsPassword(data.needsPassword === true);
    try {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch { /* ignore */ }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    setToken(null);
    setUser(null);
    setNeedsPassword(false);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* ignore */ }
  }, []);

  // Keep logoutRef in sync so the inactivity timer always calls the latest logout
  useEffect(() => { logoutRef.current = logout; }, [logout]);

  // Set password after first magic link login
  const setPassword = useCallback(async (password: string) => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const res = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storedToken || token || ''}`,
      },
      body: JSON.stringify({ password }),
    });

    let data: any = {};
    try { data = await res.json(); } catch {}

    if (!res.ok) {
      throw new Error(
        typeof data?.error === 'string' && data.error.trim()
          ? data.error
          : 'Failed to set password. Please try again.'
      );
    }

    setNeedsPassword(false);
  }, [token]);

  // Auto-logout after 30 minutes of inactivity
  useEffect(() => {
    if (!token) return;

    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        logoutRef.current?.();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [token]);

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    needsPassword,
    login,
    loginWithMagicToken,
    setPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
