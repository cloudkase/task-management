import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Organization } from './organization.entity';
import { Task } from './task.entity';
@Entity()
export class User {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ unique: true }) email!: string;
  @Column() passwordHash!: string;
  @Column() role!: 'viewer'|'admin'|'owner';
  @ManyToOne(() => Organization, org => org.users, { eager: true }) organization!: Organization;
  @OneToMany(() => Task, t => t.createdBy) tasks!: Task[];
}
