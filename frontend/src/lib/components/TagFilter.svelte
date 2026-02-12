<script lang="ts">
	import { tagStore } from '$lib/stores/tagStore.svelte';
</script>

{#if tagStore.tags.length > 0}
	<div class="tag-filter">
		<span class="filter-label">タグ:</span>
		<div class="tag-list">
			{#each tagStore.tags as tag (tag.id)}
				<button
					class="tag-btn"
					class:active={tagStore.isSelected(tag.id)}
					onclick={() => tagStore.toggleTag(tag.id)}
					type="button"
				>
					{tag.name}
				</button>
			{/each}
		</div>
		{#if tagStore.hasFilter}
			<button class="clear-btn" onclick={() => tagStore.clearFilter()} type="button">
				クリア
			</button>
		{/if}
	</div>
{/if}

<style>
	.tag-filter {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 20px;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
	}

	.filter-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		flex-shrink: 0;
	}

	.tag-list {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	.tag-btn {
		padding: 4px 12px;
		border-radius: 16px;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-secondary);
		background: var(--color-border-light);
		border: 1px solid var(--color-border);
		transition:
			background var(--transition-fast),
			color var(--transition-fast),
			border-color var(--transition-fast);
	}

	.tag-btn:hover {
		background: var(--color-primary-light);
		color: var(--color-primary);
		border-color: var(--color-primary);
	}

	.tag-btn.active {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.clear-btn {
		font-size: 12px;
		color: var(--color-text-muted);
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		transition:
			color var(--transition-fast),
			background var(--transition-fast);
	}

	.clear-btn:hover {
		color: var(--color-danger);
		background: var(--color-danger-bg);
	}
</style>
