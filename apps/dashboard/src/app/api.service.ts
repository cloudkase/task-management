import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task, LoginResponse } from './models';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiBase}/auth/login`, { email, password });
  }

  me(): any {
    return JSON.parse(localStorage.getItem('user') || 'null');
  }

  listTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${environment.apiBase}/tasks`);
  }

  createTask(payload: Partial<Task>): Observable<Task> {
    return this.http.post<Task>(`${environment.apiBase}/tasks`, payload);
  }

  updateTask(id: number, payload: Partial<Task>): Observable<Task> {
    return this.http.put<Task>(`${environment.apiBase}/tasks/${id}`, payload);
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiBase}/tasks/${id}`);
  }

  auditLog(): Observable<{entries: string[]}> {
    return this.http.get<{entries: string[]}>(`${environment.apiBase}/audit-log`);
  }
}
