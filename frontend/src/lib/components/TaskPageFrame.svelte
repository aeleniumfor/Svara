<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		title,
		description,
		loading,
		isEmpty,
		emptyIcon,
		emptyText,
		emptySubText,
		showPanel,
		countLabel,
		showCreateButton = false,
		onCreate,
		table,
		panel
	}: {
		title: string;
		description: string;
		loading: boolean;
		isEmpty: boolean;
		emptyIcon: string;
		emptyText: string;
		emptySubText: string;
		showPanel: boolean;
		countLabel: string;
		showCreateButton?: boolean;
		onCreate?: () => void;
		table: Snippet;
		panel?: Snippet;
	} = $props();
</script>

<div class="task-page">
	<div class="page-header"><div class="header-info"><h1 class="page-title">{title}</h1><p class="page-desc">{description}</p></div>{#if showCreateButton}<button class="btn-create" onclick={() => onCreate?.()} type="button">＋ 新規タスク</button>{/if}</div>
	{#if loading}
		<div class="loading"><div class="spinner"></div><span>読み込み中...</span></div>
	{:else if isEmpty}
		<div class="empty"><span class="empty-icon">{emptyIcon}</span><p class="empty-text">{emptyText}</p><p class="empty-sub">{emptySubText}</p></div>
	{:else}
		<div class="content" class:with-panel={showPanel}>
			<div class="table-area"><div class="task-table-wrapper">{@render table()}</div><div class="table-footer"><span class="count">{countLabel}</span></div></div>
			{#if showPanel && panel}{@render panel()}{/if}
		</div>
	{/if}
</div>

<style>
	.task-page{display:flex;flex-direction:column;height:100%;overflow:hidden}.page-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 12px;flex-shrink:0}.header-info{display:flex;flex-direction:column;gap:2px}.page-title{font-size:18px;font-weight:700}.page-desc{font-size:13px;color:var(--color-text-secondary)}.btn-create{padding:8px 16px;border-radius:var(--radius-sm);background:var(--color-primary);color:white;font-size:13px;font-weight:600}.btn-create:hover{background:var(--color-primary-hover)}.loading{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--color-text-secondary)}.spinner{width:32px;height:32px;border:3px solid var(--color-border);border-top-color:var(--color-primary);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}.empty-icon{font-size:48px}.empty-text{font-size:16px;font-weight:600}.empty-sub{font-size:13px;color:var(--color-text-secondary)}.content{flex:1;display:flex;overflow:hidden}.table-area{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}.task-table-wrapper{flex:1;overflow:auto;padding:0 24px}.table-footer{padding:12px 24px;flex-shrink:0}.count{font-size:12px;color:var(--color-text-muted)}@media (max-width:900px){.content.with-panel{flex-direction:column}}
</style>
