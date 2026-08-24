import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List the signed-in customer’s favourite vehicles' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.favorites.findAll(user.id, query);
  }

  @Get('ids')
  @ApiOperation({ summary: 'Favourited car ids, for rendering heart states' })
  findIds(@CurrentUser() user: AuthenticatedUser) {
    return this.favorites.findIds(user.id);
  }

  @Post(':carId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a vehicle to favourites' })
  add(@CurrentUser() user: AuthenticatedUser, @Param('carId') carId: string) {
    return this.favorites.add(user.id, carId);
  }

  @Delete(':carId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a vehicle from favourites' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('carId') carId: string) {
    return this.favorites.remove(user.id, carId);
  }
}
