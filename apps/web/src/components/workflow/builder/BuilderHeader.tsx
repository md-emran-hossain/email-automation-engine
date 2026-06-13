import { Link } from 'react-router-dom';
import { type WorkflowResponse } from '@email-automation-engine/shared';
import { Settings } from 'lucide-react';

interface BuilderHeaderProps {
  workflow: WorkflowResponse;
  onToggleActive: () => void;
  isTogglingActive: boolean;
  onOpenExitConditions: () => void;
}

export default function BuilderHeader({
  workflow,
  onToggleActive,
  isTogglingActive,
  onOpenExitConditions,
}: BuilderHeaderProps) {
  return (
    <div className="h-14 border-b bg-white dark:bg-zinc-900 flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-4">
        <Link
          to="/workflows"
          className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          &larr; Back
        </Link>
        <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {workflow.name}
        </h2>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            workflow.isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          {workflow.isActive ? 'Active' : 'Draft'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenExitConditions}
          title="Workflow Settings"
          className="p-2 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleActive}
          disabled={isTogglingActive}
          className="px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {isTogglingActive ? 'Loading...' : workflow.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
}
