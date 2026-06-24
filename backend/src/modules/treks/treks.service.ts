import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trek } from '@/schemas/trek.schema';

export interface CreateTrekDto {
  name: string;
  description: string;
  region: string;
  difficulty: string;
  duration: number;
  price: number;
  maxAltitude: number;
  imageUrl?: string | null;
  keywords?: string[];
  routeStages?: Trek['routeStages'];
}

@Injectable()
export class TreksService {
  constructor(@InjectModel(Trek.name) private trekModel: Model<Trek>) {}

  async getAll(): Promise<Trek[]> {
    return this.trekModel.find().sort({ createdAt: -1 }).exec();
  }

  async getById(id: string): Promise<Trek> {
    const trek = await this.trekModel.findById(id).exec();
    if (!trek) throw new NotFoundException('Trek not found');
    return trek;
  }

  async create(data: CreateTrekDto): Promise<Trek> {
    const trek = new this.trekModel(data);
    return trek.save();
  }

  async update(id: string, data: Partial<CreateTrekDto>): Promise<Trek> {
    const trek = await this.trekModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
    if (!trek) throw new NotFoundException('Trek not found');
    return trek;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.trekModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async count(): Promise<number> {
    return this.trekModel.countDocuments().exec();
  }
}
