import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import {
  Building2, Users, TrendingUp, BookOpen,
  Plus, ArrowRight, Hotel as HotelIcon,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAdminTheme } from '@/context/AdminThemeContext';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { dashboardApi, hotelsApi, groupsApi, DashboardStats, Hotel, ChatGroup } from '@/services/apiService';

function StatCard({ icon: Icon, label, value, color, sub, t }: {
  icon: any; label: string; value: number | string; color: string; sub?: string;
  t: ReturnType<typeof useAdminTheme>['theme'];
}) {
  return (
    <View style={[s.statCard, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={[s.statIcon, { backgroundColor: color + '18' }]}>
        <Icon size={20} color={color} strokeWidth={2} />
      </View>
      <Text style={[s.statVal, { color: t.text }]}>{value}</Text>
      <Text style={[s.statLabel, { color: t.textSub }]}>{label}</Text>
      {sub && <Text style={[s.statSub, { color: color }]}>{sub}</Text>}
    </View>
  );
}

export default function AdminDashboard() {
  const { theme: t } = useAdminTheme();
  const { admin } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, h, g] = await Promise.all([
          dashboardApi.getStats(),
          hotelsApi.getAll(),
          groupsApi.getAll(),
        ]);
        setStats(s);
        setHotels(h.slice(0, 4));
        setGroups(g.slice(0, 4));
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <ScrollView style={[s.root, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
      {/* Page header */}
      <View style={[s.pageHeader, { borderBottomColor: t.border, backgroundColor: t.surface }]}>
        <View>
          <Text style={[s.pageGreeting, { color: t.textFaint }]}>
            {greeting}, {admin?.display_name?.split(' ')[0] ?? 'Admin'}
          </Text>
          <Text style={[s.pageTitle, { color: t.text }]}>Dashboard</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => router.push('/admin/hotels')}>
          <Plus size={16} color="#fff" strokeWidth={2.5} />
          <Text style={s.addBtnText}>Add Hotel</Text>
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={t.primary} />
          </View>
        ) : (
          <>
            {/* Stats */}
            <View style={s.statsGrid}>
              <StatCard icon={Building2}  label="Total Hotels"   value={stats?.totalHotels ?? 0}   color="#3b82f6"  sub="lodges registered" t={t} />
              <StatCard icon={Users}      label="Active Groups"  value={stats?.activeGroups ?? 0}  color="#10b981"  sub="trek groups live"  t={t} />
              <StatCard icon={TrendingUp} label="Total Members"  value={stats?.totalMembers ?? 0}  color="#f59e0b"  sub="across all groups"  t={t} />
              <StatCard icon={BookOpen}   label="Bookings"       value={stats?.totalBookings ?? 0} color="#8b5cf6"  sub="hotels booked"     t={t} />
            </View>

            {/* Recent Hotels */}
            <SectionHeader title="Recent Hotels" action="View All" onAction={() => router.push('/admin/hotels')} t={t} />
            <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              {hotels.length === 0
                ? <Text style={[s.empty, { color: t.textFaint }]}>No hotels yet. Add your first hotel.</Text>
                : hotels.map((h, i) => (
                  <View key={h.id} style={[s.listRow, i < hotels.length - 1 && { borderBottomColor: t.border, borderBottomWidth: 1 }]}>
                    <View style={[s.listIcon, { backgroundColor: '#3b82f618' }]}>
                      <HotelIcon size={16} color="#3b82f6" strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.listName, { color: t.text }]} numberOfLines={1}>{h.name}</Text>
                      <Text style={[s.listSub, { color: t.textFaint }]}>{h.trek_destination_name} · {h.location}</Text>
                    </View>
                    <View style={[s.priceBadge, { backgroundColor: '#3b82f610' }]}>
                      <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '700' }}>
                        NPR {Number(h.price_per_package).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>

            {/* Recent Groups */}
            <SectionHeader title="Recent Groups" action="View All" onAction={() => router.push('/admin/groups')} t={t} />
            <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              {groups.length === 0
                ? <Text style={[s.empty, { color: t.textFaint }]}>No groups yet.</Text>
                : groups.map((g, i) => (
                  <View key={g.id} style={[s.listRow, i < groups.length - 1 && { borderBottomColor: t.border, borderBottomWidth: 1 }]}>
                    <View style={[s.listIcon, { backgroundColor: '#10b98118' }]}>
                      <Users size={16} color="#10b981" strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.listName, { color: t.text }]} numberOfLines={1}>{g.name}</Text>
                      <Text style={[s.listSub, { color: t.textFaint }]}>{g.destination_name} · {g.member_count} members</Text>
                    </View>
                    {g.hotel
                      ? <View style={[s.priceBadge, { backgroundColor: '#10b98110' }]}>
                          <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '600' }}>Booked</Text>
                        </View>
                      : <View style={[s.priceBadge, { backgroundColor: t.surfaceElevated }]}>
                          <Text style={{ color: t.textFaint, fontSize: 11 }}>No hotel</Text>
                        </View>}
                  </View>
                ))}
            </View>

            <View style={{ height: 40 }} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

function SectionHeader({ title, action, onAction, t }: {
  title: string; action: string; onAction: () => void;
  t: ReturnType<typeof useAdminTheme>['theme'];
}) {
  return (
    <View style={s.secHeader}>
      <Text style={[s.secTitle, { color: t.text }]}>{title}</Text>
      <TouchableOpacity style={s.secAction} onPress={onAction}>
        <Text style={{ color: t.primary, fontSize: 13, fontWeight: '600' }}>{action}</Text>
        <ArrowRight size={14} color={t.primary} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  pageGreeting: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  body: { padding: 28, gap: 0 },
  loadingWrap: { paddingVertical: 80, alignItems: 'center' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statVal: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  statLabel: { fontSize: 13, fontWeight: '500' },
  statSub: { fontSize: 11, marginTop: 2 },
  secHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  secTitle: { fontSize: 16, fontWeight: '700' },
  secAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 28,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
  },
  listIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  listSub: { fontSize: 12 },
  priceBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  empty: { padding: 24, textAlign: 'center' },
});
