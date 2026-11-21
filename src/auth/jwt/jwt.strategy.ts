import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../interfaces';
import { SessionService } from '../../modules/session/session.service';
import { getIP } from '../../common/helpers';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private sessionService: SessionService,
  ) {
    super({
      secretOrKey: config.get<string>('JWT_SECRET') as string,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const { sub } = payload;
    const ip = getIP(req);
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    await this.sessionService.findOne(sub, ip, token);
    const user = await this.prisma.user.findFirst({
      select: {
        username: true,
        rol: true,
        validator_department: true,
      },
      where: {
        id: sub,
      },
    });
    if (!user)
      throw new UnauthorizedException('Sesión finalizada, vuelva a ingresar');
    return {
      user_id: sub,
      rol: user.rol,
      validator_department: user.validator_department,
      ip,
    };
  }
}
