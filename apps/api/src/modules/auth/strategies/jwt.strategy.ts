import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService, JwtPayload } from '../auth.service';

/**
 * Extract JWT from cookie or Authorization header
 */
function extractJwtFromCookieOrHeader(req: Request): string | null {
  // First try to get from cookie
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  // Fall back to Authorization header (for backwards compatibility)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload);

    if (!user) {
      throw new UnauthorizedException();
    }

    // Attach team context from token
    return {
      ...user,
      currentTeamId: payload.teamId,
      currentRole: payload.role,
    };
  }
}
