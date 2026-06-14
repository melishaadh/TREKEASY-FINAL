import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Heart, Clock } from 'lucide-react-native';
import { Destination } from '@/data/destinations';
import { C, DIFFICULTY_COLOR } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface TrekCardProps {
  trek: Destination;
  onPress: () => void;
  onLike: () => void;
  isLiked: boolean;
  compact?: boolean;
}

export default function TrekCard({ trek, onPress, onLike, isLiked, compact }: TrekCardProps) {
  const diffColor = DIFFICULTY_COLOR[trek.difficulty] ?? C.textFaint;

  if (compact) {
    return (
      <TouchableOpacity onPress={onPress} style={s.compact} activeOpacity={0.85}>
        <Image source={{ uri: trek.image }} style={s.compactImage} resizeMode="cover" />
        <View style={[s.diffBadge, { backgroundColor: diffColor }]}>
          <Text style={s.diffBadgeText}>{trek.difficulty}</Text>
        </View>
        <View style={s.compactBody}>
          <Text style={s.compactName} numberOfLines={1}>{trek.displayTitle}</Text>
          <View style={s.compactRow}>
            <TouchableOpacity onPress={onLike} hitSlop={6} style={s.likeBtn}>
              <Heart
                size={14}
                color={isLiked ? C.red : C.textFaint}
                fill={isLiked ? C.red : 'transparent'}
                strokeWidth={2}
              />
              <Text style={s.compactLikes}>{trek.likes}</Text>
            </TouchableOpacity>
            <Text style={s.compactPrice}>
              {(trek.priceNPR / 1000).toFixed(0)}K
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={s.card} activeOpacity={0.88}>
      <Image source={{ uri: trek.image }} style={s.cardImage} resizeMode="cover" />

      <TouchableOpacity onPress={onLike} style={s.likeOverlay} hitSlop={6}>
        <Heart
          size={18}
          color={isLiked ? C.red : C.white}
          fill={isLiked ? C.red : 'transparent'}
          strokeWidth={2}
        />
      </TouchableOpacity>

      <View style={[s.diffBadge, { backgroundColor: diffColor }]}>
        <Text style={s.diffBadgeText}>{trek.difficulty}</Text>
      </View>

      <View style={s.cardBody}>
        <Text style={s.cardName} numberOfLines={1}>{trek.displayTitle}</Text>
        <Text style={s.cardParent} numberOfLines={1}>{trek.parentName}</Text>
        <View style={s.cardFooter}>
          <View style={s.cardMeta}>
            <Clock size={13} color={C.brand} strokeWidth={2} />
            <Text style={s.cardMetaText}>{trek.durationDays}d</Text>
            <Heart
              size={13}
              color={isLiked ? C.red : C.textFaint}
              fill={isLiked ? C.red : 'transparent'}
              strokeWidth={2}
            />
            <Text style={s.cardMetaText}>{trek.likes}</Text>
          </View>
          <Text style={s.cardPrice}>NPR {trek.priceNPR.toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  /* Full card */
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
  },
  cardImage: { width: '100%', height: 190 },
  likeOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  diffBadgeText: { color: C.white, fontSize: 11, fontWeight: '700' },
  cardBody: { padding: 14 },
  cardName: { color: C.white, fontSize: 15, fontWeight: '600' },
  cardParent: { color: C.textFaint, fontSize: 12, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMetaText: { color: C.textSub, fontSize: 12 },
  cardPrice: { color: C.brand, fontSize: 13, fontWeight: '700' },

  /* Compact card */
  compact: {
    width: width * 0.58,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  compactImage: { width: '100%', height: 130 },
  compactBody: { padding: 12 },
  compactName: { color: C.white, fontSize: 13, fontWeight: '600' },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  compactLikes: { color: C.textFaint, fontSize: 12 },
  compactPrice: { color: C.brand, fontSize: 13, fontWeight: '700' },
});
