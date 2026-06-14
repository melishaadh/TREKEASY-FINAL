import React, { useState } from 'react';
import { View, Text, StatusBar, StyleSheet } from 'react-native';
import { Building2 } from 'lucide-react-native';
import Header from '@/components/Header';
import DrawerMenu from '@/components/DrawerMenu';
import { C } from '@/constants/theme';

export default function HotelsScreen() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Header onMenuPress={() => setDrawerOpen(true)} />
      <View style={s.center}>
        <View style={s.iconWrap}>
          <Building2 size={38} color={C.brand} strokeWidth={1.5} />
        </View>
        <Text style={s.title}>Hotels</Text>
        <Text style={s.subtitle}>
          Hotel bookings for trek destinations{'\n'}are coming soon. Stay tuned!
        </Text>
      </View>
      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { color: C.white, fontSize: 22, fontWeight: '700', marginBottom: 10 },
  subtitle: {
    color: C.textFaint,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
