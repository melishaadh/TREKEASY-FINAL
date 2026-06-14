import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, User } from 'lucide-react-native';
import { C } from '@/constants/theme';

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.5;

export default function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />

        <View style={[s.drawer, { width: DRAWER_WIDTH }]}>
          {Platform.OS !== 'web' ? (
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, s.webBg]} />
          )}

          <View style={s.content}>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <X size={18} color={C.white} strokeWidth={2} />
            </TouchableOpacity>

            <Text style={s.sectionLabel}>Menu</Text>

            <TouchableOpacity style={s.menuItem} onPress={onClose}>
              <View style={s.iconWrap}>
                <User size={20} color={C.brand} strokeWidth={2} />
              </View>
              <Text style={s.menuText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  drawer: {
    height: '100%',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  webBg: {
    backgroundColor: 'rgba(18,18,18,0.92)',
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    color: C.brand,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 20,
    marginTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15,82,56,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { color: C.white, fontSize: 15, fontWeight: '500' },
});
