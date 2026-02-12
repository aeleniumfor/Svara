import { test, expect } from '@playwright/test';
import { createTaskViaAPI, cleanupTasks } from './helpers';

test.describe('期限なし画面', () => {
	const createdTaskIds: number[] = [];

	test.afterEach(async ({ request }) => {
		await cleanupTasks(request, createdTaskIds);
		createdTaskIds.length = 0;
	});

	test('ページタイトルとヘッダーが表示される', async ({ page }) => {
		await page.goto('/no-due');
		await expect(page).toHaveTitle(/期限なしタスク - Svara/);
		await expect(page.locator('.page-title')).toContainText('期限なしタスク');
		await expect(page.locator('.page-desc')).toContainText('期限が設定されていないタスク');
	});

	test('期限なしタスクが一覧に表示される', async ({ page, request }) => {
		// 期限なしタスクをAPIで作成
		const task = await createTaskViaAPI(request, {
			title: '期限なしテストタスク',
			status: 'backlog',
			due_at: null
		});
		createdTaskIds.push(task.id);

		await page.goto('/no-due');
		await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);

		await expect(page.getByText('期限なしテストタスク')).toBeVisible();
	});

	test('期限ありタスクは表示されない', async ({ page, request }) => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);

		// 期限ありタスク
		const taskWithDue = await createTaskViaAPI(request, {
			title: '期限ありタスク_除外テスト',
			status: 'backlog',
			due_at: tomorrow.toISOString()
		});
		createdTaskIds.push(taskWithDue.id);

		// 期限なしタスク
		const taskNoDue = await createTaskViaAPI(request, {
			title: '期限なしタスク_表示テスト',
			status: 'backlog',
			due_at: null
		});
		createdTaskIds.push(taskNoDue.id);

		await page.goto('/no-due');
		await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);

		await expect(page.getByText('期限なしタスク_表示テスト')).toBeVisible();
		await expect(page.getByText('期限ありタスク_除外テスト')).not.toBeVisible();
	});

	test('新規タスクボタンでタスクが作成される', async ({ page }) => {
		await page.goto('/no-due');
		await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);

		await page.click('.btn-create');

		const response = await page.waitForResponse(
			(res) => res.url().includes('/api/tasks') && res.request().method() === 'POST'
		);
		const task = await response.json();
		createdTaskIds.push(task.id);

		// 詳細パネルが表示される
		await expect(page.locator('.detail-panel')).toBeVisible();
	});

	test('タスクをクリックすると詳細パネルが開く', async ({ page, request }) => {
		const task = await createTaskViaAPI(request, {
			title: '詳細パネルテスト_期限なし',
			status: 'backlog',
			due_at: null
		});
		createdTaskIds.push(task.id);

		await page.goto('/no-due');
		await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);

		await page.getByText('詳細パネルテスト_期限なし').click();
		await expect(page.locator('.detail-panel')).toBeVisible();
		await expect(page.locator('#detail-title')).toHaveValue('詳細パネルテスト_期限なし');
	});
});
