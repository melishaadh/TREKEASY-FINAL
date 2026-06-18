import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Users, MapPin, Hotel as HotelIcon, Calendar, UserPlus, MessageSquare } from 'lucide-react-native';
import { useAdminTheme } from '@/context/AdminThemeContext';
import { groupsApi, ChatGroup } from '@/services/apiService';

function StatusBadge({ status }: { status: ChatGroup['status'] }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    active:    { bg: 'rgba(16,185,129,0.12)', fg: '#10b981', label: 'ACTIVE' },
    inactive:  { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b', label: 'INACTIVE' },
    completed: { bg: 'rgba(59,130,246,0.12)', fg: '#3b82f6', label: 'COMPLETED' },
  };
  const s = map[status] ?? map.inactive;
  return (
    <View style={[s2.badge, { backgroundColor: s.bg }]}>
      <Text style={{ color: s.fg, fontSize: 10, fontWeight: '700' }}>{s.label}</Text>
    </View>
  );
}

export default function AdminGroups() {
  const { theme: t } = useAdminTheme();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await groupsApi.getAll();
      setGroups(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (d: string | null) => {
    if (!d) return '--';
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return d; }
  };

  const activeCount = groups.filter(g => g.status === 'active').length;
  const totalMembers = groups.reduce((s, g) => s + (g.member_count ?? 0), 0);
  const bookedCount = groups.filter(g => g.booked_hotel_id).length;

  return (
    <ScrollView style={[s.root, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[s.pageHeader, { borderBottomColor: t.border, backgroundColor: t.surface }]}>
        <View>
          <Text style={[s.pageTitle, { color: t.text }]}>Group Chats</Text>
          <Text style={[s.pageSub, { color: t.textFaint }]}>{groups.length} group{groups.length !== 1 ? 's' : ''} total</Text>
        </View>
      </View>

      <View style={s.body}>
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={t.primary} />
          </View>
        ) : groups.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={[s.emptyIcon, { backgroundColor: t.primaryDim }]}>
              <MessageSquare size={32} color={t.primary} strokeWidth={1.5} />
            </View>
            <Text style={[s.emptyTitle, { color: t.text }]}>No groups yet</Text>
            <Text style={[s.emptySub, { color: t.textFaint }]}>Groups will appear here when trekkers create them.</Text>
          </View>
        ) : (
          <>
            {/* Summary cards */}
            <View style={s.summaryRow}>
              <View style={[s.summaryCard, { backgroundColor: t.surface, borderColor: t.border }]}>
                <Users size={18} color="#10b981" strokeWidth={2} />
                <Text style={[s.summaryVal, { color: t.text }]}>{activeCount}</Text>
                <Text style={[s.summaryLabel, { color: t.textFaint }]}>Active</Text>
              </View>
              <View style={[s.summaryCard, { backgroundColor: t.surface, borderColor: t.border }]}>
                <UserPlus size={18} color="#3b82f6" strokeWidth={2} />
                <Text style={[s.summaryVal, { color: t.text }]}>{totalMembers}</Text>
                <Text style={[s.summaryLabel, { color: t.textFaint }]}>Members</Text>
              </View>
              <View style={[s.summaryCard, { backgroundColor: t.surface, borderColor: t.border }]}>
                <HotelIcon size={18} color="#f59e0b" strokeWidth={2} />
                <Text style={[s.summaryVal, { color: t.text }]}>{bookedCount}</Text>
                <Text style={[s.summaryLabel, { color: t.textFaint }]}>Booked</Text>
              </View>
            </View>

            {/* Groups list */}
            <View style={s.listWrap}>
              {groups.map((g, i) => (
                <View key={g.id} style={[s.groupCard, { backgroundColor: t.surface, borderColor: t.border }]}>
                  {/* Top row */}
                  <View style={s.groupHeader}>
                    <View style={[s.groupIcon, { backgroundColor: '#10b98118' }]}>
                      <Users size={18} color="#10b981" strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.groupName, { color: t.text }]} numberOfLines={1}>{g.name}</Text>
                      <View style={s.groupMetaRow}>
                        <MapPin size={11} color={t.textFaint} strokeWidth={2} />
                        <Text style={[s.groupMeta, { color: t.textFaint }]} numberOfLines={1}>{g.destination_name}</Text>
                      </View>
                    </View>
                    <StatusBadge status={g.status} />
                  </View>

                  {/* Details row */}
                  <View style={[s.groupDetails, { borderTopColor: t.border }]}>
                    <View style={s.detailItem}>
                      <Calendar size={13} color={t.textFaint} strokeWidth={2} />
                      <Text style={[s.detailLabel, { color: t.textFaint }]}>Start</Text>
                      <Text style={[s.detailValue, { color: t.textSub }]}>{fmtDate(g.start_date)}</Text>
                    </View>
                    <View style={s.detailItem}>
                      <Users size={13} color={t.textFaint} strokeWidth={2} />
                      <Text style={[s.detailLabel, { color: t.textFaint }]}>Members</Text>
                      <Text style={[s.detailValue, { color: t.textSub }]}>{g.member_count}</Text>
                    </View>
                    <View style={s.detailItem}>
                      <Text style={[s.detailLabel, { color: t.textFaint }]}>Created by</Text>
                      <Text style={[s.detailValue, { color: t.textSub }]} numberOfLines={1}>{g.created_by}</Text>
                    </View>
                  </View>

                  {/* Booked hotel */}
                  <View style={[s.hotelRow, { borderTopColor: t.border }]}>
                    {g.hotel ? (
                      <>
                        <View style={[s.hotelIcon, { backgroundColor: '#3b82f618' }]}>
                          <HotelIcon size={14} color="#3b82f6" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.hotelName, { color: t.text }]} numberOfLines={1}>{g.hotel.name}</Text>
                          <Text style={[s.hotelSub, { color: t.textFaint }]} numberOfLines={1}>
                            {g.hotel.location} · NPR {Number(g.hotel.price_per_package).toLocaleString()}
                          </Text>
                        </View>
                        <View style={[s.bookedBadge, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                          <Text style={{ color: '#3b82f6', fontSize: 10, fontWeight: '700' }}>BOOKED</Text>
                        </View>
                      </>
                    ) : (
                      <View style={s.noHotel}>
                        <Text style={[s.noHotelText, { color: t.textFaint }]}>No hotel booked</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
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
  pageTitle: { fontSize: 22, fontWeight: '700' },
  pageSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  body: { padding: 28 },
  loadingWrap: { paddingVertical: 80, alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 13 },
  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  summaryVal: { fontSize: 24, fontWeight: '700' },
  summaryLabel: { fontSize: 11, fontWeight: '500' },
  listWrap: { gap: 14 },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  groupIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  groupName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  groupMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  groupMeta: { fontSize: 11 },
  groupDetails: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 16,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailLabel: { fontSize: 11, fontWeight: '500' },
  detailValue: { fontSize: 12, fontWeight: '500' },
  hotelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  hotelIcon: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  hotelName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  hotelSub: { fontSize: 11 },
  bookedBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  noHotel: { flex: 1, paddingVertical: 2 },
  noHotelText: { fontSize: 12, fontStyle: 'italic' },
});

const s2 = StyleSheet.create({
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
});
