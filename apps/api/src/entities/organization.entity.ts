import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';
@Entity()
export class Organization {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ unique: true }) name!: string;
  @Column({ type: 'int', nullable: true }) parentId!: number | null;
  @OneToMany(() => User, u => u.organization) users!: User[];
  @OneToMany(() => Task, t => t.organization) tasks!: Task[];
}
