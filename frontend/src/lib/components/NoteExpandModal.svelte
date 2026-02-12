<script lang="ts">
	import { marked } from 'marked';
	import type { Renderer } from 'marked';

	marked.setOptions({
		breaks: true,
		gfm: true
	});

	let {
		value = $bindable(''),
		onsave,
		taskTitle = '',
		onclose
	}: {
		value: string;
		onsave?: () => void;
		taskTitle: string;
		onclose: () => void;
	} = $props();

	let mode = $state<'edit' | 'preview'>('edit');
	let textareaRef: HTMLTextAreaElement | undefined;
	let modalRef: HTMLDivElement | undefined;
	let checkboxIndex = 0;

	// カスタムレンダラーでチェックリストにdata-checkbox-indexを付与
	const renderer: Partial<Renderer> = {
		listitem(text: string, task: boolean, checked: boolean) {
			if (task) {
				const index = checkboxIndex++;
				return `<li style="list-style: none;" class="task-list-item${checked ? ' task-list-item-checked' : ''}"><input type="checkbox" data-checkbox-index="${index}"${checked ? ' checked' : ''}> ${text}</li>`;
			}
			return `<li>${text}</li>`;
		}
	};

	marked.use({ renderer });

	let renderedHtml = $derived(marked.parse(value || '') as string);

	// テキスト選択範囲を取得
	function getSelection(): { start: number; end: number; text: string } {
		if (!textareaRef) return { start: 0, end: 0, text: '' };
		return {
			start: textareaRef.selectionStart,
			end: textareaRef.selectionEnd,
			text: textareaRef.value.substring(textareaRef.selectionStart, textareaRef.selectionEnd)
		};
	}

	// テキストを挿入してカーソル位置を設定
	function insertText(before: string, after: string = '', selectText: string = '') {
		if (!textareaRef) return;
		const { start, end, text } = getSelection();
		const selectedText = text || selectText;
		const newText = before + selectedText + after;
		const newValue =
			textareaRef.value.substring(0, start) + newText + textareaRef.value.substring(end);
		value = newValue;
		onsave?.();

		setTimeout(() => {
			if (!textareaRef) return;
			if (selectText) {
				const selectStart = start + before.length;
				const selectEnd = selectStart + selectText.length;
				textareaRef.setSelectionRange(selectStart, selectEnd);
			} else if (after.includes('url')) {
				const urlStart = start + before.length + selectedText.length + after.indexOf('url');
				const urlEnd = urlStart + 3;
				textareaRef.setSelectionRange(urlStart, urlEnd);
			} else {
				textareaRef.setSelectionRange(start + newText.length, start + newText.length);
			}
			textareaRef.focus();
		}, 0);
	}

	// 囲み系記法のトグル
	function toggleWrap(before: string, after: string = before) {
		if (!textareaRef) return;
		const { start, end, text } = getSelection();
		const beforeLen = before.length;
		const afterLen = after.length;

		const beforeText = textareaRef.value.substring(Math.max(0, start - beforeLen), start);
		const afterText = textareaRef.value.substring(end, Math.min(textareaRef.value.length, end + afterLen));

		if (beforeText === before && afterText === after) {
			const newValue =
				textareaRef.value.substring(0, start - beforeLen) +
				text +
				textareaRef.value.substring(end + afterLen);
			value = newValue;
			onsave?.();
			setTimeout(() => {
				if (!textareaRef) return;
				textareaRef.setSelectionRange(start - beforeLen, end - beforeLen);
				textareaRef.focus();
			}, 0);
		} else {
			insertText(before, after);
		}
	}

	// 行頭に記法を挿入
	function insertAtLineStart(prefix: string) {
		if (!textareaRef) return;
		const { start, end } = getSelection();
		const lines = textareaRef.value.split('\n');
		let currentPos = 0;
		let startLine = 0;
		let endLine = 0;

		for (let i = 0; i < lines.length; i++) {
			if (currentPos <= start && start < currentPos + lines[i].length + 1) {
				startLine = i;
			}
			if (currentPos <= end && end <= currentPos + lines[i].length + 1) {
				endLine = i;
				break;
			}
			currentPos += lines[i].length + 1;
		}

		for (let i = startLine; i <= endLine; i++) {
			lines[i] = prefix + lines[i];
		}

		const newValue = lines.join('\n');
		value = newValue;
		onsave?.();

		setTimeout(() => {
			if (!textareaRef) return;
			const offset = prefix.length * (endLine - startLine + 1);
			textareaRef.setSelectionRange(start + prefix.length, end + offset);
			textareaRef.focus();
		}, 0);
	}

	// 見出しのサイクル挿入
	function insertHeading() {
		if (!textareaRef) return;
		const { start } = getSelection();
		const lines = textareaRef.value.split('\n');
		let currentPos = 0;
		let lineIndex = 0;

		for (let i = 0; i < lines.length; i++) {
			if (currentPos <= start && start < currentPos + lines[i].length + 1) {
				lineIndex = i;
				break;
			}
			currentPos += lines[i].length + 1;
		}

		const line = lines[lineIndex];
		const headingMatch = line.match(/^(#{1,3})\s/);
		if (headingMatch) {
			const level = headingMatch[1].length;
			if (level === 3) {
				lines[lineIndex] = line.replace(/^###\s/, '');
			} else {
				lines[lineIndex] = line.replace(/^#+\s/, '#'.repeat(level + 1) + ' ');
			}
		} else {
			lines[lineIndex] = '## ' + line;
		}

		const newValue = lines.join('\n');
		value = newValue;
		onsave?.();

		setTimeout(() => {
			if (!textareaRef) return;
			const newPos = currentPos + (lines[lineIndex].length - line.length);
			textareaRef.setSelectionRange(newPos, newPos);
			textareaRef.focus();
		}, 0);
	}

	// コードブロック/インラインコード
	function insertCode() {
		if (!textareaRef) return;
		const { start, end, text } = getSelection();
		const isMultiline = text.includes('\n');

		if (isMultiline) {
			insertText('```\n', '\n```');
		} else {
			toggleWrap('`', '`');
		}
	}

	// Tab/Shift+Tab インデント処理
	function handleIndent(e: KeyboardEvent) {
		if (!textareaRef) return;
		if (e.key !== 'Tab') return;

		e.preventDefault();
		const { start, end } = getSelection();
		const lines = textareaRef.value.split('\n');
		let currentPos = 0;
		let startLine = 0;
		let endLine = 0;

		for (let i = 0; i < lines.length; i++) {
			if (currentPos <= start && start < currentPos + lines[i].length + 1) {
				startLine = i;
			}
			if (currentPos <= end && end <= currentPos + lines[i].length + 1) {
				endLine = i;
				break;
			}
			currentPos += lines[i].length + 1;
		}

		const indent = '    ';

		if (e.shiftKey) {
			for (let i = startLine; i <= endLine; i++) {
				if (lines[i].startsWith(indent)) {
					lines[i] = lines[i].substring(4);
				} else if (lines[i].startsWith(' ')) {
					lines[i] = lines[i].replace(/^ +/, '');
				}
			}
		} else {
			for (let i = startLine; i <= endLine; i++) {
				lines[i] = indent + lines[i];
			}
		}

		const newValue = lines.join('\n');
		value = newValue;
		onsave?.();

		setTimeout(() => {
			if (!textareaRef) return;
			const offset = e.shiftKey
				? -indent.length * (endLine - startLine + 1)
				: indent.length * (endLine - startLine + 1);
			textareaRef.setSelectionRange(
				Math.max(0, start + (e.shiftKey ? -4 : 4)),
				Math.max(0, end + offset)
			);
			textareaRef.focus();
		}, 0);
	}

	// Enter リスト自動継続
	function handleEnter(e: KeyboardEvent) {
		if (!textareaRef || e.key !== 'Enter') return;

		const { start } = getSelection();
		const lines = textareaRef.value.split('\n');
		let currentPos = 0;
		let lineIndex = 0;

		// カーソル位置から行インデックスを正確に取得
		for (let i = 0; i < lines.length; i++) {
			const lineLength = lines[i].length;
			if (start >= currentPos && start <= currentPos + lineLength) {
				lineIndex = i;
				break;
			}
			currentPos += lineLength + 1; // +1は改行文字
		}

		const line = lines[lineIndex];
		const indentMatch = line.match(/^(\s*)/);
		const indent = indentMatch ? indentMatch[1] : '';

		const contentAfterPrefix = line.substring(indent.length).trim();
		if (!contentAfterPrefix || contentAfterPrefix.match(/^[-*]\s*$/) || contentAfterPrefix.match(/^[-*]\s*\[[ x]\]\s*$/) || contentAfterPrefix.match(/^\d+\.\s*$/) || contentAfterPrefix.match(/^>\s*$/)) {
			e.preventDefault();
			lines[lineIndex] = indent;
			const newValue = lines.join('\n');
			value = newValue;
			onsave?.();
			setTimeout(() => {
				if (!textareaRef) return;
				const newPos = currentPos + indent.length;
				textareaRef.setSelectionRange(newPos, newPos);
				textareaRef.focus();
			}, 0);
			return;
		}

		const listMatch = line.match(/^(\s*)([-*])\s+(\[[ x]\]\s+)?/);
		const numberedMatch = line.match(/^(\s*)(\d+)\.\s+/);
		const quoteMatch = line.match(/^(\s*)>\s+/);

		if (listMatch) {
			e.preventDefault();
			const prefix = indent + listMatch[2] + ' ' + (listMatch[3] || '');
			const newLine = prefix;
			lines.splice(lineIndex + 1, 0, newLine);
			const newValue = lines.join('\n');
			value = newValue;
			onsave?.();
			setTimeout(() => {
				if (!textareaRef) return;
				const newPos = currentPos + line.length + 1 + newLine.length;
				textareaRef.setSelectionRange(newPos, newPos);
				textareaRef.focus();
			}, 0);
		} else if (numberedMatch) {
			e.preventDefault();
			const num = parseInt(numberedMatch[2], 10);
			const prefix = indent + (num + 1).toString() + '. ';
			const newLine = prefix;
			lines.splice(lineIndex + 1, 0, newLine);
			const newValue = lines.join('\n');
			value = newValue;
			onsave?.();
			setTimeout(() => {
				if (!textareaRef) return;
				const newPos = currentPos + line.length + 1 + newLine.length;
				textareaRef.setSelectionRange(newPos, newPos);
				textareaRef.focus();
			}, 0);
		} else if (quoteMatch) {
			e.preventDefault();
			const prefix = indent + '> ';
			const newLine = prefix;
			lines.splice(lineIndex + 1, 0, newLine);
			const newValue = lines.join('\n');
			value = newValue;
			onsave?.();
			setTimeout(() => {
				if (!textareaRef) return;
				const newPos = currentPos + line.length + 1 + newLine.length;
				textareaRef.setSelectionRange(newPos, newPos);
				textareaRef.focus();
			}, 0);
		}
		// リストパターンに一致しない場合は何もせず、通常の改行を許可
	}

	// キーボードショートカット
	function handleKeyDown(e: KeyboardEvent) {
		if (!textareaRef) return;

		handleIndent(e);
		handleEnter(e);

		if (e.ctrlKey || e.metaKey) {
			if (e.key === 'b') {
				e.preventDefault();
				toggleWrap('**', '**');
			} else if (e.key === 'i') {
				e.preventDefault();
				toggleWrap('*', '*');
			} else if (e.key === 'k') {
				e.preventDefault();
				insertText('[', '](url)', 'リンクテキスト');
			}
		}

		// Esc キーでモーダルを閉じる
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose();
		}
	}

	// チェックリストトグル
	function handleCheckboxClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		const checkbox = target.closest('input[type="checkbox"][data-checkbox-index]') as HTMLInputElement;
		if (!checkbox) return;

		e.preventDefault();
		e.stopPropagation();

		const index = parseInt(checkbox.getAttribute('data-checkbox-index') || '0', 10);
		const lines = value.split('\n');
		let checkboxCount = 0;

		for (let i = 0; i < lines.length; i++) {
			const checkboxMatch = lines[i].match(/^(\s*[-*]\s+)(\[[ x]\])\s+(.*)$/);
			if (checkboxMatch) {
				if (checkboxCount === index) {
					const checked = checkboxMatch[2] === '[x]';
					lines[i] = lines[i].replace(/\[[ x]\]/, checked ? '[ ]' : '[x]');
					value = lines.join('\n');
					onsave?.();
					break;
				}
				checkboxCount++;
			}
		}
	}

	// モーダル外クリックで閉じる
	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}

	// body のスクロールを無効化
	$effect(() => {
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	});

	// モーダルが開いたら textarea にフォーカス
	$effect(() => {
		if (mode === 'edit' && textareaRef) {
			setTimeout(() => {
				textareaRef?.focus();
			}, 100);
		}
	});

	// チェックボックスインデックスをリセット
	$effect(() => {
		checkboxIndex = 0;
	});

	// 閉じる時に保存
	function handleClose() {
		onsave?.();
		onclose();
	}
</script>

<div class="modal-overlay" onclick={handleOverlayClick}>
	<div class="modal" bind:this={modalRef}>
		<div class="modal-header">
			<h3 class="modal-title">📝 ノート - {taskTitle}</h3>
			<button class="modal-close" onclick={handleClose} type="button" aria-label="閉じる">
				×
			</button>
		</div>

		<div class="modal-toolbar">
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
			<button class="shrink-btn" onclick={handleClose} type="button" title="縮小">
				↙ 縮小
			</button>
		</div>

		{#if mode === 'edit'}
			<div class="markdown-toolbar">
				<div class="toolbar-group">
					<button class="toolbar-btn" onclick={() => toggleWrap('**', '**')} type="button" title="太字 (Ctrl+B)">
						<strong>B</strong>
					</button>
					<button class="toolbar-btn" onclick={() => toggleWrap('*', '*')} type="button" title="斜体 (Ctrl+I)">
						<em>I</em>
					</button>
					<button class="toolbar-btn" onclick={() => toggleWrap('~~', '~~')} type="button" title="取り消し線">
						<s>S</s>
					</button>
				</div>
				<div class="toolbar-divider"></div>
				<div class="toolbar-group">
					<button class="toolbar-btn" onclick={() => insertHeading()} type="button" title="見出し">
						H▾
					</button>
					<button class="toolbar-btn" onclick={() => insertAtLineStart('- ')} type="button" title="箇条書き">
						≡
					</button>
					<button class="toolbar-btn" onclick={() => insertAtLineStart('- [ ] ')} type="button" title="チェックリスト">
						☐
					</button>
				</div>
				<div class="toolbar-divider"></div>
				<div class="toolbar-group">
					<button
						class="toolbar-btn"
						onclick={() => insertText('[', '](url)', 'リンクテキスト')}
						type="button"
						title="リンク (Ctrl+K)"
					>
						🔗
					</button>
					<button class="toolbar-btn" onclick={() => insertCode()} type="button" title="コード">
						&lt;&gt;
					</button>
					<button class="toolbar-btn" onclick={() => insertAtLineStart('> ')} type="button" title="引用">
						&gt;
					</button>
				</div>
			</div>
			<textarea
				class="modal-textarea"
				bind:value
				bind:this={textareaRef}
				oninput={() => onsave?.()}
				onkeydown={handleKeyDown}
				placeholder="Markdownで記述できます..."
			></textarea>
		{:else}
			<div class="modal-preview markdown-body" onclick={handleCheckboxClick}>
				{#if value}
					{@html renderedHtml}
				{:else}
					<p class="empty-note">ノートが未入力です</p>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fadeIn 200ms ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal {
		width: 90vw;
		max-width: 1200px;
		height: 80vh;
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: scaleIn 200ms ease;
	}

	@keyframes scaleIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.modal-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.modal-close {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		font-size: 20px;
		line-height: 1;
		transition:
			background var(--transition-fast),
			color var(--transition-fast);
	}

	.modal-close:hover {
		background: var(--color-border-light);
		color: var(--color-text);
	}

	.modal-toolbar {
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-border-light);
		padding: 0 8px;
		flex-shrink: 0;
	}

	.modal-toolbar .mode-btn {
		padding: 8px 16px;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-secondary);
		border-bottom: 2px solid transparent;
		transition:
			color var(--transition-fast),
			border-color var(--transition-fast);
	}

	.modal-toolbar .mode-btn:hover {
		color: var(--color-text);
	}

	.modal-toolbar .mode-btn.active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
	}

	.shrink-btn {
		margin-left: auto;
		padding: 8px 16px;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-secondary);
		transition: color var(--transition-fast);
	}

	.shrink-btn:hover {
		color: var(--color-primary);
	}

	.markdown-toolbar {
		display: flex;
		align-items: center;
		gap: 0;
		padding: 4px;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-border-light);
		flex-shrink: 0;
	}

	.toolbar-group {
		display: flex;
		align-items: center;
		gap: 0;
	}

	.toolbar-divider {
		width: 1px;
		height: 20px;
		background: var(--color-border);
		margin: 0 4px;
	}

	.toolbar-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-secondary);
		border-radius: var(--radius-sm);
		transition:
			background var(--transition-fast),
			color var(--transition-fast);
	}

	.toolbar-btn:hover {
		background: var(--color-border);
		color: var(--color-text);
	}

	.toolbar-btn strong {
		font-weight: 700;
	}

	.toolbar-btn em {
		font-style: italic;
	}

	.toolbar-btn s {
		text-decoration: line-through;
	}

	.modal-textarea {
		flex: 1;
		width: 100%;
		padding: 16px;
		border: none;
		border-radius: 0;
		resize: none;
		font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
		font-size: 13px;
		line-height: 1.6;
		outline: none;
	}

	.modal-preview {
		flex: 1;
		padding: 16px;
		overflow-y: auto;
		font-size: 13px;
		line-height: 1.7;
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

	.markdown-body :global(ul) {
		list-style: none;
	}

	.markdown-body :global(li) {
		margin: 0.2em 0;
	}

	.markdown-body :global(input[type="checkbox"]) {
		cursor: pointer;
		accent-color: var(--color-primary);
		margin-right: 6px;
	}

	.markdown-body :global(.task-list-item-checked) {
		text-decoration: line-through;
		opacity: 0.6;
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
