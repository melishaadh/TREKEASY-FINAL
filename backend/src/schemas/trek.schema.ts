import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export interface RouteStage {
  day: number;
  from: string;
  to: string;
  distance: number;
  elevationGain: number;
  estimatedHours: number;
  checkpoint: string;
  restStop: string;
}

@Schema({ timestamps: true, _id: false })
export class Trek {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: true, trim: true })
  region!: string;

  @Prop({ required: true, trim: true })
  difficulty!: string;

  @Prop({ required: true })
  duration!: number;

  @Prop({ required: true })
  price!: number;

  @Prop({ required: true })
  maxAltitude!: number;

  @Prop({ type: String, default: null })
  imageUrl!: string | null;

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
  routeStages!: RouteStage[];

  @Prop({ type: [String], default: [] })
  keywords!: string[];

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const TrekSchema = SchemaFactory.createForClass(Trek);

TrekSchema.index({ difficulty: 1 });
TrekSchema.index({ region: 1 });
TrekSchema.index({ price: 1 });
TrekSchema.index({ duration: 1 });
