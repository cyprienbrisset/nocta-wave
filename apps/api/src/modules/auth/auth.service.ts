import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  teamId?: string;
  role?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
  ) {}

  /**
   * Register a new user
   */
  async register(dto: RegisterDto): Promise<AuthTokens> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create user and default team in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
        },
      });

      // Create default personal team
      const team = await tx.team.create({
        data: {
          name: `${dto.name || dto.email.split('@')[0]}'s Team`,
          slug: `team-${user.id.slice(0, 8)}`,
        },
      });

      // Add user as team owner
      await tx.teamMember.create({
        data: {
          userId: user.id,
          teamId: team.id,
          role: 'OWNER',
        },
      });

      return { user, team };
    });

    return this.generateTokens(result.user.id, result.user.email, result.team.id);
  }

  /**
   * Login user
   */
  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        teamMemberships: {
          include: { team: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get default team (first team user belongs to)
    const defaultTeam = user.teamMemberships[0]?.team;

    return this.generateTokens(
      user.id,
      user.email,
      defaultTeam?.id,
      user.teamMemberships[0]?.role,
    );
  }

  /**
   * Refresh access token
   */
  async refreshToken(dto: RefreshTokenDto): Promise<AuthTokens> {
    // Find refresh token
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: {
        user: {
          include: {
            teamMemberships: {
              include: { team: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshToken.expiresAt < new Date()) {
      // Delete expired token
      await this.prisma.refreshToken.delete({
        where: { id: refreshToken.id },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = refreshToken.user;
    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    // Delete old refresh token (rotation)
    await this.prisma.refreshToken.delete({
      where: { id: refreshToken.id },
    });

    const defaultTeam = user.teamMemberships[0]?.team;

    return this.generateTokens(
      user.id,
      user.email,
      defaultTeam?.id,
      user.teamMemberships[0]?.role,
    );
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // Invalidate all access tokens by adding to blacklist
    await this.redis.set(`user:${userId}:logout`, Date.now(), 60 * 60 * 24);
  }

  /**
   * Validate JWT payload
   */
  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        teamMemberships: {
          include: { team: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    // Check if user logged out after token was issued
    const logoutTime = await this.redis.get<number>(`user:${user.id}:logout`);
    if (logoutTime) {
      // Token was issued before logout - consider invalid
      return null;
    }

    return user;
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all refresh tokens
    await this.logoutAll(userId);
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    userId: string,
    email: string,
    teamId?: string,
    role?: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      teamId,
      role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Create refresh token
    const refreshToken = uuid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    const expiresIn = this.configService.get<number>('JWT_EXPIRES_IN_SECONDS', 900);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }
}
