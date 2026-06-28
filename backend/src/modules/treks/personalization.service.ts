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
export interface ItineraryDay {
  day: number;
  from: string;
  to: string;
  distance: number;
  elevationGain: number;
  estimatedHours: number;
  checkpoint: string;
  restStops: string[];
  activityType: 'trekking' | 'travel' | 'rest' | 'mixed';
  description: string;
}
const LOCATION_ALIASES: Record<string, string[]> = {
  'kathmandu': ['bhaktapur', 'lalitpur', 'patan', 'kirtipur', 'tokha', 'budhanilkantha', 'suryabinayak', 'madhyapur thimi'],
  'pokhara': ['lekhnath'],
};

export interface PersonalizedItinerary {
  trekName: string;
  totalDays: number;
  totalDistance: number;
  suitability: 'Low' | 'Moderate' | 'High';
  cautionMessage: string;
  suggestedStart: string;
  origin: string;
  finalDestination: string;
  trekEnd: string;
  preTrekSummary?: string;
  postTrekSummary?: string;
  itinerary: ItineraryDay[];
}
@Injectable()
export class PersonalizationService {
  generate(
    trekName: string,
    difficulty: string,
    stages: RouteStage[],
    input: PersonalizationInput,
  ): PersonalizedItinerary {
    const pace = input.pace || 'normal';
    const fitnessLevel = input.fitnessLevel || 'beginner';
    const experience = input.trekkingExperience || 'none';
    const targetDays = input.targetDays;
    const age = input.age;
    const weight = input.weight;
    const groupSize = input.groupSize;
    const previousTreks = input.previousTreks;
    const isSlow = pace === 'slow';
    const isFast = pace === 'fast';
    const isLowFitness = fitnessLevel === 'beginner' || fitnessLevel === 'intermediate';
    const isBeginner = experience === 'none' || experience === 'basic';
    const isExperienced = experience === 'extensive' || experience === 'moderate';
    const difficultyMap: Record<string, number> = { easy: 1, moderate: 2, hard: 3 };
    const baseDifficulty = difficultyMap[difficulty.toLowerCase()] || 2;

    let derivedExperience = experience;
    if (previousTreks !== undefined && previousTreks !== null) {
      if (previousTreks === 0) derivedExperience = 'none';
      else if (previousTreks <= 3) derivedExperience = 'basic';
      else if (previousTreks <= 10) derivedExperience = 'moderate';
      else derivedExperience = 'extensive';
    }
    const effectiveIsBeginner = derivedExperience === 'none' || derivedExperience === 'basic';
    const effectiveIsExperienced = derivedExperience === 'extensive' || derivedExperience === 'moderate';

    // ── Internal capability score (0-100) ──────────────────────────────────
    const capabilityScore = this.computeCapabilityScore(
      pace, fitnessLevel, derivedExperience, age, weight,
    );

    // ── Determine adjustment tier ──────────────────────────────────────────
    const tier =
      capabilityScore >= 75 ? 'high'
      : capabilityScore >= 50 ? 'moderate'
      : capabilityScore >= 30 ? 'low'
      : 'veryLow';

    // ── Normalise stages ───────────────────────────────────────────────────
    const toPlain = (s: RouteStage): RouteStage => ({
      day: Number(s.day) || 0,
      from: s.from ?? '',
      to: s.to ?? '',
      distance: Number(s.distance) || 0,
      elevationGain: Number(s.elevationGain) || 0,
      estimatedHours: Number(s.estimatedHours) || 0,
      checkpoint: s.checkpoint ?? '',
      restStop: s.restStop ?? '',
    });
    let adjustedStages: RouteStage[] = stages.map(toPlain);

    // ── Expand abbreviations in all location fields ────────────────────────
    adjustedStages = adjustedStages.map(s => this.expandStageAbbreviations(s));

    // ── Apply distance / hours adjustments based on tier + pace ────────────
    const distAdjust = this.getDistAdjust(tier, isSlow, isFast);
    const hoursAdjust = this.getHoursAdjust(tier, isSlow, isFast);
    adjustedStages = adjustedStages.map((s) => {
      const dist = Math.round(s.distance * distAdjust);
      const hours = Math.round(s.estimatedHours * hoursAdjust);
      return {
        ...s,
        distance: dist,
        estimatedHours: hours > 0 ? Math.max(1, hours) : 0,
      };
    });

    // ── Optionally cap daily hours for beginners ───────────────────────────
    if (effectiveIsBeginner || tier === 'low' || tier === 'veryLow') {
      const maxHours = tier === 'veryLow' ? 5 : effectiveIsBeginner ? 6 : 7;
      adjustedStages = adjustedStages.map((s) => ({
        ...s,
        estimatedHours: s.distance > 0 ? Math.min(s.estimatedHours, maxHours) : s.estimatedHours,
      }));
    }

    // ── Auto-detect & strip non-trekking stages ────────────────────────────
    const isTravelStage = (s: RouteStage) => {
      const ck = (s.checkpoint || '').toLowerCase();
      return (s.distance === 0 && s.estimatedHours > 0 && s.estimatedHours <= 2) ||
             ck.includes('flight') || ck.includes('drive') ||
             ck.includes('travel');
    };
    const firstRealIdx = adjustedStages.findIndex(s => !isTravelStage(s));
    const firstStageFrom = adjustedStages.length > 0 ? adjustedStages[0].from : '';
    const suggestedStart = firstRealIdx > 0
      ? adjustedStages[firstRealIdx].from
      : adjustedStages[0]?.from || '';
    let preTrekSummary = '';
    if (firstRealIdx > 0) {
      const travelStages = adjustedStages.slice(0, firstRealIdx);
      preTrekSummary = travelStages.map(s => {
        const ck = s.checkpoint || '';
        const method = ck.toLowerCase().includes('flight') ? 'Fly'
                     : ck.toLowerCase().includes('drive') ? 'Drive'
                     : 'Travel';
        return `${method} from ${s.from} to ${s.to}`;
      }).join(', then ');
      adjustedStages = adjustedStages.slice(firstRealIdx);
    }
    let postTrekSummary = '';
    let lastRealIdx = adjustedStages.length - 1;
    while (lastRealIdx >= 0 && isTravelStage(adjustedStages[lastRealIdx])) {
      lastRealIdx--;
    }
    if (lastRealIdx < adjustedStages.length - 1) {
      const returnStages = adjustedStages.slice(lastRealIdx + 1);
      postTrekSummary = returnStages.map(s => {
        const ck = s.checkpoint || '';
        const method = ck.toLowerCase().includes('flight') ? 'Fly'
                     : ck.toLowerCase().includes('drive') ? 'Drive'
                     : 'Travel';
        return `${method} from ${s.from} to ${s.to}`;
      }).join(', then ');
      adjustedStages = adjustedStages.slice(0, lastRealIdx + 1);
    }
    const trekEnd = adjustedStages.length > 0
      ? adjustedStages[adjustedStages.length - 1].to
      : '';
    const origin = input.startLocation?.trim() || suggestedStart;
    const finalDest = input.finalDestination?.trim() || trekEnd;

    // Normalize nearby locations so e.g. Bhaktapur → Kathmandu
    const normalizeLoc = (loc: string): string => {
      const lower = loc.toLowerCase();
      for (const [canonical, aliases] of Object.entries(LOCATION_ALIASES)) {
        if (lower === canonical || aliases.includes(lower)) return canonical;
      }
      return loc;
    };

    if (normalizeLoc(origin) !== normalizeLoc(suggestedStart)) {
      const originDest = firstRealIdx > 0 ? firstStageFrom : suggestedStart;
      if (normalizeLoc(origin) !== normalizeLoc(originDest)) {
        adjustedStages.unshift({
          day: 0, from: origin, to: originDest,
          distance: 0, elevationGain: 0, estimatedHours: 0,
          checkpoint: `Travel from ${origin} to ${originDest}`, restStop: '',
        });
        const originLeg = `Travel from ${origin} to ${originDest}`;
        preTrekSummary = preTrekSummary ? `${originLeg}, then ${preTrekSummary}` : originLeg;
      }
    }
    if (finalDest !== trekEnd) {
      adjustedStages.push({
        day: 0, from: trekEnd, to: finalDest,
        distance: 0, elevationGain: 0, estimatedHours: 0,
        checkpoint: `Travel from ${trekEnd} to ${finalDest}`, restStop: '',
      });
      if (!postTrekSummary) {
        const label = finalDest === origin ? 'Return' : 'Travel';
        postTrekSummary = `${label} from ${trekEnd} to ${finalDest}`;
      }
    }

    const baseDays = stages.length;

    // ── For fast & experienced: combine small stages ───────────────────────
    if (isFast && !effectiveIsBeginner && tier !== 'low') {
      adjustedStages = this.combineSmallStages(adjustedStages);
    }

    // ── Insert strategic rest days (limited, difficulty-based) ─────────────
    const restDaysToAdd = this.getRestDaysToAdd(tier, isSlow, effectiveIsBeginner, age, weight, groupSize);
    if (restDaysToAdd > 0) {
      adjustedStages = this.insertStrategicRestDays(adjustedStages, restDaysToAdd);
    }

    // ── Build caution messages ─────────────────────────────────────────────
    const cautionMessages: string[] = [];
    if (isLowFitness && baseDifficulty >= 2) {
      cautionMessages.push(
        'This trek may be challenging given your current fitness. We recommend building endurance with regular cardio and leg exercises before attempting.',
      );
    }
    if (effectiveIsBeginner && baseDifficulty >= 3) {
      cautionMessages.push(
        'This route is quite challenging for beginners. Consider an easier trek first or go with an experienced guide.',
      );
    }
    if (groupSize && groupSize >= 10 && baseDifficulty >= 2) {
      cautionMessages.push(
        'Large groups move slower. Plan extra time between points and coordinate with your team.',
      );
    }
    if (tier === 'low' && baseDifficulty >= 2) {
      cautionMessages.push(
        'This trek will be physically demanding for you. Take it slow, stay hydrated, and listen to your body.',
      );
    }
    if (tier === 'veryLow' && baseDifficulty >= 2) {
      cautionMessages.push(
        'This trek is very demanding given your fitness level. We strongly suggest consulting a professional and preparing with targeted training.',
      );
    }

    // ── Target days logic ──────────────────────────────────────────────────
    if (targetDays) {
      const trekDist = adjustedStages.reduce((s, d) => s + d.distance, 0);
      const maxDailyKm = difficulty === 'hard' ? 10 : difficulty === 'moderate' ? 13 : 16;
      const safeMinDays = Math.max(
        Math.ceil(trekDist / maxDailyKm),
        Math.ceil(adjustedStages.length * 0.6),
      );
      if (targetDays < safeMinDays) {
        cautionMessages.push(
          `${targetDays} days is too short for ${trekDist}km ${difficulty} trek. Minimum ${safeMinDays} days recommended — adjusting.`,
        );
      }
      const effectiveTarget = Math.max(targetDays, safeMinDays);
      if (effectiveTarget < adjustedStages.length) {
        adjustedStages = this.mergeToFitTarget(adjustedStages, effectiveTarget);
      } else if (effectiveTarget > adjustedStages.length) {
        adjustedStages = this.expandToFitTarget(adjustedStages, effectiveTarget);
      }
    } else {
      // No target: keep close to default; cap extension at baseDays + 3
      const maxAllowed = baseDays + 3;
      if (adjustedStages.length > maxAllowed) {
        adjustedStages = this.mergeToFitTarget(adjustedStages, maxAllowed);
      }
    }

    if (isLowFitness && baseDifficulty >= 2) {
      adjustedStages = this.insertRestCheckpoints(adjustedStages);
    }

    const hasMajorConcern = tier === 'low' || tier === 'veryLow' ||
      effectiveIsBeginner ||
      (age !== undefined && age >= 50) ||
      (weight !== undefined && weight >= 90) ||
      (groupSize !== undefined && groupSize >= 10);
    let suitability: 'Low' | 'Moderate' | 'High' = 'High';
    if (baseDifficulty >= 3 && hasMajorConcern) {
      suitability = 'Low';
    } else if (baseDifficulty >= 3 && !isLowFitness && !effectiveIsBeginner) {
      suitability = baseDifficulty === 3 && !effectiveIsExperienced ? 'Moderate' : 'High';
    } else if (baseDifficulty >= 2 && hasMajorConcern) {
      suitability = 'Moderate';
    }

    const renumbered: ItineraryDay[] = adjustedStages.map((s, i) => {
      const prev = i > 0 ? adjustedStages[i - 1] : null;
      const desc = this.buildDayDescription(s, prev, isFast, difficulty);
      return {
        day: i + 1,
        from: s.from,
        to: s.to,
        distance: s.distance,
        elevationGain: s.elevationGain,
        estimatedHours: s.estimatedHours,
        checkpoint: s.checkpoint,
        restStops: this.buildRestStops(s, isLowFitness || (age !== undefined && age >= 50) || (weight !== undefined && weight >= 90)),
        activityType: desc.type,
        description: desc.text,
      };
    });
    const totalDistance = renumbered.reduce((sum, d) => sum + d.distance, 0);

    return {
      trekName,
      totalDays: renumbered.length,
      totalDistance: Math.round(totalDistance * 10) / 10,
      suitability,
      cautionMessage: cautionMessages.join(' ').trim(),
      suggestedStart,
      origin,
      finalDestination: finalDest,
      trekEnd,
      ...(preTrekSummary ? { preTrekSummary } : {}),
      ...(postTrekSummary ? { postTrekSummary } : {}),
      itinerary: renumbered,
    };
  }

  // ── Internal capability score (0-100) ──────────────────────────────────
  private computeCapabilityScore(
    pace: string,
    fitnessLevel: string,
    experience: string,
    age?: number,
    weight?: number,
  ): number {
    const paceScore: Record<string, number> = { slow: 60, normal: 80, fast: 100 };
    const fitnessScore: Record<string, number> = { beginner: 40, intermediate: 60, advanced: 80, expert: 100 };
    const expScore: Record<string, number> = { none: 30, basic: 50, moderate: 75, extensive: 100 };

    let ageScore = 100;
    if (age) {
      if (age < 18) ageScore = 50;
      else if (age <= 35) ageScore = 100;
      else if (age <= 50) ageScore = 85;
      else if (age <= 65) ageScore = 60;
      else ageScore = 35;
    }

    let weightScore = 100;
    if (weight) {
      if (weight < 50) weightScore = 60;
      else if (weight <= 90) weightScore = 100;
      else if (weight <= 120) weightScore = 70;
      else weightScore = 40;
    }

    const p = (paceScore[pace] || 80) * 0.25;
    const f = (fitnessScore[fitnessLevel] || 40) * 0.25;
    const e = (expScore[experience] || 30) * 0.25;
    const a = ageScore * 0.15;
    const w = weightScore * 0.10;

    return Math.round(p + f + e + a + w);
  }

  // ── Distance adjustment factor based on capability tier + pace ──────────
  private getDistAdjust(tier: string, isSlow: boolean, isFast: boolean): number {
    let base = 1.0;
    if (tier === 'high') base = isSlow ? 0.9 : isFast ? 1.1 : 1.0;
    else if (tier === 'moderate') base = isSlow ? 0.85 : isFast ? 1.05 : 0.95;
    else if (tier === 'low') base = isSlow ? 0.75 : isFast ? 0.95 : 0.85;
    else base = isSlow ? 0.65 : isFast ? 0.85 : 0.75;
    return base;
  }

  // ── Hours adjustment factor ─────────────────────────────────────────────
  private getHoursAdjust(tier: string, isSlow: boolean, isFast: boolean): number {
    let base = 1.0;
    if (tier === 'high') base = isSlow ? 0.85 : isFast ? 1.1 : 1.0;
    else if (tier === 'moderate') base = isSlow ? 0.8 : isFast ? 1.05 : 0.9;
    else if (tier === 'low') base = isSlow ? 0.7 : isFast ? 0.9 : 0.8;
    else base = isSlow ? 0.6 : isFast ? 0.8 : 0.7;
    return base;
  }

  // ── Calculate how many rest days to add (max 3-4) ──────────────────────
  private getRestDaysToAdd(
    tier: string,
    isSlow: boolean,
    isBeginner: boolean,
    age?: number,
    weight?: number,
    groupSize?: number,
  ): number {
    let days = 0;
    if (tier === 'low') days = 2;
    else if (tier === 'veryLow') days = 3;
    else if (tier === 'moderate' && isSlow) days = 1;
    else if (tier === 'moderate' && (age && age >= 50)) days = 1;

    if (isBeginner && days < 2) days = Math.max(days, 1);
    if (weight && weight >= 120 && days < 2) days = 2;
    if (groupSize && groupSize >= 10) days = Math.min(days + 1, 3);

    return Math.min(days, 4);
  }

  // ── Expand abbreviations in location fields ────────────────────────────
  private expandStageAbbreviations(stage: RouteStage): RouteStage {
    const ABBR_MAP: Record<string, string> = {
      'ABC': 'Annapurna Base Camp',
      'MBC': 'Machhapuchhre Base Camp',
    };
    const expand = (val: string): string => {
      let result = val;
      for (const [abbr, full] of Object.entries(ABBR_MAP)) {
        result = result.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full);
      }
      return result;
    };
    return {
      ...stage,
      from: expand(stage.from),
      to: expand(stage.to),
      checkpoint: expand(stage.checkpoint),
      restStop: expand(stage.restStop),
    };
  }

  // ── Insert rest days based on section difficulty ──────────────────────
  private insertStrategicRestDays(stages: RouteStage[], count: number): RouteStage[] {
    if (count <= 0) return stages;

    const isRest = (s: RouteStage) =>
      s.distance === 0 && s.estimatedHours === 0;

    // Score each trekking stage by difficulty (distance × hours × elevation)
    const stageScores = stages.map((s, i) => ({
      index: i,
      score: (s.distance || 0) * ((s.estimatedHours || 0) + 1) * (1 + (s.elevationGain || 0) / 500),
      isRestDay: isRest(s),
    }));

    const candidates = stageScores
      .filter(s => !s.isRestDay && s.score >= 6)
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) return stages;

    const used = new Set<number>();
    const selected: number[] = [];

    for (const c of candidates) {
      if (selected.length >= count) break;
      const idx = c.index;
      if (used.has(idx - 1) || used.has(idx) || used.has(idx + 1)) continue;
      if (idx >= stages.length - 1) continue;
      if (isRest(stages[idx + 1])) continue;

      selected.push(idx);
      used.add(idx);
    }

    if (selected.length === 0) return stages;

    selected.sort((a, b) => b - a);
    const result = [...stages];
    for (const idx of selected) {
      const stage = result[idx];
      result.splice(idx + 1, 0, {
        day: 0,
        from: stage.to,
        to: stage.to,
        distance: 0,
        elevationGain: 0,
        estimatedHours: 0,
        checkpoint: 'Rest and Acclimatization Day — recover and adjust to the altitude',
        restStop: stage.to,
      });
    }
    return result;
  }

  // ── Build concise description ──────────────────────────────────────────
  private buildDayDescription(
    stage: RouteStage,
    prevStage: RouteStage | null,
    isFast: boolean,
    difficulty: string,
  ): { type: 'trekking' | 'travel' | 'rest' | 'mixed'; text: string } {
    const ck = (stage.checkpoint || '').toLowerCase();
    const isTravel = (stage.distance === 0 && stage.estimatedHours > 0 && stage.estimatedHours <= 2) ||
      ck.includes('flight') || ck.includes('drive') || ck.includes('travel from');
    const isRest = !isTravel && stage.distance === 0 && stage.estimatedHours === 0 &&
      (ck.includes('rest') || ck.includes('acclimatization') || ck.includes('exploration'));

    if (isTravel) {
      const method = ck.includes('flight') ? 'flight'
        : ck.includes('drive') ? 'jeep/private vehicle'
        : 'bus or private vehicle';
      return {
        type: 'travel',
        text: `Travel by ${method}`,
      };
    }

    if (isRest) {
      return {
        type: 'rest',
        text: `Rest & acclimatisation · ${stage.to || stage.from}`,
      };
    }

    const hrs = stage.estimatedHours;
    const dist = stage.distance;
    const elev = stage.elevationGain;
    const via = stage.checkpoint && !ck.includes('rest') ? ` via ${stage.checkpoint}` : '';

    return {
      type: 'trekking',
      text: `${dist} km · +${elev} m · ~${hrs} hr${hrs > 1 ? 's' : ''}${via}`,
    };
  }

  private combineSmallStages(stages: RouteStage[]): RouteStage[] {
    if (stages.length <= 1) return stages;
    const result: RouteStage[] = [];
    let i = 0;
    while (i < stages.length) {
      const current = { ...stages[i] };
      if (current.distance < 5 && i + 1 < stages.length) {
        const next = stages[i + 1];
        current.to = next.to;
        current.distance += next.distance;
        current.elevationGain += next.elevationGain;
        current.estimatedHours += next.estimatedHours;
        current.checkpoint = next.checkpoint || current.checkpoint;
        current.restStop = next.restStop || current.restStop;
        i += 2;
      } else {
        i += 1;
      }
      result.push(current);
    }
    return result;
  }

  private mergeToFitTarget(stages: RouteStage[], targetDays: number): RouteStage[] {
    const result = [...stages];
    const toRemove = result.length - targetDays;
    for (let r = 0; r < toRemove; r++) {
      let bestIdx = -1;
      let minDist = Infinity;
      for (let i = 0; i < result.length - 1; i++) {
        if (result[i].distance === 0 && result[i + 1].distance === 0) continue;
        const combined = result[i].distance + result[i + 1].distance;
        if (combined < minDist) {
          minDist = combined;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;
      const next = result[bestIdx + 1];
      result[bestIdx].to = next.to;
      result[bestIdx].distance += next.distance;
      result[bestIdx].elevationGain += next.elevationGain;
      result[bestIdx].estimatedHours += next.estimatedHours;
      result[bestIdx].checkpoint = next.checkpoint || result[bestIdx].checkpoint;
      result[bestIdx].restStop = next.restStop || result[bestIdx].restStop;
      result.splice(bestIdx + 1, 1);
    }
    return result;
  }

  private expandToFitTarget(stages: RouteStage[], targetDays: number): RouteStage[] {
    const totalDist = stages.reduce((s, d) => s + d.distance, 0);
    const idealDaily = totalDist / targetDays;
    let extraDays = targetDays - stages.length;
    const segments: number[] = stages.map(() => 1);
    while (extraDays > 0) {
      let bestIdx = -1;
      let bestRatio = 0;
      for (let i = 0; i < stages.length; i++) {
        if (stages[i].distance === 0) continue;
        const perDay = stages[i].distance / segments[i];
        if (perDay > idealDaily) {
          const ratio = perDay / idealDaily;
          if (ratio > bestRatio) { bestRatio = ratio; bestIdx = i; }
        }
      }
      if (bestIdx === -1) break;
      segments[bestIdx]++;
      extraDays--;
    }
    const result: RouteStage[] = [];
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const n = segments[i];
      if (n > 1 && stage.distance > 0) {
        const segDist = Math.round(stage.distance / n);
        const segHours = Math.round(stage.estimatedHours / n);
        const segElev = Math.round(stage.elevationGain / n);
        const ck = stage.checkpoint || '';
        for (let h = 0; h < n; h++) {
          const isFirst = h === 0;
          const isLast = h === n - 1;
          const from = isFirst ? stage.from : result[result.length - 1]?.to || stage.from;
          const to = isLast ? stage.to : (ck || `${stage.to} area`);
          result.push({
            day: 0, from, to, distance: segDist,
            elevationGain: segElev, estimatedHours: segHours,
            checkpoint: isFirst ? ck : `Continue to ${stage.to}`,
            restStop: '',
          });
        }
      } else {
        result.push({ ...stage });
      }
    }
    while (result.length < targetDays) {
      const last = result[result.length - 1];
      result.push({
        day: 0, from: last.to, to: last.to,
        distance: 0, elevationGain: 0, estimatedHours: 0,
        checkpoint: 'Rest and Acclimatization Day — recover and adjust to the altitude',
        restStop: last.to,
      });
    }
    return result;
  }

  private insertRestCheckpoints(stages: RouteStage[]): RouteStage[] {
    return stages.map((s) => {
      if (s.distance > 8 && s.checkpoint && !s.checkpoint.toLowerCase().includes('rest')) {
        return {
          ...s,
          checkpoint: s.checkpoint
            ? `${s.checkpoint} → Recommended Rest Stop`
            : 'Recommended Rest Stop',
        };
      }
      return s;
    });
  }

  private buildRestStops(stage: RouteStage, isLowFitness: boolean): string[] {
    const stops: string[] = [];
    if (stage.restStop) {
      stops.push(stage.restStop);
    }
    if (isLowFitness && stage.checkpoint && !stops.includes(stage.checkpoint)) {
      stops.push(stage.checkpoint);
    }
    return stops;
  }
}
