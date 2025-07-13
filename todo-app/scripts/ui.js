// UI functions for the Todo List App

let onToggleComplete, onDelete, onEdit, onReorder;

export function setHandlers({ handleToggleComplete, handleDelete, handleEdit, handleReorder }) {
  onToggleComplete = handleToggleComplete;
  onDelete = handleDelete;
  onEdit = handleEdit;
  onReorder = handleReorder;
}

export function renderTodos(todos, searchQuery = '') {
  const list = document.getElementById('todo-list');
  if (!list) return;
  list.innerHTML = '';
  let dragSrcIdx = null;
  todos.forEach((todo, idx) => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' completed' : '');
    li.dataset.id = todo.id;
    li.draggable = true;
    li.setAttribute('aria-grabbed', 'false');

    // Drag events
    li.addEventListener('dragstart', (e) => {
      dragSrcIdx = idx;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      dragSrcIdx = null;
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      li.classList.add('drag-over');
    });
    li.addEventListener('dragleave', () => {
      li.classList.remove('drag-over');
    });
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.classList.remove('drag-over');
      if (onReorder && dragSrcIdx !== null && dragSrcIdx !== idx) {
        onReorder(dragSrcIdx, idx);
      }
    });

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.addEventListener('change', () => onToggleComplete(todo.id));

    // Category indicator
    const categorySpan = document.createElement('span');
    categorySpan.className = 'category-indicator category-' + (todo.category || 'general').toLowerCase();
    categorySpan.title = todo.category || 'General';
    categorySpan.textContent = todo.category ? todo.category.charAt(0).toUpperCase() : 'G';

    // Text (editable) with search highlighting
    const textSpan = document.createElement('span');
    textSpan.className = 'todo-text';
    if (searchQuery && searchQuery.trim()) {
      const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = todo.text.split(regex);
      textSpan.innerHTML = '';
      parts.forEach((part, index) => {
        if (index % 2 === 1) {
          // This is a match
          const mark = document.createElement('mark');
          mark.className = 'search-highlight';
          mark.textContent = part;
          textSpan.appendChild(mark);
        } else {
          // This is not a match
          textSpan.appendChild(document.createTextNode(part));
        }
      });
    } else {
      textSpan.textContent = todo.text;
    }
    textSpan.contentEditable = true;
    textSpan.spellcheck = false;
    textSpan.addEventListener('blur', (e) => onEdit(todo.id, e.target.textContent));
    textSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        textSpan.blur();
      }
    });

    // Due date
    if (todo.dueDate) {
      const dueSpan = document.createElement('span');
      dueSpan.className = 'todo-due-date';
      const d = new Date(todo.dueDate);
      dueSpan.textContent = ' ' + d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      // Overdue indicator
      const now = new Date();
      if (!todo.completed && new Date(todo.dueDate) < now) {
        dueSpan.classList.add('overdue');
        dueSpan.title = 'Overdue!';
      }
      li.appendChild(dueSpan);
    }

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    const delIcon = document.createElement('img');
    delIcon.src = 'assets/icons/trash-can.png';
    delIcon.alt = 'Delete';
    delIcon.width = 24;
    delIcon.height = 24;
    delBtn.appendChild(delIcon);
    delBtn.title = 'Delete task';
    delBtn.setAttribute('aria-label', 'Delete task');
    delBtn.addEventListener('click', () => onDelete(todo.id));

    li.appendChild(categorySpan);
    li.appendChild(textSpan);
    li.appendChild(checkbox);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

export function renderCounts(todos) {
  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const remaining = total - completed;
  const counts = document.getElementById('todo-counts');
  if (counts) {
    counts.textContent = `Total: ${total} | Completed: ${completed} | Remaining: ${remaining}`;
  }
  // Progress bar
  const bar = document.getElementById('progress-bar');
  const stats = document.getElementById('progress-stats');
  if (bar && stats) {
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    bar.style.position = 'relative';
    bar.innerHTML = '';
    const fill = document.createElement('div');
    fill.style.width = percent + '%';
    fill.style.height = '100%';
    fill.style.background = 'var(--primary-color)';
    fill.style.borderRadius = '4px';
    fill.style.transition = 'width var(--transition)';
    bar.appendChild(fill);
    stats.textContent = `${percent}% complete`;
  }
}

export function setupAddTodoInput(onAdd) {
  const input = document.getElementById('new-todo-input');
  const form = document.getElementById('new-todo-form');
  if (form && input) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input.value.trim();
      if (value) {
        onAdd(value);
        input.value = '';
      }
    });
  }
}
