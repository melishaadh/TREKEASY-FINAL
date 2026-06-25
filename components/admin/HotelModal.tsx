import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { X, ChevronDown } from 'lucide-react-native';
import { Hotel, HotelInput, treksApi, Trek } from '@/services/apiService';
import { AT } from '@/context/AdminThemeContext';

interface Props {
  visible: boolean;
  hotel: Hotel | null;
  onClose: () => void;
  onSave: (data: HotelInput) => Promise<void>;
  theme: AT;
}

const EMPTY: HotelInput = {
  name: '',
  trek_destination_id: '',
  trek_destination_name: '',
  owner_contact: '',
  price_per_package: 0,
  location: '',
  capacity: 10,
  description: '',
  image_url: null,
  is_active: true,
};

export default function HotelModal({ visible, hotel, onClose, onSave, theme: t }: Props) {
  const [form, setForm] = useState<HotelInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destOpen, setDestOpen] = useState(false);
  const [destinations, setDestinations] = useState<Trek[]>([]);
  const [loadingDests, setLoadingDests] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(hotel ? {
        name: hotel.name,
        trek_destination_id: hotel.trek_destination_id,
        trek_destination_name: hotel.trek_destination_name,
        owner_contact: hotel.owner_contact,
        price_per_package: hotel.price_per_package,
        location: hotel.location,
        capacity: hotel.capacity,
        description: hotel.description ?? '',
        image_url: hotel.image_url,
        is_active: hotel.is_active,
      } : EMPTY);
      setError(null);
      (async () => {
        setLoadingDests(true);
        const data = await treksApi.getAll();
        setDestinations(data);
        setLoadingDests(false);
      })();
    }
  }, [visible, hotel]);

  const set = (k: keyof HotelInput, v: string | number | boolean | null) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Hotel name is required.'); return; }
    if (!form.trek_destination_id) { setError('Please select a trek destination.'); return; }
    if (!form.owner_contact.trim()) { setError('Owner contact is required.'); return; }
    if (!form.location.trim()) { setError('Location is required.'); return; }
    if (form.price_per_package <= 0) { setError('Price must be greater than 0.'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...form, price_per_package: Number(form.price_per_package), capacity: Number(form.capacity) });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [s.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={[s.header, { borderBottomColor: t.border }]}>
            <Text style={[s.title, { color: t.text }]}>
              {hotel ? 'Edit Hotel' : 'Add New Hotel'}
            </Text>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <X size={18} color={t.textFaint} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            {error && (
              <View style={[s.errorBox, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }]}>
                <Text style={{ color: '#ef4444', fontSize: 13 }}>{error}</Text>
              </View>
            )}

            <View style={s.row}>
              <View style={s.field}>
                <Text style={[s.label, { color: t.textSub }]}>Hotel Name *</Text>
                <TextInput
                  style={inputStyle}
                  value={form.name}
                  onChangeText={v => set('name', v)}
                  placeholder="e.g. Annapurna Lodge"
                  placeholderTextColor={t.textFaint}
                />
              </View>
              <View style={s.field}>
                <Text style={[s.label, { color: t.textSub }]}>Location *</Text>
                <TextInput
                  style={inputStyle}
                  value={form.location}
                  onChangeText={v => set('location', v)}
                  placeholder="e.g. Chomrong, Annapurna"
                  placeholderTextColor={t.textFaint}
                />
              </View>
            </View>

            <View style={s.fieldFull}>
              <Text style={[s.label, { color: t.textSub }]}>Trek Destination *</Text>
              <TouchableOpacity
                style={[inputStyle, s.dropdownBtn]}
                onPress={() => setDestOpen(p => !p)}>
                <Text style={{ color: form.trek_destination_id ? t.text : t.textFaint, flex: 1, fontSize: 13 }}>
                  {loadingDests
                    ? 'Loading...'
                    : form.trek_destination_name || 'Select a destination...'}
                </Text>
                <ChevronDown size={16} color={t.textFaint} strokeWidth={2} />
              </TouchableOpacity>
              {destOpen && (
                <View style={[s.dropdown, { backgroundColor: t.surface, borderColor: t.border }]}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {destinations.map(d => (
                      <TouchableOpacity
                        key={d.id}
                        style={[s.dropItem, { borderBottomColor: t.border }]}
                        onPress={() => {
                          set('trek_destination_id', d.id);
                          set('trek_destination_name', d.name);
                          setDestOpen(false);
                        }}>
                        <Text style={{ color: t.text, fontSize: 13 }}>{d.name}</Text>
                        <Text style={{ color: t.textFaint, fontSize: 11 }}>{d.region}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={s.row}>
              <View style={s.field}>
                <Text style={[s.label, { color: t.textSub }]}>Owner Contact *</Text>
                <TextInput
                  style={inputStyle}
                  value={form.owner_contact}
                  onChangeText={v => set('owner_contact', v)}
                  placeholder="+977-61-XXXXXX"
                  placeholderTextColor={t.textFaint}
                />
              </View>
              <View style={s.field}>
                <Text style={[s.label, { color: t.textSub }]}>Price per Package (NPR) *</Text>
                <TextInput
                  style={inputStyle}
                  value={form.price_per_package ? String(form.price_per_package) : ''}
                  onChangeText={v => set('price_per_package', v === '' ? 0 : Number(v.replace(/[^0-9]/g, '')))}
                  placeholder="e.g. 45000"
                  placeholderTextColor={t.textFaint}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={s.row}>
              <View style={s.field}>
                <Text style={[s.label, { color: t.textSub }]}>Capacity (guests)</Text>
                <TextInput
                  style={inputStyle}
                  value={String(form.capacity)}
                  onChangeText={v => set('capacity', Number(v.replace(/[^0-9]/g, '')) || 1)}
                  keyboardType="numeric"
                  placeholderTextColor={t.textFaint}
                />
              </View>
              <View style={s.field}>
                <Text style={[s.label, { color: t.textSub }]}>Image URL (optional)</Text>
                <TextInput
                  style={inputStyle}
                  value={form.image_url ?? ''}
                  onChangeText={v => set('image_url', v || null)}
                  placeholder="https://..."
                  placeholderTextColor={t.textFaint}
                />
              </View>
            </View>

            <View style={s.fieldFull}>
              <Text style={[s.label, { color: t.textSub }]}>Short Description</Text>
              <TextInput
                style={[inputStyle, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                value={form.description ?? ''}
                onChangeText={v => set('description', v)}
                placeholder="Describe the hotel in 2-3 sentences..."
                placeholderTextColor={t.textFaint}
                multiline
              />
            </View>
          </ScrollView>

          <View style={[s.footer, { borderTopColor: t.border }]}>
            <TouchableOpacity
              style={[s.cancelBtn, { borderColor: t.border, backgroundColor: t.surfaceElevated }]}
              onPress={onClose}>
              <Text style={{ color: t.textSub, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                  {hotel ? 'Save Changes' : 'Add Hotel'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 680,
    borderRadius: 18,
    borderWidth: 1,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '700' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 24, gap: 16 },
  row: { flexDirection: 'row', gap: 16 },
  field: { flex: 1 },
  fieldFull: { position: 'relative' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  dropdown: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 10,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  dropItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  saveBtn: {
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    minWidth: 120,
    alignItems: 'center',
  },
});
