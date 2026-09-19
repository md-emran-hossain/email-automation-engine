import { Upload, UserPlus } from 'lucide-react';
import { useState } from 'react';

import AddSingleContact from './components/AddSingleContact';
import ImportFromCsv from './ImportFromCsv';

type Tab = 'import' | 'single';

const TAB_BUTTON =
  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors';
const TAB_ACTIVE = 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400';
const TAB_INACTIVE =
  'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300';

export default function NewContact() {
  const [tab, setTab] = useState<Tab>('import');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add contacts</h1>
      <div className="flex gap-1 border-b border-gray-200 dark:border-zinc-800">
        <button
          onClick={() => setTab('import')}
          className={`${TAB_BUTTON} ${tab === 'import' ? TAB_ACTIVE : TAB_INACTIVE}`}
        >
          <Upload className="w-4 h-4" />
          Import from CSV
        </button>
        <button
          onClick={() => setTab('single')}
          className={`${TAB_BUTTON} ${tab === 'single' ? TAB_ACTIVE : TAB_INACTIVE}`}
        >
          <UserPlus className="w-4 h-4" />
          Add single contact
        </button>
      </div>

      {tab === 'import' ? <ImportFromCsv /> : <AddSingleContact />}
    </div>
  );
}
