import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        redis: 'unknown',
      },
    };

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.services.database = 'healthy';
    } catch {
      checks.services.database = 'unhealthy';
      checks.status = 'degraded';
    }

    // Check Redis
    try {
      await this.redis.getClient().ping();
      checks.services.redis = 'healthy';
    } catch {
      checks.services.redis = 'unhealthy';
      checks.status = 'degraded';
    }

    return checks;
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness check' })
  async ready() {
    // Check if all services are ready
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.redis.getClient().ping();
      return { ready: true };
    } catch {
      return { ready: false };
    }
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness check' })
  live() {
    return { live: true };
  }
}
