import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from '@/schemas/admin.schema';

export interface AdminLoginResponse {
  admin: { id: string; username: string; display_name: string; role: string };
  access_token: string;
}

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private jwtService: JwtService,
  ) {}

  async validateAdmin(username: string, password: string): Promise<AdminLoginResponse | null> {
    const admin = await this.adminModel.findOne({ username }).exec();
    if (!admin) return null;

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) return null;

    await this.adminModel.updateOne(
      { _id: admin._id },
      { $set: { last_login: new Date() } }
    ).exec();

    const payload = {
      sub: admin._id.toString(),
      username: admin.username,
      role: admin.role,
      type: 'admin',
    };

    return {
      admin: {
        id: admin._id.toString(),
        username: admin.username,
        display_name: admin.display_name,
        role: admin.role,
      },
      access_token: this.jwtService.sign(payload),
    };
  }

  async getAdminByUsername(username: string): Promise<AdminDocument | null> {
    return this.adminModel.findOne({ username }).exec();
  }

  async getAdminById(id: string): Promise<AdminDocument | null> {
    return this.adminModel.findById(id).exec();
  }

  async createAdmin(
    username: string,
    password: string,
    displayName: string,
    role: 'admin' | 'super_admin' = 'admin'
  ): Promise<AdminDocument> {
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
    const admin = new this.adminModel({
      username,
      password_hash: hashedPassword,
      display_name: displayName,
      role,
    });
    return admin.save();
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.adminModel.updateOne(
      { _id: id },
      { $set: { last_login: new Date() } }
    ).exec();
  }
}
