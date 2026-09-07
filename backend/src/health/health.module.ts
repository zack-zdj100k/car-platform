import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RootController } from './root.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [HealthController, RootController],
})
export class HealthModule {}
