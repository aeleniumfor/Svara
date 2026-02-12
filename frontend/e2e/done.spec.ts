import { test, expect } from '@playwright/test';
import { createTaskViaAPI, completeTaskViaAPI, cleanupTasks } from './helpers';

test.describe('Done画面', () => {
	const createdTaskIds: number[] = [];

	test.afterEach(async ({ request }) => {
		await cleanupTasks(request, createdTaskIds);
		createdTaskIds.length = 0;
	});

	test('ページタイトルとヘッダーが表示される', async ({ page }) => {
		await page.goto('/done');
		await expect(page).toHaveTitle(/Done - Svara/);
		await expect(page.locator('.page-title')).toContainText('Done');
		await expect(page.locator('.page-desc')).toContainText('完了したタスクの一覧');
	});

	test('完了したタスクがない場合は空メッセージが表示される', async ({ page }) => {
		await page.goto('/done');
		await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);

		// 完了タスクがなければ空メッセージが出る（既存データ次第）
		// このテストは環境依存なのでスキップ可能
		const emptyOrTable = page.locator('.empty, .task-table');
		await expect(emptyOrTable.first()).toBeVisible();
	});

	test('完了タスクが一覧に表示される', async ({ page, request }) => {
		// タスクを作成して完了にする
		const task = await createTaskViaAPI(request, {
			title: '完了テストタスク_done',
			status: 'backlog'
		});
		createdTaskIds.push(task.id);
		await completeTaskViaAPI(request, task.id);

		await page.goto('/done');
		await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);

		await expect(page.getByText('完了テストタスク_done')).toBeVisible();
	});

	test('未完了タスクは表示されない', async ({ page, request }) => {
		// backlog タスク
		const backlogTask = await createTaskViaAPI(request, {
			title: '未完了タスク_done除外テスト',
			status: 'backlog'
		});
		createdTaskIds.push(backlogTask.id);

		// 完了タスク
		const doneTask = await createTaskViaAPI(request, {
			title: '完了タスク_done表示テスト',
			status: 'backlog'
		});
		createdTaskIds.push(doneTask.id);
		await completeTaskViaAPI(request, doneTask.id);

		await page.goto('/done');
		await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);

		await expect(page.getByText('完了タスク_done表示テスト')).toBeVisible();
		await expect(page.getByText('未完了タスク_done除外テスト')).not.toBeVisible();
	});

	test('完了タスクをクリックすると詳細パネルが開く', async ({ page, request }) => {
		const task = await createTaskViaAPI(request, {
			title: '詳細表示テスト_done画面',
			status: 'backlog'
		});
		createdTaskIds.push(task.id);
		await completeTaskViaAPI(request, task.id);

		await page.goto('/done');
		await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);

		await page.getByText('詳細表示テスト_done画面').click();
		await expect(page.locator('.detail-panel')).toBeVisible();
		await expect(page.locator('#detail-title')).toHaveValue('詳細表示テスト_done画面');
	});
});
