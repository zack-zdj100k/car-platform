import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and database connectivity' })
  async check() {
    const database = await this.prisma.isHealthy();

    if (!database) {
      // Surfaces as 503 so a load balancer or deployment check reacts correctly.
      throw new ServiceUnavailableException({ status: 'unhealthy', database: false });
    }

    return { status: 'ok', database: true, uptimeSeconds: Math.round(process.uptime()) };
  }
}
