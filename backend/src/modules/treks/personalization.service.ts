import { Injectable } from '@nestjs/common';
import { RouteStage } from '@/schemas/trek.schema';

export interface PersonalizationInput {
  pace: 'slow' | 'normal' | 'fast';
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  trekkingExperience: 'none' | 'basic' | 'moderate' | 'extensive';
  targetDays?: number;
  healthCondition?: 'none' | 'obesity' | 'cardiovascular' | 'joint' | 'other';
  age?: number;
  weight?: number;
  groupSize?: number;
  previousTreks?: number;
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
}

export interface PersonalizedItinerary {
  trekName: string;
  totalDays: number;
  totalDistance: number;
  suitability: 'Low' | 'Moderate' | 'High';
  cautionMessage: string;
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
    const health = input.healthCondition || 'none';
    const age = input.age;
    const weight = input.weight;
    const groupSize = input.groupSize;
    const previousTreks = input.previousTreks;

    const isSlow = pace === 'slow';
    const isFast = pace === 'fast';
    const isLowFitness = fitnessLevel === 'beginner' || fitnessLevel === 'intermediate';
    const isBeginner = experience === 'none' || experience === 'basic';
    const isExperienced = experience === 'extensive' || experience === 'moderate';
    const hasHealthIssue = health !== 'none';

    const difficultyMap: Record<string, number> = { easy: 1, moderate: 2, hard: 3 };
    const baseDifficulty = difficultyMap[difficulty.toLowerCase()] || 2;

    const distanceMultiplier = isSlow ? 0.75 : isFast ? 1.15 : 1.0;
    const hoursMultiplier = isSlow ? 0.85 : isFast ? 1.1 : 1.0;
    const healthDistMultiplier = hasHealthIssue ? 0.6 : 1.0;

    let ageMultiplier = 1.0;
    let ageCaution = '';
    if (age) {
      if (age < 18) { ageMultiplier = 0.85; ageCaution = 'You are under 18 — this trek may be very demanding. Trek with an experienced guide.'; }
      else if (age >= 50 && age < 65) { ageMultiplier = 0.8; ageCaution = 'Given your age (50+), we recommend pacing yourself and taking extra rest.'; }
      else if (age >= 65) { ageMultiplier = 0.6; ageCaution = 'This trek is very demanding for trekkers aged 65+. Please consult your doctor and consider a shorter/easier route.'; }
    }

    let weightMultiplier = 1.0;
    let weightCaution = '';
    if (weight) {
      if (weight < 50) { weightMultiplier = 0.9; weightCaution = 'Your weight is below 50kg — ensure you have enough energy reserves for long trekking days.'; }
      else if (weight >= 90 && weight < 120) { weightMultiplier = 0.85; weightCaution = 'Your weight may add extra strain on joints during long descents. Trek carefully.'; }
      else if (weight >= 120) { weightMultiplier = 0.65; weightCaution = 'Significant extra weight puts strain on knees and joints. We recommend building fitness beforehand and taking it slow.'; }
    }

    let groupMultiplier = 1.0;
    if (groupSize) {
      if (groupSize >= 5 && groupSize < 10) groupMultiplier = 0.9;
      else if (groupSize >= 10 && groupSize < 15) groupMultiplier = 0.8;
      else if (groupSize >= 15) groupMultiplier = 0.7;
    }

    let derivedExperience = experience;
    if (previousTreks !== undefined && previousTreks !== null) {
      if (previousTreks === 0) derivedExperience = 'none';
      else if (previousTreks <= 3) derivedExperience = 'basic';
      else if (previousTreks <= 10) derivedExperience = 'moderate';
      else derivedExperience = 'extensive';
    }
    const effectiveIsBeginner = derivedExperience === 'none' || derivedExperience === 'basic';
    const effectiveIsExperienced = derivedExperience === 'extensive' || derivedExperience === 'moderate';

    const overallDistMultiplier = distanceMultiplier * healthDistMultiplier * ageMultiplier * weightMultiplier * groupMultiplier;

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
    let adjustedStages: RouteStage[] = stages.map(toPlain).map((s) => {
      const dist = Math.round(s.distance * overallDistMultiplier);
      const hours = Math.round(s.estimatedHours * hoursMultiplier);
      return {
        ...s,
        distance: dist,
        estimatedHours: hours > 0 ? Math.max(1, hours) : 0,
      };
    });

    const needsRestMoreFreq = hasHealthIssue || (age && age >= 50) || (weight && weight >= 120);
    const restEvery = needsRestMoreFreq ? 1 : isSlow ? 2 : 0;

    if (!hasHealthIssue && isFast && !effectiveIsBeginner) {
      adjustedStages = this.combineSmallStages(adjustedStages);
    }
    if (isSlow || needsRestMoreFreq) {
      adjustedStages = this.insertRestDays(adjustedStages, restEvery);
    }

    if (targetDays && targetDays < adjustedStages.length) {
      adjustedStages = this.mergeToFitTarget(adjustedStages, targetDays);
    } else if (targetDays && targetDays > adjustedStages.length) {
      adjustedStages = this.expandToFitTarget(adjustedStages, targetDays);
    }

    const cautionMessages: string[] = [];
    if (isLowFitness && baseDifficulty >= 2) {
      cautionMessages.push(
        `This trek is rated ${difficulty}, which may be challenging given your current fitness level. We recommend building endurance before attempting.`,
      );
    }
    if (effectiveIsBeginner && baseDifficulty >= 3) {
      cautionMessages.push(
        'This is a hard trek and may not be suitable for beginners. Consider choosing an easier route or trekking with an experienced guide.',
      );
    }
    if (hasHealthIssue && baseDifficulty >= 2) {
      cautionMessages.push(
        `Given your health condition (${health.replace('_', ' ')}), we strongly recommend consulting a doctor before attempting this trek. Extra rest days and reduced daily distances have been factored in.`,
      );
    }
    if (ageCaution && baseDifficulty >= 2) {
      cautionMessages.push(ageCaution);
    }
    if (weightCaution && baseDifficulty >= 2) {
      cautionMessages.push(weightCaution);
    }
    if (groupSize && groupSize >= 10 && baseDifficulty >= 2) {
      cautionMessages.push(
        'Large groups move slower. Ensure proper coordination and allow extra time between points.',
      );
    }
    if (isLowFitness && baseDifficulty >= 2) {
      adjustedStages = this.insertRestCheckpoints(adjustedStages);
    }

    const hasMajorConcern = isLowFitness || effectiveIsBeginner || hasHealthIssue ||
      (age !== undefined && age >= 50) || (weight !== undefined && weight >= 90) ||
      (groupSize !== undefined && groupSize >= 10);

    let suitability: 'Low' | 'Moderate' | 'High' = 'High';
    if (baseDifficulty >= 3 && hasMajorConcern) {
      suitability = 'Low';
    } else if (baseDifficulty >= 3 && !isLowFitness && !effectiveIsBeginner) {
      suitability = baseDifficulty === 3 && !effectiveIsExperienced ? 'Moderate' : 'High';
    } else if (baseDifficulty >= 2 && hasMajorConcern) {
      suitability = 'Moderate';
    }

    const renumbered: ItineraryDay[] = adjustedStages.map((s, i) => ({
      day: i + 1,
      from: s.from,
      to: s.to,
      distance: s.distance,
      elevationGain: s.elevationGain,
      estimatedHours: s.estimatedHours,
      checkpoint: s.checkpoint,
      restStops: this.buildRestStops(s, isLowFitness || hasHealthIssue || (age !== undefined && age >= 50) || (weight !== undefined && weight >= 90)),
    }));

    const totalDistance = renumbered.reduce((sum, d) => sum + d.distance, 0);

    return {
      trekName,
      totalDays: renumbered.length,
      totalDistance: Math.round(totalDistance * 10) / 10,
      suitability,
      cautionMessage: cautionMessages.join(' ').trim(),
      itinerary: renumbered,
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

  private insertRestDays(stages: RouteStage[], everyNTrekkingDays = 2): RouteStage[] {
    const result: RouteStage[] = [];
    let trekkingDaysSinceRest = 0;
    for (const stage of stages) {
      if (stage.distance === 0 && stage.estimatedHours === 0) {
        result.push(stage);
        continue;
      }
      result.push(stage);
      trekkingDaysSinceRest++;
      if (trekkingDaysSinceRest >= everyNTrekkingDays) {
        result.push({
          day: 0,
          from: stage.to,
          to: stage.to,
          distance: 0,
          elevationGain: 0,
          estimatedHours: 0,
          checkpoint: 'Rest / Acclimatization Day',
          restStop: stage.to,
        });
        trekkingDaysSinceRest = 0;
      }
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
    const result = [...stages];
    while (result.length < targetDays) {
      const last = result[result.length - 1];
      result.push({
        day: 0,
        from: last.to,
        to: last.to,
        distance: 0,
        elevationGain: 0,
        estimatedHours: 0,
        checkpoint: 'Rest / Acclimatization Day',
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
