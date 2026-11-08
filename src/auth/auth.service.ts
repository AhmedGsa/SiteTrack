import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { TokenService } from './token.service';
import { LoginDto } from './dtos/login.dto';
import { Hash } from './utils/hash';
import { RegisterDto } from './dtos/register.dto';
import { SessionService } from './session.service';
import { UserPayload } from './interfaces/user-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    return this.issueTokens(user.id, user.email);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findOneByEmail(loginDto.email);
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }
    const isPasswordValid = await Hash.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }
    return this.issueTokens(user.id, user.email);
  }

  async refresh(user: UserPayload) {
    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(user);
    await this.sessionService.rotate(user.sessionId, refreshToken);
    return {accessToken, refreshToken};
  }

  async logout(sessionId: number) {
    await this.sessionService.remove(sessionId);
    return { msg: 'Logged out successfully' };
  }

  private async issueTokens(userId: number, email: string) {
    const session = await this.sessionService.create(userId, 'pending');
    const payload: UserPayload = { userId, email, sessionId: session.id };
    const accessToken = await this.tokenService.generateAccessToken(payload);
    const refreshToken = await this.tokenService.generateRefreshToken(payload);
    await this.sessionService.rotate(session.id, refreshToken);
    return {accessToken, refreshToken};
  }
}
