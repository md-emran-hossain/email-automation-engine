import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WorkflowsHeader() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflows</h1>
        <Link
          to="/workflows/create"
          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-600 dark:border-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add New
        </Link>
      </div>
    </div>
  );
}
