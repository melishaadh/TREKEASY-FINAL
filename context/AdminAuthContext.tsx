import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { authApi, AdminUser } from '@/services/apiService';

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
    // Check for existing session from localStorage
    const existingAdmin = authApi.getCurrentAdmin();
    setAdmin(existingAdmin);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoginError(null);
    const result = await authApi.login(username, password);
    if (result.admin) {
      setAdmin(result.admin);
      return true;
    }
    setLoginError(result.error || 'Login failed');
    return false;
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
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
