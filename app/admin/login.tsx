import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Mountain, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useAdminTheme } from '@/context/AdminThemeContext';
import { router } from 'expo-router';

export default function AdminLogin() {
  const { login, loginError } = useAdminAuth();
  const { theme: t } = useAdminTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (ok) router.replace('/admin');
  };

  const inp = [s.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }];

  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoIcon}>
            <Mountain size={26} color="#3b82f6" strokeWidth={2} />
          </View>
          <View>
            <Text style={[s.logoName, { color: t.text }]}>TrekEasy</Text>
            <Text style={[s.logoSub, { color: t.textFaint }]}>Admin Panel</Text>
          </View>
        </View>

        <View style={[s.divider, { backgroundColor: t.border }]} />

        <View style={s.badge}>
          <ShieldCheck size={14} color="#3b82f6" strokeWidth={2} />
          <Text style={s.badgeText}>Secure Admin Access</Text>
        </View>

        <Text style={[s.heading, { color: t.text }]}>Sign in to dashboard</Text>
        <Text style={[s.sub, { color: t.textSub }]}>
          Manage hotels, monitor trek groups, and oversee bookings.
        </Text>

        {/* Error */}
        {loginError && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{loginError}</Text>
          </View>
        )}

        {/* Username */}
        <View style={s.fieldGroup}>
          <Text style={[s.label, { color: t.textSub }]}>Username</Text>
          <TextInput
            style={inp}
            value={username}
            onChangeText={setUsername}
            placeholder="admin"
            placeholderTextColor={t.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleLogin}
          />
        </View>

        {/* Password */}
        <View style={s.fieldGroup}>
          <Text style={[s.label, { color: t.textSub }]}>Password</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={inp}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={t.textFaint}
              secureTextEntry={!showPass}
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              style={s.eyeBtn}
              onPress={() => setShowPass(p => !p)}>
              {showPass
                ? <EyeOff size={16} color={t.textFaint} strokeWidth={2} />
                : <Eye size={16} color={t.textFaint} strokeWidth={2} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.loginBtn, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading || !username.trim() || !password.trim()}>
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.loginBtnText}>Sign In</Text>}
        </TouchableOpacity>

        {/* Demo hint */}
        <View style={[s.hint, { backgroundColor: t.primaryDim, borderColor: 'rgba(59,130,246,0.25)' }]}>
          <Text style={[s.hintLabel, { color: t.textSub }]}>Demo credentials</Text>
          <Text style={[s.hintCreds, { color: '#3b82f6' }]}>admin / admin123</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    gap: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  logoIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoName: { fontSize: 20, fontWeight: '700' },
  logoSub: { fontSize: 11, fontWeight: '500', marginTop: 2, letterSpacing: 0.5 },
  divider: { height: 1, marginBottom: 20 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  badgeText: { color: '#3b82f6', fontSize: 11, fontWeight: '600' },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#ef4444', fontSize: 13 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 7, letterSpacing: 0.3 },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  loginBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  loginBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  hint: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  hintLabel: { fontSize: 11, marginBottom: 4 },
  hintCreds: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace' as any },
});
