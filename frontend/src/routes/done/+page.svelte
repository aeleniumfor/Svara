<script lang="ts">
	import { onMount } from 'svelte';
	import { formatDateDisplay } from '$lib/utils';
	import { taskStore } from '$lib/stores/taskStore.svelte';
	import { tagStore } from '$lib/stores/tagStore.svelte';
	import TaskDetailPanel from '$lib/components/TaskDetailPanel.svelte';
	import TaskPageFrame from '$lib/components/TaskPageFrame.svelte';
	import { closeTaskSelection, toggleTaskSelection } from '$lib/taskUiActions';

	let doneTasks = $derived.by(() =>
		taskStore.tasks
			.filter((t) => t.status === 'done')
			.sort((a, b) => {
				if (!a.done_at && !b.done_at) return 0;
				if (!a.done_at) return 1;
				if (!b.done_at) return -1;
				return new Date(b.done_at).getTime() - new Date(a.done_at).getTime();
			})
	);
	let selectedTask = $derived(taskStore.selectedTask);
	let showPanel = $derived(selectedTask !== null);

	onMount(() => {
		taskStore.loadTasks();
		tagStore.loadTags();
	});
</script>

<svelte:head><title>Done - Svara</title></svelte:head>

<TaskPageFrame
	title="✅ Done"
	description="完了したタスクの一覧"
	loading={taskStore.loading}
	isEmpty={doneTasks.length === 0}
	emptyIcon="🎯"
	emptyText="完了したタスクはありません"
	emptySubText="タスクを完了するとここに表示されます"
	{showPanel}
	countLabel={`${doneTasks.length} 件の完了タスク`}
>
	{#snippet table()}
		<table class="task-table">
			<thead><tr><th class="col-title">タイトル</th><th class="col-done">完了日</th><th class="col-due">期限</th><th class="col-tags">タグ</th></tr></thead>
			<tbody>
				{#each doneTasks as task (task.id)}
					<tr class="task-row" class:selected={taskStore.selectedTaskId === task.id}>
						<td class="col-title"><button class="task-title-btn" onclick={() => toggleTaskSelection(task)} type="button">{task.title}</button></td>
						<td class="col-done">{#if task.done_at}<span class="date-text">{formatDateDisplay(task.done_at)}</span>{:else}<span class="no-date">—</span>{/if}</td>
						<td class="col-due">{#if task.due_at}<span class="date-text">{formatDateDisplay(task.due_at)}</span>{:else}<span class="no-date">—</span>{/if}</td>
						<td class="col-tags"><div class="tags-cell">{#if task.tags.length > 0}<div class="tags">{#each task.tags as tag (tag.id)}<span class="tag">{tag.name}</span>{/each}</div>{:else}<span class="no-tags">—</span>{/if}</div></td>
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
	.task-table thead{position:sticky;top:0;z-index:10}
	.task-table th{padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.5px;background:var(--color-border-light);border-bottom:1px solid var(--color-border)}
	.task-table td{padding:10px 16px;border-bottom:1px solid var(--color-border-light);vertical-align:top}
	.task-row:hover{background:var(--color-surface-hover)}.task-row.selected{background:var(--color-primary-light)}.task-row:last-child td{border-bottom:none}
	.col-title{min-width:200px}.task-title-btn{font-weight:500;font-size:13px;color:var(--color-text);text-align:left;padding:2px 0;width:100%}.task-title-btn:hover{color:var(--color-primary)}
	.col-done,.col-due{width:120px}.date-text,.no-date,.no-tags{font-size:12px;color:var(--color-text-secondary)}.no-date,.no-tags{color:var(--color-text-muted)}
	.col-tags{width:200px}.tags-cell{display:flex;align-items:center;gap:6px}.tags{display:flex;gap:4px;flex-wrap:wrap;flex:1}.tag{font-size:10px;padding:2px 8px;border-radius:10px;background:var(--color-primary-light);color:var(--color-primary);font-weight:500}
</style>
