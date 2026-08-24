import { Module } from '@nestjs/common';
import { RecentlyViewedModule } from '../recently-viewed/recently-viewed.module';
import { CarsController } from './cars.controller';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { CarsService } from './cars.service';

@Module({
  imports: [RecentlyViewedModule],
  controllers: [CarsController, BrandsController],
  providers: [CarsService, BrandsService],
  exports: [CarsService, BrandsService],
})
export class CarsModule {}
