import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Heart, Mountain, Clock, Users, TrendingUp, Map, CheckCircle } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import LoginPromptModal from '@/components/LoginPromptModal';
import { DESTINATIONS } from '@/data/destinations';
import { treksApi, Trek } from '@/services/apiService';
import { useAuth } from '@/context/AuthContext';
import { C, DIFFICULTY_COLOR } from '@/constants/theme';

const { width } = Dimensions.get('window');

function mapDetailTrek(t: Trek) {
  return {
    id: t.id,
    displayTitle: t.name,
    parentName: t.region,
    difficulty: t.difficulty,
    durationDays: t.duration,
    maxAltitude: t.maxAltitude,
    priceNPR: t.price,
    description: t.description,
    keywords: t.keywords || [],
    image: t.imageUrl ?? '',
    likes: 0,
    itinerary: t.routeStages.map(s => ({
      day: s.day,
      title: `${s.from} → ${s.to}`,
      description: `Distance: ${s.distance}km | Elevation: ${s.elevationGain}m | Est. Time: ${s.estimatedHours}hrs${s.checkpoint ? ` | Via: ${s.checkpoint}` : ''}`,
    })),
  };
}

export default function TrekDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoggedIn } = useAuth();
  const [trek, setTrek] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await treksApi.getById(id);
        if (data) {
          setTrek(mapDetailTrek(data));
        } else {
          const fallback = DESTINATIONS.find(t => t.id === id);
          if (fallback) setTrek(fallback);
        }
      } catch {
        const fallback = DESTINATIONS.find(t => t.id === id);
        if (fallback) setTrek(fallback);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.brand} />
      </View>
    );
  }

  if (!trek) {
    return (
      <View style={s.notFound}>
        <Text style={s.notFoundText}>Trek not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const diffColor = DIFFICULTY_COLOR[trek.difficulty] ?? C.textFaint;
  const trekImage = typeof trek.image === 'number' ? trek.image : { uri: trek.image || '' };

  const handleLike = () => {
    if (!isLoggedIn) {
      setLoginMessage('Please log in to like this trek.');
      setLoginPrompt(true);
      return;
    }
    setIsLiked(v => !v);
  };

  const handleCreateGroup = () => {
    if (!isLoggedIn) {
      setLoginMessage('Please log in to create a group for this trek.');
      setLoginPrompt(true);
      return;
    }
    router.push('/chatroom');
  };

  const handleViewItinerary = () => {
    router.push(`/trek/${id}/itinerary?duration=${trek.durationDays}`);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Hero */}
        <View style={s.heroWrap}>
          <Image source={trekImage} style={s.heroImage} resizeMode="cover" />
          <View style={s.heroScrim} />

          <TouchableOpacity onPress={() => router.back()} style={s.heroBackBtn}>
            <ArrowLeft size={20} color={C.white} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLike} style={s.heroLikeBtn}>
            <Heart
              size={20}
              color={isLiked ? C.red : C.white}
              fill={isLiked ? C.red : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>

          <View style={[s.heroDiff, { backgroundColor: diffColor }]}>
            <Text style={s.heroDiffText}>{trek.difficulty}</Text>
          </View>
        </View>

        {/* Body */}
        <View style={s.body}>
          <Text style={s.trekTitle}>{trek.displayTitle}</Text>
          <Text style={s.trekParent}>{trek.parentName}</Text>

          {/* Stats: Duration | Difficulty | Altitude */}
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Clock size={18} color={C.brand} strokeWidth={2} />
              <Text style={s.statVal}>{trek.durationDays} days</Text>
              <Text style={s.statLbl}>Duration</Text>
            </View>
            <View style={[s.statBox, s.statBoxBorder]}>
              <Mountain size={18} color={diffColor} strokeWidth={2} />
              <Text style={[s.statVal, { color: diffColor }]}>{trek.difficulty}</Text>
              <Text style={s.statLbl}>Difficulty</Text>
            </View>
            <View style={s.statBox}>
              <TrendingUp size={18} color={C.blue} strokeWidth={2} />
              <Text style={[s.statVal, { color: C.blue }]}>{trek.maxAltitude.toLocaleString()} m</Text>
              <Text style={s.statLbl}>Altitude</Text>
            </View>
          </View>

          {/* About */}
          <Text style={s.heading}>About This Trek</Text>
          <Text style={s.description}>{trek.description}</Text>

          {/* Highlights */}
          {trek.keywords && trek.keywords.length > 0 && (
            <>
              <Text style={s.heading}>Highlights</Text>
              <View style={s.highlightsRow}>
                {[...new Set(trek.keywords)].slice(0, 8).map((kw: string) => (
                  <View key={kw} style={s.highlightBadge}>
                    <CheckCircle size={12} color={C.green} strokeWidth={2.5} />
                    <Text style={s.highlightText}>{kw}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Photo Gallery */}
          <Text style={s.heading}>Gallery</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.galleryScroll}>
            {[trekImage, trekImage, trekImage].map((src, i) => (
              <Image
                key={i}
                source={src}
                style={s.galleryImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Details Grid */}
          <Text style={s.heading}>Quick Facts</Text>
          <View style={s.detailsGrid}>
            <View style={s.detailCard}>
              <Mountain size={16} color={C.brand} strokeWidth={2} />
              <Text style={s.detailVal}>{trek.maxAltitude.toLocaleString()} m</Text>
              <Text style={s.detailLbl}>Max Altitude</Text>
            </View>
            <View style={s.detailCard}>
              <Clock size={16} color={C.brand} strokeWidth={2} />
              <Text style={s.detailVal}>{trek.durationDays} days</Text>
              <Text style={s.detailLbl}>Duration</Text>
            </View>
            <View style={s.detailCard}>
              <TrendingUp size={16} color={C.brand} strokeWidth={2} />
              <Text style={s.detailVal}>{trek.difficulty}</Text>
              <Text style={s.detailLbl}>Difficulty</Text>
            </View>
            <View style={s.detailCard}>
              <Map size={16} color={C.brand} strokeWidth={2} />
              <Text style={s.detailVal}>{trek.parentName}</Text>
              <Text style={s.detailLbl}>Region</Text>
            </View>
          </View>

          <View style={{ height: 130 }} />
        </View>
      </ScrollView>

      {/* Glassmorphic Footer */}
      <View style={s.footerWrap}>
        {Platform.OS !== 'web' ? (
          <BlurView intensity={65} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.footerWebBg]} />
        )}
        <View style={s.footerBorder} />
        <View style={s.footerContent}>
          <View>
            <Text style={s.footerLabel}>Starting from</Text>
            <Text style={s.footerPrice}>NPR {trek.priceNPR.toLocaleString()}</Text>
          </View>
          <View style={s.footerButtons}>
            <TouchableOpacity onPress={handleViewItinerary} style={s.itineraryBtn}>
              <Map size={18} color={C.white} strokeWidth={2} />
              <Text style={s.itineraryBtnText}>Itinerary</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreateGroup} style={s.groupBtn}>
              <Users size={18} color={C.white} strokeWidth={2} />
              <Text style={s.groupBtnText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

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
  notFound: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: { color: C.white, fontSize: 18, marginBottom: 16 },
  backBtn: {
    backgroundColor: C.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: { color: C.white, fontWeight: '600' },

  /* Hero */
  heroWrap: { position: 'relative', height: 300 },
  heroImage: { width, height: 300 },
  heroScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  heroBackBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLikeBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDiff: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  heroDiffText: { color: C.white, fontSize: 12, fontWeight: '700' },

  /* Body */
  body: { paddingHorizontal: 20, paddingTop: 20 },
  trekTitle: { color: C.white, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  trekParent: { color: C.textMuted, fontSize: 14, fontWeight: '500', marginTop: 4, marginBottom: 20 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  statBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
  },
  statVal: { color: C.white, fontSize: 14, fontWeight: '700' },
  statLbl: { color: C.textMuted, fontSize: 11, fontWeight: '500', marginTop: 2 },

  heading: {
    color: C.white,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
  },
  description: {
    color: C.textSub,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 24,
    marginBottom: 20,
  },

  /* Highlights */
  highlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  highlightText: { color: C.textSub, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },

  /* Gallery */
  galleryScroll: { marginBottom: 20 },
  galleryImage: {
    width: 260,
    height: 180,
    borderRadius: 14,
    marginRight: 10,
  },

  /* Details Grid */
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  detailCard: {
    width: (width - 50) / 2,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  detailVal: { color: C.white, fontSize: 14, fontWeight: '700' },
  detailLbl: { color: C.textMuted, fontSize: 11, fontWeight: '500', marginTop: 2 },

  /* Glassmorphic Footer */
  footerWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  footerWebBg: {
    backgroundColor: 'rgba(18,18,18,0.88)',
  },
  footerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 16,
    paddingBottom: 28,
  },
  footerLabel: { color: C.textFaint, fontSize: 11, marginBottom: 2 },
  footerPrice: { color: C.brand, fontSize: 22, fontWeight: '700' },
  footerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  itineraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  itineraryBtnText: { color: C.white, fontSize: 14, fontWeight: '600' },
  groupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.brand,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  groupBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },
});
