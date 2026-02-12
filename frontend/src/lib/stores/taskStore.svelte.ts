import * as api from '$lib/api';
import type { Task, TaskCreate, TaskUpdate } from '$lib/types';

let allTasks = $state<Task[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);
let selectedTaskId = $state<number | null>(null);
let shouldFocusDueAt = $state(false);

export const taskStore = {
	get tasks() {
		return allTasks;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},
	get selectedTaskId() {
		return selectedTaskId;
	},
	get selectedTask(): Task | null {
		return allTasks.find((t) => t.id === selectedTaskId) ?? null;
	},
	get shouldFocusDueAt() {
		return shouldFocusDueAt;
	},

	selectTask(id: number | null) {
		selectedTaskId = id;
	},

	requestFocusDueAt() {
		shouldFocusDueAt = true;
	},

	clearFocusDueAt() {
		shouldFocusDueAt = false;
	},

	async loadTasks() {
		loading = true;
		error = null;
		try {
			allTasks = await api.fetchTasks();
		} catch (e) {
			error = e instanceof Error ? e.message : 'タスクの読み込みに失敗しました';
			throw e;
		} finally {
			loading = false;
		}
	},

	async updateTask(id: number, data: TaskUpdate): Promise<Task> {
		const updated = await api.updateTask(id, data);
		allTasks = allTasks.map((t) => (t.id === id ? updated : t));
		return updated;
	},

	async createTask(data: TaskCreate): Promise<Task> {
		const created = await api.createTask(data);
		allTasks = [...allTasks, created];
		return created;
	},

	async deleteTask(id: number): Promise<void> {
		await api.deleteTask(id);
		allTasks = allTasks.filter((t) => t.id !== id);
		if (selectedTaskId === id) {
			selectedTaskId = null;
		}
	},

	async completeTask(id: number): Promise<Task> {
		const updated = await api.completeTask(id);
		allTasks = allTasks.map((t) => (t.id === id ? updated : t));
		return updated;
	}
};
