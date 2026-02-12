import { test, expect } from '@playwright/test';
import { createTaskViaAPI, cleanupTasks } from './helpers';

test.describe('Backlog画面', () => {
	const createdTaskIds: number[] = [];

	test.afterEach(async ({ request }) => {
		await cleanupTasks(request, createdTaskIds);
		createdTaskIds.length = 0;
	});

	test('Backlog/Doing/Waitingの3カラムが表示される', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('.board')).toBeVisible();
		await expect(page.getByText('Backlog', { exact: false }).first()).toBeVisible();
		await expect(page.getByText('Doing', { exact: false }).first()).toBeVisible();
		await expect(page.getByText('Waiting', { exact: false }).first()).toBeVisible();
	});

	test('新規タスクボタンでタスクが作成される', async ({ page }) => {
		await page.goto('/');
		// ローディングが完了するまで待つ
		await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);

		// 新規タスクボタンをクリック
		await page.click('.btn-create');

		// タスク作成APIレスポンスを待つ
		const response = await page.waitForResponse(
			(res) => res.url().includes('/api/tasks') && res.request().method() === 'POST'
		);
		const task = await response.json();
		createdTaskIds.push(task.id);

		// 詳細パネルが表示される
		await expect(page.locator('.detail-panel')).toBeVisible();
		await expect(page.locator('.panel-title')).toHaveText('タスク詳細');
	});

	test('タスクをクリックすると詳細パネルが開く', async ({ page, request }) => {
		// テスト用タスクをAPIで作成（due_at ありで Backlog ページに表示されるように）
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const task = await createTaskViaAPI(request, {
			title: 'テスト用タスク_詳細表示',
			status: 'backlog',
			due_at: tomorrow.toISOString()
		});
		createdTaskIds.push(task.id);

		await page.goto('/');
		await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);

		// タスクカードをクリック
		await page.getByText('テスト用タスク_詳細表示').click();

		// 詳細パネルが表示される
		await expect(page.locator('.detail-panel')).toBeVisible();

		// タイトルが表示されている
		const titleInput = page.locator('#detail-title');
		await expect(titleInput).toHaveValue('テスト用タスク_詳細表示');
	});

	test('詳細パネルを閉じることができる', async ({ page, request }) => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const task = await createTaskViaAPI(request, {
			title: 'テスト用タスク_パネル閉じ',
			status: 'backlog',
			due_at: tomorrow.toISOString()
		});
		createdTaskIds.push(task.id);

		await page.goto('/');
		await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);

		// タスクをクリックしてパネルを開く
		await page.getByText('テスト用タスク_パネル閉じ').click();
		await expect(page.locator('.detail-panel')).toBeVisible();

		// 閉じるボタンをクリック
		await page.locator('.close-btn').click();
		await expect(page.locator('.detail-panel')).not.toBeVisible();
	});

	test('詳細パネルでタイトルを編集できる', async ({ page, request }) => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const task = await createTaskViaAPI(request, {
			title: 'タイトル編集テスト',
			status: 'backlog',
			due_at: tomorrow.toISOString()
		});
		createdTaskIds.push(task.id);

		await page.goto('/');
		await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);

		// タスクをクリックしてパネルを開く
		await page.getByText('タイトル編集テスト').click();
		await expect(page.locator('.detail-panel')).toBeVisible();

		// タイトルを変更
		const titleInput = page.locator('#detail-title');
		await titleInput.fill('タイトル変更済み');
		await titleInput.blur();

		// 保存のAPIレスポンスを待つ
		await page.waitForResponse(
			(res) => res.url().includes('/api/tasks/') && res.request().method() === 'PATCH'
		);

		// リロードして変更が永続化されていることを確認
		await page.reload();
		await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);
		await expect(page.getByText('タイトル変更済み')).toBeVisible();
	});
});
