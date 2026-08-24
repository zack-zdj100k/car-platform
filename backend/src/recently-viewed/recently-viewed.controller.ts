import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { RecentlyViewedService } from './recently-viewed.service';

@ApiTags('recently-viewed')
@ApiBearerAuth()
@Controller('recently-viewed')
export class RecentlyViewedController {
  constructor(private readonly recentlyViewed: RecentlyViewedService) {}

  @Get()
  @ApiOperation({ summary: 'Recently viewed vehicles, most recent first' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.recentlyViewed.findAll(user.id, query);
  }

  @Post(':carId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Record a vehicle view explicitly' })
  async record(@CurrentUser() user: AuthenticatedUser, @Param('carId') carId: string): Promise<void> {
    await this.recentlyViewed.record(user.id, carId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear view history' })
  clear(@CurrentUser() user: AuthenticatedUser) {
    return this.recentlyViewed.clear(user.id);
  }
}
