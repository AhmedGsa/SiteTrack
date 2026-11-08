import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtConfig } from "src/config/jwt.config";
import { UserPayload } from "../interfaces/user-payload.interface";
import { SessionService } from "../session.service";


@Injectable()
export class JwtAccessTokenStrategy extends PassportStrategy(Strategy, 'jwt-access-token') {
  constructor(
    private readonly jwtConfig: JwtConfig,
    private readonly sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.getAccessTokenSecret(),
    })
  }

  async validate(payload: any) : Promise<UserPayload> {
    const session = await this.sessionService.findOne(payload.sessionId);
    if (!session) {
      throw new UnauthorizedException();
    }
    return { userId: payload.userId, email: payload.email, sessionId: payload.sessionId}
  }
}
