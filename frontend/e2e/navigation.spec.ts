import { test, expect } from '@playwright/test';

test.describe('ナビゲーション', () => {
	test('トップページ（Backlog）が表示される', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/Backlog - Svara/);
		await expect(page.locator('.nav-title')).toHaveText('Svara');
	});

	test('ナビゲーションリンクが表示される', async ({ page }) => {
		await page.goto('/');
		const nav = page.locator('.nav-links');
		await expect(nav.getByText('Backlog')).toBeVisible();
		await expect(nav.getByText('期限なし')).toBeVisible();
		await expect(nav.getByText('Done')).toBeVisible();
	});

	test('Backlog → 期限なし へ遷移できる', async ({ page }) => {
		await page.goto('/');
		await page.click('a[href="/no-due"]');
		await expect(page).toHaveURL('/no-due');
		await expect(page).toHaveTitle(/期限なしタスク - Svara/);
		await expect(page.locator('.page-title')).toContainText('期限なしタスク');
	});

	test('Backlog → Done へ遷移できる', async ({ page }) => {
		await page.goto('/');
		await page.click('a[href="/done"]');
		await expect(page).toHaveURL('/done');
		await expect(page).toHaveTitle(/Done - Svara/);
		await expect(page.locator('.page-title')).toContainText('Done');
	});

	test('期限なし → Backlog へ遷移できる', async ({ page }) => {
		await page.goto('/no-due');
		await page.click('a[href="/"]');
		await expect(page).toHaveURL('/');
		await expect(page).toHaveTitle(/Backlog - Svara/);
	});

	test('アクティブなナビゲーションリンクがハイライトされる', async ({ page }) => {
		await page.goto('/');
		const backlogLink = page.locator('a[href="/"]');
		await expect(backlogLink).toHaveClass(/active/);

		await page.goto('/no-due');
		const noDueLink = page.locator('a[href="/no-due"]');
		await expect(noDueLink).toHaveClass(/active/);

		await page.goto('/done');
		const doneLink = page.locator('a[href="/done"]');
		await expect(doneLink).toHaveClass(/active/);
	});
});
