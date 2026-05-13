import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    return {
      code: 0,
      message: 'success',
      data: await this.authService.login(body.username, body.password),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: any) {
    return {
      code: 0,
      message: 'success',
      data: await this.authService.getProfile(req.user.userId),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: any,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return {
      code: 0,
      message: 'success',
      data: await this.authService.changePassword(req.user.userId, body.oldPassword, body.newPassword),
    };
  }
}
