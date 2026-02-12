import type { Task } from './types';

const JST_TIMEZONE = 'Asia/Tokyo';

/**
 * UTC ISO文字列をJSTの日付文字列(YYYY-MM-DD)に変換
 */
export function formatDateDisplay(isoStr: string): string {
	return new Intl.DateTimeFormat('ja-JP', {
		timeZone: JST_TIMEZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date(isoStr));
}

/**
 * UTC ISO文字列をJSTの相対日付表現に変換（今日、明日、昨日、N日後、N日前）
 */
export function formatDateRelative(isoStr: string): string {
	const now = new Date();
	const target = new Date(isoStr);

	// JST基準で日付部分のみ比較
	const nowJst = new Date(
		now.toLocaleString('en-US', { timeZone: JST_TIMEZONE })
	);
	const targetJst = new Date(
		target.toLocaleString('en-US', { timeZone: JST_TIMEZONE })
	);

	const nowDate = new Date(nowJst.getFullYear(), nowJst.getMonth(), nowJst.getDate());
	const targetDate = new Date(targetJst.getFullYear(), targetJst.getMonth(), targetJst.getDate());
	const diffDays = Math.round((targetDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return '今日';
	if (diffDays === 1) return '明日';
	if (diffDays === -1) return '昨日';
	if (diffDays > 0 && diffDays <= 7) return `${diffDays}日後`;
	if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}日前`;

	return formatDateDisplay(isoStr);
}

/**
 * UTC ISO文字列を<input type="date">用のYYYY-MM-DD（JST）に変換
 */
export function toDateInputValue(isoStr: string): string {
	return new Date(isoStr)
		.toLocaleDateString('sv-SE', { timeZone: JST_TIMEZONE });
}

/**
 * <input type="date">のYYYY-MM-DD（JST）をUTC ISO文字列に変換
 * JSTの00:00:00をUTCに変換
 */
export function fromDateInputValue(dateStr: string): string {
	return new Date(dateStr + 'T00:00:00+09:00').toISOString();
}

/**
 * タスクが期限切れかどうか判定
 * due_at < 現在時刻 AND status != done
 */
export function isOverdue(task: Task): boolean {
	if (!task.due_at || task.status === 'done') return false;
	return new Date(task.due_at) < new Date();
}

/**
 * タスクのソート関数
 * 1. due_at 昇順（近い順、nullは末尾）
 * 2. updated_at 降順（新しい順）
 * 3. id 昇順
 */
export function sortTasks(a: Task, b: Task): number {
	// 1. due_at ascending (null last)
	if (a.due_at && b.due_at) {
		const diff = new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
		if (diff !== 0) return diff;
	} else if (a.due_at && !b.due_at) {
		return -1;
	} else if (!a.due_at && b.due_at) {
		return 1;
	}

	// 2. updated_at descending (newer first)
	const updatedDiff = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
	if (updatedDiff !== 0) return updatedDiff;

	// 3. id ascending
	return a.id - b.id;
}
