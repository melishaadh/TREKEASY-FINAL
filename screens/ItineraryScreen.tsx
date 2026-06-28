import React, { useState } from 'react';
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
  ArrowLeft, Mountain, Clock, Map, MapPin, AlertTriangle, CheckCircle, Filter, X,
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
  targetDays: string;
  startLocation: string;
  finalDestination: string;
  age: string;
  weight: string;
  groupSize: string;
  previousTreks: string;
};

function Selector<T extends string>({
  label, options, value, onChange, required,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  required?: boolean;
}) {
  return (
    <View style={ss.selectorWrap}>
      <Text style={ss.selectorLabel}>{label}{required ? <Text style={{color: C.red}}> *</Text> : null}</Text>
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

function PrefsForm({ prefs, onChange, standardDuration }: { prefs: ItineraryPrefs; onChange: (p: ItineraryPrefs) => void; standardDuration?: number | null }) {
  const set = (partial: Partial<ItineraryPrefs>) => onChange({ ...prefs, ...partial });
  const [geoLoading, setGeoLoading] = useState(false);
  const detectLocation = async () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`,
        { headers: { 'User-Agent': 'TrekeasyApp/1.0' } }
      );
      const geo = await resp.json();
      const city = geo?.address?.city || geo?.address?.town || geo?.address?.village || geo?.address?.county || `${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`;
      set({ startLocation: city });
    } catch {
      set({ startLocation: 'Location unavailable' });
    } finally {
      setGeoLoading(false);
    }
  };
  return (
    <>
      <View style={ss.selectorWrap}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={ss.selectorLabel}>From (Your Location) <Text style={{color: C.red}}>*</Text></Text>
          <TouchableOpacity onPress={detectLocation} disabled={geoLoading}>
            <Text style={{ color: C.brandLight, fontSize: 12, fontWeight: '600' }}>
              {geoLoading ? 'Detecting…' : '📍 Detect'}
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={s.targetInput}
          value={prefs.startLocation}
          onChangeText={v => set({ startLocation: v })}
          placeholder="e.g. Kathmandu, Pokhara"
          placeholderTextColor={C.textFaint}
        />
      </View>
      <View style={ss.selectorWrap}>
        <Text style={ss.selectorLabel}>Final Destination</Text>
        <TextInput
          style={s.targetInput}
          value={prefs.finalDestination}
          onChangeText={v => set({ finalDestination: v })}
          placeholder="Leave blank to return to starting point"
          placeholderTextColor={C.textFaint}
        />
      </View>
      <Selector label="Pace" options={PACE_OPTIONS} value={prefs.pace} onChange={v => set({ pace: v })} required />
      <Selector label="Fitness" options={FITNESS_OPTIONS} value={prefs.fitnessLevel} onChange={v => set({ fitnessLevel: v })} required />
      <Selector label="Experience" options={EXPERIENCE_OPTIONS} value={prefs.trekkingExperience} onChange={v => set({ trekkingExperience: v })} required />
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
        <Text style={ss.selectorLabel}>Target Duration</Text>
        <TextInput
          style={s.targetInput}
          value={prefs.targetDays}
          onChangeText={v => set({ targetDays: v })}
          keyboardType="number-pad"
          placeholder={standardDuration ? `e.g. ${standardDuration} (default: standard ${standardDuration} days)` : "e.g. 10"}
          placeholderTextColor={C.textFaint}
        />
      </View>
    </>
  );
}

export default function ItineraryScreen() {
  const { id, duration: urlDuration } = useLocalSearchParams<{ id: string; duration?: string }>();
  const standardDuration = urlDuration ? parseInt(urlDuration, 10) : null;

  const [data, setData] = useState<PersonalizedItinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [screenState, setScreenState] = useState<'form' | 'loading' | 'results'>('form');

  const saved = loadPrefs();
  const [pace, setPace] = useState<'slow' | 'normal' | 'fast'>((saved.pace as any) || 'normal');
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>((saved.fitnessLevel as any) || 'beginner');
  const [trekkingExperience, setTrekkingExperience] = useState<'none' | 'basic' | 'moderate' | 'extensive'>((saved.trekkingExperience as any) || 'none');
  const [targetDays, setTargetDays] = useState(saved.targetDays || '');
  const [startLocation, setStartLocation] = useState(saved.startLocation || '');
  const [finalDestination, setFinalDestination] = useState(saved.finalDestination || '');
  const [age, setAge] = useState(saved.age || '');
  const [weight, setWeight] = useState(saved.weight || '');
  const [groupSize, setGroupSize] = useState(saved.groupSize || '');
  const [previousTreks, setPreviousTreks] = useState(saved.previousTreks || '');

  const [draft, setDraft] = useState<ItineraryPrefs>({
    pace, fitnessLevel, trekkingExperience,
    targetDays, startLocation, finalDestination, age, weight, groupSize, previousTreks,
  });

  const openFilter = () => {
    setDraft({ pace, fitnessLevel, trekkingExperience, targetDays, startLocation, finalDestination, age, weight, groupSize, previousTreks });
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setPace(draft.pace);
    setFitnessLevel(draft.fitnessLevel);
    setTrekkingExperience(draft.trekkingExperience);
    setTargetDays(draft.targetDays);
    setStartLocation(draft.startLocation);
    setFinalDestination(draft.finalDestination);
    setAge(draft.age);
    setWeight(draft.weight);
    setGroupSize(draft.groupSize);
    setPreviousTreks(draft.previousTreks);
    savePrefs({ ...draft });
    setFilterOpen(false);
    doGenerate(draft);
  };

  const doGenerate = async (prefs: ItineraryPrefs) => {
    setLoading(true);
    setError('');
    setScreenState('loading');
    try {
      const result = await itineraryApi.getForTrek(id, {
        pace: prefs.pace,
        fitnessLevel: prefs.fitnessLevel,
        trekkingExperience: prefs.trekkingExperience,
        targetDays: prefs.targetDays ? parseInt(prefs.targetDays, 10) : undefined,
        age: prefs.age ? parseInt(prefs.age, 10) : undefined,
        weight: prefs.weight ? parseInt(prefs.weight, 10) : undefined,
        groupSize: prefs.groupSize ? parseInt(prefs.groupSize, 10) : undefined,
        previousTreks: prefs.previousTreks ? parseInt(prefs.previousTreks, 10) : undefined,
        startLocation: prefs.startLocation || undefined,
        finalDestination: prefs.finalDestination || prefs.startLocation || undefined,
      });
      if (result) {
        setData(result);
        setScreenState('results');
      } else {
        setError('Could not load itinerary');
        setScreenState('form');
      }
    } catch {
      setError('Failed to load itinerary');
      setScreenState('form');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!draft.startLocation.trim()) {
      setError('Please enter your starting location');
      return;
    }
    setError('');
    savePrefs({ ...draft });
    doGenerate(draft);
  };

  // ─── Form screen ────────────────────────────────────────────────────────────────
  if (screenState === 'form') {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
              <ArrowLeft size={20} color={C.white} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Plan Your Trek</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={s.formIntro}>
            <Text style={s.formIntroTitle}>Customize Your Journey</Text>
            <Text style={s.formIntroSub}>
              Tell us about your trip to get a personalized itinerary.
              {standardDuration ? ` The standard trek is ${standardDuration} days.` : ''}
            </Text>
          </View>

          <View style={s.formBody}>
            <PrefsForm prefs={draft} onChange={setDraft} standardDuration={standardDuration} />

            {error ? (
              <View style={s.formError}>
                <AlertTriangle size={14} color={C.red} strokeWidth={2} />
                <Text style={s.formErrorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleGenerate}
              disabled={loading}
              style={[s.generateBtn, loading && s.generateBtnDisabled]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <>
                  <Map size={18} color={C.white} strokeWidth={2} />
                  <Text style={s.generateBtnText}>Generate Itinerary</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ─── Loading screen ──────────────────────────────────────────────────────────────
  if (screenState === 'loading') {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.brand} />
        <Text style={s.loadingText}>Creating your personalized itinerary…</Text>
      </View>
    );
  }

  // ─── Error state (after having data) ─────────────────────────────────────────────
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

  // ─── Results screen ──────────────────────────────────────────────────────────────
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

        {/* Route Info — full journey */}
        <View style={s.routeInfoCard}>
          <View style={s.routeInfoRow}>
            <MapPin size={14} color={C.brand} strokeWidth={2.5} />
            <Text style={s.routeInfoLabel}>From</Text>
            <Text style={s.routeInfoValue}>{data!.origin}</Text>
          </View>
          {data!.preTrekSummary ? (
            <Text style={s.preTrekHint}>→ {data!.preTrekSummary}</Text>
          ) : data!.origin !== data!.suggestedStart ? (
            <Text style={s.preTrekHint}>→ Travel to {data!.suggestedStart}</Text>
          ) : null}
          <View style={s.routeInfoRow}>
            <Text style={[s.routeInfoLabel, { marginLeft: 16 }]}>⛰️ Trek</Text>
            <Text style={s.routeInfoValue}>
              {data!.suggestedStart === data!.trekEnd
                ? `${data!.suggestedStart} area`
                : `${data!.suggestedStart} → ${data!.trekEnd}`}
            </Text>
          </View>
          <View style={s.routeInfoDivider} />
          <View style={s.routeInfoRow}>
            <MapPin size={14} color={C.brand} strokeWidth={2.5} />
            <Text style={s.routeInfoLabel}>End</Text>
            <Text style={s.routeInfoValue}>{data!.finalDestination}</Text>
          </View>
          {data!.postTrekSummary ? (
            <Text style={s.preTrekHint}>→ {data!.postTrekSummary}</Text>
          ) : data!.finalDestination !== data!.trekEnd ? (
            <Text style={s.preTrekHint}>→ Travel from {data!.trekEnd}</Text>
          ) : null}
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

const ACTIVITY_COLORS: Record<string, string> = {
  trekking: C.green,
  travel: C.brandLight,
  rest: C.amber,
  mixed: C.purple,
};
const ACTIVITY_LABELS: Record<string, string> = {
  trekking: 'TREK',
  travel: 'TRAVEL',
  rest: 'REST',
  mixed: 'MIXED',
};

function DayCard({ day, isLast }: { day: ItineraryDay; isLast: boolean }) {
  const ac = ACTIVITY_COLORS[day.activityType] || C.textFaint;
  const al = ACTIVITY_LABELS[day.activityType] || 'TREK';
  const isRest = day.activityType === 'rest';
  const isTravel = day.activityType === 'travel';

  const stats: { label: string; value: string }[] = [];
  if (day.distance > 0) stats.push({ label: 'Distance', value: `${day.distance} km` });
  if (day.elevationGain > 0) stats.push({ label: 'Altitude', value: `+${day.elevationGain} m` });
  if (day.estimatedHours > 0) stats.push({ label: 'Duration', value: `~${day.estimatedHours} hr${day.estimatedHours > 1 ? 's' : ''}` });

  const cardGlow = { backgroundColor: ac + '18', borderColor: ac + '50' };

  return (
    <View style={s.dayCard}>
      <View style={s.dayHeader}>
        <View style={[s.dayDot, isRest && s.dayDotRest, isTravel && s.dayDotTravel, { backgroundColor: ac }]}>
          <Text style={s.dayDotText}>{day.day}</Text>
        </View>
        {!isLast && <View style={s.dayLine} />}
      </View>

      <View style={[s.dayContent, cardGlow]}>
        {/* Top row: route + badge */}
        <View style={s.dayTopRow}>
          <View style={s.routeRow}>
            {isRest ? (
              <View style={[s.restIconWrap, { backgroundColor: ac + '20' }]}>
                <CheckCircle size={16} color={ac} strokeWidth={2.5} />
              </View>
            ) : (
              <MapPin size={14} color={ac} strokeWidth={2.5} />
            )}
            <Text style={[s.dayTitle, isRest && { color: ac }]} numberOfLines={1}>
              {isRest ? `${day.from}` : day.from === day.to ? `${day.from}` : `${day.from} → ${day.to}`}
            </Text>
          </View>
          <View style={[s.activityBadge, { backgroundColor: ac + '20', borderColor: ac }]}>
            <Text style={[s.activityBadgeText, { color: ac }]}>{al}</Text>
          </View>
        </View>

        {/* Stats Grid (trekking & mixed days) */}
        {stats.length > 0 && (
          <View style={s.statsGrid}>
            {stats.map((stat, i) => (
              <View key={i} style={s.statItem}>
                <View>
                  <Text style={s.statItemValue}>{stat.value}</Text>
                  <Text style={s.statItemLabel}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Checkpoint */}
        {!isRest && day.checkpoint && !day.checkpoint.toLowerCase().includes('travel from') && (
          <View style={s.checkpointRow}>
            <MapPin size={12} color={ac} strokeWidth={2.5} />
            <Text style={s.checkpointText}>{day.checkpoint}</Text>
          </View>
        )}

        {/* Description line (only if no stats shown) */}
        {stats.length === 0 && !isRest && (
          <Text style={s.dayDescription}>{day.description}</Text>
        )}

        {/* Overnight */}
        {!isRest && !isTravel && (
          <Text style={s.overnightLabel}>Overnight: {day.to}</Text>
        )}

        {/* Rest day hint */}
        {isRest && (
          <Text style={[s.restHint, { color: ac }]}>Recover & acclimatise · explore the area</Text>
        )}

        {/* Travel day hint */}
        {isTravel && (
          <Text style={[s.travelDesc, { color: ac }]}>{day.description}</Text>
        )}
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  selectorWrap: { marginBottom: 14 },
  selectorLabel: { color: C.white, fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
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
  statLbl: { color: C.textMuted, fontSize: 11, fontWeight: '500', marginTop: 2 },

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
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    flex: 1,
  },

  /* Route Info Card */
  routeInfoCard: {
    flexDirection: 'column',
    marginHorizontal: 20,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  routeInfoDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 12,
  },
  routeInfoLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeInfoValue: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  preTrekHint: {
    color: C.textMuted,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingBottom: 10,
    marginTop: -4,
    fontStyle: 'italic',
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
  activityBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dayDescription: {
    color: C.textSub,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 20,
  },
  overnightLabel: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
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
    color: C.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  restStops: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  restStopsText: {
    color: C.green,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  restDesc: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  restIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  restHint: {
    color: C.amber,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },

  /* Form Screen */
  formIntro: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  formIntroTitle: {
    color: C.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  formIntroSub: {
    color: C.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  formBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: C.red + '30',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  formErrorText: {
    color: C.red,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.brand,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingText: {
    color: C.textFaint,
    fontSize: 14,
    marginTop: 16,
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
