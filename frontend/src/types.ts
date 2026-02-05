// Task Status
export type TaskStatus = 'inbox' | 'next' | 'doing' | 'waiting' | 'done'

export const TaskStatusValues = {
  inbox: 'inbox',
  next: 'next',
  doing: 'doing',
  waiting: 'waiting',
  done: 'done',
} as const

// Tag
export interface Tag {
  id: number
  name: string
  key: string
  created_at: string
}

// Task
export interface Task {
  id: number
  title: string
  note: string | null
  status: TaskStatus
  due_at: string | null
  today_rank: number | null
  created_at: string
  updated_at: string
  done_at: string | null
  tags: Tag[]
}

// Task Create
export interface TaskCreate {
  title: string
  note?: string | null
  status?: TaskStatus
  due_at?: string | null
  today_rank?: number | null
  tag_ids?: number[]
}

// Task Update
export interface TaskUpdate {
  title?: string
  note?: string | null
  status?: TaskStatus
  due_at?: string | null
  today_rank?: number | null
  tag_ids?: number[] | null
}

// Tag Create
export interface TagCreate {
  name: string
}

// View type
export type TaskView = 'inbox' | 'today' | 'backlog' | 'done'
