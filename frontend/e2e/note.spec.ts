import { test, expect } from '@playwright/test';
import { createTaskViaAPI, cleanupTasks } from './helpers';

test.describe('Note機能', () => {
	const createdTaskIds: number[] = [];

	test.afterEach(async ({ request }) => {
		await cleanupTasks(request, createdTaskIds);
		createdTaskIds.length = 0;
	});

	// 共通ヘルパー: タスクを作成して詳細パネルを開く
	async function openTaskDetailPanel(page: any, request: any, taskTitle: string) {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const task = await createTaskViaAPI(request, {
			title: taskTitle,
			status: 'backlog',
			due_at: tomorrow.toISOString()
		});
		createdTaskIds.push(task.id);

		await page.goto('/');
		await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);
		await page.getByText(taskTitle).click();
		await expect(page.locator('.detail-panel')).toBeVisible();
		return task;
	}

	// ============================================================================
	// 1. ノート基本操作と永続化
	// ============================================================================
	test.describe('ノート基本操作と永続化', () => {
		test('ノートに文字を入力し、自動保存（PATCH API）が発火する', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, 'ノート自動保存テスト');

			const textarea = page.locator('.note-textarea');
			await expect(textarea).toBeVisible();

			// ノートに入力
			await textarea.fill('これはテストノートです');

			// 自動保存のAPIレスポンスを待つ（1秒デバウンス + API呼び出し）
			await page.waitForResponse(
				(res) =>
					res.url().includes('/api/tasks/') &&
					res.request().method() === 'PATCH' &&
					res.status() === 200,
				{ timeout: 3000 }
			);
		});

		test('ノートを保存後リロードして、入力した内容が残っている', async ({ page, request }) => {
			const task = await openTaskDetailPanel(page, request, 'ノート永続化テスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('永続化されるノート内容');

			// 自動保存を待つ
			await page.waitForResponse(
				(res) =>
					res.url().includes('/api/tasks/') &&
					res.request().method() === 'PATCH' &&
					res.status() === 200,
				{ timeout: 3000 }
			);

			// リロード
			await page.reload();
			await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);
			await page.getByText('ノート永続化テスト').click();
			await expect(page.locator('.detail-panel')).toBeVisible();

			// ノート内容が残っていることを確認
			await expect(page.locator('.note-textarea')).toHaveValue('永続化されるノート内容');
		});

		test('ノートを空にして保存し、note: null として永続化される', async ({ page, request }) => {
			const task = await openTaskDetailPanel(page, request, 'ノート空保存テスト');

			// まずノートを入力
			const textarea = page.locator('.note-textarea');
			await textarea.fill('一時的なノート');
			await page.waitForResponse(
				(res) =>
					res.url().includes('/api/tasks/') &&
					res.request().method() === 'PATCH' &&
					res.status() === 200,
				{ timeout: 3000 }
			);

			// ノートを空にする
			await textarea.fill('');
			await textarea.blur();

			// 保存を待つ
			await page.waitForResponse(
				(res) =>
					res.url().includes('/api/tasks/') &&
					res.request().method() === 'PATCH' &&
					res.status() === 200,
				{ timeout: 3000 }
			);

			// リロードして確認
			await page.reload();
			await page.waitForResponse((res) => res.url().includes('/api/tasks') && res.status() === 200);
			await page.getByText('ノート空保存テスト').click();
			await expect(page.locator('.detail-panel')).toBeVisible();

			// ノートが空であることを確認
			await expect(page.locator('.note-textarea')).toHaveValue('');
		});
	});

	// ============================================================================
	// 2. 編集/プレビューモード切り替え
	// ============================================================================
	test.describe('編集/プレビューモード切り替え', () => {
		test('デフォルトで編集モード（textareaが表示される）', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, '編集モードテスト');

			await expect(page.locator('.note-textarea')).toBeVisible();
			await expect(page.locator('.note-preview')).not.toBeVisible();
			await expect(page.locator('button:has-text("編集")')).toHaveClass(/active/);
		});

		test('「プレビュー」ボタンをクリックするとMarkdownがレンダリングされる', async ({
			page,
			request
		}) => {
			await openTaskDetailPanel(page, request, 'プレビューモードテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('## 見出しテスト\n\nこれは**太字**です');

			// プレビューボタンをクリック
			await page.locator('button:has-text("プレビュー")').click();

			// プレビューが表示される
			await expect(page.locator('.note-preview')).toBeVisible();
			await expect(page.locator('.note-textarea')).not.toBeVisible();

			// Markdownがレンダリングされていることを確認
			await expect(page.locator('.note-preview h2')).toContainText('見出しテスト');
			await expect(page.locator('.note-preview strong')).toContainText('太字');
		});

		test('プレビューモードで再度「編集」ボタンをクリックするとtextareaに戻る', async ({
			page,
			request
		}) => {
			await openTaskDetailPanel(page, request, 'モード切り替えテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('編集モードに戻るテスト');

			// プレビューに切り替え
			await page.locator('button:has-text("プレビュー")').click();
			await expect(page.locator('.note-preview')).toBeVisible();

			// 編集に戻す
			await page.locator('button:has-text("編集")').click();
			await expect(page.locator('.note-textarea')).toBeVisible();
			await expect(page.locator('.note-textarea')).toHaveValue('編集モードに戻るテスト');
		});
	});

	// ============================================================================
	// 3. Markdownプレビュー表示
	// ============================================================================
	test.describe('Markdownプレビュー表示', () => {
		test('見出し（## テスト）が<h2>としてレンダリングされる', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, '見出しプレビューテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('## テスト見出し');
			await page.locator('button:has-text("プレビュー")').click();

			await expect(page.locator('.note-preview h2')).toContainText('テスト見出し');
		});

		test('太字/斜体/取り消し線/コードがそれぞれ正しくレンダリングされる', async ({
			page,
			request
		}) => {
			await openTaskDetailPanel(page, request, '装飾プレビューテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('**太字** *斜体* ~~取り消し線~~ `コード`');
			await page.locator('button:has-text("プレビュー")').click();

			await expect(page.locator('.note-preview strong')).toContainText('太字');
			await expect(page.locator('.note-preview em')).toContainText('斜体');
			await expect(page.locator('.note-preview s')).toContainText('取り消し線');
			await expect(page.locator('.note-preview code')).toContainText('コード');
		});

		test('箇条書き、引用（>）、リンクが正しくレンダリングされる', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, 'リストプレビューテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('- 箇条書き1\n- 箇条書き2\n\n> 引用文\n\n[リンク](https://example.com)');
			await page.locator('button:has-text("プレビュー")').click();

			await expect(page.locator('.note-preview ul li')).toContainText('箇条書き1');
			await expect(page.locator('.note-preview blockquote')).toContainText('引用文');
			await expect(page.locator('.note-preview a')).toContainText('リンク');
		});
	});

	// ============================================================================
	// 4. ツールバーボタン
	// ============================================================================
	test.describe('ツールバーボタン', () => {
		test('テキスト選択 → Bボタンで**text**に変換される', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, '太字ボタンテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('テストテキスト');
			await textarea.selectText();

			// Bボタンをクリック
			await page.locator('button[title="太字 (Ctrl+B)"]').click();

			// **text** に変換されていることを確認
			await expect(textarea).toHaveValue(/\*\*テストテキスト\*\*/);
		});

		test('テキスト選択 → Iボタンで*text*に変換される', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, '斜体ボタンテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('テストテキスト');
			await textarea.selectText();

			// Iボタンをクリック
			await page.locator('button[title="斜体 (Ctrl+I)"]').click();

			// *text* に変換されていることを確認
			await expect(textarea).toHaveValue(/\*テストテキスト\*/);
		});

		test('☐ボタンで行頭に- [ ] が挿入される', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, 'チェックリストボタンテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('チェックリスト項目');
			await textarea.click({ position: { x: 0, y: 10 } }); // 行頭にカーソル移動

			// ☐ボタンをクリック
			await page.locator('button[title="チェックリスト"]').click();

			// - [ ] が挿入されていることを確認
			await expect(textarea).toHaveValue(/- \[ \] チェックリスト項目/);
		});

		test('≡ボタンで行頭に- が挿入される', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, '箇条書きボタンテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('箇条書き項目');
			await textarea.click({ position: { x: 0, y: 10 } }); // 行頭にカーソル移動

			// ≡ボタンをクリック
			await page.locator('button[title="箇条書き"]').click();

			// - が挿入されていることを確認
			await expect(textarea).toHaveValue(/- 箇条書き項目/);
		});

		test('🔗ボタンで[リンクテキスト](url)が挿入される', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, 'リンクボタンテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.click();

			// 🔗ボタンをクリック
			await page.locator('button[title="リンク (Ctrl+K)"]').click();

			// [リンクテキスト](url) が挿入されていることを確認
			await expect(textarea).toHaveValue(/\[リンクテキスト\]\(url\)/);
		});
	});

	// ============================================================================
	// 5. キーボードショートカット
	// ============================================================================
	test.describe('キーボードショートカット', () => {
		test('Ctrl+Bでテキストが太字記法で囲まれる', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, 'Ctrl+Bショートカットテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('太字にするテキスト');
			await textarea.selectText();

			// Ctrl+Bを押す
			await textarea.press('Control+b');

			// **text** に変換されていることを確認
			await expect(textarea).toHaveValue(/\*\*太字にするテキスト\*\*/);
		});

		test('Ctrl+Iでテキストが斜体記法で囲まれる', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, 'Ctrl+Iショートカットテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('斜体にするテキスト');
			await textarea.selectText();

			// Ctrl+Iを押す
			await textarea.press('Control+i');

			// *text* に変換されていることを確認
			await expect(textarea).toHaveValue(/\*斜体にするテキスト\*/);
		});

		test('Ctrl+Kでリンク記法が挿入される', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, 'Ctrl+Kショートカットテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.click();

			// Ctrl+Kを押す
			await textarea.press('Control+k');

			// [リンクテキスト](url) が挿入されていることを確認
			await expect(textarea).toHaveValue(/\[リンクテキスト\]\(url\)/);
		});
	});

	// ============================================================================
	// 6. GFMチェックリスト
	// ============================================================================
	test.describe('GFMチェックリスト', () => {
		test('- [ ] itemがプレビューで未チェックのチェックボックスとして表示される', async ({
			page,
			request
		}) => {
			await openTaskDetailPanel(page, request, 'チェックリスト未チェックテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('- [ ] 未チェック項目');
			await page.locator('button:has-text("プレビュー")').click();

			// チェックボックスが未チェックで表示される
			const checkbox = page.locator('.note-preview input[type="checkbox"]');
			await expect(checkbox).toBeVisible();
			await expect(checkbox).not.toBeChecked();
			await expect(page.locator('.note-preview')).toContainText('未チェック項目');
		});

		test('- [x] itemがプレビューでチェック済み + 取り消し線として表示される', async ({
			page,
			request
		}) => {
			await openTaskDetailPanel(page, request, 'チェックリストチェック済みテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('- [x] チェック済み項目');
			await page.locator('button:has-text("プレビュー")').click();

			// チェックボックスがチェック済みで表示される
			const checkbox = page.locator('.note-preview input[type="checkbox"]');
			await expect(checkbox).toBeChecked();

			// 取り消し線が適用されていることを確認
			const listItem = page.locator('.note-preview .task-list-item-checked');
			await expect(listItem).toBeVisible();
			await expect(listItem).toContainText('チェック済み項目');
		});

		test('プレビューのチェックボックスをクリックすると[ ] ↔ [x]がトグルされ、自動保存が発火する', async ({
			page,
			request
		}) => {
			await openTaskDetailPanel(page, request, 'チェックリストトグルテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('- [ ] トグルテスト項目');
			await page.locator('button:has-text("プレビュー")').click();

			// チェックボックスをクリック
			const checkbox = page.locator('.note-preview input[type="checkbox"]');
			await checkbox.click();

			// 自動保存が発火することを確認
			await page.waitForResponse(
				(res) =>
					res.url().includes('/api/tasks/') &&
					res.request().method() === 'PATCH' &&
					res.status() === 200,
				{ timeout: 3000 }
			);

			// 編集モードに戻って確認
			await page.locator('button:has-text("編集")').click();
			await expect(textarea).toHaveValue(/- \[x\] トグルテスト項目/);
		});
	});

	// ============================================================================
	// 7. Tab / Shift+Tab インデント
	// ============================================================================
	test.describe('Tab / Shift+Tab インデント', () => {
		test('Tabキーでフォーカスが外れず、4スペースが挿入される', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, 'Tabインデントテスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('インデントテスト');
			await textarea.click({ position: { x: 0, y: 10 } }); // 行頭にカーソル

			// Tabキーを押す
			await textarea.press('Tab');

			// 4スペースが挿入されていることを確認
			await expect(textarea).toHaveValue(/^    インデントテスト/);

			// フォーカスが外れていないことを確認
			await expect(textarea).toBeFocused();
		});

		test('Shift+Tabで行頭のスペースが最大4つ削除される', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, 'Shift+Tabインデント削除テスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('    インデント削除テスト'); // 5スペース
			await textarea.click({ position: { x: 0, y: 10 } }); // 行頭にカーソル

			// Shift+Tabキーを押す
			await textarea.press('Shift+Tab');

			// 4スペースが削除されていることを確認（1スペース残る）
			await expect(textarea).toHaveValue(/^ インデント削除テスト/);
		});
	});

	// ============================================================================
	// 8. Enterキーによるリスト自動継続
	// ============================================================================
	test.describe('Enterキーによるリスト自動継続', () => {
		test('- アイテムの末尾でEnter → 次行に- が自動挿入される', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, 'Enterリスト継続テスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('- アイテム1');
			await textarea.press('End'); // 行末に移動
			await textarea.press('Enter');

			// 次行に - が自動挿入されていることを確認
			await expect(textarea).toHaveValue(/- アイテム1\n- /);
		});

		test('空の- でEnter → プレフィックスが削除されてリストが終了する', async ({
			page,
			request
		}) => {
			await openTaskDetailPanel(page, request, 'Enterリスト終了テスト');

			const textarea = page.locator('.note-textarea');
			await textarea.fill('- アイテム1\n- '); // 空のリスト項目
			await textarea.press('End'); // 行末に移動
			await textarea.press('Enter');

			// プレフィックスが削除されていることを確認
			await expect(textarea).toHaveValue(/- アイテム1\n\n/);
		});
	});

	// ============================================================================
	// 9. 拡大モーダル
	// ============================================================================
	test.describe('拡大モーダル', () => {
		test('「↗ 拡大」ボタンでモーダルが開き、タスクタイトルがヘッダーに表示される', async ({
			page,
			request
		}) => {
			const task = await openTaskDetailPanel(page, request, '拡大モーダルテスト');

			// 拡大ボタンをクリック
			await page.locator('button:has-text("拡大")').click();

			// モーダルが表示される
			await expect(page.locator('.modal-overlay')).toBeVisible();
			await expect(page.locator('.modal-title')).toContainText('拡大モーダルテスト');
		});

		test('モーダル内で編集した内容が保存される', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, 'モーダル編集保存テスト');

			// 拡大モーダルを開く
			await page.locator('button:has-text("拡大")').click();
			await expect(page.locator('.modal-overlay')).toBeVisible();

			// モーダル内のtextareaで編集
			const modalTextarea = page.locator('.modal-textarea');
			await modalTextarea.fill('モーダル内で編集した内容');

			// 保存を待つ
			await page.waitForResponse(
				(res) =>
					res.url().includes('/api/tasks/') &&
					res.request().method() === 'PATCH' &&
					res.status() === 200,
				{ timeout: 3000 }
			);

			// モーダルを閉じる
			await page.locator('.modal-close').click();
			await expect(page.locator('.modal-overlay')).not.toBeVisible();

			// 詳細パネルのノートに反映されていることを確認
			await expect(page.locator('.note-textarea')).toHaveValue('モーダル内で編集した内容');
		});

		test('モーダル内でプレビューモードに切り替えられる', async ({ page, request }) => {
			await openTaskDetailPanel(page, request, 'モーダルプレビューテスト');

			// 拡大モーダルを開く
			await page.locator('button:has-text("拡大")').click();
			await expect(page.locator('.modal-overlay')).toBeVisible();

			// モーダル内でノートを入力
			const modalTextarea = page.locator('.modal-textarea');
			await modalTextarea.fill('## モーダル内の見出し');

			// モーダル内のプレビューボタンをクリック
			await page.locator('.modal-toolbar button:has-text("プレビュー")').click();

			// プレビューが表示される
			await expect(page.locator('.modal-preview')).toBeVisible();
			await expect(page.locator('.modal-preview h2')).toContainText('モーダル内の見出し');
		});

		test('×ボタン / Escキー / オーバーレイクリックでモーダルが閉じる', async ({
			page,
			request
		}) => {
			await openTaskDetailPanel(page, request, 'モーダル閉じるテスト');

			// 拡大モーダルを開く
			await page.locator('button:has-text("拡大")').click();
			await expect(page.locator('.modal-overlay')).toBeVisible();

			// ×ボタンで閉じる
			await page.locator('.modal-close').click();
			await expect(page.locator('.modal-overlay')).not.toBeVisible();

			// 再度開く
			await page.locator('button:has-text("拡大")').click();
			await expect(page.locator('.modal-overlay')).toBeVisible();

			// Escキーで閉じる
			await page.keyboard.press('Escape');
			await expect(page.locator('.modal-overlay')).not.toBeVisible();

			// 再度開く
			await page.locator('button:has-text("拡大")').click();
			await expect(page.locator('.modal-overlay')).toBeVisible();

			// オーバーレイクリックで閉じる
			await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });
			await expect(page.locator('.modal-overlay')).not.toBeVisible();
		});
	});

	// ============================================================================
	// 10. ノート未入力状態
	// ============================================================================
	test.describe('ノート未入力状態', () => {
		test('ノートが空の状態でプレビューに切り替えると「ノートが未入力です」と表示される', async ({
			page,
			request
		}) => {
			await openTaskDetailPanel(page, request, 'ノート未入力テスト');

			// ノートが空であることを確認
			await expect(page.locator('.note-textarea')).toHaveValue('');

			// プレビューボタンをクリック
			await page.locator('button:has-text("プレビュー")').click();

			// 「ノートが未入力です」が表示される
			await expect(page.locator('.empty-note')).toContainText('ノートが未入力です');
		});
	});
});
