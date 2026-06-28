import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  TextInput,
} from 'react-native';
import {
  ArrowLeft, Mountain, Clock, MapPin, AlertTriangle, CheckCircle, Settings, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { itineraryApi, PersonalizedItinerary, ItineraryDay } from '@/services/apiService';
import { C, DIFFICULTY_COLOR } from '@/constants/theme';

const SUITABILITY_COLOR: Record<string, string> = {
  Low: C.red,
  Moderate: C.amber,
  High: C.green,
};

const PACE_OPTIONS = ['slow', 'normal', 'fast'] as const;
const FITNESS_OPTIONS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
const EXPERIENCE_OPTIONS = ['none', 'basic', 'moderate', 'extensive'] as const;
const HEALTH_OPTIONS = ['none', 'obesity', 'cardiovascular', 'joint', 'other'] as const;

function Selector<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={ss.selectorWrap}>
      <Text style={ss.selectorLabel}>{label}</Text>
      <View style={ss.selectorRow}>
        {options.map(o => (
          <TouchableOpacity
            key={o}
            onPress={() => onChange(o)}
            style={[ss.selectorOpt, value === o && ss.selectorOptActive]}
          >
            <Text style={[ss.selectorOptText, value === o && ss.selectorOptTextActive]}>
              {o.charAt(0).toUpperCase() + o.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function ItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<PersonalizedItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [pace, setPace] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('beginner');
  const [trekkingExperience, setTrekkingExperience] = useState<'none' | 'basic' | 'moderate' | 'extensive'>('none');
  const [targetDays, setTargetDays] = useState('');
  const [healthCondition, setHealthCondition] = useState<'none' | 'obesity' | 'cardiovascular' | 'joint' | 'other'>('none');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [groupSize, setGroupSize] = useState('');
  const [previousTreks, setPreviousTreks] = useState('');
  const [showPrefs, setShowPrefs] = useState(false);

  const fetchItinerary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await itineraryApi.getForTrek(id, {
        pace,
        fitnessLevel,
        trekkingExperience,
        targetDays: targetDays ? parseInt(targetDays, 10) : undefined,
        healthCondition,
        age: age ? parseInt(age, 10) : undefined,
        weight: weight ? parseInt(weight, 10) : undefined,
        groupSize: groupSize ? parseInt(groupSize, 10) : undefined,
        previousTreks: previousTreks ? parseInt(previousTreks, 10) : undefined,
      });
      if (result) {
        setData(result);
      } else {
        setError('Could not load itinerary');
      }
    } catch {
      setError('Failed to load itinerary');
    } finally {
      setLoading(false);
    }
  }, [id, pace, fitnessLevel, trekkingExperience, targetDays, healthCondition, age, weight, groupSize, previousTreks]);

  useEffect(() => {
    fetchItinerary();
  }, [fetchItinerary]);

  if (loading && !data) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.brand} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>{error || 'No itinerary found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const suitColor = SUITABILITY_COLOR[data!.suitability] || C.textFaint;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <ArrowLeft size={20} color={C.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Personalized Itinerary</Text>
          <TouchableOpacity onPress={() => setShowPrefs(v => !v)} style={s.headerBtn}>
            <Settings size={20} color={showPrefs ? C.brandLight : C.white} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Preferences Panel */}
        {showPrefs && (
          <View style={s.prefsPanel}>
            <Selector label="Pace" options={PACE_OPTIONS} value={pace} onChange={setPace} />
            <Selector label="Fitness" options={FITNESS_OPTIONS} value={fitnessLevel} onChange={setFitnessLevel} />
            <Selector label="Experience" options={EXPERIENCE_OPTIONS} value={trekkingExperience} onChange={setTrekkingExperience} />
            <Selector label="Health" options={HEALTH_OPTIONS} value={healthCondition} onChange={setHealthCondition} />
            <View style={ss.row}>
              <View style={ss.halfField}>
                <Text style={ss.selectorLabel}>Age</Text>
                <TextInput style={s.targetInput} value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="e.g. 30" placeholderTextColor={C.textFaint} />
              </View>
              <View style={ss.halfField}>
                <Text style={ss.selectorLabel}>Weight (kg)</Text>
                <TextInput style={s.targetInput} value={weight} onChangeText={setWeight} keyboardType="number-pad" placeholder="e.g. 70" placeholderTextColor={C.textFaint} />
              </View>
            </View>
            <View style={ss.row}>
              <View style={ss.halfField}>
                <Text style={ss.selectorLabel}>Group Size</Text>
                <TextInput style={s.targetInput} value={groupSize} onChangeText={setGroupSize} keyboardType="number-pad" placeholder="e.g. 4" placeholderTextColor={C.textFaint} />
              </View>
              <View style={ss.halfField}>
                <Text style={ss.selectorLabel}>Prev Treks Done</Text>
                <TextInput style={s.targetInput} value={previousTreks} onChangeText={setPreviousTreks} keyboardType="number-pad" placeholder="e.g. 2" placeholderTextColor={C.textFaint} />
              </View>
            </View>
            <View style={ss.selectorWrap}>
              <Text style={ss.selectorLabel}>Target Days (optional)</Text>
              <TextInput
                style={s.targetInput}
                value={targetDays}
                onChangeText={setTargetDays}
                keyboardType="number-pad"
                placeholder="e.g. 10"
                placeholderTextColor={C.textFaint}
              />
            </View>
            {loading && (
              <View style={ss.loadingRow}>
                <ActivityIndicator size="small" color={C.brand} />
                <Text style={ss.loadingText}>Regenerating...</Text>
              </View>
            )}
          </View>
        )}

        {/* Trek Name + Suitability */}
        <View style={s.titleSection}>
          <Text style={s.trekName}>{data!.trekName}</Text>
          <View style={[s.badge, { backgroundColor: suitColor + '20', borderColor: suitColor }]}>
            <Text style={[s.badgeText, { color: suitColor }]}>{data!.suitability}</Text>
          </View>
        </View>

        {/* Stats Summary */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Clock size={18} color={C.brand} strokeWidth={2} />
            <Text style={s.statVal}>{data!.totalDays} days</Text>
            <Text style={s.statLbl}>Total Duration</Text>
          </View>
          <View style={[s.statBox, s.statBoxBorder]}>
            <Mountain size={18} color={C.blue} strokeWidth={2} />
            <Text style={[s.statVal, { color: C.blue }]}>{data!.totalDistance} km</Text>
            <Text style={s.statLbl}>Total Distance</Text>
          </View>
        </View>

        {/* Caution Message */}
        {data!.cautionMessage ? (
          <View style={s.cautionBox}>
            <AlertTriangle size={16} color={C.amber} strokeWidth={2} />
            <Text style={s.cautionText}>{data!.cautionMessage}</Text>
          </View>
        ) : null}

        {/* Day Cards */}
        <Text style={s.sectionTitle}>Day-by-Day Plan</Text>
        {data!.itinerary.map((day, i) => (
          <DayCard key={i} day={day} isLast={i === data!.itinerary.length - 1} />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function DayCard({ day, isLast }: { day: ItineraryDay; isLast: boolean }) {
  const isRest = day.distance === 0 && day.estimatedHours === 0;

  return (
    <View style={s.dayCard}>
      <View style={s.dayHeader}>
        <View style={[s.dayDot, isRest && s.dayDotRest]}>
          <Text style={s.dayDotText}>{day.day}</Text>
        </View>
        {!isLast && <View style={s.dayLine} />}
      </View>

      <View style={[s.dayContent, isRest && s.dayContentRest]}>
        <View style={s.dayTopRow}>
          <Text style={[s.dayTitle, isRest && s.dayTitleRest]}>
            {isRest ? `${day.from} (Rest Day)` : `${day.from}  →  ${day.to}`}
          </Text>
          {isRest ? (
            <View style={s.restBadge}>
              <Text style={s.restBadgeText}>REST</Text>
            </View>
          ) : null}
        </View>

        {!isRest ? (
          <>
            <View style={s.statsGroup}>
              <View style={s.statChip}>
                <MapPin size={12} color={C.textMuted} />
                <Text style={s.chipText}>{day.distance} km</Text>
              </View>
              <View style={s.statChip}>
                <Mountain size={12} color={C.textMuted} />
                <Text style={s.chipText}>{day.elevationGain} m</Text>
              </View>
              <View style={s.statChip}>
                <Clock size={12} color={C.textMuted} />
                <Text style={s.chipText}>{day.estimatedHours} hrs</Text>
              </View>
            </View>

            {day.restStops.length > 0 && (
              <View style={s.restStops}>
                <CheckCircle size={12} color={C.green} />
                <Text style={s.restStopsText}>
                  Rest stops: {day.restStops.join(', ')}
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text style={s.restDesc}>{day.checkpoint}</Text>
        )}
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  selectorWrap: { marginBottom: 14 },
  selectorLabel: { color: C.textSub, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  selectorRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  selectorOpt: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  selectorOptActive: {
    backgroundColor: C.brandDim,
    borderColor: C.brand,
  },
  selectorOptText: { color: C.textMuted, fontSize: 13, fontWeight: '500' },
  selectorOptTextActive: { color: C.brandLight, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  halfField: { flex: 1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  loadingText: { color: C.textFaint, fontSize: 12 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: { color: C.textSub, fontSize: 16, marginBottom: 16 },
  backBtn: {
    backgroundColor: C.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: { color: C.white, fontWeight: '600' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
  },

  /* Prefs */
  prefsPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
  },
  targetInput: {
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: C.white,
    fontSize: 14,
  },

  /* Title Section */
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  trekName: {
    color: C.white,
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  statBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
  },
  statVal: { color: C.white, fontSize: 14, fontWeight: '700' },
  statLbl: { color: C.textFaint, fontSize: 11 },

  /* Caution */
  cautionBox: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderWidth: 1,
    borderColor: C.amber + '30',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  cautionText: {
    color: C.amber,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },

  /* Section Title */
  sectionTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 8,
  },

  /* Day Card */
  dayCard: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  dayHeader: {
    width: 36,
    alignItems: 'center',
    marginRight: 12,
  },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotRest: {
    backgroundColor: C.amber,
  },
  dayDotText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
  },
  dayLine: {
    width: 2,
    flex: 1,
    backgroundColor: C.border,
    marginTop: 4,
    minHeight: 12,
  },
  dayContent: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  dayContentRest: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: C.amber + '30',
  },
  dayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayTitle: {
    color: C.white,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  dayTitleRest: {
    color: C.amber,
  },
  restBadge: {
    backgroundColor: C.amber + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  restBadgeText: {
    color: C.amber,
    fontSize: 10,
    fontWeight: '700',
  },
  statsGroup: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.elevated,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    color: C.textMuted,
    fontSize: 11,
  },
  restStops: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  restStopsText: {
    color: C.green,
    fontSize: 11,
    flex: 1,
  },
  restDesc: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
});