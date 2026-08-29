import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { RecentlyViewedService } from '../recently-viewed/recently-viewed.service';
import { CarsService } from './cars.service';
import { QueryCarsDto } from './dto/query-cars.dto';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';

@ApiTags('cars')
@Controller('cars')
export class CarsController {
  constructor(
    private readonly cars: CarsService,
    private readonly recentlyViewed: RecentlyViewedService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published vehicles with search, filters and sorting' })
  findAll(@Query() query: QueryCarsDto) {
    return this.cars.findAll(query);
  }

  @Public()
  @Get('facets')
  @ApiOperation({ summary: 'Available filter values for the cars listing' })
  findFacets() {
    return this.cars.findFacets();
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Featured vehicles for the home page' })
  findFeatured() {
    return this.cars.findFeatured();
  }

  /**
   * Admin listing is declared before `:idOrSlug` so the literal path wins over
   * the wildcard parameter.
   */
  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List every vehicle including drafts (admin)' })
  findAllForAdmin(@Query() query: QueryCarsDto) {
    return this.cars.findAllForAdmin(query);
  }

  @Get('admin/:idOrSlug')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vehicle detail including drafts (admin)' })
  findOneForAdmin(@Param('idOrSlug') idOrSlug: string) {
    return this.cars.findOneForAdmin(idOrSlug);
  }

  @Public()
  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Vehicle detail' })
  findOne(@Param('idOrSlug') idOrSlug: string) {
    /*
     * Reading a car no longer records anything.
     *
     * It used to, and it could not work: this page is rendered on the site's
     * server, and the reader's token lives in their browser — so every request
     * arrived here anonymous, whoever was signed in. Two things followed.
     * "Recently viewed" never recorded a single row, and an administrator
     * browsing their own catalogue was counted as a visitor, because nothing
     * here could tell it was them.
     *
     * The browser reports the view itself now, through the endpoint below,
     * where the identity actually exists. A GET that quietly writes to the
     * database was the wrong shape for this in any case.
     */
    return this.cars.findOne(idOrSlug);
  }

  /**
   * Records that somebody looked at this car.
   *
   * Sent by the reader's own browser, which is the only place that knows who
   * they are: their access token when signed in, and their anonymous visitor
   * cookie when not. Never fails the caller — a view that cannot be recorded is
   * not worth an error on a page that has already rendered (spec §72).
   */
  @OptionalAuth()
  @Post(':idOrSlug/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Record a view of this vehicle' })
  async recordView(
    @Param('idOrSlug') idOrSlug: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
  ): Promise<void> {
    const car = await this.cars.findOne(idOrSlug);

    await Promise.allSettled([
      this.cars.recordView(car.id, {
        userId: user?.id,
        role: user?.role,
        anonymousId: request.get('x-visitor-id') ?? undefined,
        userAgent: request.get('user-agent') ?? undefined,
        ip: request.ip,
        referrer: request.get('x-visitor-referrer') ?? request.get('referer') ?? undefined,
      }),
      user ? this.recentlyViewed.record(user.id, car.id) : Promise.resolve(),
    ]);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a vehicle (admin)' })
  create(@Body() dto: CreateCarDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cars.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a vehicle (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateCarDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cars.update(id, dto, user.id);
  }

  @Patch(':id/publish')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a vehicle (admin)' })
  publish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cars.setPublished(id, true, user.id);
  }

  @Patch(':id/unpublish')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpublish a vehicle (admin)' })
  unpublish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cars.setPublished(id, false, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a vehicle, or archive it when orders reference it (admin)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cars.remove(id, user.id);
  }
}
