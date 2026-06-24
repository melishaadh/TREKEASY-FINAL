import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IsInt, Min, Max, IsOptional, IsEmail, IsString, MinLength } from 'class-validator';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({
    type: {
      ageGroup: { type: Number, required: true, min: 0, max: 3 },
      experienceLevel: { type: Number, required: true, min: 0, max: 3 },
      cardioRespiratoryIndicator: { type: Number, required: true, min: 0, max: 1 },
      jointStability: { type: Number, required: true, min: 0, max: 1 },
      altitudeHistory: { type: Number, required: true, min: 0, max: 3 },
      fitnessLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'beginner' },
      trekkingExperience: { type: String, enum: ['none', 'basic', 'moderate', 'extensive'], default: 'none' },
      pace: { type: String, enum: ['slow', 'moderate', 'fast'], default: 'moderate' },
    },
    _id: false,
  })
  profile!: UserProfile;

  @Prop({ default: false })
  isOnboarded!: boolean;

  @Prop({ type: Date, default: null })
  lastLogin!: Date | null;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export interface UserProfile {
  /** Age group: 0=18-25, 1=26-35, 2=36-50, 3=50+ */
  ageGroup: number;
  /** Experience level: 0=beginner, 1=intermediate, 2=advanced, 3=expert */
  experienceLevel: number;
  /** Cardio/respiratory health indicator: 0=poor, 1=good */
  cardioRespiratoryIndicator: number;
  /** Joint stability indicator: 0=poor, 1=good */
  jointStability: number;
  /** Altitude experience history: 0=none, 1=basic, 2=moderate, 3=extensive */
  altitudeHistory: number;
  /** Fitness level for itinerary personalization */
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  /** Trekking experience for itinerary personalization */
  trekkingExperience: 'none' | 'basic' | 'moderate' | 'extensive';
  /** Preferred pace for itinerary personalization */
  pace: 'slow' | 'moderate' | 'fast';
}

// Validation constraints for UserProfile fields
export const AGE_GROUP_RANGE = { min: 0, max: 3 } as const;
export const EXPERIENCE_LEVEL_RANGE = { min: 0, max: 3 } as const;
export const CARDIO_RANGE = { min: 0, max: 1 } as const;
export const JOINT_RANGE = { min: 0, max: 1 } as const;
export const ALTITUDE_RANGE = { min: 0, max: 3 } as const;

export const UserSchema = SchemaFactory.createForClass(User);

// Index for faster queries
UserSchema.index({ email: 1 });
UserSchema.index({ isOnboarded: 1 });

// Document type
export type UserDocument = User & Document;
