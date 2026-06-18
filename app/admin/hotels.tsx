import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert,
} from 'react-native';
import { Plus, Hotel as HotelIcon, MapPin, Phone, Edit3, Trash2, ToggleLeft, ToggleRight } from 'lucide-react-native';
import { useAdminTheme } from '@/context/AdminThemeContext';
import { hotelsApi, Hotel, HotelInput } from '@/services/apiService';
import HotelModal from '@/components/admin/HotelModal';

export default function AdminHotels() {
  const { theme: t } = useAdminTheme();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editHotel, setEditHotel] = useState<Hotel | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await hotelsApi.getAll();
      setHotels(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: HotelInput) => {
    if (editHotel) {
      await hotelsApi.update(editHotel.id, data);
    } else {
      await hotelsApi.create(data);
    }
    await load();
  };

  const handleDelete = (hotel: Hotel) => {
    Alert.alert(
      'Delete Hotel',
      `Are you sure you want to delete "${hotel.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await hotelsApi.delete(hotel.id);
            await load();
          },
        },
      ]
    );
  };

  const toggleActive = async (hotel: Hotel) => {
    await hotelsApi.update(hotel.id, { is_active: !hotel.is_active });
    await load();
  };

  const openCreate = () => {
    setEditHotel(null);
    setModalVisible(true);
  };

  const openEdit = (hotel: Hotel) => {
    setEditHotel(hotel);
    setModalVisible(true);
  };

  return (
    <ScrollView style={[s.root, { backgroundColor: t.bg }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[s.pageHeader, { borderBottomColor: t.border, backgroundColor: t.surface }]}>
        <View>
          <Text style={[s.pageTitle, { color: t.text }]}>Manage Hotels</Text>
          <Text style={[s.pageSub, { color: t.textFaint }]}>{hotels.length} hotel{hotels.length !== 1 ? 's' : ''} registered</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Plus size={16} color="#fff" strokeWidth={2.5} />
          <Text style={s.addBtnText}>Add Hotel</Text>
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={t.primary} />
          </View>
        ) : hotels.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={[s.emptyIcon, { backgroundColor: t.primaryDim }]}>
              <HotelIcon size={32} color={t.primary} strokeWidth={1.5} />
            </View>
            <Text style={[s.emptyTitle, { color: t.text }]}>No hotels yet</Text>
            <Text style={[s.emptySub, { color: t.textFaint }]}>Add your first hotel to get started.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openCreate}>
              <Plus size={16} color="#fff" strokeWidth={2.5} />
              <Text style={s.addBtnText}>Add Hotel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.grid}>
            {hotels.map(h => (
              <View key={h.id} style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
                {/* Card header row */}
                <View style={s.cardHeader}>
                  <View style={[s.cardIcon, { backgroundColor: '#3b82f618' }]}>
                    <HotelIcon size={18} color="#3b82f6" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cardName, { color: t.text }]} numberOfLines={1}>{h.name}</Text>
                    <View style={s.cardMetaRow}>
                      <MapPin size={11} color={t.textFaint} strokeWidth={2} />
                      <Text style={[s.cardMeta, { color: t.textFaint }]} numberOfLines={1}>{h.location}</Text>
                    </View>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: h.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                    <Text style={{ color: h.is_active ? '#10b981' : '#ef4444', fontSize: 10, fontWeight: '700' }}>
                      {h.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <View style={[s.cardBody, { borderTopColor: t.border }]}>
                  <View style={s.detailRow}>
                    <Text style={[s.detailLabel, { color: t.textFaint }]}>Destination</Text>
                    <Text style={[s.detailValue, { color: t.textSub }]} numberOfLines={1}>{h.trek_destination_name}</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={[s.detailLabel, { color: t.textFaint }]}>Price</Text>
                    <Text style={[s.detailValue, { color: '#3b82f6', fontWeight: '700' }]}>
                      NPR {Number(h.price_per_package).toLocaleString()}
                    </Text>
                  </View>
                  <View style={s.detailRow}>
                    <Text style={[s.detailLabel, { color: t.textFaint }]}>Capacity</Text>
                    <Text style={[s.detailValue, { color: t.textSub }]}>{h.capacity} guests</Text>
                  </View>
                  <View style={s.detailRow}>
                    <Phone size={11} color={t.textFaint} strokeWidth={2} />
                    <Text style={[s.detailValue, { color: t.textSub, flex: 1 }]} numberOfLines={1}>{h.owner_contact}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={[s.cardActions, { borderTopColor: t.border }]}>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: t.primaryDim }]}
                    onPress={() => openEdit(h)}>
                    <Edit3 size={14} color={t.primary} strokeWidth={2} />
                    <Text style={{ color: t.primary, fontSize: 12, fontWeight: '600' }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: h.is_active ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)' }]}
                    onPress={() => toggleActive(h)}>
                    {h.is_active
                      ? <ToggleRight size={14} color="#f59e0b" strokeWidth={2} />
                      : <ToggleLeft size={14} color="#10b981" strokeWidth={2} />}
                    <Text style={{ color: h.is_active ? '#f59e0b' : '#10b981', fontSize: 12, fontWeight: '600' }}>
                      {h.is_active ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: 'rgba(239,68,68,0.1)' }]}
                    onPress={() => handleDelete(h)}>
                    <Trash2 size={14} color="#ef4444" strokeWidth={2} />
                    <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </View>

      <HotelModal
        visible={modalVisible}
        hotel={editHotel}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        theme={t}
      />
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
  body: { padding: 28 },
  loadingWrap: { paddingVertical: 80, alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 13, marginBottom: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#3b82f6', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    flex: 1,
    minWidth: 280,
    maxWidth: '50%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  cardIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMeta: { fontSize: 11 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  cardBody: { paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: 11, fontWeight: '500', minWidth: 80 },
  detailValue: { fontSize: 12, fontWeight: '500', flex: 1 },
  cardActions: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
});
