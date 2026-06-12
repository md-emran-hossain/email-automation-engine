import { Handle, Position } from '@xyflow/react';
import {
  type WorkflowStepResponse,
  SUPPORTED_STEP_ACTIONS,
  STEP_ACTIONS,
} from '@email-automation-engine/shared';

import {
  Mail,
  Clock,
  GitBranch,
  Tag,
  Plus,
  Minus,
  UserX,
  UserMinus,
  Webhook,
  Settings,
} from 'lucide-react';

const ICONS: Record<string, React.ReactNode> = {
  [STEP_ACTIONS.SEND_EMAIL]: <Mail className="w-5 h-5" />,
  [STEP_ACTIONS.DELAY]: <Clock className="w-5 h-5" />,
  [STEP_ACTIONS.CONDITIONAL_SPLIT]: <GitBranch className="w-5 h-5" />,
  [STEP_ACTIONS.ATTACH_TAG]: (
    <div className="relative w-5 h-5 flex items-center justify-center">
      <Tag className="w-5 h-5" />
      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
        <Plus className="w-3 h-3" />
      </div>
    </div>
  ),
  [STEP_ACTIONS.DETACH_TAG]: (
    <div className="relative w-5 h-5 flex items-center justify-center">
      <Tag className="w-5 h-5" />
      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
        <Minus className="w-3 h-3" />
      </div>
    </div>
  ),
  [STEP_ACTIONS.DELETE_CONTACT]: <UserX className="w-5 h-5" />,
  [STEP_ACTIONS.UNSUBSCRIBE_CONTACT]: <UserMinus className="w-5 h-5" />,
  [STEP_ACTIONS.WEBHOOK]: <Webhook className="w-5 h-5" />,
  default: <Settings className="w-5 h-5" />,
};

export function StepNode({
  data,
}: {
  data: {
    step: WorkflowStepResponse;
  };
}) {
  const { step } = data;

  const isSplit = step.action === STEP_ACTIONS.CONDITIONAL_SPLIT;
  const label = SUPPORTED_STEP_ACTIONS.find((a) => a === step.action) || step.action;
  const icon = ICONS[step.action] || ICONS.default;

  return (
    <div className="w-[280px] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm px-4 py-3 group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors relative">
      <Handle type="target" position={Position.Top} className="!opacity-0" />

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-400">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            {label.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase())}
          </h4>
          <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
            {step.action === STEP_ACTIONS.DELAY
              ? `${(step.config as { amount?: number; unit?: string })?.amount} ${(step.config as { amount?: number; unit?: string })?.unit}`
              : 'Configure action'}
          </p>
        </div>
      </div>

      {isSplit ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!opacity-0 translate-x-[-40px]"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!opacity-0 translate-x-[40px]"
          />
        </>
      ) : (
        <>
          <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        </>
      )}
    </div>
  );
}
