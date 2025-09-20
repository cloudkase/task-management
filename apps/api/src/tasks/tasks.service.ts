import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { CreateTaskDto, UpdateTaskDto } from '@data/dtos';
import { RbacService } from '@auth/rbac.service';
import { Role } from '@data/roles.enum';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Organization) private orgs: Repository<Organization>,
    private rbac: RbacService
  ) {}

  private async getOrgScope(orgId: number) {
    const all = await this.orgs.find();
    return this.rbac.orgScope(orgId, all);
  }

  async list(user: { userId: number; role: Role; orgId: number }) {
    if (!this.rbac.canReadTasks(user.role)) throw new ForbiddenException();
    const scope = await this.getOrgScope(user.orgId);
    const items = await this.tasks.find({ 
      relations: ['organization', 'createdBy'],
      order: { order: 'ASC' } 
    });
    return items.filter(t => scope.includes(t.organization.id));
  }

  async create(
    user: { userId: number; role: Role; orgId: number },
    dto: CreateTaskDto
  ) {
    if (!this.rbac.canCreateTasks(user.role)) throw new ForbiddenException();
    
    const creator = await this.users.findOneOrFail({ where: { id: user.userId } });
    const org = await this.orgs.findOneOrFail({ where: { id: user.orgId } });

    const entity = this.tasks.create({
      title: dto.title,
      description: dto.description ?? null,
      category: dto.category || 'Other',
      status: dto.status || 'todo',
      order: dto.order ?? 0,
      organization: org,
      createdBy: creator,
    });
    
    const saved = await this.tasks.save(entity);
    this.audit(`[CREATE]`, user.userId, `task:${saved.id}`);
    return saved;
  }

  async update(
    user: { userId: number; role: Role; orgId: number },
    id: number,
    dto: UpdateTaskDto
  ) {
    if (!this.rbac.canUpdateTasks(user.role)) throw new ForbiddenException();
    const task = await this.tasks.findOne({ 
      where: { id },
      relations: ['organization'] 
    });
    if (!task) throw new NotFoundException('Task not found');
    const scope = await this.getOrgScope(user.orgId);
    if (!scope.includes(task.organization.id)) throw new ForbiddenException('Out of scope');

    task.title = dto.title ?? task.title;
    task.description = dto.description ?? task.description;
    task.status = (dto.status as any) ?? task.status;
    task.category = (dto.category as any) ?? task.category;
    task.order = dto.order ?? task.order;
    const saved = await this.tasks.save(task);
    this.audit(`[UPDATE]`, user.userId, `task:${saved.id}`);
    return saved;
  }

  async remove(user: { userId: number; role: Role; orgId: number }, id: number) {
    if (!this.rbac.canDeleteTasks(user.role)) throw new ForbiddenException();
    const task = await this.tasks.findOne({ 
      where: { id },
      relations: ['organization'] 
    });
    if (!task) throw new NotFoundException('Task not found');
    const scope = await this.getOrgScope(user.orgId);
    if (!scope.includes(task.organization.id)) throw new ForbiddenException('Out of scope');
    await this.tasks.remove(task);
    this.audit(`[DELETE]`, user.userId, `task:${id}`);
    return { deleted: true };
  }

  private audit(action: string, actorId: number, detail: string) {
    const line = `${action} ${new Date().toISOString()} actor:${actorId} ${detail}\n`;
    const file = path.join(__dirname, '../../audit.log');
    fs.appendFileSync(file, line);
  }
}