import { Handle, Position } from '@xyflow/react';
import { Plus } from 'lucide-react';

export function AddStep({
  data,
}: {
  data: {
    parentId: string | null;
    branch: 'linear' | true | false;
    onAddNode: (parentId: string | null, branch: 'linear' | true | false) => void;
    isDragging?: boolean;
  };
}) {
  return (
    <div className="relative w-[60px] h-[60px] flex items-center justify-center">
      <Handle type="target" position={Position.Top} className="!opacity-0" isConnectable={false} />

      <button
        onClick={(e) => {
          e.stopPropagation();
          data.onAddNode(data.parentId, data.branch);
        }}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 shadow-sm cursor-pointer group border-2 border-dashed
          ${data.isDragging ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10 scale-[1.3] animate-pulse' : 'bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 hover:scale-110'}
        `}
        title="Add step"
      >
        <Plus
          className={`w-5 h-5 transition-colors ${data.isDragging ? 'text-indigo-500' : 'text-gray-400 dark:text-zinc-500 group-hover:text-indigo-500'}`}
        />
      </button>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0"
        isConnectable={false}
      />
    </div>
  );
}
