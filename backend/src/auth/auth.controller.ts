import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { Configuration } from '../config/configuration';
import { AuthService, type AuthResult } from './auth.service';
import type { GoogleProfile } from './strategies/google.strategy';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const REFRESH_COOKIE = 'cp_refresh';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Configuration, true>,
  ) {}

  private context(request: Request) {
    return {
      userAgent: request.get('user-agent') ?? undefined,
      ipAddress: request.ip,
    };
  }

  /**
   * The refresh token lives in an httpOnly cookie so client-side JavaScript —
   * and therefore any XSS payload — cannot read it (spec §67).
   */
  private setRefreshCookie(response: Response, result: AuthResult): void {
    const auth = this.config.get('auth', { infer: true });
    response.cookie(REFRESH_COOKIE, result.tokens.refreshToken, {
      httpOnly: true,
      secure: auth.cookieSecure,
      sameSite: 'lax',
      domain: auth.cookieDomain,
      path: '/',
      expires: result.tokens.refreshTokenExpiresAt,
    });
  }

  private clearRefreshCookie(response: Response): void {
    const auth = this.config.get('auth', { infer: true });
    response.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: auth.cookieSecure,
      sameSite: 'lax',
      domain: auth.cookieDomain,
      path: '/',
    });
  }

  private present(result: AuthResult) {
    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.accessTokenExpiresIn,
    };
  }

  /**
   * The throttler counts every request to this route, including ones rejected
   * for validation. Five would lock out a customer who mistypes the password
   * confirmation a few times, so the limit is set high enough to absorb honest
   * form errors while still stopping bulk account creation.
   */
  @Public()
  @Post('register')
  @Throttle({ default: { limit: 12, ttl: 900_000 } })
  @ApiOperation({ summary: 'Create a customer account' })
  async register(@Body() dto: RegisterDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(dto, this.context(request));
    this.setRefreshCookie(response, result);
    return this.present(result);
  }

  /**
   * The limit is per IP address, not per account.
   *
   * Ten was too tight: everyone behind one office NAT or mobile carrier shares
   * an address, and so does every browser in an automated test run. Thirty in
   * fifteen minutes still caps a brute-force attempt at two attempts a minute,
   * and the real cost to an attacker is elsewhere — Argon2id verification is
   * deliberately slow, and a wrong password is indistinguishable from an
   * unknown account, so guessing yields no signal either way.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 900_000 } })
  @ApiOperation({ summary: 'Sign in with email and password' })
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto, this.context(request));
    this.setRefreshCookie(response, result);
    return this.present(result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh cookie for a new access token' })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = (request.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException('No active session');
    }
    const result = await this.auth.refresh(token, this.context(request));
    this.setRefreshCookie(response, result);
    return this.present(result);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current session' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    const token = (request.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    await this.auth.logout(token);
    this.clearRefreshCookie(response);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current authenticated profile' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.id);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @ApiOperation({ summary: 'Request a password reset link' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    // Deliberately identical whether or not the address exists.
    return { message: 'If an account exists for that address, a reset link has been sent.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { message: 'Your password has been updated. Please sign in.' };
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Begin Google OAuth sign-in' })
  googleStart(): void {
    // Passport issues the redirect to Google.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() request: Request, @Res() response: Response): Promise<void> {
    const profile = request.user as GoogleProfile | undefined;
    const siteUrl = this.config.get('app', { infer: true }).siteUrl;

    if (!profile) {
      response.redirect(`${siteUrl}/login?error=google`);
      return;
    }

    const result = await this.auth.loginWithGoogle(profile, this.context(request));
    this.setRefreshCookie(response, result);

    // The frontend completes sign-in by calling /auth/refresh with the cookie,
    // so the access token never appears in a URL or browser history.
    const destination = result.user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard';
    response.redirect(`${siteUrl}${destination}?signedIn=google`);
  }
}

export { REFRESH_COOKIE };
