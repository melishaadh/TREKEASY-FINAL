import {
  Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { TreksService, CreateTrekDto } from './treks.service';

@Controller('treks')
export class TreksController {
  constructor(private readonly treksService: TreksService) {}

  @Get()
  async getAll() {
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
      imageUrl: t.imageUrl,
      keywords: t.keywords,
      routeStages: t.routeStages,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
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
      imageUrl: trek.imageUrl,
      keywords: trek.keywords,
      routeStages: trek.routeStages,
      createdAt: trek.createdAt,
      updatedAt: trek.updatedAt,
    };
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
