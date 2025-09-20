import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { Roles } from '@auth/roles.decorator';
import { RolesGuard } from '@auth/roles.guard';
import { CreateTaskDto, UpdateTaskDto } from '@data/dtos';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get()
  @Roles('viewer','admin','owner')
  list(@Req() req: any){ return this.service.list(req.user); }

  @Post()
  @Roles('admin','owner')
  create(@Req() req: any, @Body() dto: CreateTaskDto){ return this.service.create(req.user, dto); }

  @Put(':id')
  @Roles('admin','owner')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTaskDto){
    return this.service.update(req.user, +id, dto);
  }

  @Delete(':id')
  @Roles('admin','owner')
  remove(@Req() req: any, @Param('id') id: string){ return this.service.remove(req.user, +id); }
}
