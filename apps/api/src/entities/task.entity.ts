import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
@Entity()
export class Task {
  @PrimaryGeneratedColumn() id!: number;
  @Column() title!: string;
  @Column({ nullable: true }) description!: string | null;
  @Column({ default: 'todo' }) status!: 'todo'|'in_progress'|'done';
  @Column({ default: 'Other' }) category!: 'Work'|'Personal'|'Other';
  @Column({ type: 'int', default: 0 }) order!: number;
  @ManyToOne(() => Organization, org => org.tasks, { eager: true }) organization!: Organization;
  @ManyToOne(() => User, u => u.tasks, { eager: true }) createdBy!: User;
}
