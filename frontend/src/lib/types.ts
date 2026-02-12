export type TaskStatus = 'backlog' | 'doing' | 'waiting' | 'done';

export interface Tag {
	id: number;
	name: string;
	key: string;
	created_at: string;
}

export interface Task {
	id: number;
	title: string;
	note: string | null;
	status: TaskStatus;
	due_at: string | null;
	created_at: string;
	updated_at: string;
	done_at: string | null;
	tags: Tag[];
}

export interface TaskCreate {
	title: string;
	note?: string | null;
	status?: TaskStatus;
	due_at?: string | null;
	tag_ids?: number[];
}

export interface TaskUpdate {
	title?: string | null;
	note?: string | null;
	status?: TaskStatus | null;
	due_at?: string | null;
	tag_ids?: number[] | null;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
	backlog: 'Backlog',
	doing: 'Doing',
	waiting: 'Waiting',
	done: 'Done'
};

export const STATUS_ORDER: TaskStatus[] = ['backlog', 'doing', 'waiting', 'done'];
