import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hotel, HotelDocument } from '@/schemas/hotel.schema';

export interface CreateHotelDto {
  name: string;
  trek_destination_id: string;
  trek_destination_name: string;
  owner_contact: string;
  price_per_package: number;
  location: string;
  capacity?: number;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

@Injectable()
export class HotelsService {
  constructor(@InjectModel(Hotel.name) private hotelModel: Model<HotelDocument>) {}

  async getAll(): Promise<HotelDocument[]> {
    return this.hotelModel.find().sort({ createdAt: -1 }).exec();
  }

  async getActive(): Promise<HotelDocument[]> {
    return this.hotelModel.find({ is_active: true }).sort({ createdAt: -1 }).exec();
  }

  async getById(id: string): Promise<HotelDocument | null> {
    return this.hotelModel.findById(id).exec();
  }

  async create(data: CreateHotelDto): Promise<HotelDocument> {
    const hotel = new this.hotelModel(data);
    return hotel.save();
  }

  async update(id: string, data: Partial<CreateHotelDto>): Promise<HotelDocument | null> {
    return this.hotelModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.hotelModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async count(): Promise<number> {
    return this.hotelModel.countDocuments().exec();
  }

  async countActive(): Promise<number> {
    return this.hotelModel.countDocuments({ is_active: true }).exec();
  }
}
