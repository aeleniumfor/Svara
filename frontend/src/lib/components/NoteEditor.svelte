<script lang="ts">
	import MarkdownEditorCore from './note/MarkdownEditorCore.svelte';

	let { value = $bindable(''), onsave, taskTitle = '' }: { value: string; onsave?: () => void; taskTitle?: string } = $props();
	let mode = $state<'edit' | 'preview'>('edit');
	let expandedMode = $state<'edit' | 'preview'>('edit');
	let showExpandModal = $state(false);

	function openExpandModal() {
		expandedMode = mode;
		showExpandModal = true;
		document.body.style.overflow = 'hidden';
	}

	function closeExpandModal() {
		showExpandModal = false;
		onsave?.();
		document.body.style.overflow = '';
	}

	function handleOverlayKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeExpandModal();
		}
	}
</script>

<div class="note-editor">
	<div class="editor-toolbar">
		<button class="mode-btn" class:active={mode === 'edit'} onclick={() => (mode = 'edit')} type="button">✏️ 編集</button>
		<button class="mode-btn" class:active={mode === 'preview'} onclick={() => (mode = 'preview')} type="button">👁️ プレビュー</button>
		{#if taskTitle}
			<button class="expand-btn" onclick={openExpandModal} type="button" title="拡大">↗ 拡大</button>
		{/if}
	</div>

	<MarkdownEditorCore bind:value {onsave} bind:mode />
</div>

{#if showExpandModal && taskTitle}
	<div class="modal-overlay" role="dialog" aria-modal="true" aria-label={`ノート - ${taskTitle}`} onkeydown={handleOverlayKeydown} tabindex="-1">
		<button class="overlay-backdrop" type="button" aria-label="ノートを閉じる" onclick={closeExpandModal}></button>
		<div class="modal">
			<div class="modal-header">
				<h3 class="modal-title">📝 ノート - {taskTitle}</h3>
				<button class="modal-close" onclick={closeExpandModal} type="button" aria-label="閉じる">×</button>
			</div>
			<div class="modal-toolbar">
				<button class="mode-btn" class:active={expandedMode === 'edit'} onclick={() => (expandedMode = 'edit')} type="button">✏️ 編集</button>
				<button class="mode-btn" class:active={expandedMode === 'preview'} onclick={() => (expandedMode = 'preview')} type="button">👁️ プレビュー</button>
				<button class="shrink-btn" onclick={closeExpandModal} type="button" title="縮小">↙ 縮小</button>
			</div>
			<MarkdownEditorCore bind:value {onsave} mode={expandedMode} textareaClass="modal-textarea" previewClass="modal-preview" rows={20} />
		</div>
	</div>
{/if}

<style>
	.note-editor{display:flex;flex-direction:column;border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden}
	.editor-toolbar{display:flex;align-items:center;border-bottom:1px solid var(--color-border);background:var(--color-border-light)}
	.mode-btn{padding:8px 16px;font-size:12px;font-weight:500;color:var(--color-text-secondary);border-bottom:2px solid transparent}
	.mode-btn.active{color:var(--color-primary);border-bottom-color:var(--color-primary)}
	.expand-btn,.shrink-btn{margin-left:auto;padding:8px 16px;font-size:12px;font-weight:500;color:var(--color-text-secondary)}
	.modal-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:1000}
	.overlay-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.5)}
	.modal{position:relative;width:90vw;max-width:1200px;height:80vh;background:var(--color-surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);display:flex;flex-direction:column;overflow:hidden}
	.modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--color-border)}
	.modal-title{font-size:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
	.modal-close{width:32px;height:32px;font-size:20px}
	.modal-toolbar{display:flex;align-items:center;border-bottom:1px solid var(--color-border);background:var(--color-border-light);padding:0 8px}
	:global(.modal-textarea){flex:1;min-height:0;resize:none;padding:16px}
	:global(.modal-preview){flex:1;padding:16px;min-height:0}
</style>
