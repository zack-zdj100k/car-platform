import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { durationToMs } from '../common/utils/duration';
import { generateOpaqueToken, hashToken } from '../common/utils/tokens';
import type { Configuration } from '../config/configuration';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresAt: Date;
}

const REMEMBER_ME_TTL = '90d';

/**
 * Access and refresh token lifecycle (spec §37).
 *
 * Access tokens are short-lived JWTs. Refresh tokens are opaque random strings
 * stored only as SHA-256 digests and rotated on every use, so a stolen refresh
 * token is usable at most once and its reuse is detectable.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Configuration, true>,
    private readonly prisma: PrismaService,
  ) {}

  private get auth() {
    return this.config.get('auth', { infer: true });
  }

  async issue(
    user: { id: string; email: string; role: Role },
    context: { userAgent?: string; ipAddress?: string; rememberMe?: boolean } = {},
  ): Promise<IssuedTokens> {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email, role: user.role };

    // Expressed in seconds: the JWT signer's string form is a narrow literal
    // type, while our TTL comes from configuration as a free-form string.
    const accessTtlSeconds = Math.floor(durationToMs(this.auth.accessTtl) / 1000);

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.auth.accessSecret,
      expiresIn: accessTtlSeconds,
    });

    const refreshTtl = context.rememberMe ? REMEMBER_ME_TTL : this.auth.refreshTtl;
    const refreshToken = generateOpaqueToken();
    const refreshTokenExpiresAt = new Date(Date.now() + durationToMs(refreshTtl));

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: refreshTokenExpiresAt,
        userAgent: context.userAgent?.slice(0, 255) ?? null,
        ipAddress: context.ipAddress ?? null,
      },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: accessTtlSeconds,
      refreshTokenExpiresAt,
    };
  }

  /**
   * Validates and rotates a refresh token.
   *
   * Presenting an already-revoked token revokes the whole family: that pattern
   * means either replay or theft, and the safe response is to end every session.
   */
  async rotate(
    presentedToken: string,
    context: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<IssuedTokens & { user: { id: string; email: string; role: Role } }> {
    const tokenHash = hashToken(presentedToken);

    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, role: true, status: true } } },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid session. Please sign in again.');
    }

    if (existing.revokedAt) {
      await this.revokeAllForUser(existing.userId);
      throw new UnauthorizedException('Session reuse detected. Please sign in again.');
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    if (existing.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('This account is not active.');
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const user = { id: existing.user.id, email: existing.user.email, role: existing.user.role };
    const issued = await this.issue(user, context);
    return { ...issued, user };
  }

  async revoke(presentedToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(presentedToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Housekeeping for expired and long-revoked rows. */
  async pruneExpired(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
