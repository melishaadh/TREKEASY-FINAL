import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface GroupMember {
  userId: string;
  name: string;
  joinedAt: Date;
}

@Schema({ timestamps: true })
export class ChatGroup extends Document {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  destination_id!: string;

  @Prop({ required: true, trim: true })
  destination_name!: string;

  @Prop({ type: Date, default: null })
  start_date!: Date | null;

  @Prop({ required: true, default: 0 })
  member_count!: number;

  @Prop({
    type: [
      {
        userId: { type: String, required: true },
        name: { type: String, required: true },
        joinedAt: { type: Date, required: true },
      },
    ],
    default: [],
    _id: false,
  })
  members!: GroupMember[];

  @Prop({ type: Types.ObjectId, ref: 'Hotel', default: null })
  booked_hotel_id!: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  created_by!: string;

  @Prop({
    required: true,
    enum: ['active', 'inactive', 'completed'],
    default: 'active',
  })
  status!: 'active' | 'inactive' | 'completed';

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const ChatGroupSchema = SchemaFactory.createForClass(ChatGroup);

// Indexes
ChatGroupSchema.index({ destination_id: 1 });
ChatGroupSchema.index({ status: 1 });
ChatGroupSchema.index({ created_by: 1 });
ChatGroupSchema.index({ booked_hotel_id: 1 });

export type ChatGroupDocument = ChatGroup & Document;
