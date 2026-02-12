export interface ToastAction {
	label: string;
	callback: () => void;
}

export interface ToastMessage {
	id: number;
	message: string;
	type: 'info' | 'error' | 'warning' | 'success';
	action?: ToastAction;
}

let toasts = $state<ToastMessage[]>([]);
let nextId = 0;

export const toastStore = {
	get toasts() {
		return toasts;
	},

	add(
		message: string,
		type: ToastMessage['type'] = 'info',
		action?: ToastAction
	) {
		const id = nextId++;
		toasts = [...toasts, { id, message, type, action }];

		setTimeout(() => {
			this.remove(id);
		}, 5000);

		return id;
	},

	remove(id: number) {
		toasts = toasts.filter((t) => t.id !== id);
	},

	clear() {
		toasts = [];
	}
};
