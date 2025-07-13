// Main app logic
import { createTodo, soundManager } from './utils.js';
import { saveTodos, loadTodos } from './storage.js';
import { renderTodos, renderCounts, setupAddTodoInput, setHandlers } from './ui.js';

const DEFAULT_CATEGORIES = [
  { name: 'Work', color: '#4f8cff' },
  { name: 'Personal', color: '#ffb347' },
  { name: 'School', color: '#6edb8f' },
  { name: 'Shopping', color: '#e57373' },
  { name: 'General', color: '#888' },
];
const CATEGORY_KEY = 'todo-list-categories';

function saveCategories(categories) {
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
}
function loadCategories() {
  const data = localStorage.getItem(CATEGORY_KEY);
  if (!data) return [...DEFAULT_CATEGORIES];
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) return parsed;
    return [...DEFAULT_CATEGORIES];
  } catch {
    return [...DEFAULT_CATEGORIES];
  }
}

function updateCategoryDropdown(categories) {
  const select = document.getElementById('category-select');
  if (!select) return;
  // Save current value
  const current = select.value;
  select.innerHTML = '';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.name;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });
  // Restore value if possible
  if ([...select.options].some(o => o.value === current)) {
    select.value = current;
  }
}

function showCategoryModal() {
  document.getElementById('category-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function hideCategoryModal() {
  document.getElementById('category-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function renderCategoryList(categories, onEdit, onDelete) {
  const list = document.getElementById('category-list');
  if (!list) return;
  list.innerHTML = '';
  categories.forEach((cat, idx) => {
    const li = document.createElement('li');
    li.className = 'category-list-item';
    // Swatch
    const swatch = document.createElement('span');
    swatch.className = 'category-swatch';
    swatch.style.background = cat.color;
    li.appendChild(swatch);
    // Name (editable)
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = cat.name;
    nameInput.disabled = idx < DEFAULT_CATEGORIES.length; // Prevent editing default cats
    li.appendChild(nameInput);
    // Color picker
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = cat.color;
    colorInput.disabled = idx < DEFAULT_CATEGORIES.length;
    li.appendChild(colorInput);
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.innerHTML = '✏️';
    editBtn.title = 'Edit';
    editBtn.disabled = idx < DEFAULT_CATEGORIES.length;
    editBtn.onclick = () => {
      if (nameInput.value.trim() && colorInput.value) {
        onEdit(idx, nameInput.value.trim(), colorInput.value);
      }
    };
    li.appendChild(editBtn);
    // Delete button
    const delBtn = document.createElement('button');
    delBtn.innerHTML = '🗑️';
    delBtn.title = 'Delete';
    delBtn.disabled = idx < DEFAULT_CATEGORIES.length;
    delBtn.onclick = () => onDelete(idx);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

// Shortcut help modal logic
function showShortcutModal() {
  let modal = document.getElementById('shortcut-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'shortcut-modal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Keyboard Shortcuts</h2>
        <ul>
          <li><b>Ctrl/Cmd + N</b>: New task</li>
          <li><b>Enter</b>: Save task</li>
          <li><b>Escape</b>: Cancel editing / Close modals</li>
          <li><b>Ctrl/Cmd + F</b>: Focus search</li>
        </ul>
        <h3>Data Management</h3>
        <ul>
          <li><b>Export</b>: Click the download icon to backup your data</li>
          <li><b>Import</b>: Click the upload icon to restore from backup</li>
        </ul>
        <button id="close-shortcut-modal" type="button">Close</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('close-shortcut-modal').onclick = hideShortcutModal;
  } else {
    modal.style.display = 'flex';
  }
  document.body.style.overflow = 'hidden';
}
function hideShortcutModal() {
  const modal = document.getElementById('shortcut-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

// Dark mode logic
function toggleDarkMode() {
  document.body.classList.toggle('dark');
  localStorage.setItem('todo-list-dark', document.body.classList.contains('dark') ? '1' : '');
}
function loadDarkMode() {
  if (localStorage.getItem('todo-list-dark') === '1') {
    document.body.classList.add('dark');
  }
}

// Notification logic
let notifiedTaskIds = new Set();
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
function notifyDueTasks(todos) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  todos.forEach(todo => {
    if (
      todo.dueDate &&
      !todo.completed &&
      new Date(todo.dueDate) <= now &&
      !notifiedTaskIds.has(todo.id)
    ) {
      new Notification('Task Due', {
        body: `${todo.text} (Due: ${formatDueDateTime(todo.dueDate)})`,
        icon: '/assets/icons/night-mode.png',
      });
      notifiedTaskIds.add(todo.id);
    }
  });
}

// Helper for formatting due date/time
function formatDueDateTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATS_KEY = 'todo-list-stats';

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function loadStats() {
  const data = localStorage.getItem(STATS_KEY);
  if (!data) return { daily: {}, weekly: {}, streak: 0, lastCompleted: null };
  try {
    return JSON.parse(data);
  } catch {
    return { daily: {}, weekly: {}, streak: 0, lastCompleted: null };
  }
}

function updateStats(todos) {
  const stats = loadStats();
  const today = new Date().toISOString().slice(0, 10);
  const thisWeek = getWeekKey(new Date());
  
  // Count completed tasks today and this week
  const completedToday = todos.filter(t => 
    t.completed && t.updatedAt && 
    new Date(t.updatedAt).toISOString().slice(0, 10) === today
  ).length;
  
  const completedThisWeek = todos.filter(t => 
    t.completed && t.updatedAt && 
    getWeekKey(new Date(t.updatedAt)) === thisWeek
  ).length;
  
  // Update daily stats (only if there are new completions today)
  if (completedToday > 0) {
    stats.daily[today] = completedToday;
  }
  
  // Update weekly stats
  stats.weekly[thisWeek] = completedThisWeek;
  
  // Update streak (only if there are new completions today)
  if (completedToday > 0) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    
    if (stats.lastCompleted === yesterdayKey) {
      stats.streak++;
    } else if (stats.lastCompleted !== today) {
      stats.streak = 1;
    }
    stats.lastCompleted = today;
  }
  
  saveStats(stats);
  return stats;
}

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function renderStats(stats) {
  const statsContainer = document.getElementById('stats-container');
  if (!statsContainer) return;
  
  const today = new Date().toISOString().slice(0, 10);
  const thisWeek = getWeekKey(new Date());
  
  const todayCount = stats.daily[today] || 0;
  const weekCount = stats.weekly[thisWeek] || 0;
  
  statsContainer.innerHTML = `
    <div class="stats-item">
      <span class="stats-label">Today:</span>
      <span class="stats-value">${todayCount} tasks</span>
    </div>
    <div class="stats-item">
      <span class="stats-label">This Week:</span>
      <span class="stats-value">${weekCount} tasks</span>
    </div>
    <div class="stats-item">
      <span class="stats-label">Streak:</span>
      <span class="stats-value">${stats.streak} days</span>
    </div>
  `;
}


// Remove DOMContentLoaded wrapper and move all code inside to top-level
let todos = loadTodos();
let categories = loadCategories();
let searchQuery = '';
let selectedCategory = 'All';
let isSortedByDue = false;
let originalOrder = [];
let lastStatsUpdate = null;

function getFilteredTodos() {
  let filtered = todos;
  
  // Apply status filter (all/active/completed)
  if (currentFilter === 'active') {
    filtered = filtered.filter(todo => !todo.completed);
  } else if (currentFilter === 'completed') {
    filtered = filtered.filter(todo => todo.completed);
  }
  // 'all' filter shows all tasks
  
  // Apply category filter
  if (selectedCategory && selectedCategory !== 'All') {
    filtered = filtered.filter(todo => todo.category === selectedCategory);
  }
  
  // Apply search filter
  if (searchQuery) {
    filtered = filtered.filter(todo =>
      todo.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  return filtered;
}

function sortByDueDate() {
  if (!isSortedByDue) {
    // Save original order
    originalOrder = [...todos];
    // Sort by due date (earliest first, no due date last)
    todos.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
    isSortedByDue = true;
  } else {
    // Restore original order
    todos = [...originalOrder];
    isSortedByDue = false;
  }
  update();
}

// Throttle update function for better performance
let updateTimeout;
function update() {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    renderTodos(getFilteredTodos(), searchQuery);
    renderCounts(getFilteredTodos());
    saveTodos(todos);
    checkDueTasks();
  }, 50); // Small delay to batch rapid updates
}

function updateStatsOnCompletion() {
  const stats = updateStats(todos);
  renderStats(stats);
}

function addTodo(text) {
  // Input validation
  const trimmedText = text.trim();
  if (!trimmedText) {
    soundManager.playError();
    showNotification('Task text cannot be empty', 'error');
    return;
  }
  if (trimmedText.length > 500) {
    soundManager.playError();
    showNotification('Task text is too long (max 500 characters)', 'error');
    return;
  }
  
  const category = categorySelect ? categorySelect.value : 'General';
  const dueInput = document.getElementById('new-todo-due');
  const dueDate = dueInput && dueInput.value ? dueInput.value : null;
  
  // Validate due date
  if (dueDate && new Date(dueDate) < new Date()) {
    soundManager.playError();
    showNotification('Due date cannot be in the past', 'error');
    return;
  }
  
  todos.push(createTodo({ text: trimmedText, category, dueDate }));
  if (dueInput) dueInput.value = '';
  // Reset sort state when adding new task
  isSortedByDue = false;
  update();
  soundManager.playSuccess();
  showNotification('Task added successfully', 'success');
}

function toggleComplete(id) {
  const wasCompleted = todos.find(t => t.id === id)?.completed;
  todos = todos.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed, updatedAt: Date.now() } : todo
  );
  soundManager.playToggle();
  update();
  // Only update stats if a task was actually completed (not uncompleted)
  if (!wasCompleted) {
    updateStatsOnCompletion();
  }
}

function deleteTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  
  // Show confirmation dialog
  const confirmed = confirm(`Are you sure you want to delete "${todo.text}"?`);
  if (confirmed) {
    todos = todos.filter(todo => todo.id !== id);
    soundManager.playDelete();
    update();
    showNotification('Task deleted successfully', 'success');
  }
}

function editTodo(id, newText) {
  const trimmedText = newText.trim();
  if (!trimmedText) {
    soundManager.playError();
    showNotification('Task text cannot be empty', 'error');
    return;
  }
  if (trimmedText.length > 500) {
    soundManager.playError();
    showNotification('Task text is too long (max 500 characters)', 'error');
    return;
  }
  
  todos = todos.map(todo =>
    todo.id === id ? { ...todo, text: trimmedText, updatedAt: Date.now() } : todo
  );
  soundManager.playClick();
  update();
}

function handleReorder(fromIdx, toIdx) {
  if (fromIdx === toIdx) return;
  const moved = todos.splice(fromIdx, 1)[0];
  todos.splice(toIdx, 0, moved);
  // Reset sort state when manually reordering
  isSortedByDue = false;
  update();
}

setHandlers({
  handleToggleComplete: toggleComplete,
  handleDelete: deleteTodo,
  handleEdit: editTodo,
  handleReorder: handleReorder,
});

setupAddTodoInput(addTodo);

// Cache DOM elements for better performance
const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');
const sortBtn = document.getElementById('sort-by-due');
const clearFiltersBtn = document.getElementById('clear-filters');
const filterAllBtn = document.getElementById('filter-all');
const filterActiveBtn = document.getElementById('filter-active');
const filterCompletedBtn = document.getElementById('filter-completed');
const manageBtn = document.getElementById('manage-categories');
const closeModalBtn = document.getElementById('close-category-modal');
const addCatForm = document.getElementById('add-category-form');
const themeBtn = document.getElementById('theme-toggle');
const soundBtn = document.getElementById('sound-toggle');
const shortcutBtn = document.getElementById('shortcut-help');
const burgerBtn = document.getElementById('burger-menu-btn');
const burgerMenu = document.getElementById('burger-menu-actions');

if (burgerBtn && burgerMenu) {
  function openMenu() {
    burgerMenu.classList.add('open');
    burgerMenu.setAttribute('aria-hidden', 'false');
    burgerBtn.setAttribute('aria-expanded', 'true');
    // Focus first button in menu for accessibility
    const firstBtn = burgerMenu.querySelector('button');
    if (firstBtn) firstBtn.focus();
  }
  function closeMenu() {
    burgerMenu.classList.remove('open');
    burgerMenu.setAttribute('aria-hidden', 'true');
    burgerBtn.setAttribute('aria-expanded', 'false');
    burgerBtn.focus();
  }
  function toggleMenu() {
    if (burgerMenu.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  }
  burgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });
  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (burgerMenu.classList.contains('open') && !burgerMenu.contains(e.target) && e.target !== burgerBtn) {
      closeMenu();
    }
  });
  // Close menu on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burgerMenu.classList.contains('open')) {
      closeMenu();
    }
  });
}

// Search input event listener with debouncing
if (searchInput) {
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value;
      update();
    }, 150); // Debounce search for better performance
  });
}

// Category filter event listener
if (categorySelect) {
  // Add 'All' option if not present
  if (![...categorySelect.options].some(o => o.value === 'All')) {
    const allOpt = document.createElement('option');
    allOpt.value = 'All';
    allOpt.textContent = 'All';
    categorySelect.insertBefore(allOpt, categorySelect.firstChild);
  }
  categorySelect.value = 'All';
  categorySelect.addEventListener('change', (e) => {
    selectedCategory = e.target.value;
    update();
  });
}



// Sort by due date
if (sortBtn) {
  sortBtn.addEventListener('click', () => {
    soundManager.playClick();
    sortByDueDate();
  });
}

// Clear filters functionality
function clearAllFilters() {
  // Clear search
  searchQuery = '';
  if (searchInput) {
    searchInput.value = '';
  }
  
  // Reset category filter
  selectedCategory = 'All';
  if (categorySelect) {
    categorySelect.value = 'All';
  }
  
  // Reset status filter
  currentFilter = 'all';
  
  // Reset sort
  if (isSortedByDue) {
    todos = [...originalOrder];
    isSortedByDue = false;
  }
  
  // Reset filter buttons
  const filterButtons = document.querySelectorAll('#filter-controls button');
  filterButtons.forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Set "All" as active
  if (filterAllBtn) {
    filterAllBtn.classList.add('active');
  }
  
  update();
  showNotification('All filters cleared', 'info');
}

if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener('click', () => {
    soundManager.playClick();
    clearAllFilters();
  });
}

// Filter button functionality
let currentFilter = 'all';
  
function setFilter(filter) {
  currentFilter = filter;
  
  // Update button states
  const filterButtons = document.querySelectorAll('#filter-controls button');
  filterButtons.forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.getElementById(`filter-${filter}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
  
  update();
}

// Filter button event listeners
if (filterAllBtn) filterAllBtn.addEventListener('click', () => {
  soundManager.playClick();
  setFilter('all');
});
if (filterActiveBtn) filterActiveBtn.addEventListener('click', () => {
  soundManager.playClick();
  setFilter('active');
});
if (filterCompletedBtn) filterCompletedBtn.addEventListener('click', () => {
  soundManager.playClick();
  setFilter('completed');
});
  
// Set initial filter
setFilter('all');

// Category modal logic
if (manageBtn) manageBtn.onclick = () => {
  soundManager.playClick();
  showCategoryModal();
};
if (closeModalBtn) closeModalBtn.onclick = () => {
  soundManager.playClick();
  hideCategoryModal();
};
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideCategoryModal();
});

function refreshCategoriesUI() {
  updateCategoryDropdown(categories);
  // Ensure 'All' is always present in dropdown
  const select = document.getElementById('category-select');
  if (select && ![...select.options].some(o => o.value === 'All')) {
    const allOpt = document.createElement('option');
    allOpt.value = 'All';
    allOpt.textContent = 'All';
    select.insertBefore(allOpt, select.firstChild);
  }
  renderCategoryList(
    categories,
    (idx, newName, newColor) => {
      categories[idx] = { ...categories[idx], name: newName, color: newColor };
      saveCategories(categories);
      refreshCategoriesUI();
    },
    (idx) => {
      categories.splice(idx, 1);
      saveCategories(categories);
      refreshCategoriesUI();
    }
  );
}

// Add new category
if (addCatForm) {
  addCatForm.onsubmit = (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-category-name');
    const colorInput = document.getElementById('new-category-color');
    const name = nameInput.value.trim();
    const color = colorInput.value;
    if (name && color && !categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      categories.push({ name, color });
      saveCategories(categories);
      nameInput.value = '';
      colorInput.value = '#888888';
      refreshCategoriesUI();
    }
  };
}

// Initial UI setup
refreshCategoriesUI();
update();
// Initialize stats
renderStats(loadStats());

// Dark mode
loadDarkMode();
if (themeBtn) themeBtn.onclick = () => {
  soundManager.playClick();
  toggleDarkMode();
};

// Sound toggle
if (soundBtn) soundBtn.onclick = () => {
  const enabled = soundManager.toggleSounds();
  const img = soundBtn.querySelector('img');
  if (enabled) {
    img.alt = 'Sound on';
    soundBtn.removeAttribute('data-sound-disabled');
    showNotification('Sound effects enabled', 'info');
  } else {
    img.alt = 'Sound off';
    soundBtn.setAttribute('data-sound-disabled', 'true');
    showNotification('Sound effects disabled', 'info');
  }
};

// Shortcut help
if (shortcutBtn) shortcutBtn.onclick = () => {
  soundManager.playClick();
  showShortcutModal();
};
// Keyboard shortcuts with better performance
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    hideCategoryModal();
    hideShortcutModal();
  }
  // Ctrl/Cmd+N: focus new task input
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
    const input = document.getElementById('new-todo-input');
    if (input) {
      input.focus();
      e.preventDefault();
    }
  }
  // Ctrl/Cmd+F: focus search input
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    if (searchInput) {
      searchInput.focus();
      e.preventDefault();
    }
  }
};
  
window.addEventListener('keydown', handleKeydown);

// Request notification permission on user interaction
document.body.addEventListener('click', requestNotificationPermission, { once: true });

// Mobile-specific improvements
function addMobileEnhancements() {
  // Prevent zoom on double tap for iOS
  let lastTouchEnd = 0;
  const touchHandler = (event) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  };
  document.addEventListener('touchend', touchHandler, false);

  // Improve touch scrolling
  const scrollableElements = document.querySelectorAll('.modal-content, #todo-list');
  scrollableElements.forEach(el => {
    el.style.webkitOverflowScrolling = 'touch';
  });

  // Add touch feedback for buttons (only for touch devices)
  if ('ontouchstart' in window) {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      const touchStartHandler = () => {
        btn.style.transform = 'scale(0.98)';
      };
      const touchEndHandler = () => {
        btn.style.transform = '';
      };
      btn.addEventListener('touchstart', touchStartHandler, { passive: true });
      btn.addEventListener('touchend', touchEndHandler, { passive: true });
    });
  }
}

// Initialize mobile enhancements
addMobileEnhancements();

// Check for due tasks on load and every 60s
function checkDueTasks() {
  notifyDueTasks(todos);
}
checkDueTasks();
setInterval(checkDueTasks, 60000);
// Export/Import functionality
function exportData() {
  soundManager.playSuccess();
  const exportData = {
    version: '1.0',
    todos: todos,
    categories: categories,
    stats: loadStats(),
    darkMode: document.body.classList.contains('dark'),
    exportDate: new Date().toISOString()
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `todobodoist-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // Validate data structure
        if (!importedData.version || !importedData.todos) {
          throw new Error('Invalid backup file format');
        }
        
        // Handle version migration if needed
        if (importedData.version !== '1.0') {
          console.warn('Importing from older version:', importedData.version);
        }
        
        // Import data
        if (importedData.todos && Array.isArray(importedData.todos)) {
          todos = importedData.todos;
        }
        
        if (importedData.categories && Array.isArray(importedData.categories)) {
          categories = importedData.categories;
          saveCategories(categories);
        }
        
        if (importedData.stats) {
          saveStats(importedData.stats);
        }
        
        if (importedData.darkMode !== undefined) {
          if (importedData.darkMode) {
            document.body.classList.add('dark');
          } else {
            document.body.classList.remove('dark');
          }
          localStorage.setItem('todo-list-dark', importedData.darkMode ? '1' : '');
        }
        
        // Update UI
        refreshCategoriesUI();
        update();
        renderStats(loadStats());
        
        resolve('Data imported successfully!');
      } catch (error) {
        reject('Error importing data: ' + error.message);
      }
    };
    reader.onerror = () => reject('Error reading file');
    reader.readAsText(file);
  });
}

function showImportModal() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.style.display = 'none';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const result = await importData(file);
      soundManager.playSuccess();
      showNotification(result, 'success');
    } catch (error) {
      soundManager.playError();
      showNotification(error, 'error');
    }
    
    document.body.removeChild(input);
  };
  
  document.body.appendChild(input);
  input.click();
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: var(--border-radius);
    color: white;
    font-weight: 500;
    z-index: 10000;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
  `;
  
  if (type === 'success') {
    notification.style.background = 'var(--completed)';
  } else if (type === 'error') {
    notification.style.background = 'var(--accent-red)';
  } else {
    notification.style.background = 'var(--primary-color)';
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Add export/import buttons to the header
function addExportImportButtons() {
  const topActions = document.getElementById('top-actions');
  if (!topActions) return;
  
  // Export button
  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.id = 'export-data';
  exportBtn.setAttribute('aria-label', 'Export data');
  exportBtn.title = 'Export data';
  const exportIcon = document.createElement('img');
  exportIcon.src = 'assets/icons/download.png';
  exportIcon.alt = 'Export';
  exportIcon.width = 24;
  exportIcon.height = 24;
  exportBtn.appendChild(exportIcon);
  exportBtn.onclick = exportData;
  topActions.appendChild(exportBtn);
  
  // Import button
  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.id = 'import-data';
  importBtn.setAttribute('aria-label', 'Import data');
  importBtn.title = 'Import data';
  const importIcon = document.createElement('img');
  importIcon.src = 'assets/icons/upload.png';
  importIcon.alt = 'Import';
  importIcon.width = 24;
  importIcon.height = 24;
  importBtn.appendChild(importIcon);
  importBtn.onclick = showImportModal;
  topActions.appendChild(importBtn);
}

// Initialize export/import functionality
addExportImportButtons();

// Add backup reminder (check every 7 days)
function checkBackupReminder() {
  const lastBackup = localStorage.getItem('todo-list-last-backup');
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  
  if (!lastBackup || (now - parseInt(lastBackup)) > sevenDays) {
    showNotification('💡 Tip: Export your data regularly to keep it safe!', 'info');
  }
}
  
// Check backup reminder after 5 seconds
setTimeout(checkBackupReminder, 5000);
