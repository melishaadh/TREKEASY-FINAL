import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Admin extends Document {
  @Prop({ required: true, unique: true, trim: true })
  username!: string;

  @Prop({ required: true })
  password_hash!: string;

  @Prop({ required: true, trim: true })
  display_name!: string;

  @Prop({
    required: true,
    enum: ['admin', 'super_admin'],
    default: 'admin',
  })
  role!: 'admin' | 'super_admin';

  @Prop({ type: Date, default: null })
  last_login!: Date | null;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);

// Index for faster login lookup
AdminSchema.index({ username: 1 });

export type AdminDocument = Admin & Document;
