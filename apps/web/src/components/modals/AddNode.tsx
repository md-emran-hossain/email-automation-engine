import { SUPPORTED_STEP_ACTIONS } from '@email-automation-engine/shared';
import { X } from 'lucide-react';

interface AddNodeProps {
  config: { parentId: string | null; branch: 'linear' | true | false } | null;
  onClose: () => void;
  onSelectAction: (
    action: string,
    parentId: string | null,
    branch: 'linear' | true | false,
  ) => void;
  isPending: boolean;
}

export default function AddNode({ config, onClose, onSelectAction, isPending }: AddNodeProps) {
  if (!config) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Choose step</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          {SUPPORTED_STEP_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => {
                onSelectAction(action, config.parentId, config.branch);
              }}
              disabled={isPending}
              className="flex flex-col items-start p-4 bg-gray-50 dark:bg-zinc-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors text-left disabled:opacity-50"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {action.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase())}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
