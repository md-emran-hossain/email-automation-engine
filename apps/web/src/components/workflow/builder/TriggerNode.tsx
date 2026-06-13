import { Handle, Position } from '@xyflow/react';
import { type WorkflowTriggerResponse, TRIGGER_EVENTS } from '@email-automation-engine/shared';
import { Zap } from 'lucide-react';
import { useTags } from '../../../pages/workflow/hooks/useTags';

export function TriggerNode({
  data,
}: {
  data: {
    trigger: WorkflowTriggerResponse;
  };
}) {
  const { trigger } = data;
  const { data: tags = [] } = useTags();

  const eventName = trigger.event;

  let subtitle = 'All contacts';
  switch (trigger.event) {
    case TRIGGER_EVENTS.TAG_ATTACHED:
    case TRIGGER_EVENTS.TAG_DETACHED: {
      const tagId = trigger.filters?.tagId;
      if (tagId) {
        const tag = tags.find((t) => t.id === tagId);
        if (tag) subtitle = tag.name;
      } else {
        subtitle = 'Configure trigger';
      }
      break;
    }
  }

  return (
    <div className="w-[280px] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm px-4 py-3 group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors relative">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-400">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">{eventName}</h4>
          <p className="text-xs text-gray-500 dark:text-zinc-400 truncate max-w-[200px]">
            {subtitle}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}
