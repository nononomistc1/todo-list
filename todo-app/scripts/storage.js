// Storage functions for todos

const STORAGE_KEY = 'todo-list-tasks';
const DATA_VERSION = 1;

export function saveTodos(todos) {
  try {
    const payload = {
      version: DATA_VERSION,
      todos,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    // Optionally, show a user notification or log error
    console.error('Failed to save todos:', e);
  }
}

export function loadTodos() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    // Backward compatibility: if old format (array), wrap in object
    if (Array.isArray(parsed)) {
      return parsed;
    }
    // Migration logic placeholder
    if (parsed.version !== DATA_VERSION) {
      // Add migration steps here as needed
      // For now, just return todos
      return parsed.todos || [];
    }
    return parsed.todos || [];
  } catch (e) {
    console.error('Failed to load todos:', e);
    return [];
  }
}
