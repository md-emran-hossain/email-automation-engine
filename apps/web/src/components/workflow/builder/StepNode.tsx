import { Handle, Position } from '@xyflow/react';
import { useMemo } from 'react';
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

import { useEmailTemplates } from '../../../pages/workflow/hooks/useEmailTemplates';
import { useTags } from '../../../pages/workflow/hooks/useTags';

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
  const { data: tags = [] } = useTags();
  const { data: templates = [] } = useEmailTemplates();

  const isSplit = step.action === STEP_ACTIONS.CONDITIONAL_SPLIT;
  const label = SUPPORTED_STEP_ACTIONS.find((a) => a === step.action) || step.action;
  const icon = ICONS[step.action] || ICONS.default;

  const subtitle = useMemo(() => {
    switch (step.action) {
      case STEP_ACTIONS.DELAY: {
        const { amount, unit } = (step.config || {}) as { amount?: number; unit?: string };
        return amount ? `${amount} ${unit}` : 'Configure action';
      }
      case STEP_ACTIONS.SEND_EMAIL: {
        const { templateId } = (step.config || {}) as { templateId?: string };
        const template = templates.find((t) => t.id === templateId);
        return template ? template.name : 'Configure action';
      }
      case STEP_ACTIONS.ATTACH_TAG:
      case STEP_ACTIONS.DETACH_TAG: {
        const { tagId } = (step.config || {}) as { tagId?: string };
        const tag = tags.find((t) => t.id === tagId);
        return tag ? tag.name : 'Configure action';
      }
      case STEP_ACTIONS.CONDITIONAL_SPLIT:
        return 'Evaluates conditions';
      case STEP_ACTIONS.UNSUBSCRIBE_CONTACT:
      case STEP_ACTIONS.DELETE_CONTACT:
        return 'Current contact';
      default:
        return 'Configure action';
    }
  }, [step.action, step.config, tags, templates]);

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
          <p className="text-xs text-gray-500 dark:text-zinc-400 truncate max-w-[200px]">
            {subtitle}
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
