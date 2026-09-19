import { type WorkflowResponse } from '@email-automation-engine/shared';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  Clock,
  Edit2,
  MoreVertical,
  Trash2,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

function WorkflowListItem({
  workflow,
  onDelete,
}: {
  workflow: WorkflowResponse;
  onDelete: (id: string) => void;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <li
      className={`first:rounded-t-xl last:rounded-b-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center pr-4 relative ${isDropdownOpen ? 'z-20' : 'z-0'}`}
    >
      <Link to={`/workflows/${workflow.id}`} className="block p-4 sm:px-6 flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate overflow-hidden">
                {workflow.name}
              </p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                  workflow.isActive
                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50'
                    : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                }`}
              >
                {workflow.isActive ? (
                  <>
                    <Activity className="w-3 h-3 mr-1" />
                    Active
                  </>
                ) : (
                  'Draft'
                )}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 truncate mb-2">
              {workflow.description || 'No description provided'}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-zinc-500 font-medium">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Updated {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
              </div>
            </div>
          </div>
        </div>
      </Link>

      <div className="relative ml-4 shrink-0" ref={dropdownRef}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDropdownOpen(!isDropdownOpen);
          }}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          title="Actions"
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-700 py-1 z-20">
            <Link
              to={`/workflows/${workflow.id}`}
              className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700/50 flex items-center transition-colors"
            >
              <WorkflowIcon className="w-4 h-4 mr-2" />
              Open builder
            </Link>
            <Link
              to={`/workflows/${workflow.id}/summary`}
              className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700/50 flex items-center transition-colors"
            >
              <Activity className="w-4 h-4 mr-2" />
              Execution summary
            </Link>
            <Link
              to={`/workflows/${workflow.id}/edit`}
              className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700/50 flex items-center transition-colors"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit workflow
            </Link>
            <div className="h-px bg-gray-100 dark:bg-zinc-700 my-1"></div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDropdownOpen(false);
                onDelete(workflow.id);
              }}
              className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete workflow
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export default function Workflows({
  workflows,
  onDelete,
}: {
  workflows: WorkflowResponse[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl">
      <ul className="divide-y divide-gray-100 dark:divide-zinc-800/50">
        {workflows.map((workflow) => (
          <WorkflowListItem key={workflow.id} workflow={workflow} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  );
}
