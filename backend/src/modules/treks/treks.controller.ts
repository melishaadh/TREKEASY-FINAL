import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { TreksService, CreateTrekDto } from './treks.service';
import { PersonalizationService, PersonalizationInput } from './personalization.service';

@Controller('treks')
export class TreksController {
  constructor(
    private readonly treksService: TreksService,
    private readonly personalizationService: PersonalizationService,
  ) {}

  @Get()
  async getAll(@Req() req: Request) {
    const base = `${req.protocol}://${req.get('host')}`;
    const treks = await this.treksService.getAll();
    return treks.map(t => ({
      id: t._id.toString(),
      name: t.name,
      description: t.description,
      region: t.region,
      difficulty: t.difficulty,
      duration: t.duration,
      price: t.price,
      maxAltitude: t.maxAltitude,
      imageUrl: t.imageUrl ? `${base}${t.imageUrl}` : null,
      keywords: t.keywords,
      routeStages: t.routeStages,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: Request) {
    const base = `${req.protocol}://${req.get('host')}`;
    const trek = await this.treksService.getById(id);
    return {
      id: trek._id.toString(),
      name: trek.name,
      description: trek.description,
      region: trek.region,
      difficulty: trek.difficulty,
      duration: trek.duration,
      price: trek.price,
      maxAltitude: trek.maxAltitude,
      imageUrl: trek.imageUrl ? `${base}${trek.imageUrl}` : null,
      keywords: trek.keywords,
      routeStages: trek.routeStages,
      createdAt: trek.createdAt,
      updatedAt: trek.updatedAt,
    };
  }

  @Get(':id/itinerary')
  async getItinerary(
    @Param('id') id: string,
    @Query('pace') pace?: string,
    @Query('fitnessLevel') fitnessLevel?: string,
    @Query('trekkingExperience') trekkingExperience?: string,
    @Query('targetDays') targetDays?: string,
    @Query('healthCondition') healthCondition?: string,
    @Query('age') age?: string,
    @Query('weight') weight?: string,
    @Query('groupSize') groupSize?: string,
    @Query('previousTreks') previousTreks?: string,
    @Query('startLocation') startLocation?: string,
  ) {
    const trek = await this.treksService.getById(id);
    const input: PersonalizationInput = {
      pace: (pace as PersonalizationInput['pace']) || 'normal',
      fitnessLevel: (fitnessLevel as PersonalizationInput['fitnessLevel']) || 'beginner',
      trekkingExperience: (trekkingExperience as PersonalizationInput['trekkingExperience']) || 'none',
      targetDays: targetDays ? parseInt(targetDays, 10) : undefined,
      healthCondition: (healthCondition as PersonalizationInput['healthCondition']) || 'none',
      age: age ? parseInt(age, 10) : undefined,
      weight: weight ? parseInt(weight, 10) : undefined,
      groupSize: groupSize ? parseInt(groupSize, 10) : undefined,
      previousTreks: previousTreks ? parseInt(previousTreks, 10) : undefined,
      startLocation,
    };
    return this.personalizationService.generate(
      trek.name,
      trek.difficulty,
      trek.routeStages,
      input,
    );
  }

  @Post()
  async create(@Body() body: CreateTrekDto) {
    const trek = await this.treksService.create(body);
    return { success: true, id: trek._id.toString() };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<CreateTrekDto>) {
    const trek = await this.treksService.update(id, body);
    return { success: true, id: trek._id.toString() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    const deleted = await this.treksService.delete(id);
    return { success: deleted };
  }
}
