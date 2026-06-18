import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Sun, Moon, Shield, Monitor, Info } from 'lucide-react-native';
import { useAdminTheme } from '@/context/AdminThemeContext';
import { useAdminAuth } from '@/context/AdminAuthContext';

export default function AdminSettings() {
  const { theme: t, toggleTheme } = useAdminTheme();
  const { admin } = useAdminAuth();

  return (
    <ScrollView style={[s.root, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[s.pageHeader, { borderBottomColor: t.border, backgroundColor: t.surface }]}>
        <Text style={[s.pageTitle, { color: t.text }]}>Settings</Text>
      </View>

      <View style={s.body}>
        {/* Appearance */}
        <Text style={[s.sectionLabel, { color: t.textFaint }]}>APPEARANCE</Text>
        <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <TouchableOpacity style={s.settingRow} onPress={toggleTheme}>
            <View style={[s.settingIcon, { backgroundColor: t.primaryDim }]}>
              {t.isDark
                ? <Moon size={18} color={t.primary} strokeWidth={2} />
                : <Sun size={18} color={t.primary} strokeWidth={2} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.settingName, { color: t.text }]}>Theme</Text>
              <Text style={[s.settingDesc, { color: t.textFaint }]}>
                {t.isDark ? 'Dark mode is active' : 'Light mode is active'}
              </Text>
            </View>
            <View style={[s.toggleTrack, { backgroundColor: t.isDark ? '#3b82f6' : '#cbd5e1' }]}>
              <View style={[s.toggleThumb, { backgroundColor: '#fff', marginLeft: t.isDark ? 20 : 2 }]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Text style={[s.sectionLabel, { color: t.textFaint, marginTop: 24 }]}>ACCOUNT</Text>
        <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={s.settingRow}>
            <View style={[s.settingIcon, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
              <Shield size={18} color="#3b82f6" strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.settingName, { color: t.text }]}>Admin User</Text>
              <Text style={[s.settingDesc, { color: t.textFaint }]}>{admin?.display_name ?? 'Admin'}</Text>
            </View>
          </View>
          <View style={[s.settingRow, { borderTopColor: t.border, borderTopWidth: 1 }]}>
            <View style={[s.settingIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <Monitor size={18} color="#10b981" strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.settingName, { color: t.text }]}>Role</Text>
              <Text style={[s.settingDesc, { color: t.textFaint }]}>{admin?.role ?? 'admin'}</Text>
            </View>
          </View>
        </View>

        {/* About */}
        <Text style={[s.sectionLabel, { color: t.textFaint, marginTop: 24 }]}>ABOUT</Text>
        <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={s.settingRow}>
            <View style={[s.settingIcon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <Info size={18} color="#f59e0b" strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.settingName, { color: t.text }]}>TrekEasy Admin Panel</Text>
              <Text style={[s.settingDesc, { color: t.textFaint }]}>v1.0.0 — Manage hotels, trek groups, and bookings.</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  pageHeader: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  body: { padding: 28 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
  },
  settingIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  settingName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  settingDesc: { fontSize: 12 },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
