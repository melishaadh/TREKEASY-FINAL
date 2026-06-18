import React, { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'trekEasyAdminTheme';

export interface AT {
  isDark: boolean;
  bg: string;
  surface: string;
  surfaceElevated: string;
  sidebar: string;
  sidebarHover: string;
  border: string;
  borderLight: string;
  text: string;
  textSub: string;
  textFaint: string;
  primary: string;
  primaryDim: string;
  success: string;
  warning: string;
  danger: string;
  inputBg: string;
  shadow: string;
}

function build(dark: boolean): AT {
  return dark
    ? {
        isDark: true,
        bg: '#0f172a',
        surface: '#1e293b',
        surfaceElevated: '#2d3748',
        sidebar: '#020617',
        sidebarHover: '#0f172a',
        border: '#334155',
        borderLight: 'rgba(255,255,255,0.06)',
        text: '#f8fafc',
        textSub: '#94a3b8',
        textFaint: '#64748b',
        primary: '#3b82f6',
        primaryDim: 'rgba(59,130,246,0.15)',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        inputBg: '#0f172a',
        shadow: 'rgba(0,0,0,0.4)',
      }
    : {
        isDark: false,
        bg: '#f1f5f9',
        surface: '#ffffff',
        surfaceElevated: '#f8fafc',
        sidebar: '#0f172a',
        sidebarHover: '#1e293b',
        border: '#e2e8f0',
        borderLight: 'rgba(0,0,0,0.06)',
        text: '#0f172a',
        textSub: '#64748b',
        textFaint: '#94a3b8',
        primary: '#3b82f6',
        primaryDim: 'rgba(59,130,246,0.10)',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        inputBg: '#ffffff',
        shadow: 'rgba(0,0,0,0.08)',
      };
}

interface AdminThemeCtx { theme: AT; toggleTheme: () => void }
const AdminThemeContext = createContext<AdminThemeCtx>({ theme: build(false), toggleTheme: () => {} });

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try { return typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === 'dark'; }
    catch { return false; }
  });

  const toggleTheme = () => {
    setIsDark(p => {
      const next = !p;
      try { window.localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light'); } catch {}
      return next;
    });
  };

  return (
    <AdminThemeContext.Provider value={{ theme: build(isDark), toggleTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() { return useContext(AdminThemeContext); }
