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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  ArrowLeft, Mountain, Clock, MapPin, AlertTriangle, CheckCircle, Filter, Sunrise, X,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { itineraryApi, PersonalizedItinerary, ItineraryDay } from '@/services/apiService';
import { C } from '@/constants/theme';

const SUITABILITY_COLOR: Record<string, string> = {
  Low: C.red,
  Moderate: C.amber,
  High: C.green,
};

const PACE_OPTIONS = ['slow', 'normal', 'fast'] as const;
const FITNESS_OPTIONS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
const EXPERIENCE_OPTIONS = ['none', 'basic', 'moderate', 'extensive'] as const;
const HEALTH_OPTIONS = ['none', 'obesity', 'cardiovascular', 'joint', 'other'] as const;

const PREFS_KEY = 'trekeasy_itinerary_prefs';

function loadPrefs(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePrefs(prefs: Record<string, string>) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

type ItineraryPrefs = {
  pace: 'slow' | 'normal' | 'fast';
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  trekkingExperience: 'none' | 'basic' | 'moderate' | 'extensive';
  healthCondition: 'none' | 'obesity' | 'cardiovascular' | 'joint' | 'other';
  targetDays: string;
  startLocation: string;
  age: string;
  weight: string;
  groupSize: string;
  previousTreks: string;
};

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

function PrefsForm({ prefs, onChange }: { prefs: ItineraryPrefs; onChange: (p: ItineraryPrefs) => void }) {
  const set = (partial: Partial<ItineraryPrefs>) => onChange({ ...prefs, ...partial });
  return (
    <>
      <View style={ss.selectorWrap}>
        <Text style={ss.selectorLabel}>Starting Point</Text>
        <TextInput
          style={s.targetInput}
          value={prefs.startLocation}
          onChangeText={v => set({ startLocation: v })}
          placeholder="e.g. Kathmandu, Pokhara"
          placeholderTextColor={C.textFaint}
        />
      </View>
      <Selector label="Pace" options={PACE_OPTIONS} value={prefs.pace} onChange={v => set({ pace: v })} />
      <Selector label="Fitness" options={FITNESS_OPTIONS} value={prefs.fitnessLevel} onChange={v => set({ fitnessLevel: v })} />
      <Selector label="Experience" options={EXPERIENCE_OPTIONS} value={prefs.trekkingExperience} onChange={v => set({ trekkingExperience: v })} />
      <Selector label="Health" options={HEALTH_OPTIONS} value={prefs.healthCondition} onChange={v => set({ healthCondition: v })} />
      <View style={ss.row}>
        <View style={ss.halfField}>
          <Text style={ss.selectorLabel}>Age</Text>
          <TextInput style={s.targetInput} value={prefs.age} onChangeText={v => set({ age: v })} keyboardType="number-pad" placeholder="e.g. 30" placeholderTextColor={C.textFaint} />
        </View>
        <View style={ss.halfField}>
          <Text style={ss.selectorLabel}>Weight (kg)</Text>
          <TextInput style={s.targetInput} value={prefs.weight} onChangeText={v => set({ weight: v })} keyboardType="number-pad" placeholder="e.g. 70" placeholderTextColor={C.textFaint} />
        </View>
      </View>
      <View style={ss.row}>
        <View style={ss.halfField}>
          <Text style={ss.selectorLabel}>Group Size</Text>
          <TextInput style={s.targetInput} value={prefs.groupSize} onChangeText={v => set({ groupSize: v })} keyboardType="number-pad" placeholder="e.g. 4" placeholderTextColor={C.textFaint} />
        </View>
        <View style={ss.halfField}>
          <Text style={ss.selectorLabel}>Prev Treks Done</Text>
          <TextInput style={s.targetInput} value={prefs.previousTreks} onChangeText={v => set({ previousTreks: v })} keyboardType="number-pad" placeholder="e.g. 2" placeholderTextColor={C.textFaint} />
        </View>
      </View>
      <View style={ss.selectorWrap}>
        <Text style={ss.selectorLabel}>Target Duration (optional)</Text>
        <TextInput
          style={s.targetInput}
          value={prefs.targetDays}
          onChangeText={v => set({ targetDays: v })}
          keyboardType="number-pad"
          placeholder="e.g. 10"
          placeholderTextColor={C.textFaint}
        />
      </View>
    </>
  );
}

export default function ItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<PersonalizedItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const saved = loadPrefs();
  const [pace, setPace] = useState<'slow' | 'normal' | 'fast'>((saved.pace as any) || 'normal');
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>((saved.fitnessLevel as any) || 'beginner');
  const [trekkingExperience, setTrekkingExperience] = useState<'none' | 'basic' | 'moderate' | 'extensive'>((saved.trekkingExperience as any) || 'none');
  const [targetDays, setTargetDays] = useState(saved.targetDays || '');
  const [startLocation, setStartLocation] = useState(saved.startLocation || '');
  const [healthCondition, setHealthCondition] = useState<'none' | 'obesity' | 'cardiovascular' | 'joint' | 'other'>((saved.healthCondition as any) || 'none');
  const [age, setAge] = useState(saved.age || '');
  const [weight, setWeight] = useState(saved.weight || '');
  const [groupSize, setGroupSize] = useState(saved.groupSize || '');
  const [previousTreks, setPreviousTreks] = useState(saved.previousTreks || '');

  const [draft, setDraft] = useState<ItineraryPrefs>({
    pace, fitnessLevel, trekkingExperience, healthCondition,
    targetDays, startLocation, age, weight, groupSize, previousTreks,
  });

  const openFilter = () => {
    setDraft({ pace, fitnessLevel, trekkingExperience, healthCondition, targetDays, startLocation, age, weight, groupSize, previousTreks });
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setPace(draft.pace);
    setFitnessLevel(draft.fitnessLevel);
    setTrekkingExperience(draft.trekkingExperience);
    setHealthCondition(draft.healthCondition);
    setTargetDays(draft.targetDays);
    setStartLocation(draft.startLocation);
    setAge(draft.age);
    setWeight(draft.weight);
    setGroupSize(draft.groupSize);
    setPreviousTreks(draft.previousTreks);
    savePrefs({ ...draft });
    setFilterOpen(false);
  };

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
        startLocation: startLocation || undefined,
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
  }, [id, pace, fitnessLevel, trekkingExperience, targetDays, startLocation, healthCondition, age, weight, groupSize, previousTreks]);

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
          <TouchableOpacity onPress={openFilter} style={s.headerBtn}>
            <Filter size={20} color={C.white} strokeWidth={2} />
          </TouchableOpacity>
        </View>

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

        {/* Route Info */}
        <View style={s.routeInfoCard}>
          <View style={s.routeInfoRow}>
            <MapPin size={14} color={C.brand} strokeWidth={2.5} />
            <Text style={s.routeInfoLabel}>Starts at</Text>
            <Text style={s.routeInfoValue}>{data!.itinerary[0].from}</Text>
          </View>
          <View style={s.routeInfoDivider} />
          <View style={s.routeInfoRow}>
            <MapPin size={14} color={C.blue} strokeWidth={2.5} />
            <Text style={s.routeInfoLabel}>Ends at</Text>
            <Text style={s.routeInfoValue}>{data!.itinerary[data!.itinerary.length - 1].to}</Text>
          </View>
        </View>

        {/* Day Cards */}
        <Text style={s.sectionTitle}>Day-by-Day Plan</Text>
        {data!.itinerary.map((day, i) => (
          <DayCard key={i} day={day} isLast={i === data!.itinerary.length - 1} />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} onPress={() => setFilterOpen(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Your Preferences</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)} style={s.modalClose}>
                <X size={20} color={C.textSub} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              <PrefsForm prefs={draft} onChange={setDraft} />
            </ScrollView>
            <View style={s.modalFooter}>
              <TouchableOpacity onPress={() => setFilterOpen(false)} style={s.modalCancel}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={applyFilter} style={s.modalApply}>
                <Filter size={16} color={C.white} strokeWidth={2} />
                <Text style={s.modalApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function DayCard({ day, isLast }: { day: ItineraryDay; isLast: boolean }) {
  const isTravel = day.checkpoint?.startsWith('Travel from');
  const isRest = !isTravel && day.distance === 0 && day.estimatedHours === 0;

  if (isTravel) {
    return (
      <View style={s.dayCard}>
        <View style={s.dayHeader}>
          <View style={[s.dayDot, s.dayDotTravel]}>
            <Text style={s.dayDotText}>{day.day}</Text>
          </View>
          {!isLast && <View style={s.dayLine} />}
        </View>
        <View style={[s.dayContent, s.dayContentTravel]}>
          <View style={s.dayTopRow}>
            <View style={s.routeRow}>
              <MapPin size={14} color={C.blue} strokeWidth={2.5} />
              <Text style={[s.dayTitle, { color: C.blue }]} numberOfLines={2}>
                {day.from}  →  {day.to}
              </Text>
            </View>
            <View style={s.travelBadge}>
              <Text style={s.travelBadgeText}>TRAVEL</Text>
            </View>
          </View>
          <Text style={s.travelDesc}>{day.checkpoint}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.dayCard}>
      <View style={s.dayHeader}>
        <View style={[s.dayDot, isRest && s.dayDotRest]}>
          <Text style={s.dayDotText}>{day.day}</Text>
        </View>
        {!isLast && <View style={s.dayLine} />}
      </View>

      <View style={[s.dayContent, isRest && s.dayContentRest]}>
        {/* Route */}
        <View style={s.dayTopRow}>
          <View style={s.routeRow}>
            {isRest ? (
              <View style={s.restIconWrap}>
                <CheckCircle size={16} color={C.amber} strokeWidth={2.5} />
              </View>
            ) : (
              <MapPin size={14} color={C.brand} strokeWidth={2.5} />
            )}
            <Text style={[s.dayTitle, isRest && s.dayTitleRest]} numberOfLines={2}>
              {isRest ? `${day.from}` : `${day.from}  →  ${day.to}`}
            </Text>
          </View>
          {isRest ? (
            <View style={s.restBadge}>
              <Text style={s.restBadgeText}>REST</Text>
            </View>
          ) : null}
        </View>

        {isRest ? (
          <>
            <Text style={s.restDesc}>{day.checkpoint}</Text>
            <View style={s.restIconRow}>
              <Sunrise size={14} color={C.amber} strokeWidth={2} />
              <Text style={s.restHint}>Acclimatization & recovery day</Text>
            </View>
          </>
        ) : (
          <>
            <View style={s.statsGrid}>
              <View style={s.statItem}>
                <MapPin size={13} color={C.brand} strokeWidth={2.5} />
                <View>
                  <Text style={s.statItemValue}>{day.distance} km</Text>
                  <Text style={s.statItemLabel}>Distance</Text>
                </View>
              </View>
              <View style={s.statItem}>
                <Mountain size={13} color={C.brand} strokeWidth={2.5} />
                <View>
                  <Text style={s.statItemValue}>+{day.elevationGain} m</Text>
                  <Text style={s.statItemLabel}>Elevation</Text>
                </View>
              </View>
              <View style={s.statItem}>
                <Clock size={13} color={C.brand} strokeWidth={2.5} />
                <View>
                  <Text style={s.statItemValue}>{day.estimatedHours} hrs</Text>
                  <Text style={s.statItemLabel}>Est. Time</Text>
                </View>
              </View>
            </View>

            {day.elevationGain > 0 && (
              <View style={s.elevBar}>
                <View style={[s.elevFill, { width: Math.min((day.elevationGain / 1500) * 100, 100) + '%' }]} />
              </View>
            )}

            {day.checkpoint ? (
              <View style={s.checkpointRow}>
                <MapPin size={11} color={C.textFaint} strokeWidth={2} />
                <Text style={s.checkpointText}>Via {day.checkpoint}</Text>
              </View>
            ) : null}

            {day.restStops.length > 0 && (
              <View style={s.restStops}>
                <CheckCircle size={11} color={C.green} strokeWidth={2.5} />
                <Text style={s.restStopsText}>
                  Rest: {day.restStops.join(' → ')}
                </Text>
              </View>
            )}
          </>
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

  /* Target input (shared) */
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

  /* Route Info Card */
  routeInfoCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  routeInfoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  routeInfoDivider: {
    width: 1,
    backgroundColor: C.border,
  },
  routeInfoLabel: {
    color: C.textFaint,
    fontSize: 11,
    fontWeight: '500',
  },
  routeInfoValue: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
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
    marginBottom: 6,
  },
  dayHeader: {
    width: 40,
    alignItems: 'center',
    marginRight: 10,
  },
  dayDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  dayDotRest: {
    backgroundColor: C.amber,
    shadowColor: C.amber,
  },
  dayDotTravel: {
    backgroundColor: C.blue,
    shadowColor: C.blue,
  },
  dayDotText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '800',
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
    padding: 14,
    marginBottom: 8,
  },
  dayContentRest: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: C.amber + '30',
  },
  dayContentTravel: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderColor: C.blue + '30',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  restIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.amber + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    lineHeight: 20,
  },
  dayTitleRest: {
    color: C.amber,
  },
  restBadge: {
    backgroundColor: C.amber + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
  },
  restBadgeText: {
    color: C.amber,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  travelBadge: {
    backgroundColor: C.blue + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
  },
  travelBadgeText: {
    color: C.blue,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  travelDesc: {
    color: C.blue,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.elevated,
    borderRadius: 10,
    padding: 8,
  },
  statItemValue: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
  },
  statItemLabel: {
    color: C.textFaint,
    fontSize: 9,
    marginTop: 1,
  },
  elevBar: {
    height: 4,
    backgroundColor: C.elevated,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  elevFill: {
    height: '100%',
    backgroundColor: C.brand,
    borderRadius: 2,
  },
  checkpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  checkpointText: {
    color: C.textFaint,
    fontSize: 11,
  },
  restStops: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  restStopsText: {
    color: C.green,
    fontSize: 11,
    flex: 1,
  },
  restDesc: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  restIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  restHint: {
    color: C.amber,
    fontSize: 11,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    color: C.white,
    fontSize: 17,
    fontWeight: '700',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 8,
  },
  modalCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalCancelText: {
    color: C.textSub,
    fontSize: 14,
    fontWeight: '600',
  },
  modalApply: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: C.brand,
  },
  modalApplyText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
