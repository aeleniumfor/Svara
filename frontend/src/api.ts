import type { Tag, TagCreate, Task, TaskCreate, TaskUpdate, TaskView } from './types'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// =============================================================================
// Task API
// =============================================================================
export async function fetchTasks(view: TaskView): Promise<Task[]> {
  const endpoint = view === 'inbox' || view === 'today' || view === 'backlog' || view === 'done'
    ? `/views/${view}`
    : '/tasks'
  return fetchJson<Task[]>(`${API_BASE}${endpoint}`)
}

export async function fetchAllTasks(): Promise<Task[]> {
  return fetchJson<Task[]>(`${API_BASE}/tasks`)
}

export async function fetchTask(id: number): Promise<Task> {
  return fetchJson<Task>(`${API_BASE}/tasks/${id}`)
}

export async function createTask(task: TaskCreate): Promise<Task> {
  return fetchJson<Task>(`${API_BASE}/tasks`, {
    method: 'POST',
    body: JSON.stringify(task),
  })
}

export async function updateTask(id: number, task: TaskUpdate): Promise<Task> {
  return fetchJson<Task>(`${API_BASE}/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(task),
  })
}

export async function deleteTask(id: number): Promise<void> {
  return fetchJson<void>(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
  })
}

export async function promoteTask(id: number): Promise<Task> {
  return fetchJson<Task>(`${API_BASE}/tasks/${id}/promote`, {
    method: 'POST',
  })
}

export async function completeTask(id: number): Promise<Task> {
  return fetchJson<Task>(`${API_BASE}/tasks/${id}/complete`, {
    method: 'POST',
  })
}

export async function updateTaskNote(id: number, note: string): Promise<Task> {
  return fetchJson<Task>(`${API_BASE}/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  })
}

// =============================================================================
// Tag API
// =============================================================================
export async function fetchTags(): Promise<Tag[]> {
  return fetchJson<Tag[]>(`${API_BASE}/tags`)
}

export async function createTag(tag: TagCreate): Promise<Tag> {
  return fetchJson<Tag>(`${API_BASE}/tags`, {
    method: 'POST',
    body: JSON.stringify(tag),
  })
}

export async function deleteTag(id: number): Promise<void> {
  return fetchJson<void>(`${API_BASE}/tags/${id}`, {
    method: 'DELETE',
  })
}
