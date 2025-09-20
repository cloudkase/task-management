/** @typedef {{id:number,title:string,description?:string,status:'todo'|'in_progress'|'done',category?:'Work'|'Personal'|'Other',order:number}} Task */

const apiBase = 'http://localhost:3333';
const state = {
  token: localStorage.getItem('jwt') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  tasks: /** @type {Task[]} */ ([]),
  filter: 'all',
  categoryFilter: 'all',
  sortBy: 'order',
  editingTask: null,
  theme: localStorage.getItem('theme') || 'dark'
};

function setTheme(theme){
  state.theme = theme;
  localStorage.setItem('theme', theme);
  
  // Update the HTML class for dark mode
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // Re-render to apply theme changes
  render();
}

async function api(path, init){
  const headers = Object.assign({'Content-Type': 'application/json'}, (state.token ? {Authorization: 'Bearer ' + state.token} : {}));
  const res = await fetch(apiBase + path, Object.assign({headers}, init || {}));
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function login(email, password){
  const res = await fetch(apiBase + '/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password})
  });
  if (!res.ok) { alert('Login failed'); return; }
  const data = await res.json();
  state.token = data.access_token;
  state.user = data.user;
  localStorage.setItem('jwt', state.token);
  localStorage.setItem('user', JSON.stringify(state.user));
  await loadTasks();
  render();
}

async function loadTasks(){
  if (!state.token) return;
  const res = await api('/tasks');
  state.tasks = res;
  applyFiltersAndSort();
}

async function addTask(title, category, description = ''){
  await api('/tasks', {
    method: 'POST', 
    body: JSON.stringify({title, category, description})
  });
  await loadTasks();
  render();
}

async function updateTask(id, fields){
  await api('/tasks/' + id, {method: 'PUT', body: JSON.stringify(fields)});
  await loadTasks();
  render();
}

async function deleteTask(id){
  await api('/tasks/' + id, {method: 'DELETE'});
  await loadTasks();
  render();
}

async function loadAudit(){
  const res = await api('/audit-log');
  if (res && Array.isArray(res.entries)) alert(res.entries.join('\n'));
  else alert(JSON.stringify(res, null, 2));
}

function logout(){
  state.token = '';
  state.user = null;
  localStorage.removeItem('jwt');
  localStorage.removeItem('user');
  render();
}

function applyFiltersAndSort() {
  let filteredTasks = [...state.tasks];
  
  // Apply status filter
  if (state.filter !== 'all') {
    filteredTasks = filteredTasks.filter(task => task.status === state.filter);
  }
  
  // Apply category filter
  if (state.categoryFilter !== 'all') {
    filteredTasks = filteredTasks.filter(task => task.category === state.categoryFilter);
  }
  
  // Apply sorting
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
    default: // order
      filteredTasks.sort((a, b) => a.order - b.order);
  }
  
  return filteredTasks;
}

function startDrag(event, task) {
  event.dataTransfer.setData('text/plain', task.id.toString());
  event.dataTransfer.effectAllowed = 'move';
}

function allowDrop(event) {
  event.preventDefault();
}

async function drop(event, targetStatus) {
  event.preventDefault();
  const taskId = parseInt(event.dataTransfer.getData('text/plain'));
  const task = state.tasks.find(t => t.id === taskId);
  
  if (task && task.status !== targetStatus) {
    await updateTask(taskId, { status: targetStatus });
  }
}

function openEditModal(task) {
  state.editingTask = {...task};
  render();
}

function closeEditModal() {
  state.editingTask = null;
  render();
}

function saveEditedTask() {
  if (!state.editingTask) return;
  
  const { id, title, description, category, status } = state.editingTask;
  updateTask(id, { title, description, category, status });
  closeEditModal();
}

function h(tag, attrs, ...children){
  const el = document.createElement(tag);
  attrs = attrs || {};
  for (const k in attrs){
    if (k === 'class') el.className = attrs[k];
    else if (k.startsWith('on') && typeof attrs[k] === 'function') el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
    else el.setAttribute(k, attrs[k]);
  }
  for (const c of children.flat()){
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

function renderLogin(){
  const email = h('input', {
    class: 'w-full p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    type: 'email', 
    placeholder: 'Email',
    value: 'owner@turbovets.com'
  });
  
  const pass = h('input', {
    class: 'w-full p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    type: 'password', 
    placeholder: 'Password',
    value: 'password'
  });
  
  const btn = h('button', {
    class: 'w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors',
    onclick: () => login(email.value, pass.value)
  }, 'Sign In');
  
  return h('div', {class: 'min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4'},
    h('div', {class: 'bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md'},
      h('div', {class: 'text-center mb-6'},
        h('h1', {class: 'text-2xl font-bold text-gray-900 dark:text-white mb-2'}, 'Task Manager'),
        h('p', {class: 'text-gray-600 dark:text-gray-400'}, 'Sign in to manage your tasks')
      ),
      h('div', {class: 'space-y-4'},
        h('div', null,
          h('label', {class: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'}, 'Email'),
          email
        ),
        h('div', null,
          h('label', {class: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'}, 'Password'),
          pass
        ),
        btn,
        h('div', {class: 'text-center text-sm text-gray-600 dark:text-gray-400 mt-4'},
          'Demo accounts: owner@turbovets.com / password'
        )
      )
    )
  );
}

function renderDashboard(){
  const titleInp = h('input', {
    class: 'flex-1 p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    placeholder: 'Task title'
  });
  
  const descInp = h('textarea', {
    class: 'w-full p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    placeholder: 'Description (optional)', 
    rows: 2
  });
  
  const catSel = h('select', {
    class: 'p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
  }, 
    h('option', {value: 'Work'}, 'Work'),
    h('option', {value: 'Personal'}, 'Personal'),
    h('option', {value: 'Other'}, 'Other')
  );
  
  const addBtn = h('button', {
    class: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors',
    onclick: () => {
      if (titleInp.value) {
        addTask(titleInp.value, catSel.value, descInp.value);
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

  // Filters and sorting
  const statusFilter = h('select', {
    class: 'p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    onchange: (e) => { state.filter = e.target.value; render(); }
  },
    h('option', {value: 'all'}, 'All Status'),
    h('option', {value: 'todo'}, 'Todo'),
    h('option', {value: 'in_progress'}, 'In Progress'),
    h('option', {value: 'done'}, 'Done')
  );
  statusFilter.value = state.filter;

  const categoryFilter = h('select', {
    class: 'p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    onchange: (e) => { state.categoryFilter = e.target.value; render(); }
  },
    h('option', {value: 'all'}, 'All Categories'),
    h('option', {value: 'Work'}, 'Work'),
    h('option', {value: 'Personal'}, 'Personal'),
    h('option', {value: 'Other'}, 'Other')
  );
  categoryFilter.value = state.categoryFilter;

  const sortBy = h('select', {
    class: 'p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
    onchange: (e) => { state.sortBy = e.target.value; render(); }
  },
    h('option', {value: 'order'}, 'Sort by Order'),
    h('option', {value: 'title'}, 'Sort by Title'),
    h('option', {value: 'category'}, 'Sort by Category'),
    h('option', {value: 'status'}, 'Sort by Status')
  );
  sortBy.value = state.sortBy;

  const filteredTasks = applyFiltersAndSort();

  // Task columns with drag and drop
  const columns = [
    { status: 'todo', title: 'To Do', color: 'bg-red-100 dark:bg-red-900/20', border: 'border-red-200' },
    { status: 'in_progress', title: 'In Progress', color: 'bg-yellow-100 dark:bg-yellow-900/20', border: 'border-yellow-200' },
    { status: 'done', title: 'Done', color: 'bg-green-100 dark:bg-green-900/20', border: 'border-green-200' }
  ];

  const taskColumns = columns.map(col => {
    const tasksInColumn = filteredTasks.filter(t => t.status === col.status);
    
    return h('div', {
      class: `flex-1 rounded-lg p-4 ${col.color} border ${col.border} dark:border-gray-700`,
      ondrop: (e) => drop(e, col.status),
      ondragover: allowDrop
    },
      h('h3', {class: 'font-semibold mb-3 text-center'}, `${col.title} (${tasksInColumn.length})`),
      h('div', {class: 'space-y-2 min-h-40'},
        ...tasksInColumn.map(task => 
          h('div', {
            class: 'bg-white dark:bg-gray-800 rounded-lg p-3 shadow border border-gray-200 dark:border-gray-700 cursor-grab',
            draggable: true,
            ondragstart: (e) => startDrag(e, task)
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

  // Edit modal
  let editModal = null;
  if (state.editingTask) {
    const titleEdit = h('input', {
      class: 'w-full p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
      value: state.editingTask.title,
      oninput: (e) => state.editingTask.title = e.target.value
    });
    
    const descEdit = h('textarea', {
      class: 'w-full p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
      rows: 3,
      value: state.editingTask.description || '',
      oninput: (e) => state.editingTask.description = e.target.value
    });
    
    const catEdit = h('select', {
      class: 'w-full p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
      value: state.editingTask.category || 'Work',
      onchange: (e) => state.editingTask.category = e.target.value
    },
      h('option', {value: 'Work'}, 'Work'),
      h('option', {value: 'Personal'}, 'Personal'),
      h('option', {value: 'Other'}, 'Other')
    );
    
    const statusEdit = h('select', {
      class: 'w-full p-2 border border-gray-300 rounded bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white',
      value: state.editingTask.status,
      onchange: (e) => state.editingTask.status = e.target.value
    },
      h('option', {value: 'todo'}, 'To Do'),
      h('option', {value: 'in_progress'}, 'In Progress'),
      h('option', {value: 'done'}, 'Done')
    );
    
    editModal = h('div', {class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50', onclick: closeEditModal},
      h('div', {class: 'bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full', onclick: (e) => e.stopPropagation()},
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

function render(){
  const root = document.querySelector('app-root');
  if (!root) return;
  root.replaceChildren(state.token ? renderDashboard() : renderLogin());
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