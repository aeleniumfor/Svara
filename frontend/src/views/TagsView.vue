<template>
  <div class="tags-view">
    <div class="view-header">
      <h2>🏷️ タグ管理</h2>
      <p class="view-description">タグの作成・削除ができます</p>
    </div>
    <div class="tag-create-section">
      <div class="tag-create-form">
        <input
          v-model="newTagName"
          type="text"
          placeholder="新しいタグ名を入力"
          @keyup.enter="handleCreateTag"
          class="tag-input"
        />
        <button @click="handleCreateTag" class="btn btn-primary">作成</button>
      </div>
    </div>
    <div v-if="loading" class="loading">読み込み中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="tags.length === 0" class="empty">
      <p>タグがありません</p>
      <p class="empty-hint">上記のフォームから新しいタグを作成しましょう</p>
    </div>
    <div v-else class="tags-list">
      <div v-for="tag in tags" :key="tag.id" class="tag-item">
        <span class="tag-name">{{ tag.name }}</span>
        <button @click="handleDeleteTag(tag.id)" class="btn btn-sm btn-danger" title="削除">
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchTags, createTag, deleteTag } from '../api'
import type { Tag } from '../types'

const tags = ref<Tag[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const newTagName = ref('')

onMounted(async () => {
  await loadTags()
})

async function loadTags() {
  try {
    loading.value = true
    error.value = null
    tags.value = await fetchTags()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '読み込みに失敗しました'
  } finally {
    loading.value = false
  }
}

async function handleCreateTag() {
  if (!newTagName.value.trim()) return

  try {
    const newTag = await createTag({ name: newTagName.value.trim() })
    tags.value.push(newTag)
    tags.value.sort((a, b) => a.name.localeCompare(b.name))
    newTagName.value = ''
  } catch (err) {
    alert(err instanceof Error ? err.message : 'タグの作成に失敗しました')
  }
}

async function handleDeleteTag(id: number) {
  if (!confirm('このタグを削除しますか？\n（タスクからは自動的に削除されます）')) return

  try {
    await deleteTag(id)
    tags.value = tags.value.filter((t) => t.id !== id)
  } catch (err) {
    alert(err instanceof Error ? err.message : 'タグの削除に失敗しました')
  }
}

defineExpose({
  refresh: loadTags,
})
</script>

<style scoped>
.tags-view {
  padding: 20px;
}

.view-header {
  margin-bottom: 24px;
}

.view-header h2 {
  margin-top: 0;
  margin-bottom: 4px;
}

.view-description {
  margin: 0;
  font-size: 0.9em;
  color: var(--text-secondary);
}

.tag-create-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.tag-create-form {
  display: flex;
  gap: 8px;
}

.tag-input {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1em;
}

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.tag-name {
  font-weight: 500;
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.error {
  color: var(--danger-color);
}

.empty-hint {
  font-size: 0.9em;
  margin-top: 8px;
  color: var(--text-secondary);
  opacity: 0.8;
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

.btn-sm {
  padding: 4px 8px;
  font-size: 0.85em;
}

.btn-danger {
  color: var(--danger-color);
  border-color: var(--danger-color);
}

.btn-danger:hover {
  background: var(--danger-bg);
}
</style>
