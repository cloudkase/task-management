import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { Organization } from './entities/organization.entity';
import { User } from './entities/user.entity';
import { Task } from './entities/task.entity';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { AuditController } from './audit/audit.controller';
import { RbacService } from '@auth/rbac.service';
import * as path from 'path';
import * as fs from 'fs';

const dbPath = path.join(process.cwd(), 'data.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqljs',
      location: dbPath,     // absolute path prevents "apps/api/apps/api/data.db"
      autoSave: true,
      // Strongly persist to exactly dbPath on Windows:
      autoSaveCallback: (database: Uint8Array) => {
        fs.writeFileSync(dbPath, Buffer.from(database));
      },
      synchronize: true,
      autoLoadEntities: true,
      // logging: true, // uncomment if you want to see SQL
    }),
    TypeOrmModule.forFeature([Organization, User, Task]),
    AuthModule, HealthModule, 
  ],
  controllers: [TasksController, AuditController],
  providers: [TasksService, RbacService],
})

export class AppModule implements OnModuleInit {
  constructor(private dataSource: DataSource) {}
  
  async onModuleInit() {
    const orgRepo = this.dataSource.getRepository(Organization);
    const userRepo = this.dataSource.getRepository(User);
    const taskRepo = this.dataSource.getRepository(Task);

    // Seed organizations
    let parent = await orgRepo.findOne({ where: { name: 'Acme Corp' } });
    if (!parent) {
      parent = await orgRepo.save(orgRepo.create({ name: 'Acme Corp', parentId: null }));
    }
    
    let child = await orgRepo.findOne({ where: { name: 'Acme Subsidiary' } });
    if (!child) {
      child = await orgRepo.save(orgRepo.create({ name: 'Acme Subsidiary', parentId: parent.id }));
    }

    // Helper function to create users
    async function ensureUser(email: string, role: 'owner'|'admin'|'viewer', org: Organization) {
      let user = await userRepo.findOne({ where: { email } });
      if (!user) {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('password', 10);
        user = await userRepo.save(userRepo.create({ 
          email, 
          passwordHash: hash, 
          role, 
          organization: org 
        }));
      }
      return user;
    }

    // Create users
    const owner = await ensureUser('owner@turbovets.com', 'owner', parent);
    const admin = await ensureUser('admin@turbovets.com', 'admin', child);
    const viewer = await ensureUser('viewer@turbovets.com', 'viewer', child);

    // Seed tasks if none exist
    if (await taskRepo.count() === 0) {
      await taskRepo.save([
        {
          title: 'Company-wide kickoff',
          description: 'Plan Q4 OKRs and company strategy',
          status: 'todo',
          category: 'Work',
          order: 0,
          organization: parent,
          createdBy: owner
        },
        {
          title: 'Subsidiary onboarding',
          description: 'Set up accounts and access for new subsidiary',
          status: 'in_progress',
          category: 'Work',
          order: 1,
          organization: child,
          createdBy: admin
        },
        {
          title: 'Team building event',
          description: 'Organize quarterly team building activity',
          status: 'todo',
          category: 'Personal',
          order: 2,
          organization: parent,
          createdBy: owner
        },
        {
          title: 'Documentation update',
          description: 'Update API documentation and user guides',
          status: 'done',
          category: 'Work',
          order: 3,
          organization: child,
          createdBy: viewer
        }
      ]);
    }
  }
}