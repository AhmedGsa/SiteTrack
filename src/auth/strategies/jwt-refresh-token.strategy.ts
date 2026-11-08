import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtConfig } from "src/config/jwt.config";
import { UserPayload } from "../interfaces/user-payload.interface";
import { SessionService } from "../session.service";


@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh-token') {
  constructor(
    private readonly jwtConfig: JwtConfig,
    private readonly sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.getRefreshTokenSecret(),
      passReqToCallback: true,
    })
  }

  async validate(req: any, payload: any) : Promise<UserPayload> {
    const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    const session = await this.sessionService.validateRefreshToken(payload.sessionId, refreshToken);
    if (!session) {
      throw new UnauthorizedException();
    }
    return { userId: payload.userId, email: payload.email, sessionId: payload.sessionId}
  }
}
