import type { APIRequestContext } from '@playwright/test';

const API_BASE = 'http://localhost:8000';

/** APIを直接呼び出してテスト用タスクを作成 */
export async function createTaskViaAPI(
	request: APIRequestContext,
	data: {
		title: string;
		status?: string;
		due_at?: string | null;
		note?: string | null;
		tag_ids?: number[];
	}
) {
	const res = await request.post(`${API_BASE}/tasks`, { data });
	if (!res.ok()) {
		throw new Error(`Failed to create task: ${res.status()} ${await res.text()}`);
	}
	return res.json();
}

/** APIを直接呼び出してテスト用タスクを削除 */
export async function deleteTaskViaAPI(request: APIRequestContext, id: number) {
	await request.delete(`${API_BASE}/tasks/${id}`);
}

/** APIを直接呼び出してタスクを完了にする */
export async function completeTaskViaAPI(request: APIRequestContext, id: number) {
	const res = await request.post(`${API_BASE}/tasks/${id}/complete`);
	if (!res.ok()) {
		throw new Error(`Failed to complete task: ${res.status()} ${await res.text()}`);
	}
	return res.json();
}

/** APIを直接呼び出して全タスクを取得 */
export async function fetchAllTasksViaAPI(request: APIRequestContext) {
	const res = await request.get(`${API_BASE}/tasks`);
	return res.json() as Promise<{ id: number; title: string; status: string }[]>;
}

/** テスト用に作成したタスクをすべて削除するヘルパー */
export async function cleanupTasks(request: APIRequestContext, taskIds: number[]) {
	for (const id of taskIds) {
		await request.delete(`${API_BASE}/tasks/${id}`).catch(() => {});
	}
}

/** APIを直接呼び出してタグを作成 */
export async function createTagViaAPI(request: APIRequestContext, name: string) {
	const res = await request.post(`${API_BASE}/tags`, { data: { name } });
	if (!res.ok()) {
		throw new Error(`Failed to create tag: ${res.status()} ${await res.text()}`);
	}
	return res.json();
}

/** APIを直接呼び出してタグを削除 */
export async function deleteTagViaAPI(request: APIRequestContext, id: number) {
	await request.delete(`${API_BASE}/tags/${id}`).catch(() => {});
}
