interface EmptyCanvasProps {
  show: boolean;
  onAddTrigger: () => void;
  isAddingTrigger: boolean;
}

import { MousePointerClick } from 'lucide-react';

export default function EmptyCanvas({ show, onAddTrigger, isAddingTrigger }: EmptyCanvasProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
      <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur p-8 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xl text-center pointer-events-auto max-w-sm">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <MousePointerClick className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Start building</h3>
        <p className="text-gray-500 dark:text-zinc-400 mb-6 text-sm">
          Every automation starts with a trigger. What should kick off this workflow?
        </p>
        <button
          onClick={onAddTrigger}
          disabled={isAddingTrigger}
          className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isAddingTrigger ? 'Adding...' : 'Add your first trigger'}
        </button>
      </div>
    </div>
  );
}
