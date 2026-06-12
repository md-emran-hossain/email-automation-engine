import {
  type WorkflowStepResponse,
  type WorkflowTriggerResponse,
} from '@email-automation-engine/shared';
import EditTrigger, { TRIGGER_EVENT_LABELS } from './EditTrigger';
import EditStep, { STEP_ACTION_LABELS } from './EditStep';
import { X } from 'lucide-react';

interface WorkflowSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode:
    | { type: 'trigger'; data: WorkflowTriggerResponse }
    | { type: 'step'; data: WorkflowStepResponse }
    | null;
  workflowId: string;
  isActive: boolean;
  triggersCount: number;
}

export default function Sidebar({
  isOpen,
  onClose,
  selectedNode,
  workflowId,
  isActive,
  triggersCount,
}: WorkflowSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-800 shadow-xl flex flex-col z-10 transition-transform">
      <div className="h-14 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between px-4 shrink-0">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {selectedNode?.type === 'trigger'
            ? TRIGGER_EVENT_LABELS[selectedNode.data.event] || 'Trigger'
            : selectedNode?.type === 'step'
              ? STEP_ACTION_LABELS[selectedNode.data.action] || 'Step'
              : 'Settings'}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedNode ? (
          <div className="text-sm text-gray-500">Select a node to configure</div>
        ) : selectedNode.type === 'trigger' ? (
          <EditTrigger
            key={`trigger-${selectedNode.data.id}`}
            trigger={selectedNode.data}
            workflowId={workflowId}
            isActive={isActive}
            onSuccess={onClose}
            canDelete={triggersCount > 1}
          />
        ) : (
          <EditStep
            key={`step-${selectedNode.data.id}`}
            step={selectedNode.data}
            workflowId={workflowId}
            isActive={isActive}
            onSuccess={onClose}
          />
        )}
      </div>
    </div>
  );
}
