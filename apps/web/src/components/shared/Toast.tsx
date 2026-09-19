import { AlertTriangle, CheckCircle, Loader2, X } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';

import { getToasts, subscribe, toast } from '../../lib/toast';

const variantConfig = {
  success: {
    Icon: CheckCircle,
    iconClass: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  },
  error: {
    Icon: AlertTriangle,
    iconClass: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  },
  loading: {
    Icon: Loader2,
    iconClass: 'text-blue-500 animate-spin',
    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  },
};

export default function ToastContainer() {
  const toasts = useSyncExternalStore(subscribe, getToasts);

  useEffect(() => {
    const timers = toasts
      .filter((t) => t.variant !== 'loading')
      .map((t) => setTimeout(() => toast.dismiss(t.id), 3000));

    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const { Icon, iconClass, bg } = variantConfig[t.variant];

        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right-full duration-300 ${bg}`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${iconClass}`} />
            <p className="text-sm text-gray-900 dark:text-white flex-1">{t.message}</p>
            {t.variant !== 'loading' && (
              <button
                onClick={() => toast.dismiss(t.id)}
                className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
