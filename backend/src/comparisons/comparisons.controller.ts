import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { ComparisonsService } from './comparisons.service';
import { AddComparisonCarDto, CreateComparisonDto, SetComparisonCarsDto } from './dto/comparison.dto';

@ApiTags('comparisons')
@ApiBearerAuth()
@Controller('comparisons')
export class ComparisonsController {
  constructor(private readonly comparisons: ComparisonsService) {}

  @Get()
  @ApiOperation({ summary: 'List saved comparisons' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.comparisons.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve one comparison with full specifications' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.comparisons.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a comparison' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateComparisonDto) {
    return this.comparisons.create(user.id, dto);
  }

  @Post(':id/cars')
  @ApiOperation({ summary: 'Add a vehicle to a comparison' })
  addCar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddComparisonCarDto) {
    return this.comparisons.addCar(user.id, id, dto);
  }

  @Put(':id/cars')
  @ApiOperation({ summary: 'Replace the vehicles in a comparison' })
  replaceCars(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SetComparisonCarsDto) {
    return this.comparisons.replaceCars(user.id, id, dto);
  }

  @Delete(':id/cars/:carId')
  @ApiOperation({ summary: 'Remove a vehicle from a comparison' })
  removeCar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('carId') carId: string) {
    return this.comparisons.removeCar(user.id, id, carId);
  }

  @Patch(':id/clear')
  @ApiOperation({ summary: 'Clear every vehicle from a comparison' })
  clear(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.comparisons.clear(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comparison' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.comparisons.remove(user.id, id);
  }
}
