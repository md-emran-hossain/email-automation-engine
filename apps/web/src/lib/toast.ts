type ToastVariant = 'success' | 'error' | 'loading';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

let toasts: Toast[] = [];
let listeners: Array<() => void> = [];
let counter = 0;

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function addToast(message: string, variant: ToastVariant): string {
  const id = String(++counter);
  toasts = [...toasts, { id, message, variant }];
  emitChange();
  return id;
}

function updateToast(id: string, message: string, variant: ToastVariant) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, message, variant } : t));
  emitChange();
}

function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emitChange();
}

export const toast = {
  loading: (message: string) => addToast(message, 'loading'),
  success: (message: string, id?: string) => {
    if (id) {
      updateToast(id, message, 'success');
    } else {
      addToast(message, 'success');
    }
  },
  error: (message: string, id?: string) => {
    if (id) {
      updateToast(id, message, 'error');
    } else {
      addToast(message, 'error');
    }
  },
  dismiss: dismissToast,
};

export function getToasts() {
  return toasts;
}

export function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
