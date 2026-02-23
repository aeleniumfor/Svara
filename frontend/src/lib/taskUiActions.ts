import type { Task } from '$lib/types';
import { taskStore } from '$lib/stores/taskStore.svelte';

export function toggleTaskSelection(task: Task): void {
	taskStore.selectTask(task.id === taskStore.selectedTaskId ? null : task.id);
}

export function closeTaskSelection(): void {
	taskStore.selectTask(null);
}
