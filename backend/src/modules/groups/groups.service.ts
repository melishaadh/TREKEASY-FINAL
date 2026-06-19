import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatGroup, ChatGroupDocument, GroupMember } from '@/schemas/chat-group.schema';
import { Hotel, HotelDocument } from '@/schemas/hotel.schema';

export interface CreateGroupDto {
  name: string;
  destination_id: string;
  destination_name: string;
  start_date?: Date | null;
  created_by: string;
}

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(ChatGroup.name) private groupModel: Model<ChatGroupDocument>,
    @InjectModel(Hotel.name) private hotelModel: Model<HotelDocument>,
  ) {}

  async getAll(): Promise<any[]> {
    const groups = await this.groupModel.find().sort({ createdAt: -1 }).exec();
    const results: any[] = [];

    for (const g of groups) {
      let hotel = null;
      if (g.booked_hotel_id) {
        const h = await this.hotelModel.findById(g.booked_hotel_id).exec();
        if (h) {
          hotel = {
            name: h.name,
            location: h.location,
            price_per_package: h.price_per_package,
          };
        }
      }
      results.push({
        id: g._id.toString(),
        name: g.name,
        destination_id: g.destination_id,
        destination_name: g.destination_name,
        start_date: g.start_date,
        member_count: g.member_count,
        members: g.members,
        booked_hotel_id: g.booked_hotel_id?.toString() ?? null,
        created_by: g.created_by,
        status: g.status,
        created_at: g.createdAt,
        updated_at: g.updatedAt,
        hotel,
      });
    }

    return results;
  }

  async getById(id: string): Promise<any | null> {
    const g = await this.groupModel.findById(id).exec();
    if (!g) return null;

    let hotel = null;
    if (g.booked_hotel_id) {
      const h = await this.hotelModel.findById(g.booked_hotel_id).exec();
      if (h) {
        hotel = {
          name: h.name,
          location: h.location,
          price_per_package: h.price_per_package,
        };
      }
    }

    return {
      id: g._id.toString(),
      name: g.name,
      destination_id: g.destination_id,
      destination_name: g.destination_name,
      start_date: g.start_date,
      member_count: g.member_count,
      members: g.members,
      booked_hotel_id: g.booked_hotel_id?.toString() ?? null,
      created_by: g.created_by,
      status: g.status,
      created_at: g.createdAt,
      updated_at: g.updatedAt,
      hotel,
    };
  }

  async create(data: CreateGroupDto): Promise<ChatGroupDocument> {
    const group = new this.groupModel({
      ...data,
      member_count: 1,
      members: [{
        userId: data.created_by,
        name: data.created_by,
        joinedAt: new Date(),
      }],
      status: 'active',
    });
    return group.save();
  }

  async update(id: string, data: Partial<ChatGroup>): Promise<ChatGroupDocument | null> {
    return this.groupModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async bookHotel(id: string, hotelId: string): Promise<ChatGroupDocument | null> {
    return this.groupModel
      .findByIdAndUpdate(id, { $set: { booked_hotel_id: new Types.ObjectId(hotelId) } }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.groupModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async addMember(id: string, member: GroupMember): Promise<ChatGroupDocument | null> {
    const group = await this.groupModel.findById(id).exec();
    if (!group) return null;
    group.members.push(member as any);
    group.member_count = group.members.length;
    return group.save();
  }

  async removeMember(id: string, userId: string): Promise<ChatGroupDocument | null> {
    const group = await this.groupModel.findById(id).exec();
    if (!group) return null;
    group.members = group.members.filter(m => m.userId !== userId);
    group.member_count = group.members.length;
    return group.save();
  }

  async count(): Promise<number> {
    return this.groupModel.countDocuments().exec();
  }

  async countActive(): Promise<number> {
    return this.groupModel.countDocuments({ status: 'active' }).exec();
  }

  async sumMembers(): Promise<number> {
    const result = await this.groupModel.aggregate([
      { $group: { _id: null, total: { $sum: '$member_count' } } },
    ]).exec();
    return result[0]?.total ?? 0;
  }

  async countBooked(): Promise<number> {
    return this.groupModel.countDocuments({ booked_hotel_id: { $ne: null } }).exec();
  }
}
