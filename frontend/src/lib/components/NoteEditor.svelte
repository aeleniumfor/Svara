<script lang="ts">
	import { marked } from 'marked';

	marked.setOptions({
		breaks: true,
		gfm: true
	});

	let {
		value = $bindable(''),
		onsave
	}: {
		value: string;
		onsave?: () => void;
	} = $props();

	let mode = $state<'edit' | 'preview'>('edit');
	let renderedHtml = $derived(marked.parse(value || '') as string);
</script>

<div class="note-editor">
	<div class="editor-toolbar">
		<button
			class="mode-btn"
			class:active={mode === 'edit'}
			onclick={() => (mode = 'edit')}
			type="button"
		>
			✏️ 編集
		</button>
		<button
			class="mode-btn"
			class:active={mode === 'preview'}
			onclick={() => (mode = 'preview')}
			type="button"
		>
			👁️ プレビュー
		</button>
	</div>

	{#if mode === 'edit'}
		<textarea
			class="note-textarea"
			bind:value
			oninput={() => onsave?.()}
			placeholder="Markdownで記述できます..."
			rows="12"
		></textarea>
	{:else}
		<div class="note-preview markdown-body">
			{#if value}
				{@html renderedHtml}
			{:else}
				<p class="empty-note">ノートが未入力です</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.note-editor {
		display: flex;
		flex-direction: column;
		gap: 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.editor-toolbar {
		display: flex;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-border-light);
	}

	.mode-btn {
		padding: 8px 16px;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-secondary);
		border-bottom: 2px solid transparent;
		transition:
			color var(--transition-fast),
			border-color var(--transition-fast);
	}

	.mode-btn:hover {
		color: var(--color-text);
	}

	.mode-btn.active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
	}

	.note-textarea {
		width: 100%;
		min-height: 240px;
		padding: 12px;
		border: none;
		border-radius: 0;
		resize: vertical;
		font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
		font-size: 13px;
		line-height: 1.6;
	}

	.note-textarea:focus {
		box-shadow: none;
	}

	.note-preview {
		padding: 12px;
		min-height: 240px;
		font-size: 13px;
		line-height: 1.7;
		overflow-y: auto;
	}

	.empty-note {
		color: var(--color-text-muted);
		font-style: italic;
	}

	/* Markdown body styles */
	.markdown-body :global(h1) {
		font-size: 1.4em;
		font-weight: 700;
		margin: 0.8em 0 0.4em;
		padding-bottom: 0.3em;
		border-bottom: 1px solid var(--color-border);
	}

	.markdown-body :global(h2) {
		font-size: 1.2em;
		font-weight: 600;
		margin: 0.8em 0 0.4em;
	}

	.markdown-body :global(h3) {
		font-size: 1.1em;
		font-weight: 600;
		margin: 0.6em 0 0.3em;
	}

	.markdown-body :global(p) {
		margin: 0.5em 0;
	}

	.markdown-body :global(ul),
	.markdown-body :global(ol) {
		padding-left: 1.5em;
		margin: 0.5em 0;
	}

	.markdown-body :global(li) {
		margin: 0.2em 0;
	}

	.markdown-body :global(code) {
		background: var(--color-border-light);
		padding: 2px 5px;
		border-radius: 3px;
		font-size: 0.9em;
	}

	.markdown-body :global(pre) {
		background: var(--color-border-light);
		padding: 12px;
		border-radius: var(--radius-sm);
		overflow-x: auto;
		margin: 0.5em 0;
	}

	.markdown-body :global(pre code) {
		background: none;
		padding: 0;
	}

	.markdown-body :global(blockquote) {
		border-left: 3px solid var(--color-border);
		padding-left: 12px;
		color: var(--color-text-secondary);
		margin: 0.5em 0;
	}

	.markdown-body :global(a) {
		color: var(--color-primary);
	}

	.markdown-body :global(hr) {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: 1em 0;
	}

	.markdown-body :global(table) {
		border-collapse: collapse;
		width: 100%;
		margin: 0.5em 0;
	}

	.markdown-body :global(th),
	.markdown-body :global(td) {
		border: 1px solid var(--color-border);
		padding: 6px 10px;
		text-align: left;
	}

	.markdown-body :global(th) {
		background: var(--color-border-light);
		font-weight: 600;
	}
</style>
