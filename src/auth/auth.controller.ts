import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { Throttle } from '@nestjs/throttler';
import { JwtRefreshTokenGuard } from './guards/jwt-refresh-token.guard';
import { JwtAccessTokenGuard } from './guards/jwt-access-token.guard';
import { GetCurrentUser } from './decorators/current-user.decorator';
import { UserPayload } from './interfaces/user-payload.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 10000} })
  @HttpCode(201)
  @Post('/register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Throttle({ default: { limit: 10, ttl: 10000} })
  @HttpCode(200)
  @Post('/login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtRefreshTokenGuard)
  @HttpCode(200)
  @Post('/refresh')
  refresh(@GetCurrentUser() user: UserPayload) {
    return this.authService.refresh(user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @HttpCode(200)
  @Post('/logout')
  logout(@GetCurrentUser() user: UserPayload) {
    return this.authService.logout(user.sessionId);
  }
}
