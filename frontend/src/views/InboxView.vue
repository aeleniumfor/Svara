<template>
  <div class="view">
    <div class="view-header">
      <h2>📥 Inbox</h2>
      <p class="view-description">思いついたタスクをとりあえず入れる場所（まだ何も決まっていない）</p>
      <p class="view-next-action">→ 「→next」ボタンで Backlog へ昇格</p>
    </div>
    <div v-if="loading" class="loading">読み込み中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="tasks.length === 0" class="empty">
      <p>Inbox にはまだタスクがありません</p>
      <p class="empty-hint">「+ New Task」ボタンから新しいタスクを作成しましょう</p>
    </div>
    <div v-else>
      <TaskCard
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @promote="handlePromote(task.id)"
        @complete="handleComplete(task.id)"
        @edit="handleEdit(task)"
        @note-edit="handleNoteEdit(task)"
        @delete="handleDelete(task.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import TaskCard from '../components/TaskCard.vue'
import { fetchTasks, promoteTask, completeTask, deleteTask } from '../api'
import type { Task } from '../types'

const tasks = ref<Task[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const emit = defineEmits<{
  edit: [task: Task]
  'note-edit': [task: Task]
  promoted: []
}>()

onMounted(async () => {
  await loadTasks()
})

async function loadTasks() {
  try {
    loading.value = true
    error.value = null
    tasks.value = await fetchTasks('inbox')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '読み込みに失敗しました'
  } finally {
    loading.value = false
  }
}

async function handlePromote(id: number) {
  try {
    await promoteTask(id)
    await loadTasks()
    // Backlog ビューに移動することを提案（親コンポーネントで処理）
    emit('promoted')
  } catch (err) {
    alert(err instanceof Error ? err.message : '操作に失敗しました')
  }
}

async function handleComplete(id: number) {
  try {
    await completeTask(id)
    await loadTasks()
  } catch (err) {
    alert(err instanceof Error ? err.message : '操作に失敗しました')
  }
}

function handleEdit(task: Task) {
  emit('edit', task)
}

function handleNoteEdit(task: Task) {
  emit('note-edit', task)
}

async function handleDelete(id: number) {
  if (!confirm('このタスクを削除しますか？')) return
  try {
    await deleteTask(id)
    await loadTasks()
  } catch (err) {
    alert(err instanceof Error ? err.message : '削除に失敗しました')
  }
}

defineExpose({
  refresh: loadTasks,
})
</script>

<style scoped>
.view {
  padding: 20px;
}

.view-header {
  margin-bottom: 24px;
}

.view h2 {
  margin-top: 0;
  margin-bottom: 4px;
}

.view-description {
  margin: 0;
  font-size: 0.9em;
  color: var(--text-secondary);
}

.view-next-action {
  margin: 4px 0 0 0;
  font-size: 0.85em;
  color: var(--primary-color);
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
</style>
