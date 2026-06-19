import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { GroupsService, CreateGroupDto } from './groups.service';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';

class BookHotelDto {
  hotelId: string;
}

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  async getAll() {
    return this.groupsService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const group = await this.groupsService.getById(id);
    if (!group) return { error: 'Group not found' };
    return group;
  }

  @Post()
  async create(@Body() body: CreateGroupDto) {
    const group = await this.groupsService.create(body);
    return { success: true, id: group._id.toString() };
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  async update(@Param('id') id: string, @Body() body: Partial<CreateGroupDto & { status: 'active' | 'inactive' | 'completed' }>) {
    const group = await this.groupsService.update(id, body);
    if (!group) return { error: 'Group not found' };
    return { success: true };
  }

  @Post(':id/book-hotel')
  @UseGuards(AdminAuthGuard)
  async bookHotel(@Param('id') id: string, @Body() body: BookHotelDto) {
    const group = await this.groupsService.bookHotel(id, body.hotelId);
    if (!group) return { error: 'Group not found' };
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    const deleted = await this.groupsService.delete(id);
    return { success: deleted };
  }
}
