import {
  Controller, Get, Post, Delete, Body, Param, Request, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ItineraryService, GenerateItineraryDto } from './itinerary.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('itinerary')
@UseGuards(AuthGuard('jwt'))
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Post('generate')
  async generate(@Request() req: any, @Body() body: GenerateItineraryDto) {
    const itinerary = await this.itineraryService.generate(req.user.userId, body);
    return {
      id: itinerary._id.toString(),
      trekId: itinerary.trekId,
      trekName: itinerary.trekName,
      totalDays: itinerary.totalDays,
      totalDistance: itinerary.totalDistance,
      totalEffort: itinerary.totalEffort,
      maxAltitude: itinerary.maxAltitude,
      suitability: itinerary.suitability,
      cautions: itinerary.cautions,
      origin: itinerary.origin,
      finalDestination: itinerary.finalDestination,
      days: itinerary.days,
      rejectionReason: itinerary.rejectionReason,
      minimumSafeDays: itinerary.minimumSafeDays,
      recommendedDays: itinerary.recommendedDays,
      createdAt: itinerary.createdAt,
    };
  }

  @Get()
  async getMyItineraries(@Request() req: any) {
    const itineraries = await this.itineraryService.getByUser(req.user.userId);
    return itineraries.map(i => ({
      id: i._id.toString(),
      trekId: i.trekId,
      trekName: i.trekName,
      totalDays: i.totalDays,
      totalDistance: i.totalDistance,
      totalEffort: i.totalEffort,
      maxAltitude: i.maxAltitude,
      suitability: i.suitability,
      cautions: i.cautions,
      origin: i.origin,
      finalDestination: i.finalDestination,
      days: i.days,
      rejectionReason: i.rejectionReason,
      minimumSafeDays: i.minimumSafeDays,
      recommendedDays: i.recommendedDays,
      createdAt: i.createdAt,
    }));
  }

  @Get(':trekId')
  async getForTrek(@Request() req: any, @Param('trekId') trekId: string) {
    const itinerary = await this.itineraryService.getByUserAndTrek(req.user.userId, trekId);
    if (!itinerary) return { error: 'No itinerary found for this trek' };
    return {
      id: itinerary._id.toString(),
      trekId: itinerary.trekId,
      trekName: itinerary.trekName,
      totalDays: itinerary.totalDays,
      totalDistance: itinerary.totalDistance,
      totalEffort: itinerary.totalEffort,
      maxAltitude: itinerary.maxAltitude,
      suitability: itinerary.suitability,
      cautions: itinerary.cautions,
      origin: itinerary.origin,
      finalDestination: itinerary.finalDestination,
      days: itinerary.days,
      rejectionReason: itinerary.rejectionReason,
      minimumSafeDays: itinerary.minimumSafeDays,
      recommendedDays: itinerary.recommendedDays,
      createdAt: itinerary.createdAt,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    const deleted = await this.itineraryService.delete(id);
    return { success: deleted };
  }
}
