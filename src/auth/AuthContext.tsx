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
  needsPassword: boolean;       // new user — must set a password before continuing
  recoveryToken: string | null; // password reset email was clicked — show reset form
  login: (email: string, password: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  resetPassword: (supabaseAccessToken: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const logoutRef = useRef<() => Promise<void>>();

  // On mount: check for Supabase recovery hash first, then restore session
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const accessToken = params.get('access_token');
        const type = params.get('type');
        if (accessToken && type === 'recovery') {
          // Clear the hash so the token isn't visible in the URL
          window.history.replaceState(null, '', window.location.pathname);
          setRecoveryToken(accessToken);
          setIsLoading(false);
          return; // Skip restoring old session — just show the reset form
        }
      }
    } catch { /* ignore */ }

    // Normal session restore from localStorage
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
    setNeedsPassword(data.needsPassword === true);
    try {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch { /* ignore */ }
  }, []);

  // New user setting their password for the first time
  const setPassword = useCallback(async (password: string) => {
    const storedToken = localStorage.getItem(TOKEN_KEY) || token || '';
    const res = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storedToken}`,
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

  // User arrived via forgot-password email link
  const resetPassword = useCallback(async (supabaseAccessToken: string, newPassword: string) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: supabaseAccessToken, password: newPassword }),
    });
    let data: any = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      throw new Error(
        typeof data?.error === 'string' && data.error.trim()
          ? data.error
          : 'Failed to reset password. Please try again.'
      );
    }
    setRecoveryToken(null); // Return to login page after successful reset
  }, []);

  const logout = useCallback(async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    setToken(null);
    setUser(null);
    setNeedsPassword(false);
    setRecoveryToken(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { logoutRef.current = logout; }, [logout]);

  // Auto-logout after 30 minutes of inactivity
  useEffect(() => {
    if (!token) return;
    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { logoutRef.current?.(); }, INACTIVITY_TIMEOUT_MS);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [token]);

  return (
    <AuthContext.Provider value={{
      user, token,
      isAuthenticated: !!token,
      isLoading,
      needsPassword,
      recoveryToken,
      login,
      setPassword,
      resetPassword,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
