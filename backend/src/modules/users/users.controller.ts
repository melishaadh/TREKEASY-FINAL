import {
  Controller, Get, Post, Patch, Body, Param, Request, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { IsEmail, IsString, MinLength, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { UserProfile } from '@/schemas/user.schema';

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class UpdateProfileDto {
  @IsInt() @Min(0) @Max(3)
  ageGroup: number;

  @IsInt() @Min(0) @Max(3)
  experienceLevel: number;

  @IsInt() @Min(0) @Max(1)
  cardioRespiratoryIndicator: number;

  @IsInt() @Min(0) @Max(1)
  jointStability: number;

  @IsInt() @Min(0) @Max(3)
  altitudeHistory: number;

  @IsOptional() @IsIn(['beginner', 'intermediate', 'advanced', 'expert'])
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  @IsOptional() @IsIn(['none', 'basic', 'moderate', 'extensive'])
  trekkingExperience?: 'none' | 'basic' | 'moderate' | 'extensive';

  @IsOptional() @IsIn(['slow', 'moderate', 'fast'])
  pace?: 'slow' | 'moderate' | 'fast';
}

class LikeTrekDto {
  trekId: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateUserDto) {
    const existing = await this.usersService.findByEmail(body.email);
    if (existing) {
      return { error: 'Email already registered' };
    }
    const user = await this.usersService.createUser(body.email, body.name, body.password);
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      isOnboarded: user.isOnboarded,
    };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Request() req: any) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) return { error: 'User not found' };
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      profile: user.profile,
      isOnboarded: user.isOnboarded,
      lastLogin: user.lastLogin,
    };
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(@Request() req: any, @Body() body: UpdateProfileDto) {
    const profile: UserProfile = {
      ageGroup: body.ageGroup,
      experienceLevel: body.experienceLevel,
      cardioRespiratoryIndicator: body.cardioRespiratoryIndicator,
      jointStability: body.jointStability,
      altitudeHistory: body.altitudeHistory,
      fitnessLevel: body.fitnessLevel ?? 'beginner',
      trekkingExperience: body.trekkingExperience ?? 'none',
      pace: body.pace ?? 'moderate',
    };
    const user = await this.usersService.updateProfile(req.user.userId, profile);
    if (!user) return { error: 'User not found' };
    return { success: true, profile: user.profile };
  }

  @Post('me/likes')
  @UseGuards(AuthGuard('jwt'))
  async likeTrek(@Request() req: any, @Body() body: LikeTrekDto) {
    const like = await this.usersService.likeTrek(req.user.userId, body.trekId);
    return { success: true, trekId: like.trekId };
  }

  @Post('me/unlike')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async unlikeTrek(@Request() req: any, @Body() body: LikeTrekDto) {
    const removed = await this.usersService.unlikeTrek(req.user.userId, body.trekId);
    return { success: removed };
  }

  @Get('me/likes')
  @UseGuards(AuthGuard('jwt'))
  async getMyLikes(@Request() req: any) {
    const likes = await this.usersService.getUserLikes(req.user.userId);
    return likes.map(l => ({ trekId: l.trekId, likedAt: l.likedAt }));
  }

  @Get('liked/:trekId')
  async isLiked(@Param('trekId') trekId: string, @Request() req: any) {
    const userId = req.user?.userId;
    if (!userId) return { isLiked: false };
    const isLiked = await this.usersService.isTrekLikedByUser(userId, trekId);
    return { isLiked };
  }

  @Get('likes/top')
  async getTopLiked() {
    const top = await this.usersService.getTopLikedTreks(3);
    return top.map(t => ({ trekId: t.trekId, likeCount: t.count }));
  }

  @Get('likes/count/:trekId')
  async getLikeCount(@Param('trekId') trekId: string) {
    const count = await this.usersService.getTrekLikeCount(trekId);
    return { trekId, likeCount: count };
  }
}
