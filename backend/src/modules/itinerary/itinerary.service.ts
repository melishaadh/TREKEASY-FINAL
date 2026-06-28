import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Itinerary } from '@/schemas/itinerary.schema';
import { PersonalizationService, PersonalizationInput, PersonalizedItinerary } from '@/modules/treks/personalization.service';
import { User } from '@/schemas/user.schema';
import { Trek } from '@/schemas/trek.schema';

export interface GenerateItineraryDto {
  trekId: string;
  pace?: string;
  fitnessLevel?: string;
  trekkingExperience?: string;
  targetDays?: number;
  age?: number;
  weight?: number;
  groupSize?: number;
  previousTreks?: number;
  startLocation?: string;
  finalDestination?: string;
}

@Injectable()
export class ItineraryService {
  constructor(
    @InjectModel(Itinerary.name) private itineraryModel: Model<Itinerary>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Trek.name) private trekModel: Model<Trek>,
    private readonly personalizationService: PersonalizationService,
  ) {}

  async generate(userId: string, dto: GenerateItineraryDto): Promise<Itinerary> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    const trek = await this.trekModel.findById(dto.trekId).exec();
    if (!trek) throw new NotFoundException('Trek not found');

    const profile = user.profile;

    const input: PersonalizationInput = {
      pace: (dto.pace as PersonalizationInput['pace']) || profile.pace || 'normal',
      fitnessLevel: (dto.fitnessLevel as PersonalizationInput['fitnessLevel']) || profile.fitnessLevel || 'beginner',
      trekkingExperience: (dto.trekkingExperience as PersonalizationInput['trekkingExperience']) || profile.trekkingExperience || 'none',
      targetDays: dto.targetDays,
      age: dto.age,
      weight: dto.weight,
      groupSize: dto.groupSize,
      previousTreks: dto.previousTreks,
      startLocation: dto.startLocation,
      finalDestination: dto.finalDestination,
    };

    const result: PersonalizedItinerary = this.personalizationService.generate(
      trek.name,
      trek.difficulty,
      trek.routeStages,
      input,
    );

    const existing = await this.itineraryModel.findOne({ userId, trekId: dto.trekId }).exec();
    if (existing) {
      Object.assign(existing, {
        trekName: trek.name,
        totalDays: result.totalDays,
        totalDistance: result.totalDistance,
        totalEffort: result.totalEffort,
        maxAltitude: result.maxAltitude,
        suitability: result.suitability,
        cautions: result.cautions,
        origin: result.origin,
        finalDestination: result.finalDestination,
        days: result.days,
        rejectionReason: result.rejectionReason || null,
        minimumSafeDays: result.minimumSafeDays || null,
        recommendedDays: result.recommendedDays || null,
      });
      return existing.save();
    }

    return this.itineraryModel.create({
      userId,
      trekId: dto.trekId,
      trekName: trek.name,
      totalDays: result.totalDays,
      totalDistance: result.totalDistance,
      totalEffort: result.totalEffort,
      maxAltitude: result.maxAltitude,
      suitability: result.suitability,
      cautions: result.cautions,
      origin: result.origin,
      finalDestination: result.finalDestination,
      days: result.days,
      rejectionReason: result.rejectionReason || null,
      minimumSafeDays: result.minimumSafeDays || null,
      recommendedDays: result.recommendedDays || null,
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
