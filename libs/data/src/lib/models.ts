export interface Organization { id:number; name:string; parentId?: number | null; }
export interface User { id:number; email:string; role:'viewer'|'admin'|'owner'; organizationId:number; }
export type TaskStatus = 'todo'|'in_progress'|'done';
export type TaskCategory = 'Work'|'Personal'|'Other';
export interface Task {
  id:number; title:string; description?:string|null;
  status:TaskStatus; category:TaskCategory; order:number;
  organizationId:number; createdById:number;
}
