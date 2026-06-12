import { Handle, Position } from '@xyflow/react';
import { Plus } from 'lucide-react';

export function AddTrigger({
  data,
}: {
  data: {
    onAddTrigger: () => void;
  };
}) {
  return (
    <div
      className="w-[280px] py-3 bg-transparent border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl flex items-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors group px-4"
      onClick={data.onAddTrigger}
    >
      <div className="flex items-center justify-start gap-3 w-full">
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 group-hover:text-indigo-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
          <Plus className="w-5 h-5" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-sm font-medium text-gray-600 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            Add trigger
          </span>
          <p className="text-xs text-gray-400 dark:text-zinc-500 group-hover:text-indigo-400/80 transition-colors">
            Maximum 3 triggers
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-300 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900 !opacity-0"
        isConnectable={false}
      />
    </div>
  );
}
