<template>
  <div class="task-card" :class="{ 'task-done': task.status === TaskStatusValues.done }">
    <div class="task-header">
      <span v-if="task.today_rank" class="today-rank">[{{ task.today_rank }}]</span>
      <h3 class="task-title">{{ task.title }}</h3>
      <div class="task-actions">
        <button
          v-if="task.status === TaskStatusValues.inbox"
          @click="$emit('promote')"
          class="btn btn-sm btn-promote"
          title="Inbox → Next に昇格（Backlog に移動）"
        >
          →next
        </button>
        <button
          v-if="task.status !== TaskStatusValues.done"
          @click="$emit('complete')"
          class="btn btn-sm btn-complete"
          title="完了（Done に移動）"
        >
          ✓done
        </button>
        <button @click="$emit('edit')" class="btn btn-sm btn-edit" title="編集">✎</button>
        <button @click="$emit('delete')" class="btn btn-sm btn-danger" title="削除">×</button>
      </div>
    </div>
    <div
      v-if="task.note"
      class="task-note markdown-content"
      v-html="renderMarkdown(task.note)"
      @click="$emit('note-edit')"
      title="メモを編集"
    ></div>
    <div v-else class="task-note-empty" @click="$emit('note-edit')" title="メモを追加">
      <span class="note-placeholder">📝 メモを追加</span>
    </div>
    <div v-if="task.tags.length > 0" class="task-tags">
      <TagBadge v-for="tag in task.tags" :key="tag.id" :tag="tag" />
    </div>
    <div class="task-meta">
      <span v-if="task.due_at" class="due-date">期限: {{ formatDate(task.due_at) }}</span>
      <span v-if="task.status === TaskStatusValues.done && task.done_at" class="done-date">
        完了: {{ formatDate(task.done_at) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { markdownItTable } from 'markdown-it-table'
import TagBadge from './TagBadge.vue'
import { TaskStatusValues } from '../types'
import type { Task } from '../types'

defineProps<{
  task: Task
}>()

defineEmits<{
  promote: []
  complete: []
  edit: []
  delete: []
  'note-edit': []
}>()

const md = new MarkdownIt({
  html: false, // XSS対策: HTMLタグを無効化
  breaks: true, // 改行を<br>に変換
}).use(markdownItTable)

function renderMarkdown(text: string): string {
  return md.render(text)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  })
}
</script>

<style scoped>
.task-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  transition: box-shadow 0.2s;
}

.task-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.task-card.task-done {
  opacity: 0.7;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.today-rank {
  font-weight: bold;
  color: var(--primary-color);
}

.task-title {
  flex: 1;
  margin: 0;
  font-size: 1.1em;
  font-weight: 500;
}

.task-actions {
  display: flex;
  gap: 4px;
}

.task-note {
  color: var(--text-secondary);
  font-size: 0.9em;
  margin: 8px 0;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.task-note:hover {
  background: var(--hover-bg);
}

.task-note.markdown-content {
  line-height: 1.6;
}

.task-note-empty {
  margin: 8px 0;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.task-note-empty:hover {
  background: var(--hover-bg);
}

.note-placeholder {
  color: var(--text-secondary);
  font-size: 0.9em;
  opacity: 0.6;
  font-style: italic;
}

.task-tags {
  margin: 8px 0;
}

.task-meta {
  display: flex;
  gap: 16px;
  font-size: 0.85em;
  color: var(--text-secondary);
  margin-top: 8px;
}

.btn {
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  background: var(--btn-bg);
  color: var(--text-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  transition: background 0.2s;
}

.btn:hover {
  background: var(--btn-hover);
}

.btn-promote {
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.btn-promote:hover {
  background: var(--primary-color);
  color: white;
}

.btn-complete {
  color: #27ae60;
}

.btn-complete:hover {
  background: #e8f5e9;
}

.btn-edit {
  color: var(--text-secondary);
}

.btn-danger {
  color: var(--danger-color);
}

.btn-danger:hover {
  background: var(--danger-bg);
}
</style>
