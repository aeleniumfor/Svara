<template>
  <div class="app">
    <header class="header">
      <h1 class="title">Svara</h1>
      <div class="header-actions">
        <button @click="showTagsView = true" class="btn btn-icon" title="タグ管理">🏷️</button>
        <button @click="showTaskForm = true" class="btn btn-primary">+ New Task</button>
      </div>
    </header>
    <nav class="tabs">
      <button
        v-for="view in views"
        :key="view.id"
        @click="currentView = view.id"
        :class="['tab', { active: currentView === view.id }]"
      >
        {{ view.label }}
      </button>
    </nav>
    <main class="main">
      <component
        :is="currentViewComponent"
        :ref="viewRef"
        @edit="handleEdit"
        @note-edit="handleNoteEdit"
        @promoted="handlePromoted"
        @completed="handleCompleted"
      />
    </main>
    <TaskForm
      :show="showTaskForm"
      :task="editingTask"
      @submit="handleTaskSubmit"
      @close="handleFormClose"
    />
    <NoteEditor
      :show="showNoteEditor"
      :task="editingNoteTask"
      @save="handleNoteSave"
      @close="handleNoteEditorClose"
    />
    <div v-if="showTagsView" class="modal-overlay" @click.self="showTagsView = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>タグ管理</h2>
          <button @click="showTagsView = false" class="btn btn-icon btn-close">×</button>
        </div>
        <TagsView :ref="tagsViewRef" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import TaskForm from './components/TaskForm.vue'
import NoteEditor from './components/NoteEditor.vue'
import TagsView from './views/TagsView.vue'
import InboxView from './views/InboxView.vue'
import TodayView from './views/TodayView.vue'
import BacklogView from './views/BacklogView.vue'
import DoneView from './views/DoneView.vue'
import { createTask, updateTask, updateTaskNote } from './api'
import { TaskStatusValues } from './types'
import type { Task, TaskCreate, TaskUpdate, TaskView } from './types'

const views = [
  { id: 'inbox' as TaskView, label: 'Inbox', component: InboxView },
  { id: 'backlog' as TaskView, label: 'Backlog', component: BacklogView },
  { id: 'today' as TaskView, label: 'Today', component: TodayView },
  { id: 'done' as TaskView, label: 'Done', component: DoneView },
]

const currentView = ref<TaskView>('inbox')
const showTaskForm = ref(false)
const showTagsView = ref(false)
const showNoteEditor = ref(false)
const editingTask = ref<Task | null>(null)
const editingNoteTask = ref<Task | null>(null)
const viewRef = ref<{ refresh?: () => Promise<void> } | null>(null)
const tagsViewRef = ref<{ refresh?: () => Promise<void> } | null>(null)

const currentViewComponent = computed(() => {
  const view = views.find((v) => v.id === currentView.value)
  return view?.component || InboxView
})

watch(currentView, () => {
  // ビューが切り替わったらリフレッシュ
  refreshCurrentView()
})

watch(showTagsView, async (newVal) => {
  if (newVal && tagsViewRef.value?.refresh) {
    await tagsViewRef.value.refresh()
  }
})

async function refreshCurrentView() {
  if (viewRef.value?.refresh) {
    await viewRef.value.refresh()
  }
}

function handleEdit(task: Task) {
  editingTask.value = task
  showTaskForm.value = true
}

async function handleTaskSubmit(data: TaskCreate | TaskUpdate) {
  try {
    if (editingTask.value) {
      await updateTask(editingTask.value.id, data as TaskUpdate)
    } else {
      const created = await createTask(data as TaskCreate)
      // 新規作成時は、適切なビューに自動移動
      if (created.today_rank) {
        currentView.value = 'today'
      } else if (created.status === TaskStatusValues.inbox) {
        currentView.value = 'inbox'
      } else if (created.status === TaskStatusValues.done) {
        currentView.value = 'done'
      } else {
        currentView.value = 'backlog'
      }
    }
    showTaskForm.value = false
    editingTask.value = null
    await refreshCurrentView()
  } catch (error) {
    alert(error instanceof Error ? error.message : '保存に失敗しました')
  }
}

function handleFormClose() {
  showTaskForm.value = false
  editingTask.value = null
}

function handlePromoted() {
  // Inbox から promote されたら Backlog に移動
  if (currentView.value === 'inbox') {
    currentView.value = 'backlog'
  }
}

function handleCompleted() {
  // タスクが完了したら Done ビューに移動
  currentView.value = 'done'
}

function handleNoteEdit(task: Task) {
  editingNoteTask.value = task
  showNoteEditor.value = true
}

async function handleNoteSave(taskId: number, note: string) {
  try {
    await updateTaskNote(taskId, note)
    showNoteEditor.value = false
    editingNoteTask.value = null
    await refreshCurrentView()
  } catch (error) {
    alert(error instanceof Error ? error.message : 'メモの保存に失敗しました')
  }
}

function handleNoteEditorClose() {
  showNoteEditor.value = false
  editingNoteTask.value = null
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--header-bg);
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.title {
  margin: 0;
  font-size: 1.5em;
  font-weight: 600;
}

.tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-color);
}

.tab {
  padding: 12px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1em;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab:hover {
  color: var(--text-color);
  background: var(--hover-bg);
}

.tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  font-weight: 500;
}

.main {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-color);
}

.btn {
  padding: 8px 16px;
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

.btn-icon {
  background: transparent;
  border: none;
  padding: 8px;
  font-size: 1.2em;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: var(--hover-bg);
}

.btn-close {
  font-size: 1.5em;
  line-height: 1;
  padding: 4px 8px;
}

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
}

.modal-content {
  background: var(--card-bg);
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.2em;
}

.modal-content :deep(.tags-view) {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}
</style>
