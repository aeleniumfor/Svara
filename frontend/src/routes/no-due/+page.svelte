<script lang="ts">
	import { onMount } from 'svelte';
	import type { Task, TaskStatus } from '$lib/types';
	import { sortTasks, toDateInputValue, fromDateInputValue, formatDateDisplay } from '$lib/utils';
	import { STATUS_LABELS } from '$lib/types';
	import { taskStore } from '$lib/stores/taskStore.svelte';
	import { tagStore } from '$lib/stores/tagStore.svelte';
	import { toastStore } from '$lib/stores/toastStore.svelte';
	import TaskDetailPanel from '$lib/components/TaskDetailPanel.svelte';
	import TaskPageFrame from '$lib/components/TaskPageFrame.svelte';
	import { closeTaskSelection, toggleTaskSelection } from '$lib/taskUiActions';

	let noDueTasks = $derived.by(() => taskStore.tasks.filter((t) => t.due_at === null && t.status !== 'done').sort(sortTasks));
	let selectedTask = $derived(taskStore.selectedTask);
	let showPanel = $derived(selectedTask !== null);

	onMount(() => {
		taskStore.loadTasks();
		tagStore.loadTags();
	});

	async function handleSetDueAt(task: Task, e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.value) return;
		try {
			await taskStore.updateTask(task.id, { due_at: fromDateInputValue(input.value) });
			toastStore.add(`「${task.title}」に期限を設定しました`, 'success');
		} catch {
			toastStore.add('期限の設定に失敗しました', 'error');
		}
	}

	async function handleStatusChange(task: Task, e: Event) {
		const select = e.target as HTMLSelectElement;
		const newStatus = select.value as TaskStatus;
		if (!task.due_at && (newStatus === 'doing' || newStatus === 'waiting')) {
			toastStore.add('期限を設定してからステータスを変更してください', 'warning');
			select.value = task.status;
			return;
		}
		try {
			await taskStore.updateTask(task.id, { status: newStatus });
			toastStore.add(`ステータスを「${STATUS_LABELS[newStatus]}」に変更しました`, 'success');
		} catch {
			toastStore.add('ステータスの変更に失敗しました', 'error');
			select.value = task.status;
		}
	}

	async function handleCreateTask() {
		try {
			const task = await taskStore.createTask({ title: '新しいタスク', status: 'backlog' });
			taskStore.selectTask(task.id);
			toastStore.add('タスクを作成しました', 'success');
		} catch {
			toastStore.add('タスクの作成に失敗しました', 'error');
		}
	}
</script>

<svelte:head><title>期限なしタスク - Svara</title></svelte:head>

<TaskPageFrame
	title="📅 期限なしタスク"
	description="期限が設定されていないタスクを整理できます"
	loading={taskStore.loading}
	isEmpty={noDueTasks.length === 0}
	emptyIcon="🎉"
	emptyText="期限なしタスクはありません"
	emptySubText="すべてのタスクに期限が設定されています"
	{showPanel}
	countLabel={`${noDueTasks.length} 件のタスク`}
	showCreateButton={true}
	onCreate={handleCreateTask}
>
	{#snippet table()}
		<table class="task-table">
			<thead><tr><th class="col-title">タイトル</th><th class="col-status">ステータス</th><th class="col-due">期限を設定</th><th class="col-tags">タグ</th><th class="col-updated">更新日</th></tr></thead>
			<tbody>
				{#each noDueTasks as task (task.id)}
					<tr class="task-row" class:selected={taskStore.selectedTaskId === task.id}>
						<td class="col-title"><button class="task-title-btn" onclick={() => toggleTaskSelection(task)} type="button">{task.title}</button></td>
						<td class="col-status"><select class="status-select status-{task.status}" value={task.status} onchange={(e) => handleStatusChange(task, e)}><option value="backlog">Backlog</option><option value="doing">Doing</option><option value="waiting">Waiting</option><option value="done">Done</option></select></td>
						<td class="col-due"><input type="date" class="due-input" value={task.due_at ? toDateInputValue(task.due_at) : ''} onchange={(e) => handleSetDueAt(task, e)} /></td>
						<td class="col-tags"><div class="tags-cell">{#if task.tags.length > 0}<div class="tags">{#each task.tags as tag (tag.id)}<span class="tag">{tag.name}</span>{/each}</div>{:else}<span class="no-tags">—</span>{/if}</div></td>
						<td class="col-updated"><span class="date-text">{formatDateDisplay(task.updated_at)}</span></td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/snippet}
	{#snippet panel()}
		{#if selectedTask}<TaskDetailPanel task={selectedTask} onclose={closeTaskSelection} />{/if}
	{/snippet}
</TaskPageFrame>

<style>
	.task-table{width:100%;border-collapse:collapse;background:var(--color-surface);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-sm)}
	.task-table thead{position:sticky;top:0;z-index:10}.task-table th{padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.5px;background:var(--color-border-light);border-bottom:1px solid var(--color-border)}
	.task-table td{padding:10px 16px;border-bottom:1px solid var(--color-border-light);vertical-align:top}.task-row:hover{background:var(--color-surface-hover)}.task-row.selected{background:var(--color-primary-light)}.task-row:last-child td{border-bottom:none}
	.col-title{min-width:200px}.task-title-btn{font-weight:500;font-size:13px;color:var(--color-text);text-align:left;padding:2px 0;width:100%}.task-title-btn:hover{color:var(--color-primary)}
	.col-status{width:130px}.status-select{padding:4px 8px;border-radius:var(--radius-sm);font-size:12px;font-weight:600;border:1px solid var(--color-border)}.status-select.status-backlog{color:var(--color-backlog)}.status-select.status-doing{color:var(--color-doing)}.status-select.status-waiting{color:var(--color-waiting)}.status-select.status-done{color:var(--color-done)}
	.col-due{width:160px}.due-input{padding:4px 8px;font-size:12px;width:140px}.col-tags{width:200px}.tags-cell{display:flex;align-items:center;gap:6px}.tags{display:flex;gap:4px;flex-wrap:wrap;flex:1}.tag{font-size:10px;padding:2px 8px;border-radius:10px;background:var(--color-primary-light);color:var(--color-primary);font-weight:500}.no-tags{color:var(--color-text-muted);font-size:12px}
	.col-updated{width:100px}.date-text{font-size:12px;color:var(--color-text-secondary)}
</style>
