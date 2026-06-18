import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { authApi, AdminUser } from '@/services/apiService';

// ─── SHA-256 via Web Crypto API (browsers + React Native web) ─────────────────
async function sha256hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Session storage (localStorage, web only) ────────────────────────────────
const SESSION_KEY = 'trekEasyAdminSession';
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours

interface AdminSession { user: AdminUser; expiresAt: number }

function readSession(): AdminUser | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: AdminSession = JSON.parse(raw);
    if (Date.now() > s.expiresAt) { window.localStorage.removeItem(SESSION_KEY); return null; }
    return s.user;
  } catch { return null; }
}

function writeSession(user: AdminUser) {
  try {
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ user, expiresAt: Date.now() + SESSION_TTL })
    );
  } catch {}
}

function clearSession() {
  try { window.localStorage.removeItem(SESSION_KEY); } catch {}
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface AdminAuthContextType {
  admin: AdminUser | null;
  isLoading: boolean;
  loginError: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  admin: null,
  isLoading: true,
  loginError: null,
  login: async () => false,
  logout: () => {},
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    setAdmin(readSession());
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoginError(null);
    try {
      const user = await authApi.findByUsername(username.toLowerCase().trim());
      if (!user) { setLoginError('Invalid username or password.'); return false; }
      const hash = await sha256hex(password);
      if (hash !== user.password_hash) { setLoginError('Invalid username or password.'); return false; }
      await authApi.updateLastLogin(user.id);
      writeSession(user);
      setAdmin(user);
      return true;
    } catch {
      setLoginError('Connection error. Please try again.');
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setAdmin(null);
    router.replace('/admin/login');
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, isLoading, loginError, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
