import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Menu, Mountain } from 'lucide-react-native';
import { C } from '@/constants/theme';

interface HeaderProps {
  onMenuPress: () => void;
}

export default function Header({ onMenuPress }: HeaderProps) {
  return (
    <View style={s.container}>
      <View style={s.spacer} />
      <View style={s.titleRow}>
        <Mountain size={22} color={C.brand} strokeWidth={2.5} />
        <Text style={s.title}>TrekEasy</Text>
      </View>
      <TouchableOpacity onPress={onMenuPress} style={s.menuBtn} hitSlop={8}>
        <Menu size={22} color={C.white} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  spacer: { width: 36 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: C.white,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
