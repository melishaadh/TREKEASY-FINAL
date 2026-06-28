import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface ActivityRecord {
  type: 'road_travel' | 'flight' | 'trekking' | 'rest' | 'acclimatization' | 'checkpoint_stop' | 'meal_break' | 'recovery_break' | 'sightseeing';
  from: string;
  to: string;
  distance: number;
  elevationGain: number;
  durationHours: number;
  effortScore: number;
  description: string;
}

export interface DayRecord {
  day: number;
  activities: ActivityRecord[];
  totalHours: number;
  totalDistance: number;
  totalElevationGain: number;
  maxAltitude: number;
  overnightLocation: string;
  notes: string[];
}

@Schema({ timestamps: true })
export class Itinerary extends Document {
  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ type: String, required: true })
  trekId!: string;

  @Prop({ required: true, trim: true })
  trekName!: string;

  @Prop({ required: true })
  totalDays!: number;

  @Prop({ required: true })
  totalDistance!: number;

  @Prop({ required: true })
  totalEffort!: number;

  @Prop({ required: true })
  maxAltitude!: number;

  @Prop({ required: true, trim: true })
  suitability!: string;

  @Prop({ type: [String], default: [] })
  cautions!: string[];

  @Prop({ type: String, default: null })
  origin!: string | null;

  @Prop({ type: String, default: null })
  finalDestination!: string | null;

  @Prop({
    type: [{
      day: { type: Number, required: true },
      activities: { type: [{
        type: { type: String, required: true },
        from: { type: String, required: true },
        to: { type: String, required: true },
        distance: { type: Number, default: 0 },
        elevationGain: { type: Number, default: 0 },
        durationHours: { type: Number, default: 0 },
        effortScore: { type: Number, default: 0 },
        description: { type: String, default: '' },
      }], default: [] },
      totalHours: { type: Number, default: 0 },
      totalDistance: { type: Number, default: 0 },
      totalElevationGain: { type: Number, default: 0 },
      maxAltitude: { type: Number, default: 0 },
      overnightLocation: { type: String, default: '' },
      notes: { type: [String], default: [] },
    }],
    default: [],
    _id: false,
  })
  days!: DayRecord[];

  @Prop({ type: String, default: null })
  rejectionReason!: string | null;

  @Prop({ type: Number, default: null })
  minimumSafeDays!: number | null;

  @Prop({ type: Number, default: null })
  recommendedDays!: number | null;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const ItinerarySchema = SchemaFactory.createForClass(Itinerary);

ItinerarySchema.index({ userId: 1 });
ItinerarySchema.index({ trekId: 1 });
ItinerarySchema.index({ userId: 1, trekId: 1 }, { unique: true });
