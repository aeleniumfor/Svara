<template>
  <div v-if="show" class="note-editor-overlay" @click.self="close">
    <div class="note-editor-modal">
      <div class="note-editor-header">
        <h2 class="note-editor-title">{{ task.title }}</h2>
        <button @click="close" class="btn-close" title="閉じる">×</button>
      </div>
      <div class="note-editor-content">
        <div class="note-tabs">
          <button
            type="button"
            :class="{ active: noteMode === 'edit' }"
            @click="noteMode = 'edit'"
            class="tab-btn"
          >
            編集
          </button>
          <button
            type="button"
            :class="{ active: noteMode === 'preview' }"
            @click="noteMode = 'preview'"
            class="tab-btn"
          >
            プレビュー
          </button>
        </div>
        <div v-if="noteMode === 'edit'" class="note-editor-area">
          <textarea
            ref="textareaRef"
            v-model="noteContent"
            placeholder="Markdown形式で記述できます&#10;&#10;例:&#10;# 見出し&#10;- リスト項目&#10;```コードブロック```&#10;| テーブル | 列 |"
            @focus="noteFocused = true"
            @blur="noteFocused = false"
          ></textarea>
          <div class="markdown-hint">
            <small>Markdown記法: # 見出し、- リスト、```コード```、| テーブル |</small>
          </div>
        </div>
        <div v-else class="note-preview-area markdown-content" v-html="renderMarkdown(noteContent || '')"></div>
      </div>
      <div class="note-editor-footer">
        <button type="button" @click="close" class="btn btn-secondary">キャンセル</button>
        <button type="button" @click="handleSave" class="btn btn-primary">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import { markdownItTable } from 'markdown-it-table'
import type { Task } from '../types'

const props = defineProps<{
  show: boolean
  task: Task | null
}>()

const emit = defineEmits<{
  save: [taskId: number, note: string]
  close: []
}>()

const noteMode = ref<'edit' | 'preview'>('edit')
const noteContent = ref('')
const noteFocused = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const md = new MarkdownIt({
  html: false, // XSS対策: HTMLタグを無効化
  breaks: true, // 改行を<br>に変換
}).use(markdownItTable)

function renderMarkdown(text: string): string {
  if (!text) return '<p class="empty-note">プレビューが表示されます</p>'
  return md.render(text)
}

watch(
  () => props.show,
  async (newVal) => {
    if (newVal && props.task) {
      noteContent.value = props.task.note || ''
      noteMode.value = 'edit'
      await nextTick()
      if (textareaRef.value) {
        textareaRef.value.focus()
      }
    }
  }
)

function handleSave() {
  if (props.task) {
    emit('save', props.task.id, noteContent.value || '')
  }
}

function close() {
  emit('close')
}
</script>

<style scoped>
.note-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.note-editor-modal {
  background: var(--card-bg);
  border-radius: 8px;
  max-width: 1400px;
  width: 98%;
  height: 98vh;
  max-height: 98vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.note-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.note-editor-title {
  margin: 0;
  font-size: 1.2em;
  font-weight: 500;
  color: var(--text-color);
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 2em;
  line-height: 1;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--btn-bg);
  color: var(--text-color);
}

.note-editor-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.note-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background: var(--btn-bg);
  color: var(--text-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: var(--btn-hover);
}

.tab-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.note-editor-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 24px;
}

.note-editor-area textarea {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  font-size: 1.3em;
  line-height: 2.2;
  flex: 1;
  min-height: 0;
  resize: none;
  overflow-y: auto;
  padding: 24px;
  border: 2px solid transparent;
  border-radius: 4px;
  background: var(--card-bg);
  color: var(--text-color);
  transition: all 0.2s;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

.note-editor-area textarea::-webkit-scrollbar {
  width: 8px;
}

.note-editor-area textarea::-webkit-scrollbar-track {
  background: transparent;
}

.note-editor-area textarea::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.note-editor-area textarea::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.note-editor-area textarea:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.15);
  background: var(--card-bg);
}

.note-editor-area textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.markdown-hint {
  margin-top: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
  font-size: 0.85em;
}

.note-preview-area {
  flex: 1;
  min-height: 0;
  padding: 24px;
  overflow-y: auto;
  line-height: 2.2;
  font-size: 1.3em;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

.note-preview-area::-webkit-scrollbar {
  width: 8px;
}

.note-preview-area::-webkit-scrollbar-track {
  background: transparent;
}

.note-preview-area::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.note-preview-area::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.note-preview-area .empty-note {
  color: var(--text-secondary);
  font-style: italic;
}

.note-editor-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.btn {
  padding: 10px 20px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background: var(--btn-bg);
  color: var(--text-color);
}

.btn-secondary:hover {
  background: var(--btn-hover);
}
</style>
