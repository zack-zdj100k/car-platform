import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

/**
 * Every route requires the ADMIN role, verified server-side (spec §38, §56).
 */
@ApiTags('analytics')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Complete admin overview payload' })
  dashboard() {
    return this.analytics.dashboard();
  }

  @Get('overview')
  @ApiOperation({ summary: 'Headline counts' })
  overview() {
    return this.analytics.overview();
  }

  @Get('most-viewed')
  @ApiOperation({ summary: 'Most viewed vehicles' })
  mostViewed(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('days') days?: string,
  ) {
    return this.analytics.mostViewed(Math.min(limit, 50), days ? Number(days) : undefined);
  }

  @Get('most-favorited')
  @ApiOperation({ summary: 'Most favourited vehicles' })
  mostFavorited(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
    return this.analytics.mostFavorited(Math.min(limit, 50));
  }

  @Get('most-ordered')
  @ApiOperation({ summary: 'Most requested vehicles' })
  mostOrdered(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
    return this.analytics.mostOrdered(Math.min(limit, 50));
  }

  @Get('growth')
  @ApiOperation({ summary: 'Daily user, car, order and view counts' })
  growth(@Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number) {
    return this.analytics.growth(Math.min(Math.max(days, 1), 365));
  }

  @Get('orders')
  @ApiOperation({ summary: 'Order counts per status' })
  orderBreakdown() {
    return this.analytics.orderBreakdown();
  }

  @Get('catalogue')
  @ApiOperation({ summary: 'Vehicle distribution by brand, body type and fuel type' })
  catalogue() {
    return this.analytics.catalogueBreakdown();
  }

  @Get('email-health')
  @ApiOperation({ summary: 'Email delivery status and recent failures' })
  emailHealth() {
    return this.analytics.emailHealth();
  }
}
