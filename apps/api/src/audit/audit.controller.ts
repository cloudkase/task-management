import { Controller, Get, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { Roles } from '@auth/roles.decorator';
import { RolesGuard } from '@auth/roles.guard';
import * as fs from 'fs';
import * as path from 'path';
import { Role } from '@data/roles.enum';

@Controller('audit-log')
@Roles('owner','admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  @Get()
  get(@Req() req: any) {
    const role: Role = req.user.role;
    if (!(role === 'owner' || role === 'admin')) throw new ForbiddenException();
    const file = path.join(__dirname, '../../audit.log');
    if (!fs.existsSync(file)) return { entries: [] };
    const entries = fs.readFileSync(file, 'utf-8').trim().split('\n').slice(-500);
    return { entries };
  }
}
