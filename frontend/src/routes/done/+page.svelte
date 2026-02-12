<script lang="ts">
	import { onMount } from 'svelte';
	import type { Task } from '$lib/types';
	import { formatDateDisplay } from '$lib/utils';
	import { taskStore } from '$lib/stores/taskStore.svelte';
	import { tagStore } from '$lib/stores/tagStore.svelte';
	import TaskDetailPanel from '$lib/components/TaskDetailPanel.svelte';

	// Done tasks sorted by done_at descending
	let doneTasks = $derived.by(() => {
		return taskStore.tasks
			.filter((t) => t.status === 'done')
			.sort((a, b) => {
				// Sort by done_at descending (newest first)
				if (!a.done_at && !b.done_at) return 0;
				if (!a.done_at) return 1;
				if (!b.done_at) return -1;
				return new Date(b.done_at).getTime() - new Date(a.done_at).getTime();
			});
	});

	// Detail panel
	let selectedTask = $derived(taskStore.selectedTask);
	let showPanel = $derived(selectedTask !== null);

	onMount(() => {
		taskStore.loadTasks();
		tagStore.loadTags();
	});

	function handleSelectTask(task: Task) {
		taskStore.selectTask(task.id === taskStore.selectedTaskId ? null : task.id);
	}

	function handleClosePanel() {
		taskStore.selectTask(null);
	}
</script>

<svelte:head>
	<title>Done - Svara</title>
</svelte:head>

<div class="done-page">
	<div class="page-header">
		<div class="header-info">
			<h1 class="page-title">✅ Done</h1>
			<p class="page-desc">完了したタスクの一覧</p>
		</div>
	</div>

	{#if taskStore.loading}
		<div class="loading">
			<div class="spinner"></div>
			<span>読み込み中...</span>
		</div>
	{:else if doneTasks.length === 0}
		<div class="empty">
			<span class="empty-icon">🎯</span>
			<p class="empty-text">完了したタスクはありません</p>
			<p class="empty-sub">タスクを完了するとここに表示されます</p>
		</div>
	{:else}
		<div class="content" class:with-panel={showPanel}>
			<div class="table-area">
				<div class="task-table-wrapper">
					<table class="task-table">
						<thead>
							<tr>
								<th class="col-title">タイトル</th>
								<th class="col-done">完了日</th>
								<th class="col-due">期限</th>
								<th class="col-tags">タグ</th>
							</tr>
						</thead>
						<tbody>
							{#each doneTasks as task (task.id)}
								<tr
									class="task-row"
									class:selected={taskStore.selectedTaskId === task.id}
								>
									<td class="col-title">
										<button
											class="task-title-btn"
											onclick={() => handleSelectTask(task)}
											type="button"
										>
											{task.title}
										</button>
									</td>
									<td class="col-done">
										{#if task.done_at}
											<span class="date-text">{formatDateDisplay(task.done_at)}</span>
										{:else}
											<span class="no-date">—</span>
										{/if}
									</td>
									<td class="col-due">
										{#if task.due_at}
											<span class="date-text">{formatDateDisplay(task.due_at)}</span>
										{:else}
											<span class="no-date">—</span>
										{/if}
									</td>
									<td class="col-tags">
										<div class="tags-cell">
											{#if task.tags.length > 0}
												<div class="tags">
													{#each task.tags as tag (tag.id)}
														<span class="tag">{tag.name}</span>
													{/each}
												</div>
											{:else}
												<span class="no-tags">—</span>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="table-footer">
					<span class="count">{doneTasks.length} 件の完了タスク</span>
				</div>
			</div>

			{#if showPanel && selectedTask}
				<TaskDetailPanel task={selectedTask} onclose={handleClosePanel} />
			{/if}
		</div>
	{/if}
</div>

<style>
	.done-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px 12px;
		flex-shrink: 0;
	}

	.header-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.page-title {
		font-size: 18px;
		font-weight: 700;
	}

	.page-desc {
		font-size: 13px;
		color: var(--color-text-secondary);
	}

	.loading {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		color: var(--color-text-secondary);
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.empty-icon {
		font-size: 48px;
	}

	.empty-text {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text);
	}

	.empty-sub {
		font-size: 13px;
		color: var(--color-text-secondary);
	}

	/* Layout with optional panel */
	.content {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.table-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-width: 0;
	}

	.task-table-wrapper {
		flex: 1;
		overflow: auto;
		padding: 0 24px;
	}

	.task-table {
		width: 100%;
		border-collapse: collapse;
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
	}

	.task-table thead {
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.task-table th {
		padding: 10px 16px;
		text-align: left;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		background: var(--color-border-light);
		border-bottom: 1px solid var(--color-border);
	}

	.task-table td {
		padding: 10px 16px;
		border-bottom: 1px solid var(--color-border-light);
		vertical-align: top;
	}

	.task-row {
		transition: background var(--transition-fast);
	}

	.task-row:hover {
		background: var(--color-surface-hover);
	}

	.task-row.selected {
		background: var(--color-primary-light);
	}

	.task-row:last-child td {
		border-bottom: none;
	}

	.col-title {
		min-width: 200px;
	}

	.task-title-btn {
		font-weight: 500;
		font-size: 13px;
		color: var(--color-text);
		text-align: left;
		padding: 2px 0;
		width: 100%;
		border-radius: var(--radius-sm);
		transition: color var(--transition-fast);
	}

	.task-title-btn:hover {
		color: var(--color-primary);
	}

	.col-done {
		width: 120px;
	}

	.col-due {
		width: 120px;
	}

	.date-text {
		font-size: 12px;
		color: var(--color-text-secondary);
	}

	.no-date {
		color: var(--color-text-muted);
		font-size: 12px;
	}

	.col-tags {
		width: 200px;
	}

	.tags-cell {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.tags {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
		flex: 1;
	}

	.tag {
		font-size: 10px;
		padding: 2px 8px;
		border-radius: 10px;
		background: var(--color-primary-light);
		color: var(--color-primary);
		font-weight: 500;
	}

	.no-tags {
		color: var(--color-text-muted);
		font-size: 12px;
	}

	.table-footer {
		padding: 12px 24px;
		flex-shrink: 0;
	}

	.count {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	/* Responsive */
	@media (max-width: 900px) {
		.content.with-panel {
			flex-direction: column;
		}
	}
</style>
