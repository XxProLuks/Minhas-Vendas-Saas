import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { hashPassword, verifyPassword } from '../common/utils/password.util.js';
import { generateToken } from '../common/utils/token.util.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService
  ) {}

  async register(payload: RegisterDto) {
    const existing = await this.usersService.findByEmail(payload.email);
    if (existing) {
      throw new BadRequestException('E-mail já cadastrado');
    }

    const hashedPassword = await hashPassword(payload.password);

    const user = await this.prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: hashedPassword,
        phone: payload.phone
      }
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.persistRefreshToken(user.id, tokens.refreshToken);
    await this.enqueueEmailVerification(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      ...tokens
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isValid = await verifyPassword(user.password, password);
    if (!isValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens
    };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('app.jwt.refreshSecret')
      });
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }

    const token = await this.prisma.refreshToken.findFirst({ where: { userId: payload.sub } });
    if (!token) {
      throw new UnauthorizedException('Token inválido');
    }

    const isValid = await verifyPassword(token.tokenHash, dto.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Token inválido');
    }

    if (token.expiresAt < new Date()) {
      throw new UnauthorizedException('Token expirado');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens
    };
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (user.emailVerifiedAt) {
      throw new BadRequestException('E-mail já verificado');
    }

    await this.enqueueEmailVerification(user.id, user.email);
    return { success: true };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token: dto.token }
    });

    if (!verification) {
      throw new BadRequestException('Token inválido');
    }

    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('Token expirado');
    }

    await this.usersService.setEmailVerified(verification.userId);
    await this.prisma.emailVerification.delete({ where: { id: verification.id } });

    return { success: true };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return { success: true };
    }

    const token = generateToken(24);
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt: expires
      }
    });

    await this.notificationsService.sendPasswordReset(user.email, token);

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const reset = await this.prisma.passwordReset.findUnique({ where: { token: dto.token } });
    if (!reset) {
      throw new BadRequestException('Token inválido');
    }

    if (reset.expiresAt < new Date()) {
      throw new BadRequestException('Token expirado');
    }

    const hashedPassword = await hashPassword(dto.password);

    await this.prisma.user.update({
      where: { id: reset.userId },
      data: { password: hashedPassword }
    });

    await this.prisma.passwordReset.delete({ where: { id: reset.id } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: reset.userId } });

    return { success: true };
  }

  private async generateTokens(userId: string, email: string, role: Role) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('app.jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('app.jwt.refreshTtl') || '7d'
      })
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('app.jwt.accessTtl') || '15m'
    };
  }

  private async persistRefreshToken(userId: string, refreshToken: string) {
    const hashedToken = await hashPassword(refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashedToken,
        expiresAt: new Date(Date.now() + this.getRefreshTtlMs())
      }
    });
  }

  private getRefreshTtlMs() {
    const ttl = this.configService.get<string>('app.jwt.refreshTtl') || '7d';
    const unit = ttl.slice(-1);
    const value = parseInt(ttl.slice(0, -1), 10);

    const unitMap: Record<string, number> = {
      s: 1000,
      m: 1000 * 60,
      h: 1000 * 60 * 60,
      d: 1000 * 60 * 60 * 24
    };

    return (unitMap[unit] || unitMap['d']) * (value || 7);
  }

  private async enqueueEmailVerification(userId: string, email: string) {
    const token = generateToken(24);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await this.prisma.emailVerification.create({
      data: {
        userId,
        token,
        expiresAt: expires
      }
    });

    await this.notificationsService.sendEmailVerification(email, token);
  }

  private sanitizeUser(user: { password: string; [key: string]: any }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return safeUser;
  }
}