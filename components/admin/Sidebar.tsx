import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  LayoutDashboard, Hotel, MessageSquare, Settings, LogOut, Mountain,
} from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { useAdminAuth } from '@/context/AdminAuthContext';

export const SIDEBAR_W = 240;

const NAV = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/admin' as const },
  { label: 'Manage Hotels', icon: Hotel,           path: '/admin/hotels' as const },
  { label: 'Group Chats',   icon: MessageSquare,   path: '/admin/groups' as const },
  { label: 'Settings',      icon: Settings,        path: '/admin/settings' as const },
];

export default function Sidebar() {
  const { admin, logout } = useAdminAuth();
  const pathname = usePathname();

  function isActive(path: string) {
    if (path === '/admin') return pathname === '/admin';
    return pathname.startsWith(path);
  }

  return (
    <View style={s.root}>
      {/* Brand */}
      <View style={s.brand}>
        <View style={s.brandIcon}>
          <Mountain size={20} color="#3b82f6" strokeWidth={2} />
        </View>
        <View>
          <Text style={s.brandName}>TrekEasy</Text>
          <Text style={s.brandSub}>Admin Panel</Text>
        </View>
      </View>

      <View style={s.hr} />

      {/* Navigation */}
      <View style={s.nav}>
        {NAV.map(item => {
          const active = isActive(item.path);
          return (
            <TouchableOpacity
              key={item.path}
              style={[s.item, active && s.itemActive]}
              onPress={() => router.push(item.path)}>
              {active && <View style={s.activeBar} />}
              <item.icon size={18} color={active ? '#3b82f6' : '#64748b'} strokeWidth={2} />
              <Text style={[s.itemLabel, { color: active ? '#f1f5f9' : '#94a3b8' }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <View style={s.hr} />
        <View style={s.userRow}>
          <View style={s.avatar}>
            <Text style={s.avatarLetter}>
              {(admin?.display_name ?? 'A')[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName} numberOfLines={1}>
              {admin?.display_name ?? 'Admin'}
            </Text>
            <Text style={s.userRole}>{admin?.role ?? 'admin'}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <LogOut size={15} color="#64748b" strokeWidth={2} />
          <Text style={s.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    width: SIDEBAR_W,
    backgroundColor: '#020617',
    flexDirection: 'column',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 22,
    gap: 12,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  brandSub: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  hr: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 },
  nav: { flex: 1, paddingTop: 14, paddingHorizontal: 12, gap: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 12,
    position: 'relative',
  },
  itemActive: { backgroundColor: 'rgba(59,130,246,0.12)' },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '20%' as any,
    bottom: '20%' as any,
    width: 3,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  itemLabel: { fontSize: 14, fontWeight: '500' },
  footer: { padding: 12, paddingBottom: 20, gap: 0 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 14, fontWeight: '700' },
  userName: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  userRole: { color: '#475569', fontSize: 10, textTransform: 'capitalize', marginTop: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  logoutText: { color: '#64748b', fontSize: 13, fontWeight: '500' },
});
