import type { Task, TaskCreate, TaskUpdate, Tag } from './types';

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${BASE_URL}${path}`, {
		headers: {
			'Content-Type': 'application/json',
			...options?.headers
		},
		...options
	});

	if (!res.ok) {
		const body = await res.json().catch(() => null);
		const message = body?.detail || `HTTP ${res.status}`;
		throw new Error(message);
	}

	if (res.status === 204) return undefined as T;
	return res.json();
}

// ─── Tasks ───────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
	return request<Task[]>('/tasks');
}


export async function createTask(data: TaskCreate): Promise<Task> {
	return request<Task>('/tasks', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function updateTask(id: number, data: TaskUpdate): Promise<Task> {
	return request<Task>(`/tasks/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

export async function deleteTask(id: number): Promise<void> {
	return request<void>(`/tasks/${id}`, { method: 'DELETE' });
}

export async function completeTask(id: number): Promise<Task> {
	return request<Task>(`/tasks/${id}/complete`, { method: 'POST' });
}

// ─── Tags ────────────────────────────────────────────────────────

export async function fetchTags(): Promise<Tag[]> {
	return request<Tag[]>('/tags');
}

export async function createTag(name: string): Promise<Tag> {
	return request<Tag>('/tags', {
		method: 'POST',
		body: JSON.stringify({ name })
	});
}

export async function deleteTag(id: number): Promise<void> {
	return request<void>(`/tags/${id}`, { method: 'DELETE' });
}
