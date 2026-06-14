import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { router } from 'expo-router';
import Header from '@/components/Header';
import DrawerMenu from '@/components/DrawerMenu';
import TrekCard from '@/components/TrekCard';
import FilterModal, { FilterState } from '@/components/FilterModal';
import LoginPromptModal from '@/components/LoginPromptModal';
import { DESTINATIONS } from '@/data/destinations';
import { useAuth } from '@/context/AuthContext';
import { C } from '@/constants/theme';

const DEFAULT_FILTERS: FilterState = {
  difficulty: 'All',
  maxDuration: 21,
  maxPrice: 300000,
};

const TRENDING = [...DESTINATIONS].sort((a, b) => b.likes - a.likes).slice(0, 3);

export default function ExploreScreen() {
  const { isLoggedIn } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const handleLike = useCallback(
    (id: string) => {
      if (!isLoggedIn) {
        setLoginMessage('Please log in to like a trek.');
        setLoginPrompt(true);
        return;
      }
      setLiked(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    },
    [isLoggedIn]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return DESTINATIONS.filter(t => {
      const matchSearch =
        !q ||
        t.displayTitle.toLowerCase().includes(q) ||
        t.parentName.toLowerCase().includes(q) ||
        t.keywords.some(k => k.toLowerCase().includes(q));
      const matchDiff = filters.difficulty === 'All' || t.difficulty === filters.difficulty;
      const matchDur = t.durationDays <= filters.maxDuration;
      const matchPrice = t.priceNPR <= filters.maxPrice;
      return matchSearch && matchDiff && matchDur && matchPrice;
    });
  }, [search, filters]);

  const isFiltered =
    filters.difficulty !== DEFAULT_FILTERS.difficulty ||
    filters.maxDuration !== DEFAULT_FILTERS.maxDuration ||
    filters.maxPrice !== DEFAULT_FILTERS.maxPrice ||
    search.length > 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Header onMenuPress={() => setDrawerOpen(true)} />

      {/* Search & Filter */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Search size={18} color={C.textFaint} strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            placeholder="Search treks..."
            placeholderTextColor={C.textFaint}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity
          onPress={() => setFilterOpen(true)}
          style={[s.filterBtn, isFiltered && s.filterBtnActive]}>
          <SlidersHorizontal
            size={20}
            color={isFiltered ? C.white : C.textFaint}
            strokeWidth={2}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            {/* Trending Now */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Trending Now</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {TRENDING.map(t => (
                  <TrekCard
                    key={t.id}
                    trek={t}
                    compact
                    isLiked={liked.has(t.id)}
                    onLike={() => handleLike(t.id)}
                    onPress={() => router.push(`/trek/${t.id}`)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={s.discoverHeader}>
              <Text style={s.sectionTitle}>Discover Treks</Text>
              <Text style={s.resultCount}>{filtered.length} treks</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TrekCard
            trek={item}
            isLiked={liked.has(item.id)}
            onLike={() => handleLike(item.id)}
            onPress={() => router.push(`/trek/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No treks match your filters.</Text>
            <TouchableOpacity
              style={s.clearBtn}
              onPress={() => {
                setSearch('');
                setFilters(DEFAULT_FILTERS);
              }}>
              <Text style={s.clearBtnText}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <FilterModal
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
        current={filters}
      />
      <LoginPromptModal
        visible={loginPrompt}
        onClose={() => setLoginPrompt(false)}
        message={loginMessage}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    color: C.white,
    fontSize: 14,
    marginLeft: 10,
    padding: 0,
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: C.brand,
    borderColor: C.brand,
  },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  section: { marginBottom: 20 },
  sectionTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  discoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultCount: { color: C.textFaint, fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: C.textFaint, fontSize: 15, marginBottom: 16 },
  clearBtn: {
    backgroundColor: C.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearBtnText: { color: C.white, fontWeight: '600' },
});
