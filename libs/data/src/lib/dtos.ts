/**
 * Shared DTOs & types
 */

export type Status = 'todo' | 'in_progress' | 'done';
export type Category = 'Work' | 'Personal' | 'Other';

/** Auth */
export interface LoginDto {
  email: string;
  password: string;
}

/** Tasks */
export interface CreateTaskDto {
  title: string;
  description?: string | null;
  status?: Status;       // optional; default is 'todo' on server
  category?: Category;   // optional; default is 'Other' on server
  order?: number;        // optional; default is 0 on server
  organizationId?: number; // optional: org where the task belongs
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  status?: Status;
  category?: Category;
  order?: number;
  // Typically we don't allow moving between orgs via update; add if needed.
}
