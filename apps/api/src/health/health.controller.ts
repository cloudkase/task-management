import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/')
  root() {
    return {
      ok: true,
      service: 'secure-task-api',
      version: process.env.npm_package_version || '0.0.0',
      time: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('/health')
  health() { return { status: 'ok', time: new Date().toISOString() }; }
}
