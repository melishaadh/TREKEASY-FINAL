import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { HotelsService, CreateHotelDto } from './hotels.service';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';

@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get()
  async getAll() {
    const hotels = await this.hotelsService.getAll();
    return hotels.map(h => ({
      id: h._id.toString(),
      name: h.name,
      trek_destination_id: h.trek_destination_id,
      trek_destination_name: h.trek_destination_name,
      owner_contact: h.owner_contact,
      price_per_package: h.price_per_package,
      location: h.location,
      capacity: h.capacity,
      description: h.description,
      image_url: h.image_url,
      is_active: h.is_active,
      created_at: h.createdAt,
      updated_at: h.updatedAt,
    }));
  }

  @Get('active')
  async getActive() {
    const hotels = await this.hotelsService.getActive();
    return hotels.map(h => ({
      id: h._id.toString(),
      name: h.name,
      trek_destination_id: h.trek_destination_id,
      trek_destination_name: h.trek_destination_name,
      price_per_package: h.price_per_package,
      location: h.location,
      capacity: h.capacity,
      image_url: h.image_url,
    }));
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const hotel = await this.hotelsService.getById(id);
    if (!hotel) return { error: 'Hotel not found' };
    return {
      id: hotel._id.toString(),
      name: hotel.name,
      trek_destination_id: hotel.trek_destination_id,
      trek_destination_name: hotel.trek_destination_name,
      owner_contact: hotel.owner_contact,
      price_per_package: hotel.price_per_package,
      location: hotel.location,
      capacity: hotel.capacity,
      description: hotel.description,
      image_url: hotel.image_url,
      is_active: hotel.is_active,
      created_at: hotel.createdAt,
      updated_at: hotel.updatedAt,
    };
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  async create(@Body() body: CreateHotelDto) {
    const hotel = await this.hotelsService.create(body);
    return { success: true, id: hotel._id.toString() };
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  async update(@Param('id') id: string, @Body() body: Partial<CreateHotelDto>) {
    const hotel = await this.hotelsService.update(id, body);
    if (!hotel) return { error: 'Hotel not found' };
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    const deleted = await this.hotelsService.delete(id);
    return { success: deleted };
  }
}
