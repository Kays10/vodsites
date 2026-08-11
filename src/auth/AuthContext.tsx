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
  // set when user arrives via invite or recovery email link
  pendingToken: string | null;
  pendingType: 'invite' | 'recovery' | null;
  login: (email: string, password: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
  clearPending: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<'invite' | 'recovery' | null>(null);
  const logoutRef = useRef<() => Promise<void>>();

  useEffect(() => {
    // Check URL hash for Supabase email link callbacks
    // Supabase appends: #access_token=...&type=recovery (or invite)
    try {
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const sbToken = params.get('access_token');
        const type = params.get('type');
        if (sbToken && (type === 'recovery' || type === 'invite')) {
          // Remove hash from URL so token isn't visible/bookmarkable
          window.history.replaceState(null, '', window.location.pathname);
          setPendingToken(sbToken);
          setPendingType(type as 'invite' | 'recovery');
          setIsLoading(false);
          return; // Don't restore old session — show password form
        }
      }
    } catch { /* ignore */ }

    // Normal session restore from localStorage
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        const parts = storedToken.split('.');
        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
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
    try {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch { /* ignore */ }
  }, []);

  // Called from ResetPasswordPage — uses the Supabase token from the email link
  const resetPassword = useCallback(async (newPassword: string) => {
    if (!pendingToken) throw new Error('No reset token found. Please use the link from your email.');
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: pendingToken, password: newPassword }),
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
    // Done — clear the pending state so app shows login page
    setPendingToken(null);
    setPendingType(null);
  }, [pendingToken]);

  const clearPending = useCallback(() => {
    setPendingToken(null);
    setPendingType(null);
  }, []);

  const logout = useCallback(async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    setToken(null);
    setUser(null);
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
      pendingToken,
      pendingType,
      login,
      resetPassword,
      clearPending,
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
