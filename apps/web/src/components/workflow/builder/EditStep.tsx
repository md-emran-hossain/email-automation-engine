import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type WorkflowStepResponse,
  STEP_ACTIONS,
  StepFormSchema,
  type StepFormData,
} from '@email-automation-engine/shared';
import { useWorkflowSteps } from '../../../pages/workflow/hooks/useWorkflowSteps';
import { useEmailTemplates } from '../../../pages/workflow/hooks/useEmailTemplates';
import { useTags } from '../../../pages/workflow/hooks/useTags';

export const STEP_ACTION_LABELS: Record<string, string> = {
  [STEP_ACTIONS.DELAY]: 'Delay',
  [STEP_ACTIONS.SEND_EMAIL]: 'Send email',
  [STEP_ACTIONS.ATTACH_TAG]: 'Attach tag',
  [STEP_ACTIONS.DETACH_TAG]: 'Detach tag',
  [STEP_ACTIONS.UNSUBSCRIBE_CONTACT]: 'Unsubscribe contact',
  [STEP_ACTIONS.DELETE_CONTACT]: 'Delete contact',
  [STEP_ACTIONS.CONDITIONAL_SPLIT]: 'Conditional split',
  [STEP_ACTIONS.WEBHOOK]: 'Webhook',
};

interface StepConfigPayload {
  amount?: number;
  unit?: string;
  templateId?: string;
  tagId?: string;
}

interface StepFormProps {
  step: WorkflowStepResponse;
  workflowId: string;
  isActive: boolean;
  onSuccess: () => void;
}

export default function EditStep({ step, workflowId, isActive, onSuccess }: StepFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<StepFormData>({
    resolver: zodResolver(StepFormSchema),
    defaultValues: {
      action: step.action,
      configString: JSON.stringify(step.config || {}, null, 2),
      config: {
        amount: (step.config as StepConfigPayload)?.amount || 15,
        unit: (step.config as StepConfigPayload)?.unit || 'minutes',
        templateId: (step.config as StepConfigPayload)?.templateId || '',
        tagId: (step.config as StepConfigPayload)?.tagId || '',
      },
    },
  });

  const selectedAction = watch('action');

  const { updateStep, deleteStep } = useWorkflowSteps(workflowId);

  const { data: templates = [] } = useEmailTemplates({
    enabled: selectedAction === STEP_ACTIONS.SEND_EMAIL,
  });

  const { data: tags = [] } = useTags({
    enabled:
      selectedAction === STEP_ACTIONS.ATTACH_TAG ||
      selectedAction === STEP_ACTIONS.DETACH_TAG ||
      selectedAction === STEP_ACTIONS.CONDITIONAL_SPLIT,
  });

  const onSubmit = (data: StepFormData) => {
    let finalConfig: Record<string, unknown> = {};

    // Build config based on selected action
    if (data.action === STEP_ACTIONS.DELAY) {
      finalConfig = {
        amount: Number(data.config?.amount),
        unit: data.config?.unit,
      };
    } else if (data.action === STEP_ACTIONS.SEND_EMAIL) {
      finalConfig = { templateId: data.config?.templateId };
    } else if (data.action === STEP_ACTIONS.ATTACH_TAG || data.action === STEP_ACTIONS.DETACH_TAG) {
      finalConfig = { tagId: data.config?.tagId };
    } else {
      try {
        finalConfig = JSON.parse(data.configString || '{}') as Record<string, unknown>;
      } catch {
        /* ignore parsing error */
      }
    }

    updateStep.mutate(
      { stepId: step.id, payload: { action: data.action, config: finalConfig } },
      { onSuccess },
    );
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      className="space-y-4 flex flex-col h-full"
      noValidate
    >
      <div className="flex-1 space-y-4">
        <input type="hidden" {...register('action')} />

        {selectedAction === STEP_ACTIONS.DELAY && (
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                Wait for
              </label>
              <input
                type="number"
                {...register('config.amount')}
                min={watch('config.unit') === 'minutes' ? 15 : 1}
                step={watch('config.unit') === 'minutes' ? 15 : 1}
                disabled={isActive}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50 ${
                  errors.config?.amount
                    ? 'border-red-300 dark:border-red-900 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-zinc-700'
                }`}
              />
              {errors.config?.amount && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.config.amount.message as string}
                </p>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                Time unit
              </label>
              <select
                {...register('config.unit')}
                disabled={isActive}
                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>
          </div>
        )}

        {selectedAction === STEP_ACTIONS.SEND_EMAIL && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
              Email template
            </label>
            <select
              {...register('config.templateId')}
              disabled={isActive}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value="">Select a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(selectedAction === STEP_ACTIONS.ATTACH_TAG ||
          selectedAction === STEP_ACTIONS.DETACH_TAG) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
              Select tag
            </label>
            <select
              {...register('config.tagId')}
              disabled={isActive}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value="">Select a tag...</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(selectedAction === STEP_ACTIONS.CONDITIONAL_SPLIT ||
          selectedAction === STEP_ACTIONS.WEBHOOK) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
              Configuration (JSON)
            </label>
            <textarea
              {...register('configString')}
              disabled={isActive}
              rows={10}
              className="w-full font-mono text-sm px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
              placeholder="{}"
            />
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-zinc-800 flex gap-3">
        <button
          type="submit"
          disabled={isActive || isSubmitting || updateStep.isPending}
          className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting || updateStep.isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => deleteStep.mutate(step.id, { onSuccess })}
          disabled={isActive || deleteStep.isPending}
          className="py-2 px-4 bg-white dark:bg-zinc-800 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
        >
          {deleteStep.isPending ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </form>
  );
}
