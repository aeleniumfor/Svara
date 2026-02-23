<script lang="ts">
	import { marked } from 'marked';
	import type { Tokens } from 'marked';

	marked.setOptions({ breaks: true, gfm: true });

	let {
		value = $bindable(''),
		onsave,
		mode = $bindable<'edit' | 'preview'>('edit'),
		className = '',
		textareaClass = '',
		previewClass = '',
		rows = 12
	}: {
		value: string;
		onsave?: () => void;
		mode?: 'edit' | 'preview';
		className?: string;
		textareaClass?: string;
		previewClass?: string;
		rows?: number;
	} = $props();

	let textareaRef = $state<HTMLTextAreaElement | undefined>(undefined);
	let checkboxIndex = 0;

	marked.use({
		renderer: {
			listitem(item: Tokens.ListItem) {
				if (item.task) {
					const index = checkboxIndex++;
					return `<li style="list-style: none;" class="task-list-item${item.checked ? ' task-list-item-checked' : ''}"><input type="checkbox" data-checkbox-index="${index}"${item.checked ? ' checked' : ''}> ${item.text}</li>`;
				}
				return `<li>${item.text}</li>`;
			}
		}
	});

	let renderedHtml = $derived.by(() => {
		checkboxIndex = 0;
		return marked.parse(value || '') as string;
	});

	function getSelection() {
		if (!textareaRef) return { start: 0, end: 0, text: '' };
		return {
			start: textareaRef.selectionStart,
			end: textareaRef.selectionEnd,
			text: textareaRef.value.substring(textareaRef.selectionStart, textareaRef.selectionEnd)
		};
	}

	function setSelection(start: number, end: number) {
		setTimeout(() => {
			if (!textareaRef) return;
			textareaRef.setSelectionRange(start, end);
			textareaRef.focus();
		}, 0);
	}

	function insertText(before: string, after = '', selectText = '') {
		if (!textareaRef) return;
		const { start, end, text } = getSelection();
		const selectedText = text || selectText;
		const newText = before + selectedText + after;
		value = textareaRef.value.substring(0, start) + newText + textareaRef.value.substring(end);
		onsave?.();

		if (selectText) {
			const selectStart = start + before.length;
			setSelection(selectStart, selectStart + selectText.length);
			return;
		}

		if (after.includes('url')) {
			const urlStart = start + before.length + selectedText.length + after.indexOf('url');
			setSelection(urlStart, urlStart + 3);
			return;
		}

		setSelection(start + newText.length, start + newText.length);
	}

	function toggleWrap(before: string, after = before) {
		if (!textareaRef) return;
		const { start, end, text } = getSelection();
		const beforeText = textareaRef.value.substring(Math.max(0, start - before.length), start);
		const afterText = textareaRef.value.substring(
			end,
			Math.min(textareaRef.value.length, end + after.length)
		);

		if (beforeText === before && afterText === after) {
			value =
				textareaRef.value.substring(0, start - before.length) +
				text +
				textareaRef.value.substring(end + after.length);
			onsave?.();
			setSelection(start - before.length, end - before.length);
			return;
		}

		insertText(before, after);
	}

	function getSelectedLineRange() {
		if (!textareaRef) return { startLine: 0, endLine: 0 };
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

		return { startLine, endLine };
	}

	function insertAtLineStart(prefix: string) {
		if (!textareaRef) return;
		const { start, end } = getSelection();
		const lines = textareaRef.value.split('\n');
		const { startLine, endLine } = getSelectedLineRange();

		for (let i = startLine; i <= endLine; i++) {
			lines[i] = prefix + lines[i];
		}

		value = lines.join('\n');
		onsave?.();
		const offset = prefix.length * (endLine - startLine + 1);
		setSelection(start + prefix.length, end + offset);
	}

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
		lines[lineIndex] = headingMatch
			? headingMatch[1].length === 3
				? line.replace(/^###\s/, '')
				: line.replace(/^#+\s/, '#'.repeat(headingMatch[1].length + 1) + ' ')
			: `## ${line}`;

		value = lines.join('\n');
		onsave?.();
	}

	function insertCode() {
		if (!textareaRef) return;
		const { text } = getSelection();
		if (text.includes('\n')) {
			insertText('```\n', '\n```');
			return;
		}
		toggleWrap('`', '`');
	}

	function handleIndent(e: KeyboardEvent) {
		if (!textareaRef || e.key !== 'Tab') return;
		e.preventDefault();

		const { start, end } = getSelection();
		const lines = textareaRef.value.split('\n');
		const { startLine, endLine } = getSelectedLineRange();
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

		value = lines.join('\n');
		onsave?.();
		const offset = e.shiftKey
			? -indent.length * (endLine - startLine + 1)
			: indent.length * (endLine - startLine + 1);
		setSelection(Math.max(0, start + (e.shiftKey ? -4 : 4)), Math.max(0, end + offset));
	}

	function handleEnter(e: KeyboardEvent) {
		if (!textareaRef || e.key !== 'Enter') return;

		const { start } = getSelection();
		const lines = textareaRef.value.split('\n');
		let currentPos = 0;
		let lineIndex = 0;

		for (let i = 0; i < lines.length; i++) {
			const lineLength = lines[i].length;
			if (start >= currentPos && start <= currentPos + lineLength) {
				lineIndex = i;
				break;
			}
			currentPos += lineLength + 1;
		}

		const line = lines[lineIndex];
		const indent = line.match(/^(\s*)/)?.[1] || '';
		const contentAfterPrefix = line.substring(indent.length).trim();

		if (
			!contentAfterPrefix ||
			contentAfterPrefix.match(/^[-*]\s*$/) ||
			contentAfterPrefix.match(/^[-*]\s*\[[ x]\]\s*$/) ||
			contentAfterPrefix.match(/^\d+\.\s*$/) ||
			contentAfterPrefix.match(/^>\s*$/)
		) {
			e.preventDefault();
			lines[lineIndex] = indent;
			value = lines.join('\n');
			onsave?.();
			setSelection(currentPos + indent.length, currentPos + indent.length);
			return;
		}

		const listMatch = line.match(/^(\s*)([-*])\s+(\[[ x]\]\s+)?/);
		const numberedMatch = line.match(/^(\s*)(\d+)\.\s+/);
		const quoteMatch = line.match(/^(\s*)>\s+/);
		let newLine = '';

		if (listMatch) {
			e.preventDefault();
			newLine = indent + listMatch[2] + ' ' + (listMatch[3] || '');
		} else if (numberedMatch) {
			e.preventDefault();
			newLine = indent + (Number.parseInt(numberedMatch[2], 10) + 1).toString() + '. ';
		} else if (quoteMatch) {
			e.preventDefault();
			newLine = indent + '> ';
		}

		if (newLine) {
			lines.splice(lineIndex + 1, 0, newLine);
			value = lines.join('\n');
			onsave?.();
			setSelection(currentPos + line.length + 1 + newLine.length, currentPos + line.length + 1 + newLine.length);
		}
	}

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
	}

	function toggleCheckbox(e: MouseEvent | KeyboardEvent) {
		const target = e.target as HTMLElement;
		const checkbox = target.closest(
			'input[type="checkbox"][data-checkbox-index]'
		) as HTMLInputElement | null;
		if (!checkbox) return;

		e.preventDefault();
		const index = Number.parseInt(checkbox.dataset.checkboxIndex || '0', 10);
		const lines = value.split('\n');
		let count = 0;

		for (let i = 0; i < lines.length; i++) {
			const match = lines[i].match(/^(\s*[-*]\s+)(\[[ x]\])\s+(.*)$/);
			if (!match) continue;
			if (count === index) {
				lines[i] = lines[i].replace(/\[[ x]\]/, match[2] === '[x]' ? '[ ]' : '[x]');
				value = lines.join('\n');
				onsave?.();
				break;
			}
			count++;
		}
	}

	function handlePreviewKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			toggleCheckbox(e);
		}
	}
</script>

<div class={`markdown-editor-core ${className}`.trim()}>
	{#if mode === 'edit'}
		<div class="markdown-toolbar">
			<div class="toolbar-group">
				<button class="toolbar-btn" onclick={() => toggleWrap('**', '**')} type="button" title="太字 (Ctrl+B)"><strong>B</strong></button>
				<button class="toolbar-btn" onclick={() => toggleWrap('*', '*')} type="button" title="斜体 (Ctrl+I)"><em>I</em></button>
				<button class="toolbar-btn" onclick={() => toggleWrap('~~', '~~')} type="button" title="取り消し線"><s>S</s></button>
			</div>
			<div class="toolbar-divider"></div>
			<div class="toolbar-group">
				<button class="toolbar-btn" onclick={insertHeading} type="button" title="見出し">H▾</button>
				<button class="toolbar-btn" onclick={() => insertAtLineStart('- ')} type="button" title="箇条書き">≡</button>
				<button class="toolbar-btn" onclick={() => insertAtLineStart('- [ ] ')} type="button" title="チェックリスト">☐</button>
			</div>
			<div class="toolbar-divider"></div>
			<div class="toolbar-group">
				<button class="toolbar-btn" onclick={() => insertText('[', '](url)', 'リンクテキスト')} type="button" title="リンク (Ctrl+K)">🔗</button>
				<button class="toolbar-btn" onclick={insertCode} type="button" title="コード">&lt;&gt;</button>
				<button class="toolbar-btn" onclick={() => insertAtLineStart('> ')} type="button" title="引用">&gt;</button>
			</div>
		</div>
		<textarea
			class={`note-textarea ${textareaClass}`.trim()}
			bind:value
			bind:this={textareaRef}
			oninput={() => onsave?.()}
			onkeydown={handleKeyDown}
			placeholder="Markdownで記述できます..."
			{rows}
		></textarea>
	{:else}
		<div
			class={`note-preview markdown-body ${previewClass}`.trim()}
			onclick={toggleCheckbox}
			onkeydown={handlePreviewKeydown}
			role="button"
			tabindex="0"
			aria-label="プレビュー内のチェックリストを切り替え"
		>
			{#if value}
				{@html renderedHtml}
			{:else}
				<p class="empty-note">ノートが未入力です</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.markdown-toolbar,
	.toolbar-group {
		display: flex;
		align-items: center;
	}

	.markdown-toolbar {
		gap: 0;
		padding: 4px;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-border-light);
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
	}

	.toolbar-btn:hover {
		background: var(--color-border);
		color: var(--color-text);
	}

	.note-textarea {
		width: 100%;
		min-height: 240px;
		padding: 12px;
		border: none;
		resize: vertical;
		font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
		font-size: 13px;
		line-height: 1.6;
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

	.markdown-body :global(ul) {
		list-style: none;
		padding-left: 1.5em;
	}

	.markdown-body :global(input[type='checkbox']) {
		cursor: pointer;
		accent-color: var(--color-primary);
		margin-right: 6px;
	}

	.markdown-body :global(.task-list-item-checked) {
		text-decoration: line-through;
		opacity: 0.6;
	}
</style>
