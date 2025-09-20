import { Component, OnInit, TrackByFunction, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { Task, Status, Category } from './models';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.css'],
})
export class TasksComponent implements OnInit, AfterViewInit {
  @ViewChild('statusChart', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  @HostListener('window:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent) {
    if (ev.key === 'n' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault(); 
      this.quickAdd();
    }
    if (ev.key === '/' && ev.ctrlKey) {
      ev.preventDefault(); 
      (document.querySelector('input[placeholder="Search tasks"]') as HTMLInputElement)?.focus();
    }
    if (ev.key === 'Escape') {
      this.closeEditModal();
    }
  }

  // Drag and drop handling
  drop(event: CdkDragDrop<Task[]>, targetStatus: Status) {
    if (event.previousContainer === event.container) {
      // Reorder within same column
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      
      // Update order for all tasks in this status
      event.container.data.forEach((task, index) => {
        task.order = index;
        this.api.updateTask(task.id, { order: index }).subscribe();
      });
    } else {
      // Move between columns
      const task: Task = event.previousContainer.data[event.previousIndex];
      
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Update task status and order
      const updatedTask = { ...task, status: targetStatus, order: event.currentIndex };
      this.api.updateTask(task.id, { 
        status: targetStatus, 
        order: event.currentIndex 
      }).subscribe({
        next: () => {
          this.tasks = this.tasks.map(t => t.id === task.id ? updatedTask : t);
        },
        error: (error) => {
          console.error('Failed to update task:', error);
          // Revert UI change on error
          this.refresh();
        }
      });
    }
  }

  quickAdd() {
    const title = prompt('New task title?');
    if (!title) return;
    this.api.createTask({ 
      title, 
      category: 'Work' as Category, 
      status: 'todo' as Status 
    }).subscribe({ 
      next: () => this.refresh(),
      error: (error) => alert('Failed to create task: ' + error.message)
    });
  }

  user: any;
  loading = false;
  error = '';
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  filter: 'all' | Status = 'all';
  scope: 'all' | 'my-org' | 'mine' = 'all';
  searchQuery = '';
  editingTask: Task | null = null;
  showEditModal = false;

  // Forms
  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private api: ApiService, 
    private fb: FormBuilder, 
    private router: Router,
    private elementRef: ElementRef
  ) {
    this.createForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      category: ['Work', Validators.required]
    });

    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      category: ['Work', Validators.required],
      status: ['todo', Validators.required]
    });
  }

  get canWrite(): boolean {
    const role = this.user?.role || '';
    return role === 'owner' || role === 'admin';
  }

  ngOnInit(): void {
    this.user = this.api.me();
    if (!localStorage.getItem('jwt')) {
      this.router.navigateByUrl('/login');
      return;
    }
    this.refresh();
  }

  ngAfterViewInit() {
    this.renderChart();
  }

  trackById: TrackByFunction<Task> = (index, task) => task.id;

  refresh() {
    this.loading = true;
    this.error = '';
    this.api.listTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.applyFilters();
        this.renderChart();
        this.loading = false;
      },
      error: (error) => {
        this.error = error?.error?.message || 'Failed to load tasks';
        this.loading = false;
        console.error('Error loading tasks:', error);
      }
    });
  }

  applyFilters() {
    this.filteredTasks = this.tasks.filter(task => {
      // Status filter
      if (this.filter !== 'all' && task.status !== this.filter) {
        return false;
      }

      // Scope filter
      if (this.scope === 'mine') {
        const uid = this.user?.id;
        const creatorId = typeof task.createdBy === 'object' && task.createdBy ? 
                         (task.createdBy as any).id : task.createdBy;
        if (!uid || creatorId !== uid) return false;
      } else if (this.scope === 'my-org') {
        const uOrgId = this.user?.orgId ?? (this.user?.organization as any)?.id ?? null;
        const tOrgId = typeof task.organization === 'object' && task.organization ? 
                      task.organization.id : task.organization;
        if (uOrgId !== tOrgId) return false;
      }

      // Search filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        return task.title.toLowerCase().includes(query) || 
               (task.description && task.description.toLowerCase().includes(query)) ||
               task.category.toLowerCase().includes(query);
      }

      return true;
    });

    // Sort by order within each status
    this.filteredTasks.sort((a, b) => a.order - b.order);
  }

  onFilterChange() {
    this.applyFilters();
  }

  onSearchChange() {
    this.applyFilters();
  }

  visible(task: Task): boolean {
    return this.filteredTasks.includes(task);
  }

  create() {
    if (!this.canWrite || !this.createForm.valid) return;

    this.loading = true;
    const formValue = this.createForm.value;

    this.api.createTask({
      title: formValue.title.trim(),
      description: formValue.description?.trim() || null,
      category: formValue.category,
      status: 'todo' as Status
    }).subscribe({
      next: () => {
        this.createForm.reset({ title: '', description: '', category: 'Work' });
        this.refresh();
      },
      error: (error) => {
        alert(error?.error?.message || 'Failed to create task');
        this.loading = false;
      }
    });
  }

  openEditModal(task: Task) {
    if (!this.canWrite) return;

    this.editingTask = task;
    this.editForm.patchValue({
      title: task.title,
      description: task.description || '',
      category: task.category || 'Work',
      status: task.status
    });
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingTask = null;
    this.editForm.reset();
  }

  updateTask() {
    if (!this.canWrite || !this.editingTask || !this.editForm.valid) return;

    this.loading = true;
    const formValue = this.editForm.value;

    this.api.updateTask(this.editingTask.id, {
      title: formValue.title.trim(),
      description: formValue.description?.trim() || null,
      category: formValue.category,
      status: formValue.status
    }).subscribe({
      next: () => {
        this.closeEditModal();
        this.refresh();
      },
      error: (error) => {
        alert(error?.error?.message || 'Failed to update task');
        this.loading = false;
      }
    });
  }

  toggleStatus(task: Task, newStatus: Status) {
    if (!this.canWrite) return;

    this.api.updateTask(task.id, { status: newStatus }).subscribe({
      next: () => this.refresh(),
      error: (error) => alert('Failed to update task: ' + error.message)
    });
  }

  deleteTask(task: Task) {
    if (!this.canWrite) return;
    
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      this.api.deleteTask(task.id).subscribe({
        next: () => this.refresh(),
        error: (error) => alert('Failed to delete task: ' + error.message)
      });
    }
  }

  openAudit() {
    this.api.auditLog().subscribe({
      next: (data) => {
        const event = new CustomEvent('open-audit', { detail: data });
        window.dispatchEvent(event);
      },
      error: (error) => {
        alert(error?.error?.message || 'Failed to load audit log');
      }
    });
  }

  logout() {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    this.router.navigateByUrl('/login');
  }

  getTasksByStatus(status: Status): Task[] {
    return this.filteredTasks.filter(task => task.status === status);
  }

  renderChart() {
    if (!this.chartCanvas?.nativeElement) return;
    
    const canvas = this.chartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Count tasks by status
    const counts = { todo: 0, in_progress: 0, done: 0 };
    this.tasks.forEach(task => counts[task.status]++);
    
    const total = this.tasks.length || 1;
    const todoPercent = (counts.todo / total) * 100;
    const inProgressPercent = (counts.in_progress / total) * 100;
    const donePercent = (counts.done / total) * 100;
    
    // Draw chart
    const barWidth = 60;
    const spacing = 30;
    const startX = 50;
    const maxHeight = 120;
    
    // Draw bars
    ctx.fillStyle = '#ef4444'; // Red for todo
    ctx.fillRect(startX, maxHeight - (todoPercent * maxHeight / 100), barWidth, todoPercent * maxHeight / 100);
    
    ctx.fillStyle = '#f59e0b'; // Amber for in progress
    ctx.fillRect(startX + barWidth + spacing, maxHeight - (inProgressPercent * maxHeight / 100), barWidth, inProgressPercent * maxHeight / 100);
    
    ctx.fillStyle = '#10b981'; // Green for done
    ctx.fillRect(startX + (barWidth + spacing) * 2, maxHeight - (donePercent * maxHeight / 100), barWidth, donePercent * maxHeight / 100);
    
    // Draw labels
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    ctx.fillText('Todo', startX + barWidth / 2, maxHeight + 20);
    ctx.fillText(`${counts.todo}`, startX + barWidth / 2, maxHeight - (todoPercent * maxHeight / 100) - 5);
    
    ctx.fillText('In Progress', startX + barWidth + spacing + barWidth / 2, maxHeight + 20);
    ctx.fillText(`${counts.in_progress}`, startX + barWidth + spacing + barWidth / 2, maxHeight - (inProgressPercent * maxHeight / 100) - 5);
    
    ctx.fillText('Done', startX + (barWidth + spacing) * 2 + barWidth / 2, maxHeight + 20);
    ctx.fillText(`${counts.done}`, startX + (barWidth + spacing) * 2 + barWidth / 2, maxHeight - (donePercent * maxHeight / 100) - 5);
  }

  // Category filtering
  filterByCategory(category: Category) {
    this.searchQuery = category;
    this.applyFilters();
  }

  // Sorting functions
  sortByTitle() {
    this.filteredTasks.sort((a, b) => a.title.localeCompare(b.title));
  }

  sortByCategory() {
    this.filteredTasks.sort((a, b) => a.category.localeCompare(b.category));
  }

  sortByStatus() {
    const statusOrder = { todo: 0, in_progress: 1, done: 2 };
    this.filteredTasks.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }
}