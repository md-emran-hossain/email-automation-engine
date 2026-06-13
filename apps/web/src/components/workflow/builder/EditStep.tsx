import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type WorkflowStepResponse,
  STEP_ACTIONS,
  StepFormSchema,
  type StepFormData,
  TIME_UNITS,
} from '@email-automation-engine/shared';
import { useWorkflowSteps } from '../../../pages/workflow/hooks/useWorkflowSteps';
import Delay from './steps/Delay';
import Email from './steps/Email';
import Tag from './steps/Tag';
import Webhook from './steps/Webhook';
import StepConditionsEditor, { type StepConditionsEditorRef } from './StepConditionsEditor';

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
  const conditionsRef = useRef<StepConditionsEditorRef>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<StepFormData>({
    resolver: zodResolver(StepFormSchema),
    defaultValues: {
      action: step.action,
      configString: JSON.stringify(step.config || {}, null, 2),
      config: {
        amount: (step.config as StepConfigPayload)?.amount || 15,
        unit: (step.config as StepConfigPayload)?.unit || TIME_UNITS.MINUTES,
        templateId: (step.config as StepConfigPayload)?.templateId || '',
        tagId: (step.config as StepConfigPayload)?.tagId || '',
      },
    },
  });

  const selectedAction = watch('action');
  const { updateStep, deleteStep } = useWorkflowSteps(workflowId);

  const onSubmit = (data: StepFormData) => {
    if (data.action === STEP_ACTIONS.CONDITIONAL_SPLIT) {
      conditionsRef.current?.save();
      return;
    }

    let finalConfig: Record<string, unknown> = {};

    switch (data.action) {
      case STEP_ACTIONS.DELAY:
        finalConfig = { amount: Number(data.config?.amount), unit: data.config?.unit };
        break;
      case STEP_ACTIONS.SEND_EMAIL:
        finalConfig = { templateId: data.config?.templateId };
        break;
      case STEP_ACTIONS.ATTACH_TAG:
      case STEP_ACTIONS.DETACH_TAG:
        finalConfig = { tagId: data.config?.tagId };
        break;
      case STEP_ACTIONS.WEBHOOK:
      default:
        try {
          finalConfig = JSON.parse(data.configString || '{}') as Record<string, unknown>;

          if (data.action === STEP_ACTIONS.WEBHOOK) {
            if (typeof finalConfig.url !== 'string' || !finalConfig.url.trim()) {
              setError('configString', {
                type: 'manual',
                message: 'A valid "url" is required in the JSON configuration for a webhook.',
              });
              return;
            }
            try {
              new URL(finalConfig.url);
            } catch {
              setError('configString', {
                type: 'manual',
                message: 'The "url" provided in the JSON configuration must be a valid URL.',
              });
              return;
            }
          }
        } catch (e) {
          setError('configString', {
            type: 'manual',
            message:
              e instanceof Error
                ? `Invalid JSON configuration: ${e.message}`
                : 'Invalid JSON configuration',
          });
          return;
        }
        break;
    }

    updateStep.mutate(
      { stepId: step.id, payload: { action: data.action, config: finalConfig } },
      {
        onSuccess,
        onError: (err) => setError('root', { message: err.message || 'Failed to update step' }),
      },
    );
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      className="space-y-4 flex flex-col h-full"
      noValidate
    >
      <div className="flex-1 space-y-4">
        {errors.root && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-200 dark:border-red-900/50">
            {errors.root.message}
          </div>
        )}
        <input type="hidden" {...register('action')} />

        {selectedAction === STEP_ACTIONS.DELAY && (
          <Delay register={register} watch={watch} errors={errors} isActive={isActive} />
        )}

        {selectedAction === STEP_ACTIONS.SEND_EMAIL && (
          <Email register={register} isActive={isActive} />
        )}

        {(selectedAction === STEP_ACTIONS.ATTACH_TAG ||
          selectedAction === STEP_ACTIONS.DETACH_TAG) && (
          <Tag register={register} isActive={isActive} />
        )}

        {selectedAction === STEP_ACTIONS.CONDITIONAL_SPLIT && (
          <StepConditionsEditor
            ref={conditionsRef}
            workflowId={workflowId}
            stepId={step.id}
            isActive={isActive}
            onSuccess={onSuccess}
          />
        )}

        {selectedAction === STEP_ACTIONS.WEBHOOK && (
          <Webhook register={register} errors={errors} isActive={isActive} />
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
          onClick={() =>
            deleteStep.mutate(step.id, {
              onSuccess,
              onError: (err) =>
                setError('root', { message: err.message || 'Failed to delete step' }),
            })
          }
          disabled={isActive || deleteStep.isPending}
          className="py-2 px-4 bg-white dark:bg-zinc-800 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
        >
          {deleteStep.isPending ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </form>
  );
}
