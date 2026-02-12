<script lang="ts">
	import type { Task, TaskUpdate } from '$lib/types';
	import { STATUS_LABELS } from '$lib/types';
	import { toDateInputValue, fromDateInputValue, formatDateDisplay } from '$lib/utils';
	import { taskStore } from '$lib/stores/taskStore.svelte';
	import { tagStore } from '$lib/stores/tagStore.svelte';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import NoteEditor from './NoteEditor.svelte';

	let {
		task,
		onclose
	}: {
		task: Task;
		onclose: () => void;
	} = $props();

	// Local editing state
	let editTitle = $state('');
	let editDueAt = $state('');
	let editNote = $state('');
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let lastSyncedTaskId = $state<number | null>(null);
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let dueAtInput: HTMLInputElement | undefined;

	// Remember original values for change detection
	let originalTitle = $state('');
	let originalDueAt = $state('');
	let originalNote = $state('');

	// Sync from task when task ID changes
	$effect(() => {
		if (task && task.id !== lastSyncedTaskId) {
			lastSyncedTaskId = task.id;

			const title = task.title;
			const dueAt = task.due_at ? toDateInputValue(task.due_at) : '';
			const note = task.note || '';

			editTitle = title;
			editDueAt = dueAt;
			editNote = note;

			originalTitle = title;
			originalDueAt = dueAt;
			originalNote = note;
		}
	});

	// Focus due_at field when requested
	$effect(() => {
		if (taskStore.shouldFocusDueAt && dueAtInput) {
			dueAtInput.focus();
			taskStore.clearFocusDueAt();
		}
	});

	function scheduleAutoSave() {
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => save(), 1000);
	}

	async function save() {
		if (!task) return;

		const data: TaskUpdate = {};
		let hasChanges = false;

		if (editTitle && editTitle !== originalTitle) {
			data.title = editTitle;
			hasChanges = true;
		}

		if (editDueAt !== originalDueAt) {
			data.due_at = editDueAt ? fromDateInputValue(editDueAt) : null;
			hasChanges = true;
		}

		const newNote = editNote || null;
		const origNote = originalNote || null;
		if (newNote !== origNote) {
			data.note = newNote;
			hasChanges = true;
		}

		if (!hasChanges) return;

		saving = true;
		saveError = null;
		try {
			const updated = await taskStore.updateTask(task.id, data);
			// Update originals to the saved values
			originalTitle = updated.title;
			originalDueAt = updated.due_at ? toDateInputValue(updated.due_at) : '';
			originalNote = updated.note || '';
			toastStore.add('保存しました', 'success');
		} catch (e) {
			saveError = e instanceof Error ? e.message : '保存に失敗しました';
			toastStore.add('保存に失敗しました。再試行してください。', 'error');
		} finally {
			saving = false;
		}
	}

	function handleBlur() {
		clearTimeout(saveTimer);
		save();
	}

	function handleDueAtChange() {
		clearTimeout(saveTimer);
		save();
	}

	// Tag editing
	let editingTags = $state(false);
	let currentTagIds = $derived(task.tags.map((t) => t.id));
	let newTagName = $state('');
	let creatingTag = $state(false);

	function isTagActive(tagId: number): boolean {
		return currentTagIds.includes(tagId);
	}

	async function handleToggleTag(tagId: number) {
		const newTagIds = isTagActive(tagId)
			? currentTagIds.filter((id) => id !== tagId)
			: [...currentTagIds, tagId];

		try {
			await taskStore.updateTask(task.id, { tag_ids: newTagIds });
			toastStore.add('タグを更新しました', 'success');
		} catch (e) {
			toastStore.add('タグの更新に失敗しました', 'error');
		}
	}

	async function handleCreateTag() {
		const name = newTagName.trim();
		if (!name) return;

		creatingTag = true;
		try {
			await tagStore.createTag(name);
			newTagName = '';
			toastStore.add('タグを作成しました', 'success');
		} catch (e) {
			const message = e instanceof Error ? e.message : 'タグの作成に失敗しました';
			toastStore.add(message, 'error');
		} finally {
			creatingTag = false;
		}
	}

	async function handleDeleteTag(tagId: number, tagName: string) {
		if (!confirm(`タグ「${tagName}」を削除しますか？`)) return;

		try {
			await tagStore.deleteTag(tagId);
			toastStore.add('タグを削除しました', 'success');
		} catch (e) {
			toastStore.add('タグの削除に失敗しました', 'error');
		}
	}

	async function handleComplete() {
		try {
			await taskStore.completeTask(task.id);
			toastStore.add('タスクを完了しました！', 'success');
		} catch (e) {
			toastStore.add('完了に失敗しました', 'error');
		}
	}

	async function handleDelete() {
		if (!confirm('このタスクを削除しますか？')) return;
		try {
			await taskStore.deleteTask(task.id);
			onclose();
			toastStore.add('タスクを削除しました', 'info');
		} catch (e) {
			toastStore.add('削除に失敗しました', 'error');
		}
	}
</script>

<aside class="detail-panel">
	<div class="panel-header">
		<h2 class="panel-title">タスク詳細</h2>
		<div class="panel-actions">
			{#if saving}
				<span class="save-indicator">保存中...</span>
			{/if}
			<button class="close-btn" onclick={onclose} type="button" aria-label="閉じる">
				✕
			</button>
		</div>
	</div>

	{#if saveError}
		<div class="save-error">
			<span>⚠️ {saveError}</span>
			<button onclick={() => save()} type="button">再試行</button>
		</div>
	{/if}

	<div class="panel-body">
		<div class="field">
			<label class="field-label" for="detail-title">タイトル</label>
			<input
				id="detail-title"
				type="text"
				class="field-input"
				bind:value={editTitle}
				oninput={scheduleAutoSave}
				onblur={handleBlur}
				placeholder="タスクのタイトル"
			/>
		</div>

		<div class="field">
			<label class="field-label" for="detail-due">期限</label>
			<input
				id="detail-due"
				type="date"
				class="field-input"
				bind:value={editDueAt}
				onchange={handleDueAtChange}
				bind:this={dueAtInput}
			/>
			{#if task.due_at}
				<span class="field-hint">{formatDateDisplay(task.due_at)}</span>
			{/if}
		</div>

		<div class="field">
			<span class="field-label">ステータス</span>
			<span class="status-badge status-{task.status}">
				{STATUS_LABELS[task.status]}
			</span>
			{#if task.done_at}
				<span class="field-hint">完了: {formatDateDisplay(task.done_at)}</span>
			{/if}
		</div>

		<div class="field">
			<div class="field-label-row">
				<span class="field-label">タグ</span>
				<button
					class="edit-toggle"
					onclick={() => (editingTags = !editingTags)}
					type="button"
				>
					{editingTags ? '完了' : '編集'}
				</button>
			</div>
			{#if editingTags}
				<div class="tag-editor">
					{#if tagStore.tags.length === 0}
						<span class="no-tags-hint">タグがありません</span>
					{:else}
						{#each tagStore.tags as tag (tag.id)}
							<div class="tag-item">
								<button
									class="tag-toggle"
									class:active={isTagActive(tag.id)}
									onclick={() => handleToggleTag(tag.id)}
									type="button"
								>
									{#if isTagActive(tag.id)}
										<span class="tag-check">✓</span>
									{/if}
									{tag.name}
								</button>
								<button
									class="tag-delete-btn"
									onclick={() => handleDeleteTag(tag.id, tag.name)}
									type="button"
									aria-label="タグを削除"
								>
									×
								</button>
							</div>
						{/each}
					{/if}
					<div class="tag-create-form">
						<input
							type="text"
							class="tag-input"
							bind:value={newTagName}
							placeholder="新しいタグ名"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									handleCreateTag();
								}
							}}
							disabled={creatingTag}
						/>
						<button
							class="tag-add-btn"
							onclick={handleCreateTag}
							type="button"
							disabled={creatingTag || !newTagName.trim()}
						>
							{creatingTag ? '作成中...' : '追加'}
						</button>
					</div>
				</div>
			{:else}
				<div class="tag-list">
					{#if task.tags.length > 0}
						{#each task.tags as tag (tag.id)}
							<span class="tag">{tag.name}</span>
						{/each}
					{:else}
						<span class="no-tags-hint">タグなし</span>
					{/if}
				</div>
			{/if}
		</div>

		<div class="field note-field">
			<span class="field-label">ノート</span>
			<NoteEditor bind:value={editNote} onsave={scheduleAutoSave} />
		</div>
	</div>

	<div class="panel-footer">
		{#if task.status !== 'done'}
			<button class="btn btn-complete" onclick={handleComplete} type="button">
				✅ 完了にする
			</button>
		{/if}
		<button class="btn btn-delete" onclick={handleDelete} type="button">
			🗑️ 削除
		</button>
		<div class="meta-info">
			<span>作成: {formatDateDisplay(task.created_at)}</span>
			<span>更新: {formatDateDisplay(task.updated_at)}</span>
		</div>
	</div>
</aside>

<style>
	.detail-panel {
		width: 400px;
		min-width: 360px;
		background: var(--color-surface);
		border-left: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.panel-title {
		font-size: 15px;
		font-weight: 600;
	}

	.panel-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.save-indicator {
		font-size: 12px;
		color: var(--color-primary);
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.close-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		font-size: 14px;
		transition:
			background var(--transition-fast),
			color var(--transition-fast);
	}

	.close-btn:hover {
		background: var(--color-border-light);
		color: var(--color-text);
	}

	.save-error {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 20px;
		background: var(--color-danger-bg);
		border-bottom: 1px solid var(--color-danger-border);
		font-size: 12px;
		color: var(--color-danger);
	}

	.save-error button {
		padding: 4px 10px;
		border-radius: var(--radius-sm);
		background: var(--color-danger);
		color: white;
		font-size: 11px;
		font-weight: 600;
	}

	.panel-body {
		flex: 1;
		overflow-y: auto;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.field-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.field-input {
		width: 100%;
	}

	.field-hint {
		font-size: 11px;
		color: var(--color-text-muted);
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: 4px 12px;
		border-radius: 16px;
		font-size: 12px;
		font-weight: 600;
		width: fit-content;
	}

	.status-backlog {
		background: var(--color-backlog-light);
		color: var(--color-backlog);
	}

	.status-doing {
		background: var(--color-doing-light);
		color: var(--color-doing);
	}

	.status-waiting {
		background: var(--color-waiting-light);
		color: var(--color-waiting);
	}

	.status-done {
		background: var(--color-done-light);
		color: var(--color-done);
	}

	.field-label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.edit-toggle {
		font-size: 11px;
		color: var(--color-primary);
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		transition:
			background var(--transition-fast),
			color var(--transition-fast);
	}

	.edit-toggle:hover {
		background: var(--color-primary-light);
	}

	.tag-list {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	.tag {
		font-size: 12px;
		padding: 3px 10px;
		border-radius: 16px;
		background: var(--color-primary-light);
		color: var(--color-primary);
		font-weight: 500;
	}

	.tag-editor {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.tag-item {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.tag-toggle {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		padding: 4px 12px;
		border-radius: 16px;
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		background: var(--color-surface);
		transition:
			background var(--transition-fast),
			color var(--transition-fast),
			border-color var(--transition-fast);
		flex: 1;
	}

	.tag-toggle:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.tag-toggle.active {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.tag-check {
		font-size: 10px;
		font-weight: 700;
	}

	.tag-delete-btn {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-muted);
		font-size: 16px;
		line-height: 1;
		cursor: pointer;
		transition:
			background var(--transition-fast),
			color var(--transition-fast),
			border-color var(--transition-fast);
		flex-shrink: 0;
	}

	.tag-delete-btn:hover {
		background: var(--color-danger-bg);
		color: var(--color-danger);
		border-color: var(--color-danger);
	}

	.tag-create-form {
		display: flex;
		gap: 6px;
		margin-top: 4px;
	}

	.tag-input {
		flex: 1;
		padding: 4px 10px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 12px;
		background: var(--color-surface);
		color: var(--color-text);
	}

	.tag-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.tag-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.tag-add-btn {
		padding: 4px 12px;
		border-radius: var(--radius-sm);
		font-size: 12px;
		font-weight: 500;
		background: var(--color-primary);
		color: white;
		border: none;
		cursor: pointer;
		transition: background var(--transition-fast);
		white-space: nowrap;
	}

	.tag-add-btn:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}

	.tag-add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.no-tags-hint {
		font-size: 12px;
		color: var(--color-text-muted);
		font-style: italic;
	}

	.note-field {
		flex: 1;
		min-height: 0;
	}

	.panel-footer {
		padding: 16px 20px;
		border-top: 1px solid var(--color-border);
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		flex-shrink: 0;
	}

	.btn {
		padding: 8px 16px;
		border-radius: var(--radius-sm);
		font-size: 12px;
		font-weight: 600;
		transition:
			background var(--transition-fast),
			color var(--transition-fast);
	}

	.btn-complete {
		background: var(--color-done-light);
		color: var(--color-done);
	}

	.btn-complete:hover {
		background: var(--color-done);
		color: white;
	}

	.btn-delete {
		background: var(--color-danger-bg);
		color: var(--color-danger);
	}

	.btn-delete:hover {
		background: var(--color-danger);
		color: white;
	}

	.meta-info {
		margin-left: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 10px;
		color: var(--color-text-muted);
		text-align: right;
	}
</style>
