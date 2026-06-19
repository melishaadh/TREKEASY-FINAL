import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserProfile } from '@/schemas/user.schema';
import { UserLikes, UserLikesDocument } from '@/schemas/user-likes.schema';
import {
  AGE_GROUP_RANGE,
  EXPERIENCE_LEVEL_RANGE,
  CARDIO_RANGE,
  JOINT_RANGE,
  ALTITUDE_RANGE,
} from '@/schemas/user.schema';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserLikes.name) private userLikesModel: Model<UserLikesDocument>,
  ) {}

  private validateUserProfile(profile: UserProfile): void {
    const errors: string[] = [];

    if (!Number.isInteger(profile.ageGroup) || profile.ageGroup < AGE_GROUP_RANGE.min || profile.ageGroup > AGE_GROUP_RANGE.max) {
      errors.push(`ageGroup must be an integer between ${AGE_GROUP_RANGE.min} and ${AGE_GROUP_RANGE.max}`);
    }
    if (!Number.isInteger(profile.experienceLevel) || profile.experienceLevel < EXPERIENCE_LEVEL_RANGE.min || profile.experienceLevel > EXPERIENCE_LEVEL_RANGE.max) {
      errors.push(`experienceLevel must be an integer between ${EXPERIENCE_LEVEL_RANGE.min} and ${EXPERIENCE_LEVEL_RANGE.max}`);
    }
    if (!Number.isInteger(profile.cardioRespiratoryIndicator) || profile.cardioRespiratoryIndicator < CARDIO_RANGE.min || profile.cardioRespiratoryIndicator > CARDIO_RANGE.max) {
      errors.push(`cardioRespiratoryIndicator must be an integer between ${CARDIO_RANGE.min} and ${CARDIO_RANGE.max}`);
    }
    if (!Number.isInteger(profile.jointStability) || profile.jointStability < JOINT_RANGE.min || profile.jointStability > JOINT_RANGE.max) {
      errors.push(`jointStability must be an integer between ${JOINT_RANGE.min} and ${JOINT_RANGE.max}`);
    }
    if (!Number.isInteger(profile.altitudeHistory) || profile.altitudeHistory < ALTITUDE_RANGE.min || profile.altitudeHistory > ALTITUDE_RANGE.max) {
      errors.push(`altitudeHistory must be an integer between ${ALTITUDE_RANGE.min} and ${ALTITUDE_RANGE.max}`);
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Invalid profile: ${errors.join('; ')}`);
    }
  }

  async createUser(email: string, name: string, password: string): Promise<UserDocument> {
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
    const user = new this.userModel({
      email,
      name,
      password: hashedPassword,
      profile: {
        ageGroup: 0,
        experienceLevel: 0,
        cardioRespiratoryIndicator: 0,
        jointStability: 0,
        altitudeHistory: 0,
      },
      isOnboarded: false,
    });
    return user.save();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async updateProfile(userId: string, profile: UserProfile): Promise<UserDocument | null> {
    this.validateUserProfile(profile);
    return this.userModel.findByIdAndUpdate(
      userId,
      { $set: { profile, isOnboarded: true } },
      { new: true }
    ).exec();
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, { $set: updates }, { new: true }).exec();
  }

  async setLastLogin(userId: string): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { $set: { lastLogin: new Date() } }).exec();
  }

  async likeTrek(userId: string, trekId: string): Promise<UserLikesDocument> {
    const existing = await this.userLikesModel.findOne({ userId: new Types.ObjectId(userId), trekId }).exec();
    if (existing) return existing;

    const like = new this.userLikesModel({
      userId: new Types.ObjectId(userId),
      trekId,
      likedAt: new Date(),
    });
    return like.save();
  }

  async unlikeTrek(userId: string, trekId: string): Promise<boolean> {
    const result = await this.userLikesModel.deleteOne({
      userId: new Types.ObjectId(userId),
      trekId,
    }).exec();
    return result.deletedCount > 0;
  }

  async getUserLikes(userId: string): Promise<UserLikesDocument[]> {
    return this.userLikesModel.find({ userId: new Types.ObjectId(userId) }).sort({ likedAt: -1 }).exec();
  }

  async getTopLikedTreks(limit: number = 3): Promise<{ trekId: string; count: number }[]> {
    const result = await this.userLikesModel.aggregate([
      { $group: { _id: '$trekId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { trekId: '$_id', count: 1, _id: 0 } },
    ]).exec();
    return result.map(r => ({ trekId: r.trekId, count: r.count }));
  }

  async isTrekLikedByUser(userId: string, trekId: string): Promise<boolean> {
    const like = await this.userLikesModel.findOne({
      userId: new Types.ObjectId(userId),
      trekId,
    }).exec();
    return !!like;
  }

  async getTrekLikeCount(trekId: string): Promise<number> {
    return this.userLikesModel.countDocuments({ trekId }).exec();
  }
}
