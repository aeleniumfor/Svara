<script lang="ts">
	import type { Task } from '$lib/types';
	import { isOverdue, formatDateRelative } from '$lib/utils';

	let {
		task,
		selected = false,
		onclick
	}: {
		task: Task;
		selected?: boolean;
		onclick?: () => void;
	} = $props();

	let overdue = $derived(isOverdue(task));
</script>

<button
	class="task-card"
	class:selected
	class:overdue
	{onclick}
	type="button"
>
	<div class="task-header">
		<span class="task-title">{task.title}</span>
	</div>

	<div class="task-meta">
		{#if task.due_at}
			<span class="due-date" class:overdue>
				{#if overdue}
					<span class="overdue-icon">🔴</span>
				{/if}
				{formatDateRelative(task.due_at)}
			</span>
		{/if}

		{#if task.tags.length > 0}
			<div class="task-tags">
				{#each task.tags as tag (tag.id)}
					<span class="tag">{tag.name}</span>
				{/each}
			</div>
		{/if}
	</div>

	{#if task.note}
		<div class="task-note-indicator" title="ノートあり">📝</div>
	{/if}
</button>

<style>
	.task-card {
		display: block;
		width: 100%;
		text-align: left;
		padding: 12px 14px;
		background: var(--color-surface);
		border: 2px solid transparent;
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
		cursor: grab;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast),
			transform var(--transition-fast);
		position: relative;
	}

	.task-card:hover {
		box-shadow: var(--shadow-md);
		transform: translateY(-1px);
	}

	.task-card.selected {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
	}

	.task-card.overdue {
		border-left: 3px solid var(--color-danger);
	}

	.task-card:active {
		cursor: grabbing;
	}

	.task-header {
		margin-bottom: 6px;
	}

	.task-title {
		font-size: 13px;
		font-weight: 500;
		line-height: 1.4;
		word-break: break-word;
		color: var(--color-text);
	}

	.task-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.due-date {
		font-size: 11px;
		color: var(--color-text-secondary);
		background: var(--color-border-light);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	.due-date.overdue {
		color: var(--color-danger);
		background: var(--color-danger-bg);
		font-weight: 600;
	}

	.overdue-icon {
		font-size: 10px;
	}

	.task-tags {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}

	.tag {
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 10px;
		background: var(--color-primary-light);
		color: var(--color-primary);
		font-weight: 500;
	}

	.task-note-indicator {
		position: absolute;
		top: 8px;
		right: 8px;
		font-size: 12px;
		opacity: 0.6;
	}
</style>
