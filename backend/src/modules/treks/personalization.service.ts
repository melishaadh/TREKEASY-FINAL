import { Injectable } from '@nestjs/common';
import { RouteStage } from '@/schemas/trek.schema';

export interface PersonalizationInput {
  pace: 'slow' | 'normal' | 'fast';
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  trekkingExperience: 'none' | 'basic' | 'moderate' | 'extensive';
  targetDays?: number;
  age?: number;
  weight?: number;
  groupSize?: number;
  previousTreks?: number;
  startLocation?: string;
  finalDestination?: string;
}

export interface ActivityDetail {
  type: 'road_travel' | 'flight' | 'trekking' | 'rest' | 'acclimatization' | 'checkpoint_stop' | 'meal_break' | 'recovery_break' | 'sightseeing';
  from: string;
  to: string;
  distance: number;
  elevationGain: number;
  durationHours: number;
  effortScore: number;
  description: string;
}

export interface ItineraryDay {
  day: number;
  activities: ActivityDetail[];
  totalHours: number;
  totalDistance: number;
  totalElevationGain: number;
  maxAltitude: number;
  overnightLocation: string;
  notes: string[];
}

export interface PersonalizedItinerary {
  trekName: string;
  totalDays: number;
  totalDistance: number;
  totalEffort: number;
  maxAltitude: number;
  suitability: 'Low' | 'Moderate' | 'High';
  cautions: string[];
  origin: string;
  finalDestination: string;
  days: ItineraryDay[];
  rejectionReason?: string;
  minimumSafeDays?: number;
  recommendedDays?: number;
}

const LOCATION_ALIASES: Record<string, string[]> = {
  'kathmandu': ['bhaktapur', 'lalitpur', 'patan', 'kirtipur', 'tokha', 'budhanilkantha', 'suryabinayak', 'madhyapur thimi'],
  'pokhara': ['lekhnath'],
};

const ABBR_MAP: Record<string, string> = {
  'ABC': 'Annapurna Base Camp',
  'MBC': 'Machhapuchhre Base Camp',
  'EBC': 'Everest Base Camp',
};

interface RouteSegment {
  from: string;
  to: string;
  distance: number;
  elevationGain: number;
  baseHours: number;
  altitude: number;
  type: 'road_travel' | 'flight' | 'trekking' | 'rest' | 'acclimatization' | 'checkpoint_stop';
  checkpoint: string;
}

interface CapabilityProfile {
  maxDailyHours: number;
  maxEffortPerDay: number;
  maxElevationPerDay: number;
  breakIntervalHours: number;
  recoveryFactor: number;
  altitudeTolerance: number;
  paceMultiplier: number;
  effortModifier: number;
}

interface BreakSuggestion {
  afterIndex: number;
  type: 'acclimatization' | 'recovery_break' | 'rest_day';
  reason: string;
}

@Injectable()
export class PersonalizationService {
  generate(
    trekName: string,
    difficulty: string,
    stages: RouteStage[],
    input: PersonalizationInput,
  ): PersonalizedItinerary {
    // ── Step 0: Normalize inputs & build capability profile ──────────────
    const profile = this.buildCapabilityProfile(input);
    const origin = input.startLocation?.trim() || '';
    const finalDest = input.finalDestination?.trim() || '';
    const baseDifficulty = this.difficultyToNumber(difficulty);
    const baseDuration = this.computeBaseDuration(stages);

    // ── Step 1: Build complete route path ────────────────────────────────
    const route = this.buildRoute(stages, origin, finalDest, baseDifficulty);

    // ── Step 2: Determine planning mode ──────────────────────────────────
    const userProvidedDuration = input.targetDays != null;
    let effectiveTarget: number | null = null;

    if (userProvidedDuration) {
      const durationInfo = this.validateDuration(input.targetDays!, baseDuration, input, profile);
      if (durationInfo.rejected) {
        return {
          trekName,
          totalDays: 0,
          totalDistance: 0,
          totalEffort: 0,
          maxAltitude: 0,
          suitability: 'Low',
          cautions: [durationInfo.rejected],
          origin: origin || 'Unknown',
          finalDestination: finalDest || 'Unknown',
          days: [],
          rejectionReason: durationInfo.rejected,
          minimumSafeDays: durationInfo.minimumSafeDays,
          recommendedDays: durationInfo.recommendedDays,
        };
      }
      effectiveTarget = durationInfo.target;
    }

    // ── Step 3: Convert route segments into activity blocks ──────────────
    const activities = this.segmentsToActivities(route, profile);

    // ── Step 4: Estimate effort scores ───────────────────────────────────
    const scored = activities.map(a => this.computeEffortScore(a, profile, baseDifficulty));

    // ── Step 5: Schedule activities into days using time budgets ─────────
    let scheduled = this.scheduleIntoDays(scored, profile);

    // ── Step 6: Add recovery / acclimatization ───────────────────────────
    scheduled = this.addRecoveryAndAcclimatization(scheduled, profile, baseDifficulty, effectiveTarget);

    // ── Step 7: Compress (targeted mode) or basic merge (automatic mode) ─
    scheduled = this.compressToTarget(scheduled, profile, effectiveTarget);

    // ── Step 8: Final validation ─────────────────────────────────────────
    const result = this.finalize(scheduled, input, profile, baseDifficulty, trekName, origin, finalDest, baseDuration, effectiveTarget);

    return result;
  }

  // ── Validate / clamp target duration against base + experience ─────────
  private validateDuration(
    targetDays: number,
    baseDuration: number,
    input: PersonalizationInput,
    profile: CapabilityProfile,
  ): { target: number; rejected?: string; minimumSafeDays?: number; recommendedDays?: number } {
    const exp = input.trekkingExperience || 'none';

    let minDuration: number;
    let maxDuration: number;

    if (exp === 'extensive') {
      minDuration = Math.max(1, baseDuration - 2);
      maxDuration = baseDuration + 1;
    } else if (exp === 'none' || exp === 'basic') {
      minDuration = baseDuration;
      maxDuration = baseDuration + 3;
    } else {
      minDuration = Math.max(1, baseDuration - 1);
      maxDuration = baseDuration + 2;
    }

    // Clamp to profile limits (users with very low capacity may need more days)
    const profileMinDays = Math.ceil(baseDuration / Math.max(0.5, profile.recoveryFactor));
    minDuration = Math.max(minDuration, Math.ceil(baseDuration * 0.7));
    maxDuration = Math.max(maxDuration, profileMinDays);

    if (targetDays < minDuration) {
      return {
        target: baseDuration,
        rejected: `${targetDays} days is too short for this trek. The minimum is ${minDuration} days — we recommend ${baseDuration} days for a safe and enjoyable journey.`,
        minimumSafeDays: minDuration,
        recommendedDays: baseDuration,
      };
    }

    if (targetDays > maxDuration) {
      return { target: maxDuration };
    }

    return { target: targetDays };
  }

  // ── Build a capability profile from user inputs ────────────────────────
  private buildCapabilityProfile(input: PersonalizationInput): CapabilityProfile {
    const pace = input.pace || 'normal';
    const fitness = input.fitnessLevel || 'beginner';
    const experience = input.trekkingExperience || 'none';
    const age = input.age || 30;
    const weight = input.weight || 70;
    const groupSize = input.groupSize || 1;

    const paceMap: Record<string, number> = { slow: 0.8, normal: 1.0, fast: 1.15 };
    const fitnessMap: Record<string, number> = { beginner: 0.6, intermediate: 0.8, advanced: 1.0, expert: 1.15 };
    const expMap: Record<string, number> = { none: 0.5, basic: 0.7, moderate: 0.9, extensive: 1.1 };

    let baseCapability = (paceMap[pace] + fitnessMap[fitness] + expMap[experience]) / 3;

    if (age > 50) baseCapability *= 0.85;
    if (age > 60) baseCapability *= 0.8;
    if (weight > 100) baseCapability *= 0.85;
    if (weight > 120) baseCapability *= 0.75;
    if (groupSize > 8) baseCapability *= 0.9;
    if (groupSize > 15) baseCapability *= 0.8;

    baseCapability = Math.max(0.3, Math.min(1.2, baseCapability));

    const maxHours = baseCapability >= 1.0 ? 9
      : baseCapability >= 0.8 ? 8
      : baseCapability >= 0.6 ? 6.5
      : baseCapability >= 0.45 ? 5.5
      : 4.5;

    const maxEffort = baseCapability >= 1.0 ? 50
      : baseCapability >= 0.8 ? 40
      : baseCapability >= 0.6 ? 30
      : baseCapability >= 0.45 ? 22
      : 16;

    const maxElevation = baseCapability >= 1.0 ? 1200
      : baseCapability >= 0.8 ? 900
      : baseCapability >= 0.6 ? 650
      : baseCapability >= 0.45 ? 450
      : 300;

    const breakInterval = baseCapability >= 1.0 ? 3
      : baseCapability >= 0.8 ? 2.5
      : baseCapability >= 0.6 ? 2
      : baseCapability >= 0.45 ? 1.5
      : 1.2;

    return {
      maxDailyHours: maxHours,
      maxEffortPerDay: maxEffort,
      maxElevationPerDay: maxElevation,
      breakIntervalHours: breakInterval,
      recoveryFactor: baseCapability,
      altitudeTolerance: baseCapability,
      paceMultiplier: paceMap[pace],
      effortModifier: 1.0 / baseCapability,
    };
  }

  // ── Step 1: Build the actual connected route ──────────────────────────
  private buildRoute(
    stages: RouteStage[],
    origin: string,
    finalDest: string,
    baseDifficulty: number,
  ): RouteSegment[] {
    const route: RouteSegment[] = [];
    const normalizedOrigin = this.normalizeLoc(origin);
    const firstStage = stages[0];
    const lastStage = stages[stages.length - 1];

    if (!firstStage) return route;

    const firstFrom = this.expandAbbr(firstStage.from);
    const firstTo = this.expandAbbr(firstStage.to);

    // If user origin is different from trek start, add transport segment
    if (origin && this.normalizeLoc(origin) !== this.normalizeLoc(firstFrom)) {
      const isNearby = this.isNearbyLocation(normalizedOrigin, this.normalizeLoc(firstFrom));
      route.push({
        from: origin,
        to: firstFrom,
        distance: isNearby ? 10 : 0,
        elevationGain: 0,
        baseHours: isNearby ? 0.5 : 0,
        altitude: 0,
        type: isNearby ? 'road_travel' : 'flight',
        checkpoint: isNearby ? `Drive from ${origin} to ${firstFrom}`
          : `Fly from ${origin} to ${firstFrom}`,
      });
    }

    // Convert trek stages to route segments
    for (const stage of stages) {
      route.push({
        from: this.expandAbbr(stage.from),
        to: this.expandAbbr(stage.to),
        distance: stage.distance || 0,
        elevationGain: stage.elevationGain || 0,
        baseHours: stage.estimatedHours || 1,
        altitude: this.guessDestinationAltitude(stage.to, stage.elevationGain, route),
        type: 'trekking',
        checkpoint: stage.checkpoint || '',
      });
    }

    // If final destination differs from trek end, add transport segment
    const lastTo = this.expandAbbr(lastStage.to);
    if (finalDest && this.normalizeLoc(finalDest) !== this.normalizeLoc(lastTo)) {
      const isNearby = this.isNearbyLocation(this.normalizeLoc(finalDest), this.normalizeLoc(lastTo));
      route.push({
        from: lastTo,
        to: finalDest,
        distance: isNearby ? 10 : 0,
        elevationGain: 0,
        baseHours: isNearby ? 0.5 : 0,
        altitude: 0,
        type: isNearby ? 'road_travel' : 'flight',
        checkpoint: isNearby ? `Drive from ${lastTo} to ${finalDest}`
          : `Fly from ${lastTo} to ${finalDest}`,
      });
    }

    return route;
  }

  // ── Convert route segments to activity blocks ──────────────────────────
  private segmentsToActivities(
    route: RouteSegment[],
    profile: CapabilityProfile,
  ): ActivityDetail[] {
    const activities: ActivityDetail[] = [];

    for (const seg of route) {
      if (seg.type === 'flight' || seg.type === 'road_travel') {
        const hours = seg.baseHours > 0 ? seg.baseHours : seg.distance / 50;
        activities.push({
          type: seg.type,
          from: seg.from,
          to: seg.to,
          distance: seg.distance,
          elevationGain: 0,
          durationHours: Math.max(0.5, hours),
          effortScore: seg.type === 'flight' ? 2 : 3,
          description: seg.checkpoint,
        });
        continue;
      }

      const hours = seg.baseHours > 0 ? seg.baseHours : seg.distance / 3 + seg.elevationGain / 300;
      activities.push({
        type: 'trekking',
        from: seg.from,
        to: seg.to,
        distance: seg.distance,
        elevationGain: seg.elevationGain,
        durationHours: Math.round(hours * 10) / 10,
        effortScore: 0,
        description: seg.checkpoint || `Trek from ${seg.from} to ${seg.to}`,
      });
    }

    return activities;
  }

  // ── Compute effort score for an activity ───────────────────────────────
  private computeEffortScore(
    activity: ActivityDetail,
    profile: CapabilityProfile,
    baseDifficulty: number,
  ): ActivityDetail {
    if (activity.type === 'rest' || activity.type === 'acclimatization' || activity.type === 'meal_break') {
      activity.effortScore = 0;
      return activity;
    }

    const distanceFactor = activity.distance * 1.5;
    const elevationFactor = activity.elevationGain / 80;
    const terrainFactor = baseDifficulty * 2;
    const durationFactor = activity.durationHours * 1.5;
    const effort = Math.round((distanceFactor + elevationFactor + terrainFactor + durationFactor) * profile.effortModifier);

    activity.effortScore = Math.max(0, effort);
    return activity;
  }

  // ── Schedule activities into days using time budgets ──────────────────
  private scheduleIntoDays(
    activities: ActivityDetail[],
    profile: CapabilityProfile,
  ): ItineraryDay[] {
    const days: ItineraryDay[] = [];
    let currentDay: ItineraryDay | null = null;

    for (const activity of activities) {
      if (!currentDay) {
        currentDay = this.createDay(days.length + 1);
      }

      const wouldFit = this.wouldFitInDay(currentDay, activity, profile);

      if (!wouldFit) {
        if (currentDay.activities.length === 0 && activity.type === 'trekking') {
          currentDay.activities.push(activity);
          this.updateDayTotals(currentDay);
          continue;
        }
        days.push(currentDay);
        currentDay = this.createDay(days.length + 1);
        currentDay.activities.push(activity);
        this.updateDayTotals(currentDay);
      } else {
        currentDay.activities.push(activity);
        this.updateDayTotals(currentDay);
      }
    }

    if (currentDay && currentDay.activities.length > 0) {
      days.push(currentDay);
    }

    return days;
  }

  private isNonBudgetActivity(activity: ActivityDetail): boolean {
    if (['rest', 'acclimatization', 'meal_break', 'recovery_break', 'checkpoint_stop', 'sightseeing'].includes(activity.type)) {
      return true;
    }
    if ((activity.type === 'road_travel' || activity.type === 'flight') && activity.durationHours < 2) {
      return true;
    }
    return false;
  }

  private wouldFitInDay(day: ItineraryDay, activity: ActivityDetail, profile: CapabilityProfile): boolean {
    if (this.isNonBudgetActivity(activity)) {
      return true;
    }

    const newHours = day.totalHours + activity.durationHours;
    const newEffort = day.activities.reduce((s, a) => s + a.effortScore, 0) + activity.effortScore;
    const newElevation = day.totalElevationGain + activity.elevationGain;

    if (newHours > profile.maxDailyHours) return false;
    if (newEffort > profile.maxEffortPerDay) return false;
    if (newElevation > profile.maxElevationPerDay) return false;

    return true;
  }

  private createDay(dayNumber: number): ItineraryDay {
    return {
      day: dayNumber,
      activities: [],
      totalHours: 0,
      totalDistance: 0,
      totalElevationGain: 0,
      maxAltitude: 0,
      overnightLocation: '',
      notes: [],
    };
  }

  private updateDayTotals(day: ItineraryDay): void {
    day.totalHours = 0;
    day.totalDistance = 0;
    day.totalElevationGain = 0;
    day.maxAltitude = 0;

    for (const a of day.activities) {
      day.totalHours += a.durationHours;
      day.totalDistance += a.distance;
      day.totalElevationGain += a.elevationGain;
    }
  }

  // ── Step 6: Intelligent recovery and acclimatization ──────────────────
  private addRecoveryAndAcclimatization(
    days: ItineraryDay[],
    profile: CapabilityProfile,
    baseDifficulty: number,
    targetDays: number | null,
  ): ItineraryDay[] {
    if (days.length === 0) return days;

    const result: ItineraryDay[] = [];
    let currentAltitude = 0;

    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const nextDay = i < days.length - 1 ? days[i + 1] : null;

      const dayMaxAlt = this.estimateDayMaxAltitude(day, currentAltitude);
      currentAltitude = dayMaxAlt;

      // Add within-day breaks for low-capability users
      if (profile.recoveryFactor < 0.6) {
        day.activities = this.addBreaksWithinDay(day.activities, profile);
        this.updateDayTotals(day);
      }

      day.maxAltitude = Math.max(dayMaxAlt, day.maxAltitude);
      result.push(day);

      // In automatic mode (null target), never constrain recovery days.
      // In targeted mode, respect remaining budget.
      const remainingDays = targetDays !== null ? targetDays - result.length : Infinity;

      // Determine breaks needed after adding the day
      const breaks = this.determineBreaksNeeded(result, day, nextDay, currentAltitude, profile, baseDifficulty, i);

      for (const br of breaks) {
        if (br.type === 'rest_day') {
          if (remainingDays <= 0 && targetDays !== null) {
            const insertedAt = this.tryInsertRecovery(result, br, profile, currentAltitude);
            if (insertedAt === null) {
              const isCritical = currentAltitude > 4000 || result.filter(d =>
                d.activities.some(a => a.type === 'trekking')
              ).length >= 4;
              if (isCritical) {
                result.push(this.createRestDay(result.length + 1, day.activities[0]?.from || '', currentAltitude, br.reason));
              }
            }
          } else {
            result.push(this.createRestDay(result.length + 1, day.activities[0]?.from || '', currentAltitude, br.reason));
          }
        } else {
          const insertedAt = this.tryInsertRecovery(result, br, profile, currentAltitude);
          if (insertedAt === null) {
            if (br.type === 'acclimatization') {
              if (remainingDays > 0 || remainingDays === Infinity || currentAltitude > 4000) {
                result.push(this.createAcclimatizationDay(result.length + 1, day.activities[0]?.from || '', currentAltitude));
              }
            } else if (remainingDays > 0 || remainingDays === Infinity) {
              result.push(this.createRestDay(result.length + 1, day.activities[0]?.from || '', currentAltitude, br.reason));
            }
          }
        }
      }
    }

    return result;
  }

  private determineBreaksNeeded(
    pastDays: ItineraryDay[],
    currentDay: ItineraryDay,
    nextDay: ItineraryDay | null,
    currentAltitude: number,
    profile: CapabilityProfile,
    baseDifficulty: number,
    dayIndex: number,
  ): BreakSuggestion[] {
    const breaks: BreakSuggestion[] = [];

    if (pastDays.length === 0) return breaks;

    // Check consecutive hard days
    let consecutiveHard = 0;
    for (let i = pastDays.length - 1; i >= 0 && i >= pastDays.length - 4; i--) {
      const d = pastDays[i];
      if (d.totalHours >= 6 || d.totalElevationGain >= 500) {
        consecutiveHard++;
      } else {
        break;
      }
    }

    if (consecutiveHard >= 4) {
      breaks.push({
        afterIndex: pastDays.length,
        type: 'rest_day',
        reason: 'Extended effort — recovery day needed',
      });
      return breaks;
    }

    if (consecutiveHard >= 3 && profile.recoveryFactor < 0.8) {
      breaks.push({
        afterIndex: pastDays.length,
        type: 'rest_day',
        reason: 'Multiple consecutive difficult days require recovery',
      });
      return breaks;
    }

    // Check altitude acclimatization — try within-day first
    if (currentAltitude > 2500) {
      const altDays = pastDays.filter(d => d.maxAltitude >= currentAltitude - 200).length;
      const tolerantEnough = profile.altitudeTolerance >= 0.8;

      if (currentAltitude > 4500 && altDays < 3 && !tolerantEnough) {
        breaks.push({
          afterIndex: pastDays.length,
          type: 'acclimatization',
          reason: 'Extended acclimatization needed at high altitude',
        });
      } else if (currentAltitude > 4000 && altDays < 2 && !tolerantEnough) {
        breaks.push({
          afterIndex: pastDays.length,
          type: 'acclimatization',
          reason: 'Additional acclimatization required above 4000m',
        });
      } else if (currentAltitude > 3000 && altDays < 1 && profile.altitudeTolerance < 0.7) {
        breaks.push({
          afterIndex: pastDays.length,
          type: 'acclimatization',
          reason: 'Altitude acclimatization needed above 3000m',
        });
      }
    }

    // Check upcoming difficult day
    if (nextDay && nextDay.totalElevationGain > 800 && profile.recoveryFactor < 1.0) {
      breaks.push({
        afterIndex: pastDays.length,
        type: 'recovery_break',
        reason: 'Prepare for difficult climb ahead',
      });
    }

    return breaks;
  }

  private tryInsertRecovery(
    days: ItineraryDay[],
    br: BreakSuggestion,
    profile: CapabilityProfile,
    altitude: number,
  ): number | null {
    if (days.length === 0) return null;

    const durationMap: Record<string, number> = {
      acclimatization: 2,
      recovery_break: 1,
      rest_day: 8,
    };
    const durationHours = durationMap[br.type] || 1;
    const recoveryAct: ActivityDetail = {
      type: br.type === 'rest_day' ? 'rest' : br.type,
      from: days[days.length - 1].activities[days[days.length - 1].activities.length - 1]?.to || '',
      to: days[days.length - 1].activities[days[days.length - 1].activities.length - 1]?.to || '',
      distance: 0,
      elevationGain: 0,
      durationHours,
      effortScore: 0,
      description: br.reason,
    };

    // Try same day (most recent) first
    const lastIdx = days.length - 1;
    if (days[lastIdx].totalHours + durationHours <= profile.maxDailyHours) {
      days[lastIdx].activities.push({ ...recoveryAct });
      this.updateDayTotals(days[lastIdx]);
      return lastIdx;
    }

    // Try adjacent day (second-most recent)
    const adjIdx = days.length - 2;
    if (adjIdx >= 0 && days[adjIdx].totalHours + durationHours <= profile.maxDailyHours) {
      days[adjIdx].activities.push({ ...recoveryAct });
      this.updateDayTotals(days[adjIdx]);
      return adjIdx;
    }

    // Try any existing low-effort day
    for (let i = 0; i < days.length; i++) {
      if (i === lastIdx || i === adjIdx) continue;
      if (days[i].totalHours + durationHours <= profile.maxDailyHours * 0.7) {
        days[i].activities.push({ ...recoveryAct });
        this.updateDayTotals(days[i]);
        return i;
      }
    }

    return null;
  }

  private addBreaksWithinDay(activities: ActivityDetail[], profile: CapabilityProfile): ActivityDetail[] {
    const result: ActivityDetail[] = [];
    let hoursSinceBreak = 0;

    for (const activity of activities) {
      if (activity.type !== 'trekking') {
        result.push(activity);
        continue;
      }

      result.push(activity);
      hoursSinceBreak += activity.durationHours;

      if (hoursSinceBreak >= profile.breakIntervalHours) {
        result.push({
          type: 'recovery_break',
          from: activity.to,
          to: activity.to,
          distance: 0,
          elevationGain: 0,
          durationHours: 0.5,
          effortScore: 0,
          description: 'Short recovery break',
        });
        hoursSinceBreak = 0;
      }
    }

    return result;
  }

  private createRestDay(dayNumber: number, location: string, altitude: number, reason: string): ItineraryDay {
    return {
      day: dayNumber,
      activities: [{
        type: 'rest',
        from: location,
        to: location,
        distance: 0,
        elevationGain: 0,
        durationHours: 0,
        effortScore: 0,
        description: `Full rest day — ${reason}`,
      }],
      totalHours: 0,
      totalDistance: 0,
      totalElevationGain: 0,
      maxAltitude: altitude,
      overnightLocation: location,
      notes: [reason],
    };
  }

  private createAcclimatizationDay(dayNumber: number, location: string, altitude: number): ItineraryDay {
    return {
      day: dayNumber,
      activities: [{
        type: 'acclimatization',
        from: location,
        to: location,
        distance: 0,
        elevationGain: 0,
        durationHours: 0,
        effortScore: 0,
        description: `Acclimatization day at ${altitude}m — short walks recommended`,
      }],
      totalHours: 0,
      totalDistance: 0,
      totalElevationGain: 0,
      maxAltitude: altitude + 100,
      overnightLocation: location,
      notes: [`Acclimatization at ${altitude}m`],
    };
  }

  private estimateDayMaxAltitude(day: ItineraryDay, previousAltitude: number): number {
    let maxAlt = previousAltitude;
    for (const a of day.activities) {
      if (a.elevationGain > 0) {
        maxAlt = Math.max(maxAlt, maxAlt + a.elevationGain);
      }
    }
    return maxAlt;
  }

  // ── Guess destination altitude from accumulated gain ──────────────────
  private guessDestinationAltitude(dest: string, elevationGain: number, route: RouteSegment[]): number {
    if (route.length === 0) return elevationGain;
    const lastAlt = route[route.length - 1].altitude || 0;
    return lastAlt + elevationGain;
  }

  // ── Final validation and output building ──────────────────────────────
  private finalize(
    days: ItineraryDay[],
    input: PersonalizationInput,
    profile: CapabilityProfile,
    baseDifficulty: number,
    trekName: string,
    origin: string,
    finalDest: string,
    baseDuration: number = days.length,
    effectiveTarget: number | null = null,
  ): PersonalizedItinerary {
    const cautions: string[] = [];
    const adjustedDays = [...days];

    if (adjustedDays.length === 0) {
      return {
        trekName,
        totalDays: 0,
        totalDistance: 0,
        totalEffort: 0,
        maxAltitude: 0,
        suitability: 'Low',
        cautions: ['Cannot generate itinerary — no valid route'],
        origin: origin || 'Unknown',
        finalDestination: finalDest || 'Unknown',
        days: [],
        rejectionReason: 'No valid route could be constructed',
      };
    }

    // Set overnight locations
    for (let i = 0; i < adjustedDays.length; i++) {
      const day = adjustedDays[i];
      const lastActivity = day.activities[day.activities.length - 1];
      if (lastActivity) {
        day.overnightLocation = lastActivity.to;
      }
    }

    // Calculate max altitude
    let maxAltitude = 0;
    for (const day of adjustedDays) {
      if (day.maxAltitude > maxAltitude) maxAltitude = day.maxAltitude;
    }

    const totalDistance = Math.round(adjustedDays.reduce((s, d) => s + d.totalDistance, 0) * 10) / 10;
    const totalEffort = adjustedDays.reduce((s, d) => s + d.activities.reduce((sa, a) => sa + a.effortScore, 0), 0);

    // ── Validation checks ─────────────────────────────────────────────────

    // Check if user source matches origin
    if (origin && adjustedDays.length > 0) {
      const firstDayFirstAct = adjustedDays[0].activities[0];
      if (firstDayFirstAct && this.normalizeLoc(firstDayFirstAct.from) !== this.normalizeLoc(origin)) {
        cautions.push(`Your starting point has been set to ${firstDayFirstAct.from} to match the trek route.`);
      }
    }

    // Compare generated days vs target (targeted mode only)
    if (effectiveTarget != null && adjustedDays.length > effectiveTarget + 1) {
      cautions.push(`Your itinerary is ${adjustedDays.length} days — slightly longer than your target of ${effectiveTarget} days due to safety and route constraints.`);
    }

    // Check excessive expansion relative to base duration
    const expansionThreshold = Math.max(4, Math.ceil(baseDuration * 0.4));
    if (adjustedDays.length > baseDuration + expansionThreshold) {
      cautions.push(`Your trek will take ${adjustedDays.length} days — longer than the typical ${baseDuration}-day plan. Take your time and enjoy the extra days!`);
    }

    // ── Day-specific notes (shown inside day card) ──────────────────────

    // Altitude gain too aggressive
    for (let i = 1; i < adjustedDays.length; i++) {
      const altGain = adjustedDays[i].maxAltitude - adjustedDays[i - 1].maxAltitude;
      if (altGain > 500 && adjustedDays[i].maxAltitude > 3000) {
        adjustedDays[i].notes.push(`Big climb of ${altGain}m today. Go slow, drink plenty of water, and listen to your body.`);
      }
    }

    // Daily effort exceeds capability
    for (const day of adjustedDays) {
      if (day.totalHours > profile.maxDailyHours + 1) {
        day.notes.push(`Long day (${day.totalHours}h). Start early and take regular breaks to keep your energy up.`);
      }
    }

    // Check too many consecutive difficult days (attach to last hard day)
    let hardCount = 0;
    let lastHardIdx = -1;
    for (let i = 0; i < adjustedDays.length; i++) {
      const day = adjustedDays[i];
      if (day.totalElevationGain > 500 || day.totalHours > 7) {
        hardCount++;
        lastHardIdx = i;
      } else {
        hardCount = 0;
      }
    }
    if (hardCount >= 5 && lastHardIdx >= 0) {
      adjustedDays[lastHardIdx].notes.push(`${hardCount} tough days in a row — consider adding a rest day to recharge.`);
    }

    // Check disconnected route
    if (adjustedDays.length > 1) {
      for (let i = 0; i < adjustedDays.length - 1; i++) {
        const currentEnd = adjustedDays[i].overnightLocation;
        const nextStart = adjustedDays[i + 1].activities[0]?.from || '';
        if (currentEnd && nextStart && this.normalizeLoc(currentEnd) !== this.normalizeLoc(nextStart)) {
          adjustedDays[i].notes.push(`Route gap: day ends at ${currentEnd} but next day starts at ${nextStart}.`);
        }
      }
    }

    // ── Global cautions ────────────────────────────────────────────────

    // Excessive rest days
    let restCount = 0;
    for (const day of adjustedDays) {
      if (day.activities.every(a => a.type === 'rest' || a.type === 'acclimatization')) {
        restCount++;
      }
    }
    if (restCount > 0) {
      const ratio = restCount / adjustedDays.length;
      if (ratio > 0.4) {
        cautions.push(`You have lots of rest days planned (${restCount} out of ${adjustedDays.length}). That's totally fine for a relaxed trip!`);
      }
    }

    // Check if first location matches user source
    if (origin && adjustedDays.length > 0) {
      const firstLoc = adjustedDays[0].activities[0]?.from || '';
      if (this.normalizeLoc(firstLoc) !== this.normalizeLoc(origin)) {
        cautions.push(`Your starting point has been updated from ${origin} to ${firstLoc} to align with the trek route.`);
      }
    }

    // Check if last location matches final destination
    if (finalDest && adjustedDays.length > 0) {
      const lastDay = adjustedDays[adjustedDays.length - 1];
      const lastLoc = lastDay.activities[lastDay.activities.length - 1]?.to || '';
      if (this.normalizeLoc(lastLoc) !== this.normalizeLoc(finalDest)) {
        cautions.push(`Your final destination has been updated to ${lastLoc} to match the trek route.`);
      }
    }

    // Determine suitability
    let suitability: 'Low' | 'Moderate' | 'High' = 'High';
    const hasConcerns = profile.recoveryFactor < 0.6 || input.age && input.age > 55 || input.weight && input.weight > 100;

    if (hasConcerns && baseDifficulty >= 3) {
      suitability = 'Low';
    } else if (hasConcerns && baseDifficulty >= 2) {
      suitability = 'Moderate';
    } else if (profile.recoveryFactor < 0.7 && baseDifficulty >= 2) {
      suitability = 'Moderate';
    }

    if (cautions.length > 2 && baseDifficulty >= 2) {
      suitability = 'Moderate';
    }

    return {
      trekName,
      totalDays: adjustedDays.length,
      totalDistance,
      totalEffort,
      maxAltitude,
      suitability,
      cautions,
      origin: origin || adjustedDays[0]?.activities[0]?.from || 'Unknown',
      finalDestination: finalDest || adjustedDays[adjustedDays.length - 1]?.overnightLocation || 'Unknown',
      days: adjustedDays,
    };
  }

  // ── Step 7: Compress (automatic mode → basic merge; targeted → force) ──
  private compressToTarget(
    days: ItineraryDay[],
    profile: CapabilityProfile,
    targetDays: number | null,
  ): ItineraryDay[] {
    if (days.length === 0) return days;

    let current = days.map(d => ({ ...d, activities: [...d.activities], notes: [...d.notes] }));

    // Always merge underutilized days and convert unnecessary rest
    current = this.mergeUnderutilizedDays(current, profile);
    current = this.convertUnnecessaryRestDays(current, profile);
    current = this.renumberDays(current);

    // Automatic mode: done — let the itinerary breathe naturally
    if (targetDays === null) return current;

    // Targeted mode: compress to meet target
    if (current.length <= targetDays) return current;

    // Phase 3: Aggressive compression
    current = this.aggressiveCompress(current, profile);
    if (current.length <= targetDays) return this.renumberDays(current);

    // Phase 4: Force-merge to meet target
    current = this.mergeToFitMax(current, profile, targetDays);
    current = this.renumberDays(current);

    // Phase 5: If still over target, pair-merge smallest days
    let safety = 0;
    while (current.length > targetDays && safety < 20) {
      let bestIdx = -1;
      let minCombined = Infinity;
      for (let i = 0; i < current.length - 1; i++) {
        const combined = current[i].totalHours + current[i + 1].totalHours;
        if (combined < minCombined) {
          minCombined = combined;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;
      const merged = this.cloneDay(current[bestIdx]);
      for (const act of current[bestIdx + 1].activities) {
        merged.activities.push({ ...act });
      }
      this.updateDayTotals(merged);
      merged.overnightLocation = current[bestIdx + 1].overnightLocation;
      if (current[bestIdx + 1].maxAltitude > merged.maxAltitude) {
        merged.maxAltitude = current[bestIdx + 1].maxAltitude;
      }
      merged.notes.push(...current[bestIdx + 1].notes);
      current = [
        ...current.slice(0, bestIdx),
        merged,
        ...current.slice(bestIdx + 2),
      ];
      safety++;
    }

    return this.renumberDays(current);
  }

  private computeBaseDuration(stages: RouteStage[]): number {
    const trekStages = stages.filter(s => s.distance > 0 && s.estimatedHours > 0);
    return Math.max(1, trekStages.length);
  }

  private mergeUnderutilizedDays(days: ItineraryDay[], profile: CapabilityProfile): ItineraryDay[] {
    if (days.length <= 1) return days;

    const result: ItineraryDay[] = [];
    let i = 0;

    while (i < days.length) {
      const current = this.cloneDay(days[i]);
      const nextDay = i + 1 < days.length ? days[i + 1] : null;

      if (nextDay && this.canMergeDays(current, nextDay, profile)) {
        for (const act of nextDay.activities) {
          current.activities.push({ ...act });
        }
        this.updateDayTotals(current);
        current.overnightLocation = nextDay.overnightLocation;
        if (nextDay.maxAltitude > current.maxAltitude) {
          current.maxAltitude = nextDay.maxAltitude;
        }
        current.notes.push(...nextDay.notes);
        i += 2;
      } else {
        i += 1;
      }
      result.push(current);
    }

    return result;
  }

  private canMergeDays(dayA: ItineraryDay, dayB: ItineraryDay, profile: CapabilityProfile): boolean {
    if (dayA.totalHours >= profile.maxDailyHours * 0.5) return false;

    const combinedHours = dayA.totalHours + dayB.totalHours;
    if (combinedHours > profile.maxDailyHours) return false;

    const effortA = dayA.activities.reduce((s, a) => s + a.effortScore, 0);
    const effortB = dayB.activities.reduce((s, a) => s + a.effortScore, 0);
    if (effortA + effortB > profile.maxEffortPerDay) return false;

    const combinedElevation = dayA.totalElevationGain + dayB.totalElevationGain;
    if (combinedElevation > profile.maxElevationPerDay) return false;

    return true;
  }

  private convertUnnecessaryRestDays(days: ItineraryDay[], profile: CapabilityProfile): ItineraryDay[] {
    const result: ItineraryDay[] = [];

    for (let i = 0; i < days.length; i++) {
      const day = this.cloneDay(days[i]);
      const isPureRestDay = day.activities.every(a => a.type === 'rest' || a.type === 'acclimatization');
      const prevDay = result.length > 0 ? result[result.length - 1] : null;

      if (isPureRestDay && prevDay) {
        const restActivity = day.activities[0];
        const isAcclimatization = restActivity.type === 'acclimatization';

        // Rule 3: Acclimatization days require justification
        if (isAcclimatization) {
          const altGain = day.maxAltitude - prevDay.maxAltitude;
          const lowGain = altGain < 300;
          const highTolerance = profile.altitudeTolerance >= 0.8;
          const fitsInPrevDay = prevDay.totalHours + 2 <= profile.maxDailyHours;

          if ((lowGain || highTolerance) && fitsInPrevDay) {
            prevDay.activities.push({
              type: 'recovery_break',
              from: restActivity.from || prevDay.overnightLocation,
              to: restActivity.to || prevDay.overnightLocation,
              distance: 0,
              elevationGain: 0,
              durationHours: 1.5,
              effortScore: 0,
              description: 'Recovery period — acclimatization',
            });
            this.updateDayTotals(prevDay);
            continue;
          }
        }

        // Rule 4: Hard-climb recovery should prefer existing days
        if (!isAcclimatization) {
          const nextDay = i + 1 < days.length ? days[i + 1] : null;
          const hasHardClimbAhead = nextDay && nextDay.activities.some(a => a.elevationGain > 300);
          const hasCapacity = prevDay.totalHours + 3 <= profile.maxDailyHours;

          if (hasHardClimbAhead && hasCapacity) {
            prevDay.activities.push({
              type: 'recovery_break',
              from: prevDay.overnightLocation,
              to: prevDay.overnightLocation,
              distance: 0,
              elevationGain: 0,
              durationHours: 2,
              effortScore: 0,
              description: 'Extended recovery before difficult section',
            });
            this.updateDayTotals(prevDay);
            continue;
          }
        }
      }

      result.push(day);
    }

    return result;
  }

  private aggressiveCompress(days: ItineraryDay[], profile: CapabilityProfile): ItineraryDay[] {
    if (days.length <= 1) return days;

    const result: ItineraryDay[] = [];
    let i = 0;

    while (i < days.length) {
      const current = this.cloneDay(days[i]);
      let j = i + 1;

      while (j < days.length) {
        const nextDay = days[j];

        const combinedHours = current.totalHours + nextDay.totalHours;
        const effortA = current.activities.reduce((s, a) => s + a.effortScore, 0);
        const effortB = nextDay.activities.reduce((s, a) => s + a.effortScore, 0);
        const combinedEffort = effortA + effortB;
        const combinedElevation = current.totalElevationGain + nextDay.totalElevationGain;

        if (combinedHours <= profile.maxDailyHours &&
            combinedEffort <= profile.maxEffortPerDay &&
            combinedElevation <= profile.maxElevationPerDay) {
          for (const act of nextDay.activities) {
            current.activities.push({ ...act });
          }
          this.updateDayTotals(current);
          current.overnightLocation = nextDay.overnightLocation;
          if (nextDay.maxAltitude > current.maxAltitude) {
            current.maxAltitude = nextDay.maxAltitude;
          }
          current.notes.push(...nextDay.notes);
          j++;
        } else {
          break;
        }
      }

      result.push(current);
      i = j;
    }

    return result;
  }

  private mergeToFitMax(days: ItineraryDay[], profile: CapabilityProfile, maxDays: number): ItineraryDay[] {
    if (days.length <= maxDays) return days;

    let current = this.mergeUnderutilizedDays(days, profile);
    if (current.length <= maxDays) return current;

    current = this.aggressiveCompress(current, profile);
    if (current.length <= maxDays) return current;

    while (current.length > maxDays) {
      let bestIdx = -1;
      let minHours = Infinity;

      for (let i = 0; i < current.length - 1; i++) {
        const combined = current[i].totalHours + current[i + 1].totalHours;
        if (combined < minHours) {
          minHours = combined;
          bestIdx = i;
        }
      }

      if (bestIdx === -1) break;

      const merged = this.cloneDay(current[bestIdx]);
      const nextDay = current[bestIdx + 1];
      for (const act of nextDay.activities) {
        merged.activities.push({ ...act });
      }
      this.updateDayTotals(merged);
      merged.overnightLocation = nextDay.overnightLocation;
      if (nextDay.maxAltitude > merged.maxAltitude) {
        merged.maxAltitude = nextDay.maxAltitude;
      }
      merged.notes.push(...nextDay.notes);

      current = [
        ...current.slice(0, bestIdx),
        merged,
        ...current.slice(bestIdx + 2),
      ];
    }

    return current;
  }

  private renumberDays(days: ItineraryDay[]): ItineraryDay[] {
    return days.map((d, i) => ({ ...d, day: i + 1 }));
  }

  private cloneDay(day: ItineraryDay): ItineraryDay {
    return {
      ...day,
      activities: day.activities.map(a => ({ ...a })),
      notes: [...day.notes],
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  private difficultyToNumber(difficulty: string): number {
    const map: Record<string, number> = { easy: 1, moderate: 2, hard: 3 };
    return map[difficulty.toLowerCase()] || 2;
  }

  private normalizeLoc(loc: string): string {
    const lower = loc.toLowerCase().trim();
    for (const [canonical, aliases] of Object.entries(LOCATION_ALIASES)) {
      if (lower === canonical || aliases.includes(lower)) return canonical;
    }
    return lower;
  }

  private expandAbbr(val: string): string {
    let result = val;
    for (const [abbr, full] of Object.entries(ABBR_MAP)) {
      result = result.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full);
    }
    return result;
  }

  private isNearbyLocation(a: string, b: string): boolean {
    if (a === b) return true;
    for (const [, aliases] of Object.entries(LOCATION_ALIASES)) {
      if (aliases.includes(a) && aliases.includes(b)) return true;
    }
    return false;
  }
}
