import React, { useState, useMemo, useRef } from 'react';
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
  ArrowLeft, Mountain, Clock, Map, MapPin, AlertTriangle, CheckCircle, Filter, X, Info,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { itineraryApi, PersonalizedItinerary, ItineraryDay, ActivityDetail } from '@/services/apiService';
import { C } from '@/constants/theme';

const COMMON_LOCATIONS = [
  'Kathmandu', 'Pokhara', 'Lukla', 'Bhaktapur', 'Lalitpur',
  'Syabrubesi', 'Sundarijal', 'Besisahar', 'Arughat', 'Soti Khola',
  'Jiri', 'Tumlingtar', 'Simigaon', 'Juphal', 'Nepalgunj',
  'Chitwan', 'Bharatpur', 'Gorkha', 'Bandipur', 'Nuwakot',
  'Dhulikhel', 'Nagarkot', 'Kakani', 'Damak', 'Biratnagar',
  'Janakpur', 'Butwal', 'Hetauda', 'Dhangadhi', 'Mahendranagar',
];

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

function LocationInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<TextInput>(null);

  const suggestions = useMemo(() => {
    if (!draft.trim()) return [];
    const q = draft.toLowerCase();
    return COMMON_LOCATIONS.filter(l => l.toLowerCase().includes(q)).slice(0, 8);
  }, [draft]);

  const select = (loc: string) => {
    setDraft(loc);
    onChange(loc);
    setFocused(false);
    inputRef.current?.blur();
  };

  return (
    <View>
      <TextInput
        ref={inputRef}
        style={s.targetInput}
        value={draft}
        onChangeText={v => { setDraft(v); onChange(v); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        placeholderTextColor={C.textFaint}
      />
      {focused && suggestions.length > 0 && (
        <View style={s.suggestionsList}>
          {suggestions.map(loc => (
            <TouchableOpacity key={loc} style={s.suggestionItem} onPress={() => select(loc)} activeOpacity={0.7}>
              <Text style={s.suggestionText}>{loc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
          <Text style={ss.selectorLabel}>From (Your Location) <Text style={{color: C.red}}> *</Text></Text>
          <TouchableOpacity onPress={detectLocation} disabled={geoLoading}>
            <Text style={{ color: C.brandLight, fontSize: 12, fontWeight: '600' }}>
              {geoLoading ? 'Detecting...' : 'Detect'}
            </Text>
          </TouchableOpacity>
        </View>
        <LocationInput
          value={prefs.startLocation}
          onChange={v => set({ startLocation: v })}
          placeholder="e.g. Kathmandu, Pokhara"
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
          placeholder={standardDuration ? `e.g. ${standardDuration} (default: ${standardDuration} days)` : "e.g. 10"}
          placeholderTextColor={C.textFaint}
        />
      </View>
    </>
  );
}

const ACTIVITY_ICONS: Record<string, string> = {
  road_travel: 'Drive',
  flight: 'Fly',
  trekking: 'Hike',
  rest: 'Rest',
  acclimatization: 'Acclimate',
  checkpoint_stop: 'Stop',
  meal_break: 'Meal',
  recovery_break: 'Recover',
  sightseeing: 'Explore',
};

function ActivityRow({ activity, isLast }: { activity: ActivityDetail; isLast: boolean }) {
  const label = ACTIVITY_ICONS[activity.type] || activity.type;
  const color = activity.type === 'trekking' ? C.green
    : activity.type === 'rest' || activity.type === 'acclimatization' ? C.amber
    : activity.type === 'road_travel' || activity.type === 'flight' ? C.blue
    : C.textMuted;

  return (
    <View style={s.activityRow}>
      <View style={s.activityTimeline}>
        <View style={[s.activityDot, { backgroundColor: color }]} />
        {!isLast && <View style={[s.activityLine, { backgroundColor: C.border }]} />}
      </View>
      <View style={s.activityBody}>
        <View style={s.activityHead}>
          <Text style={[s.activityLabel, { color }]}>{label}</Text>
          {activity.durationHours > 0 && (
            <Text style={s.activityTime}>{activity.durationHours.toFixed(1)}h</Text>
          )}
        </View>
        <Text style={s.activityRoute} numberOfLines={1}>
          {activity.from === activity.to ? activity.from : `${activity.from}  →  ${activity.to}`}
        </Text>
        {activity.description && activity.type !== 'rest' && activity.type !== 'acclimatization' ? (
          <Text style={s.activityDesc}>{activity.description}</Text>
        ) : null}
      </View>
    </View>
  );
}

function DayCard({ day }: { day: ItineraryDay }) {
  const isRest = day.activities.every(a => a.type === 'rest' || a.type === 'acclimatization');
  const isTravel = day.activities.every(a => a.type === 'road_travel' || a.type === 'flight');
  const dotColor = isRest ? C.amber : isTravel ? C.blue : C.green;

  return (
    <View style={s.dayCard}>
      <View style={s.dayCardHead}>
        <View style={[s.dayNumDot, { backgroundColor: dotColor }]}>
          <Text style={s.dayNumText}>{day.day}</Text>
        </View>
        <View style={s.dayInfo}>
          <Text style={s.dayRoute} numberOfLines={1}>
            {isRest
              ? day.overnightLocation || 'Rest day'
              : `${day.activities[0]?.from || ''}  →  ${day.overnightLocation || ''}`}
          </Text>
          <View style={s.dayMeta}>
            {day.totalHours > 0 && (
              <View style={[s.dayChip, { backgroundColor: C.brandDim, borderColor: C.brand + '40' }]}>
                <Clock size={11} color={C.brandLight} strokeWidth={2.5} />
                <Text style={[s.dayChipText, { color: C.brandLight }]}>{day.totalHours.toFixed(1)}h</Text>
              </View>
            )}
            {day.totalDistance > 0 && (
              <View style={[s.dayChip, { backgroundColor: C.blue + '15', borderColor: C.blue + '30' }]}>
                <Mountain size={11} color={C.blue} strokeWidth={2.5} />
                <Text style={[s.dayChipText, { color: C.blue }]}>{day.totalDistance.toFixed(1)} km</Text>
              </View>
            )}
            {day.totalElevationGain > 0 && (
              <View style={[s.dayChip, { backgroundColor: C.green + '15', borderColor: C.green + '30' }]}>
                <Text style={[s.dayChipText, { color: C.green }]}>+{Math.round(day.totalElevationGain)}m</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={s.dayActivities}>
        {day.activities.map((act, i) => (
          <ActivityRow key={i} activity={act} isLast={i === day.activities.length - 1} />
        ))}
      </View>

      {day.notes.length > 0 ? (
        <View style={s.dayNotes}>
          {day.notes.map((note, i) => (
            <View key={i} style={s.dayNoteRow}>
              <Info size={11} color={C.amber} strokeWidth={2} />
              <Text style={s.dayNoteText}>{note}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
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
        <Text style={s.loadingText}>Creating your personalized itinerary...</Text>
      </View>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────────────
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

  // ─── Rejection state ──────────────────────────────────────────────────────────────
  if (data?.rejectionReason) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <ArrowLeft size={20} color={C.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Plan Unavailable</Text>
          <TouchableOpacity onPress={openFilter} style={s.headerBtn}>
            <Filter size={20} color={C.white} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={s.rejectionContainer}>
          <View style={s.rejectionIcon}>
            <AlertTriangle size={48} color={C.amber} strokeWidth={1.5} />
          </View>
          <Text style={s.rejectionTitle}>Cannot Create This Plan</Text>
          <Text style={s.rejectionText}>{data.rejectionReason}</Text>
          {data.minimumSafeDays ? (
            <View style={s.rejectionDetails}>
              <Text style={s.rejectionDetail}>
                Minimum safe duration: {data.minimumSafeDays} days
              </Text>
              {data.recommendedDays ? (
                <Text style={s.rejectionDetail}>
                  Recommended duration: {data.recommendedDays} days
                </Text>
              ) : null}
            </View>
          ) : null}
          <TouchableOpacity onPress={openFilter} style={s.retryBtn}>
            <Text style={s.retryBtnText}>Adjust Preferences</Text>
          </TouchableOpacity>
        </View>

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

  // ─── Results screen ──────────────────────────────────────────────────────────────
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

        {/* Trek Name + Quick Stats */}
        <View style={s.titleSection}>
          <Text style={s.trekName}>{data!.trekName}</Text>
          <View style={s.quickStats}>
            <View style={s.quickStat}>
              <Clock size={14} color={C.textMuted} strokeWidth={2} />
              <Text style={s.quickStatText}>{data!.totalDays} days</Text>
            </View>
            <View style={s.quickStatDivider} />
            <View style={s.quickStat}>
              <Mountain size={14} color={C.textMuted} strokeWidth={2} />
              <Text style={s.quickStatText}>{data!.totalDistance} km</Text>
            </View>
          </View>
        </View>

        {/* Route */}
        <View style={s.routeCard}>
          <MapPin size={14} color={C.brandLight} strokeWidth={2.5} />
          <Text style={s.routeText} numberOfLines={1}>
            {data!.origin}  →  {data!.finalDestination}
          </Text>
        </View>

        {/* Day Cards */}
        <Text style={s.sectionTitle}>Trek Plan</Text>
        {data!.days.map((day, i) => (
          <DayCard key={i} day={day} />
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
  suggestionsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  suggestionText: { color: C.white, fontSize: 14, fontWeight: '500' },

  /* Title Section */
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  trekName: {
    color: C.white,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickStatDivider: {
    width: 1,
    height: 12,
    backgroundColor: C.border,
  },
  quickStatText: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },

  /* Route */
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  routeText: {
    color: C.textSub,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  /* Section Title */
  sectionTitle: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Day Card */
  dayCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  dayCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dayNumDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
  },
  dayInfo: {
    flex: 1,
  },
  dayRoute: {
    color: C.white,
    fontSize: 13,
    fontWeight: '600',
  },
  dayMeta: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 3,
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  dayChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dayActivities: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dayNotes: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  dayNoteRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  dayNoteText: {
    color: C.amber,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    flex: 1,
  },

  /* Activity Row */
  activityRow: {
    flexDirection: 'row',
  },
  activityTimeline: {
    width: 18,
    alignItems: 'center',
    paddingTop: 6,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityLine: {
    width: 1,
    flex: 1,
    marginTop: 2,
    minHeight: 6,
  },
  activityBody: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 8,
  },
  activityHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 1,
  },
  activityLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  activityTime: {
    color: C.textFaint,
    fontSize: 11,
    fontWeight: '500',
  },
  activityRoute: {
    color: C.textMuted,
    fontSize: 12,
    marginBottom: 1,
  },
  activityDesc: {
    color: C.textFaint,
    fontSize: 11,
    lineHeight: 15,
  },

  /* Rejection state */
  rejectionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  rejectionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.amber + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  rejectionTitle: {
    color: C.white,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  rejectionText: {
    color: C.textSub,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  rejectionDetails: {
    backgroundColor: C.elevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    width: '100%',
  },
  rejectionDetail: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  retryBtn: {
    backgroundColor: C.brand,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  retryBtnText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
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
