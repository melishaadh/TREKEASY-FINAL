import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface PersonalizedStage {
  day: number;
  from: string;
  to: string;
  distance: number;
  elevationGain: number;
  estimatedHours: number;
  checkpoint: string;
  restStop: string;
}

@Schema({ timestamps: true })
export class Itinerary extends Document {
  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ type: String, required: true })
  trekId!: string;

  @Prop({ required: true, trim: true })
  trekName!: string;

  @Prop({ required: true, trim: true })
  region!: string;

  @Prop({ required: true })
  totalDuration!: number;

  @Prop({ required: true })
  totalDistance!: number;

  @Prop({ required: true, trim: true })
  difficulty!: string;

  @Prop({ required: true })
  maxAltitude!: number;

  @Prop({
    type: [{
      day: { type: Number, required: true },
      from: { type: String, required: true },
      to: { type: String, required: true },
      distance: { type: Number, required: true },
      elevationGain: { type: Number, required: true },
      estimatedHours: { type: Number, required: true },
      checkpoint: { type: String, default: '' },
      restStop: { type: String, default: '' },
    }],
    default: [],
    _id: false,
  })
  personalizedStages!: PersonalizedStage[];

  @Prop({ type: String, default: null })
  notes!: string | null;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const ItinerarySchema = SchemaFactory.createForClass(Itinerary);

ItinerarySchema.index({ userId: 1 });
ItinerarySchema.index({ trekId: 1 });
ItinerarySchema.index({ userId: 1, trekId: 1 }, { unique: true });
