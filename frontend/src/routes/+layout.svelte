<script lang="ts">
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';

	let { children }: { children: Snippet } = $props();
</script>

<div class="app">
	<nav class="nav">
		<div class="nav-brand">
			<span class="nav-logo">📋</span>
			<span class="nav-title">Svara</span>
		</div>
		<div class="nav-links">
			<a
				href="/"
				class="nav-link"
				class:active={$page.url.pathname === '/'}
			>
				Backlog
			</a>
			<a
				href="/no-due"
				class="nav-link"
				class:active={$page.url.pathname === '/no-due'}
			>
				期限なし
			</a>
			<a
				href="/done"
				class="nav-link"
				class:active={$page.url.pathname === '/done'}
			>
				Done
			</a>
		</div>
	</nav>

	<main class="main">
		{@render children()}
	</main>
</div>

<Toast />

<style>
	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 32px;
		padding: 0 24px;
		height: 52px;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
		z-index: 100;
	}

	.nav-brand {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.nav-logo {
		font-size: 20px;
	}

	.nav-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--color-text);
		letter-spacing: -0.3px;
	}

	.nav-links {
		display: flex;
		gap: 4px;
	}

	.nav-link {
		padding: 8px 16px;
		border-radius: var(--radius-sm);
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-secondary);
		transition:
			background var(--transition-fast),
			color var(--transition-fast);
		text-decoration: none;
	}

	.nav-link:hover {
		background: var(--color-border-light);
		color: var(--color-text);
		text-decoration: none;
	}

	.nav-link.active {
		background: var(--color-primary-light);
		color: var(--color-primary);
		font-weight: 600;
	}

	.main {
		flex: 1;
		overflow: hidden;
	}
</style>
