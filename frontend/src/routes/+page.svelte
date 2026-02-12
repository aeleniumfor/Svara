<script lang="ts">
	import { onMount } from 'svelte';
	import type { Task, TaskStatus } from '$lib/types';
	import { sortTasks } from '$lib/utils';
	import { taskStore } from '$lib/stores/taskStore.svelte';
	import { tagStore } from '$lib/stores/tagStore.svelte';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import StatusSection from '$lib/components/StatusSection.svelte';
	import TaskDetailPanel from '$lib/components/TaskDetailPanel.svelte';
	import TagFilter from '$lib/components/TagFilter.svelte';

	// D&D state
	let isDragging = $state(false);
	let backlogItems = $state<Task[]>([]);
	let doingItems = $state<Task[]>([]);
	let waitingItems = $state<Task[]>([]);

	// Filtered & sorted tasks (from store)
	let filteredBacklog = $derived.by(() => {
		let tasks = taskStore.tasks.filter((t) => t.status === 'backlog' && t.due_at !== null);
		if (tagStore.selectedTagIds.length > 0) {
			tasks = tasks.filter((t) => t.tags.some((tag) => tagStore.selectedTagIds.includes(tag.id)));
		}
		return tasks.sort(sortTasks);
	});

	let filteredDoing = $derived.by(() => {
		let tasks = taskStore.tasks.filter((t) => t.status === 'doing' && t.due_at !== null);
		if (tagStore.selectedTagIds.length > 0) {
			tasks = tasks.filter((t) => t.tags.some((tag) => tagStore.selectedTagIds.includes(tag.id)));
		}
		return tasks.sort(sortTasks);
	});

	let filteredWaiting = $derived.by(() => {
		let tasks = taskStore.tasks.filter((t) => t.status === 'waiting' && t.due_at !== null);
		if (tagStore.selectedTagIds.length > 0) {
			tasks = tasks.filter((t) => t.tags.some((tag) => tagStore.selectedTagIds.includes(tag.id)));
		}
		return tasks.sort(sortTasks);
	});

	// Sync D&D items from store (paused during drag)
	$effect(() => {
		const b = filteredBacklog;
		const d = filteredDoing;
		const w = filteredWaiting;

		if (!isDragging) {
			backlogItems = b.map((t) => ({ ...t }));
			doingItems = d.map((t) => ({ ...t }));
			waitingItems = w.map((t) => ({ ...t }));
		}
	});

	// Selected task
	let selectedTask = $derived(taskStore.selectedTask);
	let showPanel = $derived(selectedTask !== null);

	// Load data on mount
	onMount(() => {
		taskStore.loadTasks();
		tagStore.loadTags();
	});

	// D&D handlers
	function handleConsider(status: string) {
		return (e: CustomEvent) => {
			isDragging = true;
			const items = e.detail.items;
			if (status === 'backlog') backlogItems = items;
			else if (status === 'doing') doingItems = items;
			else waitingItems = items;
		};
	}

	function handleFinalize(targetStatus: string) {
		return async (e: CustomEvent) => {
			const items: Task[] = e.detail.items;

			// Update local state immediately
			if (targetStatus === 'backlog') backlogItems = items;
			else if (targetStatus === 'doing') doingItems = items;
			else waitingItems = items;

			// Find tasks that moved to this zone
			const movedTasks = items.filter((t) => t.status !== targetStatus);

			for (const task of movedTasks) {
				// Validate due_at constraint
				if (!task.due_at && (targetStatus === 'doing' || targetStatus === 'waiting')) {
					toastStore.add(
						'期限が設定されていないため移動できません',
						'warning',
						{
							label: '期限を設定',
							callback: () => {
								taskStore.selectTask(task.id);
								taskStore.requestFocusDueAt();
							}
						}
					);
					// Revert by reloading
					await taskStore.loadTasks();
					isDragging = false;
					return;
				}

				// Update status via API
				try {
					await taskStore.updateTask(task.id, { status: targetStatus as TaskStatus });
				} catch (err) {
					toastStore.add('ステータスの更新に失敗しました', 'error');
					await taskStore.loadTasks();
					isDragging = false;
					return;
				}
			}

			isDragging = false;
		};
	}

	function handleSelectTask(task: Task) {
		taskStore.selectTask(task.id === taskStore.selectedTaskId ? null : task.id);
	}

	function handleClosePanel() {
		taskStore.selectTask(null);
	}

	async function handleCreateTask() {
		try {
			const task = await taskStore.createTask({
				title: '新しいタスク',
				status: 'backlog'
			});
			taskStore.selectTask(task.id);
			toastStore.add('タスクを作成しました', 'success');
		} catch (e) {
			toastStore.add('タスクの作成に失敗しました', 'error');
		}
	}
</script>

<svelte:head>
	<title>Backlog - Svara</title>
</svelte:head>

<div class="backlog-page">
	<TagFilter />

	<div class="page-toolbar">
		<button class="btn-create" onclick={handleCreateTask} type="button">
			＋ 新規タスク
		</button>
	</div>

	<div class="content" class:with-panel={showPanel}>
		<div class="board">
			<div class="column">
				<StatusSection
					title="Backlog"
					status="backlog"
					items={backlogItems}
					color="var(--color-backlog)"
					selectedTaskId={taskStore.selectedTaskId}
					onselect={handleSelectTask}
					onconsider={handleConsider('backlog')}
					onfinalize={handleFinalize('backlog')}
				/>
			</div>
			<div class="column">
				<StatusSection
					title="Doing"
					status="doing"
					items={doingItems}
					color="var(--color-doing)"
					selectedTaskId={taskStore.selectedTaskId}
					onselect={handleSelectTask}
					onconsider={handleConsider('doing')}
					onfinalize={handleFinalize('doing')}
				/>
			</div>
			<div class="column">
				<StatusSection
					title="Waiting"
					status="waiting"
					items={waitingItems}
					color="var(--color-waiting)"
					selectedTaskId={taskStore.selectedTaskId}
					onselect={handleSelectTask}
					onconsider={handleConsider('waiting')}
					onfinalize={handleFinalize('waiting')}
				/>
			</div>
		</div>

		{#if showPanel && selectedTask}
			<TaskDetailPanel task={selectedTask} onclose={handleClosePanel} />
		{/if}
	</div>

	{#if taskStore.loading}
		<div class="loading-overlay">
			<div class="spinner"></div>
		</div>
	{/if}
</div>

<style>
	.backlog-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.page-toolbar {
		display: flex;
		align-items: center;
		padding: 8px 20px;
		gap: 12px;
		flex-shrink: 0;
	}

	.btn-create {
		padding: 8px 16px;
		border-radius: var(--radius-sm);
		background: var(--color-primary);
		color: white;
		font-size: 13px;
		font-weight: 600;
		transition: background var(--transition-fast);
	}

	.btn-create:hover {
		background: var(--color-primary-hover);
	}

	.content {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.board {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		background: var(--color-border);
		overflow: hidden;
		min-width: 0;
	}

	.content.with-panel .board {
		/* Shrink board when panel is open */
	}

	.column {
		background: var(--color-bg);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.loading-overlay {
		position: fixed;
		inset: 0;
		background: rgba(255, 255, 255, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.spinner {
		width: 36px;
		height: 36px;
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

	/* Responsive */
	@media (max-width: 900px) {
		.board {
			grid-template-columns: 1fr;
		}

		.content.with-panel {
			flex-direction: column;
		}
	}
</style>
