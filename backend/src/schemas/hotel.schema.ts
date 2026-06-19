import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Hotel extends Document {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  trek_destination_id!: string;

  @Prop({ required: true, trim: true })
  trek_destination_name!: string;

  @Prop({ required: true, trim: true })
  owner_contact!: string;

  @Prop({ required: true })
  price_per_package!: number;

  @Prop({ required: true, trim: true })
  location!: string;

  @Prop({ required: true, default: 10 })
  capacity!: number;

  @Prop({ trim: true, default: null })
  description!: string | null;

  @Prop({ trim: true, default: null })
  image_url!: string | null;

  @Prop({ default: true })
  is_active!: boolean;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const HotelSchema = SchemaFactory.createForClass(Hotel);

// Index for filtering by destination
HotelSchema.index({ trek_destination_id: 1 });
HotelSchema.index({ is_active: 1 });

export type HotelDocument = Hotel & Document;
