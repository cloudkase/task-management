export type Status = 'todo'|'in_progress'|'done';
export type Category = 'Work'|'Personal'|'Other';
export interface Task {
  id: number; title: string;
  description?: string|null;
  status: Status; category: Category; order: number;
  organization: { id:number; name:string };
}
export interface LoginResponse {
  access_token: string;
  user: any;
}
