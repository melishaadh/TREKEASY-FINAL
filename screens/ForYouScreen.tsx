import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import Header from '@/components/Header';
import DrawerMenu from '@/components/DrawerMenu';
import { C } from '@/constants/theme';

export default function ForYouScreen() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Header onMenuPress={() => setDrawerOpen(true)} />

      <View style={s.body}>
        <View style={s.banner}>
          <View style={s.bannerRow}>
            <Sparkles size={18} color={C.brand} strokeWidth={2} />
            <Text style={s.bannerTag}>Curated For You</Text>
          </View>
          <Text style={s.bannerTitle}>
            Discover treks matched{'\n'}to your style.
          </Text>
          <Text style={s.bannerSub}>
            Personalized recommendations powered by your preferences.
          </Text>
        </View>
      </View>

      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  banner: {
    backgroundColor: 'rgba(15,82,56,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(15,82,56,0.32)',
    borderRadius: 20,
    padding: 22,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  bannerTag: {
    color: C.brand,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  bannerTitle: {
    color: C.white,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 8,
  },
  bannerSub: {
    color: C.textFaint,
    fontSize: 13,
    lineHeight: 20,
  },
});
