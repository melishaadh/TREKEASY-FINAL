import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewDocument } from '@/schemas/review.schema';

export interface CreateReviewDto {
  trekId: string;
  rating: number;
  comment?: string;
}

@Injectable()
export class ReviewsService {
  constructor(@InjectModel(Review.name) private reviewModel: Model<ReviewDocument>) {}

  async findByTrek(trekId: string): Promise<ReviewDocument[]> {
    return this.reviewModel.find({ trekId }).sort({ createdAt: -1 }).exec();
  }

  async create(dto: CreateReviewDto): Promise<ReviewDocument> {
    const review = new this.reviewModel({
      trekId: dto.trekId,
      rating: dto.rating,
      comment: dto.comment || '',
    });
    return review.save();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.reviewModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('Review not found');
    return true;
  }

  async getTrekAverageRating(trekId: string): Promise<number> {
    const result = await this.reviewModel.aggregate([
      { $match: { trekId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]).exec();
    if (result.length === 0) return 0;
    return Math.round(result[0].avg * 10) / 10;
  }

  async getTrekReviewCount(trekId: string): Promise<number> {
    return this.reviewModel.countDocuments({ trekId }).exec();
  }
}
