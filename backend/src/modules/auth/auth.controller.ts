import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminAuthGuard } from '@/guards/admin-auth.guard';

class AdminLoginDto {
  username: string;
  password: string;
}

@Controller('auth/admin')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: AdminLoginDto) {
    const result = await this.authService.validateAdmin(body.username, body.password);
    if (!result) {
      return { error: 'Invalid username or password' };
    }
    return result;
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  async getCurrentAdmin(@Request() req: any) {
    const admin = await this.authService.getAdminById(req.user.sub);
    if (!admin) {
      return { error: 'Admin not found' };
    }
    return {
      id: admin._id.toString(),
      username: admin.username,
      display_name: admin.display_name,
      role: admin.role,
      last_login: admin.last_login,
    };
  }

  @Post('logout')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout() {
    return { success: true };
  }
}
