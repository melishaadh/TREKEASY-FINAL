import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, router, usePathname } from 'expo-router';
import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';
import { AdminThemeProvider, useAdminTheme } from '@/context/AdminThemeContext';
import Sidebar, { SIDEBAR_W } from '@/components/admin/Sidebar';

function AdminShell() {
  const { admin, isLoading } = useAdminAuth();
  const { theme: t } = useAdminTheme();
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    if (isLoading) return;
    if (!admin && !isLogin) {
      router.replace('/admin/login');
    } else if (admin && isLogin) {
      router.replace('/admin');
    }
  }, [admin, isLoading, isLogin]);

  if (isLoading) {
    return (
      <View style={[s.loader, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  if (isLogin) {
    return (
      <View style={[s.loginWrap, { backgroundColor: t.bg }]}>
        <Slot />
      </View>
    );
  }

  if (!admin) return null;

  return (
    <View style={[s.shell, { backgroundColor: t.bg }]}>
      <Sidebar />
      <View style={{ flex: 1, overflow: 'hidden' as any }}>
        <Slot />
      </View>
    </View>
  );
}

export default function AdminLayout() {
  return (
    <AdminThemeProvider>
      <AdminAuthProvider>
        <AdminShell />
      </AdminAuthProvider>
    </AdminThemeProvider>
  );
}

const s = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loginWrap: { flex: 1 },
  shell: {
    flex: 1,
    flexDirection: 'row',
  },
});
