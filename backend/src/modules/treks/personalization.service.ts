import { Injectable } from '@nestjs/common';
import { RouteStage } from '@/schemas/trek.schema';

export interface PersonalizationInput {
  pace: 'slow' | 'normal' | 'fast';
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  trekkingExperience: 'none' | 'basic' | 'moderate' | 'extensive';
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

    const isSlow = pace === 'slow';
    const isFast = pace === 'fast';
    const isLowFitness = fitnessLevel === 'beginner';
    const isBeginner = experience === 'none' || experience === 'basic';
    const isExperienced = experience === 'extensive' || experience === 'moderate';

    const difficultyMap: Record<string, number> = { easy: 1, moderate: 2, hard: 3 };
    const baseDifficulty = difficultyMap[difficulty.toLowerCase()] || 2;

    const distanceMultiplier = isSlow ? 0.75 : isFast ? 1.15 : 1.0;
    const hoursMultiplier = isSlow ? 0.85 : isFast ? 1.1 : 1.0;

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
      const dist = Math.round(s.distance * distanceMultiplier);
      const hours = Math.round(s.estimatedHours * hoursMultiplier);
      return {
        ...s,
        distance: dist,
        estimatedHours: hours > 0 ? Math.max(1, hours) : 0,
      };
    });

    if (isFast && !isBeginner) {
      adjustedStages = this.combineSmallStages(adjustedStages);
    }

    if (isSlow) {
      adjustedStages = this.insertRestDays(adjustedStages);
    }

    const cautionMessages: string[] = [];
    if (isLowFitness && baseDifficulty >= 2) {
      cautionMessages.push(
        `This trek is rated ${difficulty}, which may be challenging given your current fitness level. We recommend building endurance before attempting.`,
      );
    }
    if (isBeginner && baseDifficulty >= 3) {
      cautionMessages.push(
        'This is a hard trek and may not be suitable for beginners. Consider choosing an easier route or trekking with an experienced guide.',
      );
    }
    if (isLowFitness && baseDifficulty >= 2) {
      adjustedStages = this.insertRestCheckpoints(adjustedStages);
    }

    let suitability: 'Low' | 'Moderate' | 'High' = 'High';
    if (baseDifficulty === 3 && (isLowFitness || isBeginner)) {
      suitability = 'Low';
    } else if (baseDifficulty === 3 && !isLowFitness && !isBeginner) {
      suitability = baseDifficulty === 3 && !isExperienced ? 'Moderate' : 'High';
    } else if (baseDifficulty === 2 && (isLowFitness || isBeginner)) {
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
      restStops: this.buildRestStops(s, isLowFitness),
    }));

    const totalDistance = renumbered.reduce((sum, d) => sum + d.distance, 0);

    return {
      trekName,
      totalDays: renumbered.length,
      totalDistance: Math.round(totalDistance * 10) / 10,
      suitability,
      cautionMessage: cautionMessages.join(' '),
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

  private insertRestDays(stages: RouteStage[]): RouteStage[] {
    const result: RouteStage[] = [];
    let trekkingDaysSinceRest = 0;
    for (const stage of stages) {
      if (stage.distance === 0 && stage.estimatedHours === 0) {
        result.push(stage);
        continue;
      }
      result.push(stage);
      trekkingDaysSinceRest++;
      if (trekkingDaysSinceRest >= 2) {
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
