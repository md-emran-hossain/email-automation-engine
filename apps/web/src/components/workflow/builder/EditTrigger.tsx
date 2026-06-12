import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type WorkflowTriggerResponse,
  TRIGGER_EVENTS,
  TriggerFormSchema,
  type TriggerFormData,
  type UpdateWorkflowTriggerDto,
} from '@email-automation-engine/shared';
import { useWorkflowTriggers } from '../../../pages/workflow/hooks/useWorkflowTriggers';
import { useTags } from '../../../pages/workflow/hooks/useTags';

interface TriggerFormProps {
  trigger: WorkflowTriggerResponse;
  workflowId: string;
  isActive: boolean;
  onSuccess: () => void;
  canDelete: boolean;
}

export const TRIGGER_EVENT_LABELS: Record<string, string> = {
  [TRIGGER_EVENTS.CONTACT_SUBSCRIBED]: 'Contact subscribed',
  [TRIGGER_EVENTS.CONTACT_UNSUBSCRIBED]: 'Contact unsubscribed',
  [TRIGGER_EVENTS.TAG_ATTACHED]: 'Tag attached',
  [TRIGGER_EVENTS.TAG_DETACHED]: 'Tag detached',
  [TRIGGER_EVENTS.EMAIL_SENT]: 'Email sent',
  [TRIGGER_EVENTS.EMAIL_DELIVERED]: 'Email delivered',
  [TRIGGER_EVENTS.EMAIL_BOUNCED]: 'Email bounced',
  [TRIGGER_EVENTS.EMAIL_COMPLAINED]: 'Email complained',
  [TRIGGER_EVENTS.EMAIL_OPENED]: 'Email opened',
  [TRIGGER_EVENTS.EMAIL_LINK_CLICKED]: 'Email link clicked',
  [TRIGGER_EVENTS.CUSTOM_EVENT]: 'Custom event',
};

export default function EditTrigger({
  trigger,
  workflowId,
  isActive,
  onSuccess,
  canDelete,
}: TriggerFormProps) {
  const { register, handleSubmit, watch } = useForm<TriggerFormData>({
    resolver: zodResolver(TriggerFormSchema),
    defaultValues: {
      event: trigger.event,
      tagId: (trigger.filters?.tagId as string) || '',
    },
  });

  const selectedEvent = watch('event');

  const { data: tags = [] } = useTags({
    enabled:
      selectedEvent === TRIGGER_EVENTS.TAG_ATTACHED ||
      selectedEvent === TRIGGER_EVENTS.TAG_DETACHED,
  });

  const { updateTrigger, deleteTrigger } = useWorkflowTriggers(workflowId);

  const onSubmit = (data: TriggerFormData) => {
    const payload: UpdateWorkflowTriggerDto = {
      event: data.event as UpdateWorkflowTriggerDto['event'],
    };
    if (data.event === TRIGGER_EVENTS.TAG_ATTACHED || data.event === TRIGGER_EVENTS.TAG_DETACHED) {
      payload.filters = { tagId: data.tagId };
    }

    updateTrigger.mutate({ triggerId: trigger.id, payload }, { onSuccess });
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      className="space-y-4 flex flex-col h-full"
    >
      <div className="flex-1 space-y-4">
        <input type="hidden" {...register('event')} />

        {(selectedEvent === TRIGGER_EVENTS.TAG_ATTACHED ||
          selectedEvent === TRIGGER_EVENTS.TAG_DETACHED) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
              Select tag
            </label>
            <select
              {...register('tagId')}
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
      </div>
      <div className="pt-4 border-t border-gray-200 dark:border-zinc-800 flex gap-3">
        <button
          type="submit"
          disabled={isActive || updateTrigger.isPending}
          className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {updateTrigger.isPending ? 'Saving...' : 'Save'}
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={() => deleteTrigger.mutate(trigger.id, { onSuccess })}
            disabled={isActive || deleteTrigger.isPending}
            className="py-2 px-4 bg-white dark:bg-zinc-800 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
          >
            {deleteTrigger.isPending ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </form>
  );
}
