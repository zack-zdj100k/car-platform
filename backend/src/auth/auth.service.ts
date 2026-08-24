import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, UserStatus, type User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { generateOpaqueToken, hashToken } from '../common/utils/tokens';
import type { Configuration } from '../config/configuration';
import { PasswordService } from './password.service';
import { TokenService, type IssuedTokens } from './token.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

export interface AuthenticatedProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  profileImage: string | null;
  createdAt: Date;
}

export interface AuthResult {
  user: AuthenticatedProfile;
  tokens: IssuedTokens;
}

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService<Configuration, true>,
  ) {}

  private toProfile(user: User): AuthenticatedProfile {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
    };
  }

  /** Spec §36 — registration. New accounts are always CUSTOMER. */
  async register(dto: RegisterDto, context: { userAgent?: string; ipAddress?: string }): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        password: await this.passwords.hash(dto.password),
        phone: dto.phone ?? null,
        // Role is never taken from client input — privilege escalation defence.
        role: Role.CUSTOMER,
      },
    });

    this.logger.log(`Registered user ${user.id}`);
    const tokens = await this.tokens.issue(user, context);
    return { user: this.toProfile(user), tokens };
  }

  /** Spec §37 — sign in. */
  async login(
    dto: LoginDto,
    context: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Identical response and comparable timing whether or not the account
    // exists, so the endpoint cannot be used to enumerate registered emails.
    if (!user || !user.password) {
      await this.passwords.fakeVerify();
      throw new UnauthorizedException('Incorrect email address or password');
    }

    const valid = await this.passwords.verify(user.password, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Incorrect email address or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account has been suspended. Please contact support.');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const tokens = await this.tokens.issue(user, { ...context, rememberMe: dto.rememberMe });
    return { user: this.toProfile(user), tokens };
  }

  /** Google OAuth sign-in / sign-up (spec §3, §36). */
  async loginWithGoogle(
    profile: { googleId: string; email: string; fullName: string; picture?: string },
    context: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthResult> {
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          fullName: profile.fullName,
          email: profile.email,
          googleId: profile.googleId,
          profileImage: profile.picture ?? null,
          emailVerified: true,
          role: Role.CUSTOMER,
          // No password: this account authenticates through Google only until
          // the customer sets one via the password-reset flow.
          password: null,
        },
      });
    } else if (!user.googleId) {
      // Existing password account signing in with the same verified address.
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId, emailVerified: true },
      });
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account has been suspended. Please contact support.');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const tokens = await this.tokens.issue(user, context);
    return { user: this.toProfile(user), tokens };
  }

  async refresh(refreshToken: string, context: { userAgent?: string; ipAddress?: string }) {
    const rotated = await this.tokens.rotate(refreshToken, context);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: rotated.user.id } });
    return { user: this.toProfile(user), tokens: rotated };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.tokens.revoke(refreshToken);
    }
  }

  async me(userId: string): Promise<AuthenticatedProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }
    return this.toProfile(user);
  }

  /**
   * Spec §37 — forgot password.
   *
   * Always reports success: revealing whether an address is registered would
   * turn this endpoint into an account-enumeration oracle.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.logger.log('Password reset requested for an unknown address');
      return;
    }

    // Any previously issued, unused links become invalid.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = generateOpaqueToken(32);
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    const siteUrl = this.config.get('app', { infer: true }).siteUrl;
    await this.notifications.sendPasswordReset({
      to: user.email,
      fullName: user.fullName,
      resetUrl: `${siteUrl}/reset-password?token=${token}`,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('This password reset link is invalid or has expired');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: await this.passwords.hash(newPassword) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Changing a password ends every existing session.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.log(`Password reset completed for user ${record.userId}`);
  }
}
