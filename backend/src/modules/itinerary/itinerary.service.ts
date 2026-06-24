import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Itinerary, PersonalizedStage } from '@/schemas/itinerary.schema';
import { User, UserProfile } from '@/schemas/user.schema';
import { Trek } from '@/schemas/trek.schema';

export interface GenerateItineraryDto {
  trekId: string;
}

function profileToPace(profile: UserProfile): 'slow' | 'moderate' | 'fast' {
  return profile.pace || 'moderate';
}

function profileToFitnessLevel(profile: UserProfile): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  return profile.fitnessLevel || 'beginner';
}

function profileToTrekkingExperience(profile: UserProfile): 'none' | 'basic' | 'moderate' | 'extensive' {
  return profile.trekkingExperience || 'none';
}

@Injectable()
export class ItineraryService {
  constructor(
    @InjectModel(Itinerary.name) private itineraryModel: Model<Itinerary>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Trek.name) private trekModel: Model<Trek>,
  ) {}

  async generate(userId: string, dto: GenerateItineraryDto): Promise<Itinerary> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    const trek = await this.trekModel.findById(dto.trekId).exec();
    if (!trek) throw new NotFoundException('Trek not found');

    const profile = user.profile;
    const pace = profileToPace(profile);
    const fitnessLevel = profileToFitnessLevel(profile);
    const experience = profileToTrekkingExperience(profile);

    const paceMultiplier = pace === 'slow' ? 0.7 : pace === 'fast' ? 1.3 : 1.0;
    const difficultyMap: Record<string, number> = { easy: 1, moderate: 2, hard: 3 };
    const difficultyLabel = ['easy', 'moderate', 'hard'] as const;
    const fitnessMap: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };

    const experienceNum = experience === 'extensive' ? 3 : experience === 'moderate' ? 2 : experience === 'basic' ? 1 : 0;
    const baseDifficulty = difficultyMap[trek.difficulty.toLowerCase()] || 2;
    const userFitness = fitnessMap[fitnessLevel] || 1;
    const experienceBonus = experience === 'extensive' ? 2 : experience === 'moderate' ? 1 : 0;
    const adjustedDifficulty = Math.max(1, Math.min(3, baseDifficulty - (userFitness > 2 ? 1 : 0) + (experienceNum < 1 ? 1 : 0) - experienceBonus));

    const personalizedStages: PersonalizedStage[] = trek.routeStages.map((stage, index) => {
      const adjustedDistance = Math.round(stage.distance * paceMultiplier);
      const adjustedHours = Math.round(stage.estimatedHours * (1 / paceMultiplier));
      const extraRestDay = index > 0 && index < trek.routeStages.length - 1 && baseDifficulty >= 3 && userFitness <= 2;

      if (extraRestDay) {
        personalizedStages.push({
          day: stage.day,
          from: stage.from,
          to: stage.from,
          distance: 0,
          elevationGain: 0,
          estimatedHours: 0,
          checkpoint: 'Rest / Acclimatization',
          restStop: stage.from,
        });
      }

      return {
        day: stage.day,
        from: stage.from,
        to: stage.to,
        distance: adjustedDistance,
        elevationGain: stage.elevationGain,
        estimatedHours: adjustedHours > 0 ? adjustedHours : stage.estimatedHours,
        checkpoint: stage.checkpoint,
        restStop: stage.restStop,
      };
    });

    const renumberedStages = personalizedStages.map((stage, index) => ({
      ...stage,
      day: index + 1,
    }));

    const totalDistance = renumberedStages.reduce((sum, s) => sum + s.distance, 0);
    const totalDuration = renumberedStages.length;

    const existing = await this.itineraryModel.findOne({ userId, trekId: dto.trekId }).exec();
    if (existing) {
      Object.assign(existing, {
        trekName: trek.name,
        region: trek.region,
        totalDuration,
        totalDistance,
        difficulty: difficultyLabel[adjustedDifficulty - 1],
        maxAltitude: trek.maxAltitude,
        personalizedStages: renumberedStages,
        notes: `Personalized for ${fitnessLevel} fitness, ${pace} pace, ${experience} experience.`,
      });
      return existing.save();
    }

    return this.itineraryModel.create({
      userId,
      trekId: dto.trekId,
      trekName: trek.name,
      region: trek.region,
      totalDuration,
      totalDistance,
      difficulty: difficultyLabel[adjustedDifficulty - 1],
      maxAltitude: trek.maxAltitude,
      personalizedStages: renumberedStages,
      notes: `Personalized for ${fitnessLevel} fitness, ${pace} pace, ${experience} experience.`,
    });
  }

  async getByUser(userId: string): Promise<Itinerary[]> {
    return this.itineraryModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async getByUserAndTrek(userId: string, trekId: string): Promise<Itinerary | null> {
    return this.itineraryModel.findOne({ userId, trekId }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.itineraryModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
