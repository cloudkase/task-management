type Status = 'todo' | 'in_progress' | 'done';
type Category = 'Work' | 'Personal' | 'Other';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: Status;
  category?: Category;
  order: number;
}

interface UserInfo {
  id?: number;
  email: string;
  role?: string;
}

const apiBase = 'http://localhost:3333' as const;

const state: {
  token: string;
  user: UserInfo | null;
  tasks: Task[];
  filter: 'all' | Status;
  categoryFilter: 'all' | Category;
  sortBy: 'order' | 'title' | 'category' | 'status';
  editingTask: Task | null;
  theme: 'light' | 'dark';
} = {
  token: localStorage.getItem('jwt') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  tasks: [],
  filter: 'all',
  categoryFilter: 'all',
  sortBy: 'order',
  editingTask: null,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
};

function setTheme(theme: 'light' | 'dark') {
  state.theme = theme;
  localStorage.setItem('theme', theme);
  
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  render();
}

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}),
  };
  
  const res = await fetch(apiBase + path, { 
    headers, 
    ...(init || {}) 
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `HTTP ${res.status}`);
  }
  
  return res.json() as Promise<T>;
}

async function login(email: string, password: string): Promise<void> {
  try {
    const res = await fetch(apiBase + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!res.ok) { 
      alert('Login failed');
      return;
    }
    
    const data = await res.json();
    state.token = data.access_token;
    state.user = data.user;
    
    localStorage.setItem('jwt', state.token);
    localStorage.setItem('user', JSON.stringify(state.user));
    
    await loadTasks();
    render();
  } catch (error) {
    alert('Login failed: ' + (error as Error).message);
  }
}

async function loadTasks(): Promise<void> {
  if (!state.token) return;
  
  try {
    const res = await api<Task[]>('/tasks');
    state.tasks = res;
  } catch (error) {
    console.error('Failed to load tasks:', error);
  }
}

async function addTask(title: string, category: Category, description: string = ''): Promise<void> {
  try {
    await api('/tasks', {
      method: 'POST', 
      body: JSON.stringify({ title, category, description })
    });
    await loadTasks();
  } catch (error) {
    console.error('Failed to add task:', error);
  }
}

async function updateTask(id: number, fields: Partial<Task>): Promise<void> {
  try {
    await api('/tasks/' + id, { 
      method: 'PUT', 
      body: JSON.stringify(fields) 
    });
    await loadTasks();
  } catch (error) {
    console.error('Failed to update task:', error);
  }
}

async function deleteTask(id: number): Promise<void> {
  try {
    await api('/tasks/' + id, { method: 'DELETE' });
    await loadTasks();
  } catch (error) {
    console.error('Failed to delete task:', error);
  }
}

async function loadAudit(): Promise<void> {
  try {
    const res: any = await api('/audit-log');
    if (res && Array.isArray(res.entries)) {
      alert(res.entries.join('\n'));
    } else {
      alert(JSON.stringify(res, null, 2));
    }
  } catch (error) {
    console.error('Failed to load audit log:', error);
  }
}

function logout(): void {
  state.token = '';
  state.user = null;
  state.tasks = [];
  localStorage.removeItem('jwt');
  localStorage.removeItem('user');
  render();
}

function applyFiltersAndSort(): Task[] {
  let filteredTasks = [...state.tasks];
  
  if (state.filter !== 'all') {
    filteredTasks = filteredTasks.filter(task => task.status === state.filter);
  }
  
  if (state.categoryFilter !== 'all') {
    filteredTasks = filteredTasks.filter(task => task.category === state.categoryFilter);
  }
  
  switch(state.sortBy) {
    case 'title':
      filteredTasks.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'category':
      filteredTasks.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
      break;
    case 'status':
      const statusOrder = { todo: 0, in_progress: 1, done: 2 };
      filteredTasks.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      break;
    default:
      filteredTasks.sort((a, b) => a.order - b.order);
  }
  
  return filteredTasks;
}

function startDrag(event: DragEvent, task: Task): void {
  event.dataTransfer?.setData('text/plain', task.id.toString());
  event.dataTransfer!.effectAllowed = 'move';
}

function allowDrop(event: DragEvent): void {
  event.preventDefault();
}

async function drop(event: DragEvent, targetStatus: Status): Promise<void> {
  event.preventDefault();
  const taskId = parseInt(event.dataTransfer?.getData('text/plain') || '0');
  const task = state.tasks.find(t => t.id === taskId);
  
  if (task && task.status !== targetStatus) {
    await updateTask(taskId, { status: targetStatus });
  }
}

function openEditModal(task: Task): void {
  state.editingTask = { ...task };
  render();
}

function closeEditModal(): void {
  state.editingTask = null;
  render();
}

function saveEditedTask(): void {
  if (!state.editingTask) return;
  
  const { id, title, description, category, status } = state.editingTask;
  updateTask(id, { title, description, category, status });
  closeEditModal();
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, any> | null,
  ...children: Array<Node | string | number | boolean | null | undefined>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  const a = attrs || {};
  
  for (const k in a) {
    const v = a[k];
    if (k === 'class') (el as HTMLElement).className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== undefined && v !== null) el.setAttribute(k, String(v));
  }
  
  for (const c0 of children) {
    if (c0 === null || c0 === undefined || c0 === false) continue;
    const c = (typeof c0 === 'string' || typeof c0 === 'number') ? document.createTextNode(String(c0)) : (c0 as Node);
    el.appendChild(c);
  }
  
  return el;
}

function renderLogin(): HTMLElement {
  const email = h('input', { 
    class: 'w-full p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    type: 'email', 
    placeholder: 'Email',
    value: 'owner@turbovets.com'
  }) as HTMLInputElement;
  
  const pass = h('input', { 
    class: 'w-full p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    type: 'password', 
    placeholder: 'Password',
    value: 'password'
  }) as HTMLInputElement;
  
  const btn = h('button', { 
    class: 'w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors',
    onclick: () => login(email.value, pass.value) 
  }, 'Sign In');
  
  return h('div', { class: 'min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4' },
    h('div', { class: 'bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md' },
      h('div', { class: 'text-center mb-6' },
        h('h1', { class: 'text-2xl font-bold text-gray-900 dark:text-white mb-2' }, 'Task Manager'),
        h('p', { class: 'text-gray-600 dark:text-gray-400' }, 'Sign in to manage your tasks')
      ),
      h('div', { class: 'space-y-4' },
        h('div', null,
          h('label', { class: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1' }, 'Email'),
          email
        ),
        h('div', null,
          h('label', { class: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1' }, 'Password'),
          pass
        ),
        btn,
        h('div', { class: 'text-center text-sm text-gray-600 dark:text-gray-400 mt-4' },
          'Demo accounts: owner@turbovets.com / password'
        )
      )
    )
  );
}

function renderDashboard(): HTMLElement {
  const titleInp = h('input', {
    class: 'flex-1 p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    placeholder: 'Task title'
  }) as HTMLInputElement;
  
  const descInp = h('textarea', {
    class: 'w-full p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    placeholder: 'Description (optional)', 
    rows: 2
  }) as HTMLTextAreaElement;
  
  const catSel = h('select', {
    class: 'p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
  }, 
    h('option', {value: 'Work'}, 'Work'),
    h('option', {value: 'Personal'}, 'Personal'),
    h('option', {value: 'Other'}, 'Other')
  ) as HTMLSelectElement;
  
  const addBtn = h('button', {
    class: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors',
    onclick: () => {
      if (titleInp.value) {
        addTask(titleInp.value, catSel.value as Category, descInp.value);
        titleInp.value = '';
        descInp.value = '';
      }
    }
  }, 'Add Task');

  const themeBtn = h('button', {
    class: 'px-3 py-2 border border-gray-300 rounded text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
    onclick: () => setTheme(state.theme === 'light' ? 'dark' : 'light')
  }, state.theme === 'light' ? '🌙 Dark' : '☀️ Light');

  const auditBtn = h('button', {
    class: 'px-3 py-2 border border-gray-300 rounded text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
    onclick: loadAudit
  }, '📋 Audit Log');

  const logoutBtn = h('button', {
    class: 'px-3 py-2 border border-red-300 rounded text-red-700 dark:border-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900',
    onclick: logout
  }, '🚪 Logout');

  const header = h('div', {class: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6'},
    h('div', null, 
      h('h1', {class: 'text-2xl font-bold text-gray-900 dark:text-white mb-1'}, 'Task Dashboard'),
      h('p', {class: 'text-gray-600 dark:text-gray-400'}, 
        `Welcome, ${state.user?.email || 'User'} • ${state.user?.role || 'Unknown role'}`
      )
    ),
    h('div', {class: 'flex flex-wrap gap-2'}, themeBtn, auditBtn, logoutBtn)
  );

  const statusFilter = h('select', {
    class: 'p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    onchange: (e: Event) => { state.filter = (e.target as HTMLSelectElement).value as any; render(); }
  },
    h('option', {value: 'all'}, 'All Status'),
    h('option', {value: 'todo'}, 'Todo'),
    h('option', {value: 'in_progress'}, 'In Progress'),
    h('option', {value: 'done'}, 'Done')
  ) as HTMLSelectElement;
  statusFilter.value = state.filter;

  const categoryFilter = h('select', {
    class: 'p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    onchange: (e: Event) => { state.categoryFilter = (e.target as HTMLSelectElement).value as any; render(); }
  },
    h('option', {value: 'all'}, 'All Categories'),
    h('option', {value: 'Work'}, 'Work'),
    h('option', {value: 'Personal'}, 'Personal'),
    h('option', {value: 'Other'}, 'Other')
  ) as HTMLSelectElement;
  categoryFilter.value = state.categoryFilter;

  const sortBy = h('select', {
    class: 'p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    onchange: (e: Event) => { state.sortBy = (e.target as HTMLSelectElement).value as any; render(); }
  },
    h('option', {value: 'order'}, 'Sort by Order'),
    h('option', {value: 'title'}, 'Sort by Title'),
    h('option', {value: 'category'}, 'Sort by Category'),
    h('option', {value: 'status'}, 'Sort by Status')
  ) as HTMLSelectElement;
  sortBy.value = state.sortBy;

  const filteredTasks = applyFiltersAndSort();

  const columns = [
    { status: 'todo' as Status, title: 'To Do', color: 'bg-red-100 dark:bg-red-900/20', border: 'border-red-200' },
    { status: 'in_progress' as Status, title: 'In Progress', color: 'bg-yellow-100 dark:bg-yellow-900/20', border: 'border-yellow-200' },
    { status: 'done' as Status, title: 'Done', color: 'bg-green-100 dark:bg-green-900/20', border: 'border-green-200' }
  ];

  const taskColumns = columns.map(col => {
    const tasksInColumn = filteredTasks.filter(t => t.status === col.status);
    
    return h('div', {
      class: `flex-1 rounded-lg p-4 ${col.color} border ${col.border} dark:border-gray-700`,
      ondrop: (e: DragEvent) => drop(e, col.status),
      ondragover: allowDrop
    },
      h('h3', {class: 'font-semibold mb-3 text-center'}, `${col.title} (${tasksInColumn.length})`),
      h('div', {class: 'space-y-2 min-h-40'},
        ...tasksInColumn.map(task => 
          h('div', {
            class: 'bg-white dark:bg-gray-800 rounded-lg p-3 shadow border border-gray-200 dark:border-gray-700 cursor-grab',
            draggable: true,
            ondragstart: (e: DragEvent) => startDrag(e, task)
          },
            h('div', {class: 'flex justify-between items-start mb-2'},
              h('div', {class: 'font-medium text-gray-900 dark:text-white'}, task.title),
              h('div', {class: 'flex space-x-1'},
                h('button', {
                  class: 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200',
                  onclick: () => openEditModal(task)
                }, '✏️'),
                h('button', {
                  class: 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200',
                  onclick: () => deleteTask(task.id)
                }, '🗑️')
              )
            ),
            task.description && h('p', {class: 'text-sm text-gray-600 dark:text-gray-400 mb-2'}, task.description),
            h('div', {class: 'flex justify-between items-center text-xs'},
              h('span', {class: 'px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700'}, task.category || 'Other'),
              h('div', {class: 'flex space-x-1'},
                task.status !== 'todo' && h('button', {
                  class: 'text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
                  onclick: () => updateTask(task.id, {status: 'todo'})
                }, '◀️'),
                task.status !== 'done' && h('button', {
                  class: 'text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/50',
                  onclick: () => updateTask(task.id, {status: 'done'})
                }, '▶️')
              )
            )
          )
        )
      )
    );
  });

  const tools = h('div', {class: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'},
    h('div', null,
      h('label', {class: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'}, 'Status Filter'),
      statusFilter
    ),
    h('div', null,
      h('label', {class: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'}, 'Category Filter'),
      categoryFilter
    ),
    h('div', null,
      h('label', {class: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'}, 'Sort By'),
      sortBy
    )
  );

  const createForm = h('div', {class: 'bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4'},
    h('h3', {class: 'font-semibold mb-3 text-gray-900 dark:text-white'}, 'Create New Task'),
    h('div', {class: 'flex flex-col sm:flex-row gap-2 mb-2'},
      titleInp,
      catSel,
      addBtn
    ),
    descInp
  );

  let editModal = null;
  if (state.editingTask) {
    const titleEdit = h('input', {
      class: 'w-full p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
      value: state.editingTask.title,
      oninput: (e: Event) => state.editingTask!.title = (e.target as HTMLInputElement).value
    }) as HTMLInputElement;
    
    const descEdit = h('textarea', {
      class: 'w-full p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
      rows: 3,
      value: state.editingTask.description || '',
      oninput: (e: Event) => state.editingTask!.description = (e.target as HTMLTextAreaElement).value
    }) as HTMLTextAreaElement;
    
    const catEdit = h('select', {
      class: 'w-full p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
      value: state.editingTask.category || 'Work',
      onchange: (e: Event) => state.editingTask!.category = (e.target as HTMLSelectElement).value as Category
    },
      h('option', {value: 'Work'}, 'Work'),
      h('option', {value: 'Personal'}, 'Personal'),
      h('option', {value: 'Other'}, 'Other')
    ) as HTMLSelectElement;
    
    const statusEdit = h('select', {
      class: 'w-full p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
      value: state.editingTask.status,
      onchange: (e: Event) => state.editingTask!.status = (e.target as HTMLSelectElement).value as Status
    },
      h('option', {value: 'todo'}, 'To Do'),
      h('option', {value: 'in_progress'}, 'In Progress'),
      h('option', {value: 'done'}, 'Done')
    ) as HTMLSelectElement;
    
    editModal = h('div', {class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50', onclick: closeEditModal},
      h('div', {class: 'bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full', onclick: (e: Event) => e.stopPropagation()},
        h('div', {class: 'flex justify-between items-center mb-4'},
          h('h2', {class: 'text-lg font-semibold text-gray-900 dark:text-white'}, 'Edit Task'),
          h('button', {onclick: closeEditModal, class: 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}, '✕')
        ),
        h('div', {class: 'space-y-4'},
          h('div', null,
            h('label', {class: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'}, 'Title'),
            titleEdit
          ),
          h('div', null,
            h('label', {class: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'}, 'Description'),
            descEdit
          ),
          h('div', {class: 'grid grid-cols-2 gap-4'},
            h('div', null,
              h('label', {class: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'}, 'Category'),
              catEdit
            ),
            h('div', null,
              h('label', {class: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'}, 'Status'),
              statusEdit
            )
          ),
          h('div', {class: 'flex gap-3 pt-4'},
            h('button', {
              class: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors',
              onclick: saveEditedTask
            }, 'Save'),
            h('button', {
              class: 'px-4 py-2 border border-gray-300 rounded text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
              onclick: closeEditModal
            }, 'Cancel')
          )
        )
      )
    );
  }

  return h('div', {class: 'min-h-screen bg-gray-100 dark:bg-gray-900 p-4'},
    h('div', {class: 'max-w-7xl mx-auto space-y-6'},
      h('div', {class: 'bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6'}, header),
      h('div', {class: 'bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6'}, tools),
      h('div', {class: 'bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6'}, createForm),
      h('div', {class: 'grid grid-cols-1 md:grid-cols-3 gap-6'}, ...taskColumns)
    ),
    editModal
  );
}

function render(): void {
  const root = document.querySelector('app-root');
  if (!root) return;
  
  const content = state.token ? renderDashboard() : renderLogin();
  (root as HTMLElement).replaceChildren(content);
}

// Add Tailwind CSS
const link = document.createElement('link');
link.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
link.rel = 'stylesheet';
document.head.appendChild(link);

// Add custom styles for drag and drop
const style = document.createElement('style');
style.textContent = `
  .cdk-drag-preview {
    opacity: 0.8;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    transform: rotate(5deg);
  }

  .cdk-drag-placeholder {
    opacity: 0.3;
  }

  .cdk-drag-animating {
    transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
  }

  .cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder) {
    transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
  }
`;
document.head.appendChild(style);

// boot
setTheme(state.theme);
if (state.token) {
  loadTasks().then(render).catch(() => render());
} else {
  render();
}