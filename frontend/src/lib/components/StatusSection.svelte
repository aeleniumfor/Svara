<script lang="ts">
	import { dndzone } from 'svelte-dnd-action';
	import type { Task } from '$lib/types';
	import TaskCard from './TaskCard.svelte';

	let {
		title,
		status,
		items,
		color,
		selectedTaskId = null,
		onselect,
		onconsider,
		onfinalize
	}: {
		title: string;
		status: string;
		items: Task[];
		color: string;
		selectedTaskId?: number | null;
		onselect: (task: Task) => void;
		onconsider: (e: CustomEvent) => void;
		onfinalize: (e: CustomEvent) => void;
	} = $props();

	const flipDurationMs = 200;
</script>

<div class="section">
	<div class="section-header">
		<div class="section-title-row">
			<div class="status-dot" style="background: {color}"></div>
			<h2 class="section-title">{title}</h2>
			<span class="section-count">{items.length}</span>
		</div>
	</div>

	<div
		class="task-list"
		use:dndzone={{ items, flipDurationMs, type: 'tasks', dropTargetStyle: { outline: `2px dashed ${color}`, borderRadius: '8px' } }}
		onconsider={onconsider}
		onfinalize={onfinalize}
	>
		{#each items as task (task.id)}
			<div class="task-wrapper">
				<TaskCard
					{task}
					selected={selectedTaskId === task.id}
					onclick={() => onselect(task)}
				/>
			</div>
		{/each}
	</div>
</div>

<style>
	.section {
		display: flex;
		flex-direction: column;
		min-width: 0;
		height: 100%;
	}

	.section-header {
		padding: 12px 16px;
		flex-shrink: 0;
	}

	.section-title-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.status-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.section-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
	}

	.section-count {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-muted);
		background: var(--color-border-light);
		padding: 1px 8px;
		border-radius: 10px;
	}

	.task-list {
		flex: 1;
		overflow-y: auto;
		padding: 0 12px 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-height: 60px;
	}

	.task-wrapper {
		flex-shrink: 0;
	}
</style>
