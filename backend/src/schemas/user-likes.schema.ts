import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class UserLikes extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  trekId!: string;

  @Prop({ required: true })
  likedAt!: Date;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const UserLikesSchema = SchemaFactory.createForClass(UserLikes);

// Compound index for efficient lookup of user's likes
UserLikesSchema.index({ userId: 1, trekId: 1 }, { unique: true });

// Index for getting most liked treks
UserLikesSchema.index({ trekId: 1 });

// Index for getting user's likes sorted by date
UserLikesSchema.index({ userId: 1, likedAt: -1 });

export type UserLikesDocument = UserLikes & Document;
