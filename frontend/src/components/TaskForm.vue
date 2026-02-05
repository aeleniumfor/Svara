<template>
  <div v-if="show" class="task-form-overlay" @click.self="close">
    <div class="task-form">
      <h2>{{ task ? 'タスクを編集' : '新しいタスク' }}</h2>
      <form @submit.prevent="handleSubmit" class="task-form-content" :class="{ 'meta-collapsed': !metaExpanded, 'note-focused': noteFocused }">
        <div class="title-section">
          <label for="title">タイトル *</label>
          <input id="title" v-model="form.title" type="text" required maxlength="255" />
        </div>
        <div class="meta-toggle-section">
          <button type="button" @click="metaExpanded = !metaExpanded" class="meta-toggle-btn">
            <span>{{ metaExpanded ? '▼' : '▶' }}</span>
            <span>詳細設定</span>
          </button>
        </div>
        <div v-show="metaExpanded" class="meta-section">
          <div class="meta-row">
            <div class="form-group">
              <label for="status">ステータス</label>
              <select id="status" v-model="form.status">
                <option :value="TaskStatusValues.inbox">Inbox</option>
                <option :value="TaskStatusValues.next">Next</option>
                <option :value="TaskStatusValues.doing">Doing</option>
                <option :value="TaskStatusValues.waiting">Waiting</option>
                <option :value="TaskStatusValues.done">Done</option>
              </select>
            </div>
            <div class="form-group">
              <label for="due_at">期限</label>
              <input id="due_at" v-model="form.due_at" type="datetime-local" />
            </div>
            <div class="form-group">
              <label for="today_rank">Today ランク (1-3)</label>
              <input
                id="today_rank"
                v-model.number="form.today_rank"
                type="number"
                min="1"
                max="3"
                :disabled="form.status !== TaskStatusValues.next && form.status !== TaskStatusValues.doing"
              />
            </div>
          </div>
          <div class="form-group">
            <label>タグ</label>
            <div class="tag-selector">
              <label v-for="tag in availableTags" :key="tag.id" class="tag-checkbox">
                <input
                  type="checkbox"
                  :value="tag.id"
                  :checked="form.tag_ids.includes(tag.id)"
                  @change="toggleTag(tag.id)"
                />
                {{ tag.name }}
              </label>
            </div>
            <div class="tag-create-section">
              <button
                v-if="!showNewTagForm"
                type="button"
                @click="showNewTagForm = true"
                class="btn btn-sm btn-link"
              >
                + 新しいタグ
              </button>
              <div v-else class="tag-create-form">
                <input
                  v-model="newTagName"
                  type="text"
                  placeholder="タグ名を入力"
                  @keyup.enter="handleCreateTag"
                  class="tag-input"
                />
                <button type="button" @click="handleCreateTag" class="btn btn-sm btn-primary">
                  追加
                </button>
                <button type="button" @click="cancelNewTag" class="btn btn-sm btn-secondary">
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="note-section">
          <div class="note-header">
            <label for="note">メモ</label>
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
          </div>
          <div v-if="noteMode === 'edit'" class="note-editor">
            <textarea
              id="note"
              v-model="form.note"
              placeholder="Markdown形式で記述できます&#10;&#10;例:&#10;# 見出し&#10;- リスト項目&#10;```コードブロック```&#10;| テーブル | 列 |"
              @focus="noteFocused = true"
              @blur="noteFocused = false"
            ></textarea>
            <div class="markdown-hint">
              <small>Markdown記法: # 見出し、- リスト、```コード```、| テーブル |</small>
            </div>
          </div>
          <div v-else class="note-preview markdown-content" v-html="renderMarkdown(form.note || '')"></div>
        </div>
        <div class="form-actions">
          <button type="button" @click="close" class="btn btn-secondary">キャンセル</button>
          <button type="submit" class="btn btn-primary">保存</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import { markdownItTable } from 'markdown-it-table'
import { fetchTags, createTag } from '../api'
import type { Tag, Task, TaskCreate, TaskUpdate, TaskStatus } from '../types'
import { TaskStatusValues } from '../types'

const props = defineProps<{
  show: boolean
  task?: Task | null
}>()

const emit = defineEmits<{
  submit: [data: TaskCreate | TaskUpdate]
  close: []
}>()

const availableTags = ref<Tag[]>([])
const showNewTagForm = ref(false)
const newTagName = ref('')
const noteMode = ref<'edit' | 'preview'>('edit')
const metaExpanded = ref(false)
const noteFocused = ref(false)
const form = ref<{
  title: string
  note: string
  status: TaskStatus
  due_at: string
  today_rank: number | null
  tag_ids: number[]
}>({
  title: '',
  note: '',
  status: TaskStatusValues.inbox,
  due_at: '',
  today_rank: null,
  tag_ids: [],
})

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
  (newVal) => {
    if (newVal) {
      if (props.task) {
        form.value = {
          title: props.task.title,
          note: props.task.note || '',
          status: props.task.status,
          due_at: props.task.due_at ? formatDateTimeLocal(props.task.due_at) : '',
          today_rank: props.task.today_rank,
          tag_ids: props.task.tags.map((t) => t.id),
        }
      } else {
        form.value = {
          title: '',
          note: '',
          status: TaskStatusValues.inbox,
          due_at: '',
          today_rank: null,
          tag_ids: [],
        }
      }
    }
  }
)

watch(
  () => form.value.status,
  (newStatus) => {
    if (newStatus !== TaskStatusValues.next && newStatus !== TaskStatusValues.doing) {
      form.value.today_rank = null
    }
  }
)

onMounted(async () => {
  await loadTags()
})

async function loadTags() {
  try {
    availableTags.value = await fetchTags()
  } catch (error) {
    console.error('Failed to load tags:', error)
  }
}

function formatDateTimeLocal(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function toggleTag(tagId: number) {
  const index = form.value.tag_ids.indexOf(tagId)
  if (index > -1) {
    form.value.tag_ids.splice(index, 1)
  } else {
    form.value.tag_ids.push(tagId)
  }
}

async function handleCreateTag() {
  if (!newTagName.value.trim()) return

  try {
    const newTag = await createTag({ name: newTagName.value.trim() })
    availableTags.value.push(newTag)
    form.value.tag_ids.push(newTag.id)
    newTagName.value = ''
    showNewTagForm.value = false
  } catch (error) {
    alert(error instanceof Error ? error.message : 'タグの作成に失敗しました')
  }
}

function cancelNewTag() {
  newTagName.value = ''
  showNewTagForm.value = false
}

function handleSubmit() {
  const data: TaskCreate | TaskUpdate = {
    title: form.value.title,
    note: form.value.note || null,
    status: form.value.status,
    due_at: form.value.due_at || null,
    today_rank: form.value.today_rank,
    tag_ids: form.value.tag_ids,
  }
  emit('submit', data)
}

function close() {
  emit('close')
}
</script>

<style scoped>
.task-form-overlay {
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
}

.task-form {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 24px;
  max-width: 1200px;
  width: 95%;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
}

.task-form h2 {
  margin-top: 0;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.task-form-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  transition: opacity 0.2s;
}

.task-form-content.note-focused .meta-section,
.task-form-content.note-focused .meta-toggle-section,
.task-form-content.note-focused .form-actions {
  opacity: 0.6;
  transition: opacity 0.2s;
}

.meta-toggle-section {
  flex-shrink: 0;
  margin-bottom: 8px;
}

.meta-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.2s;
}

.meta-toggle-btn:hover {
  background: var(--btn-bg);
  color: var(--text-color);
}

.meta-section {
  flex-shrink: 0;
  margin-bottom: 16px;
  font-size: 0.9em;
}

.meta-row {
  display: grid;
  grid-template-columns: 1fr 1fr 80px;
  gap: 8px;
  margin-bottom: 12px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  font-size: 0.9em;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.9em;
  font-family: inherit;
}

.note-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  margin-bottom: 16px;
  transition: opacity 0.2s;
}

.task-form-content.note-focused .note-section {
  opacity: 1;
}

.title-section {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.title-section label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  font-size: 0.9em;
}

.title-section input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1em;
  font-family: inherit;
}

.task-form-content.note-focused .title-section {
  opacity: 0.6;
  transition: opacity 0.2s;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.note-header label {
  font-size: 1em;
  font-weight: 500;
}

.note-tabs {
  display: flex;
  gap: 4px;
}

.tab-btn {
  padding: 4px 12px;
  border: 1px solid var(--border-color);
  background: var(--btn-bg);
  color: var(--text-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  transition: background 0.2s;
}

.tab-btn:hover {
  background: var(--btn-hover);
}

.tab-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.note-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.note-editor textarea {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  font-size: 1.2em;
  line-height: 2.0;
  flex: 1;
  min-height: 0;
  resize: none;
  overflow-y: auto;
  padding: 20px;
  border: 2px solid transparent;
  border-radius: 4px;
  background: var(--card-bg);
  color: var(--text-color);
  transition: all 0.2s;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

.note-editor textarea::-webkit-scrollbar {
  width: 6px;
}

.note-editor textarea::-webkit-scrollbar-track {
  background: transparent;
}

.note-editor textarea::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.note-editor textarea::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.note-editor textarea:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
  background: var(--card-bg);
}

.note-editor textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.markdown-hint {
  margin-top: 8px;
  color: var(--text-secondary);
  flex-shrink: 0;
  font-size: 0.85em;
}

.note-preview {
  flex: 1;
  min-height: 0;
  padding: 20px;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-color);
  line-height: 2.0;
  font-size: 1.2em;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

.note-preview::-webkit-scrollbar {
  width: 6px;
}

.note-preview::-webkit-scrollbar-track {
  background: transparent;
}

.note-preview::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.note-preview::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.note-preview .empty-note {
  color: var(--text-secondary);
  font-style: italic;
}

.form-group input:disabled {
  background: var(--disabled-bg);
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .meta-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.tag-checkbox input {
  width: auto;
  margin: 0;
}

.tag-create-section {
  margin-top: 12px;
}

.btn-link {
  background: transparent;
  border: none;
  color: var(--primary-color);
  text-decoration: underline;
  cursor: pointer;
  padding: 4px 0;
  font-size: 0.9em;
}

.btn-link:hover {
  opacity: 0.8;
}

.tag-create-form {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.tag-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.9em;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.85em;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 16px;
  flex-shrink: 0;
  border-top: 1px solid var(--border-color);
}

.btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
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
