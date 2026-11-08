import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersService } from 'src/users/users.service';
import { JwtModule } from '@nestjs/jwt';
import { EnvConfigModule } from 'src/config/config.module';
import { TokenService } from './token.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Session } from './entities/session.entity';
import { JwtAccessTokenStrategy } from './strategies/jwt-access-token.strategy';
import { JwtRefreshTokenStrategy } from './strategies/jwt-refresh-token.strategy';
import { SessionService } from './session.service';

@Module({
  imports: [
    EnvConfigModule,
    JwtModule,
    TypeOrmModule.forFeature([User, Session]),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService, TokenService, SessionService, JwtAccessTokenStrategy, JwtRefreshTokenStrategy],
})
export class AuthModule {}
