<script lang="ts">
	import { toastStore } from '$lib/stores/toastStore.svelte';
</script>

{#if toastStore.toasts.length > 0}
	<div class="toast-container">
		{#each toastStore.toasts as toast (toast.id)}
			<div class="toast toast-{toast.type}" role="alert">
				<div class="toast-content">
					<span class="toast-icon">
						{#if toast.type === 'error'}⚠️
						{:else if toast.type === 'warning'}⚡
						{:else if toast.type === 'success'}✅
						{:else}ℹ️
						{/if}
					</span>
					<span class="toast-message">{toast.message}</span>
					{#if toast.action}
						<button
							class="toast-action"
							onclick={() => {
								toast.action?.callback();
								toastStore.remove(toast.id);
							}}
						>
							{toast.action.label}
						</button>
					{/if}
				</div>
				<button class="toast-close" onclick={() => toastStore.remove(toast.id)} aria-label="閉じる">
					✕
				</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		bottom: 24px;
		right: 24px;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-width: 420px;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		border-radius: var(--radius-md);
		background: var(--color-surface);
		box-shadow: var(--shadow-lg);
		border-left: 4px solid;
		animation: slideIn 200ms ease-out;
	}

	.toast-info {
		border-left-color: var(--color-primary);
	}

	.toast-error {
		border-left-color: var(--color-danger);
		background: var(--color-danger-bg);
	}

	.toast-warning {
		border-left-color: var(--color-warning);
		background: var(--color-warning-bg);
	}

	.toast-success {
		border-left-color: var(--color-done);
		background: var(--color-done-light);
	}

	.toast-content {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
	}

	.toast-icon {
		flex-shrink: 0;
		font-size: 16px;
	}

	.toast-message {
		font-size: 13px;
		line-height: 1.4;
	}

	.toast-action {
		flex-shrink: 0;
		padding: 4px 10px;
		border-radius: var(--radius-sm);
		background: var(--color-primary);
		color: white;
		font-size: 12px;
		font-weight: 600;
		transition: background var(--transition-fast);
	}

	.toast-action:hover {
		background: var(--color-primary-hover);
	}

	.toast-close {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		color: var(--color-text-muted);
		font-size: 12px;
		transition: background var(--transition-fast);
	}

	.toast-close:hover {
		background: rgba(0, 0, 0, 0.05);
		color: var(--color-text);
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
</style>
