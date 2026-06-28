import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { X } from 'lucide-react-native';
import Slider from '@/components/Slider';
import { C } from '@/constants/theme';

export interface FilterState {
  difficulty: string;
  maxDuration: number;
  maxPrice: number;
}

const DEFAULT_FILTERS: FilterState = {
  difficulty: 'All',
  maxDuration: 21,
  maxPrice: 300000,
};

const DIFFICULTIES = ['All', 'Easy', 'Moderate', 'Hard'];

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  current: FilterState;
}

export default function FilterModal({ visible, onClose, onApply, current }: FilterModalProps) {
  const [difficulty, setDifficulty] = useState(current.difficulty);
  const [maxDuration, setMaxDuration] = useState(current.maxDuration);
  const [maxPrice, setMaxPrice] = useState(current.maxPrice);

  const handleApply = () => {
    onApply({ difficulty, maxDuration, maxPrice });
    onClose();
  };

  const handleReset = () => {
    setDifficulty(DEFAULT_FILTERS.difficulty);
    setMaxDuration(DEFAULT_FILTERS.maxDuration);
    setMaxPrice(DEFAULT_FILTERS.maxPrice);
    onApply(DEFAULT_FILTERS);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Filter Treks</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color={C.textFaint} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Difficulty select */}
            <Text style={s.sectionLabel}>Difficulty</Text>
            <View style={s.diffRow}>
              {DIFFICULTIES.map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDifficulty(d)}
                  style={[s.diffChip, difficulty === d && s.diffChipActive]}>
                  <Text style={[s.diffChipText, difficulty === d && s.diffChipTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Duration slider */}
            <Slider
              label="Duration"
              min={3}
              max={21}
              step={1}
              value={maxDuration}
              onValueChange={setMaxDuration}
              formatValue={v => `${v} days`}
            />

            {/* Price slider */}
            <Slider
              label="Max Price"
              min={30000}
              max={300000}
              step={10000}
              value={maxPrice}
              onValueChange={setMaxPrice}
              formatValue={v => `NPR ${(v / 1000).toFixed(0)}K`}
            />

            {/* Buttons */}
            <View style={s.btnRow}>
              <TouchableOpacity onPress={handleReset} style={s.resetBtn}>
                <Text style={s.resetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleApply} style={s.applyBtn}>
                <Text style={s.applyText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 24 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 14,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: C.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: { color: C.white, fontSize: 19, fontWeight: '700' },
  sectionLabel: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  diffRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
  },
  diffChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.elevated,
  },
  diffChipActive: { backgroundColor: C.brand, borderColor: C.brand },
  diffChipText: { color: C.textSub, fontSize: 13, fontWeight: '500' },
  diffChipTextActive: { color: C.white, fontWeight: '700' },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  resetText: { color: C.textSub, fontSize: 15, fontWeight: '600' },
  applyBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: C.brand,
  },
  applyText: { color: C.white, fontSize: 15, fontWeight: '700' },
});
