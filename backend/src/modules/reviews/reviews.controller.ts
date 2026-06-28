import {
  Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ReviewsService, CreateReviewDto } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('trek/:trekId')
  async getByTrek(@Param('trekId') trekId: string) {
    const reviews = await this.reviewsService.findByTrek(trekId);
    const avg = await this.reviewsService.getTrekAverageRating(trekId);
    const total = await this.reviewsService.getTrekReviewCount(trekId);
    return {
      average: avg,
      total,
      reviews: reviews.map(r => ({
        id: r._id.toString(),
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateReviewDto) {
    const review = await this.reviewsService.create(dto);
    return {
      id: review._id.toString(),
      rating: review.rating,
      comment: review.comment,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.reviewsService.delete(id);
    return { success: true };
  }
}
