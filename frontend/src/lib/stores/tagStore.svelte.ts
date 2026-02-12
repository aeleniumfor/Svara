import * as api from '$lib/api';
import type { Tag } from '$lib/types';

let allTags = $state<Tag[]>([]);
let selectedTagIds = $state<number[]>([]);
let loading = $state(false);

export const tagStore = {
	get tags() {
		return allTags;
	},
	get selectedTagIds() {
		return selectedTagIds;
	},
	get loading() {
		return loading;
	},
	get hasFilter() {
		return selectedTagIds.length > 0;
	},

	async loadTags() {
		loading = true;
		try {
			allTags = await api.fetchTags();
		} finally {
			loading = false;
		}
	},

	toggleTag(id: number) {
		if (selectedTagIds.includes(id)) {
			selectedTagIds = selectedTagIds.filter((tid) => tid !== id);
		} else {
			selectedTagIds = [...selectedTagIds, id];
		}
	},

	clearFilter() {
		selectedTagIds = [];
	},

	isSelected(id: number): boolean {
		return selectedTagIds.includes(id);
	},

	async createTag(name: string) {
		loading = true;
		try {
			await api.createTag(name);
			// Reload tags after creation
			await this.loadTags();
		} finally {
			loading = false;
		}
	},

	async deleteTag(id: number) {
		loading = true;
		try {
			await api.deleteTag(id);
			// Remove from selectedTagIds if it was selected
			selectedTagIds = selectedTagIds.filter((tid) => tid !== id);
			// Reload tags after deletion
			await this.loadTags();
		} finally {
			loading = false;
		}
	}
};
