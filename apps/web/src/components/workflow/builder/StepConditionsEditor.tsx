import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useWorkflowStepConditions } from '../../../pages/workflow/hooks/useWorkflowStepConditions';
import { useTags } from '../../../pages/workflow/hooks/useTags';
import {
  LOGICAL_OPERATORS,
  type CreateWorkflowStepConditionDto,
  type LogicalOperator,
  CONDITION_TYPES,
  CONDITION_OPERATORS,
} from '@email-automation-engine/shared';

interface StepConditionsEditorProps {
  workflowId: string;
  stepId: string;
  isActive: boolean;
  onSuccess?: () => void;
}

export interface StepConditionsEditorRef {
  save: () => void;
}

const StepConditionsEditor = forwardRef<StepConditionsEditorRef, StepConditionsEditorProps>(
  ({ workflowId, stepId, isActive, onSuccess }, ref) => {
    const {
      conditions: savedConditions,
      replaceConditions,
      isLoading,
    } = useWorkflowStepConditions(workflowId, stepId);
    const { data: tags = [] } = useTags();

    const [conditions, setConditions] = useState<CreateWorkflowStepConditionDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [matchType, setMatchType] = useState<LogicalOperator>(LOGICAL_OPERATORS.ALL);

    useEffect(() => {
      if (savedConditions) {
        if (savedConditions.length > 0) {
          setMatchType(
            (savedConditions[0]?.logicalOperator as LogicalOperator) || LOGICAL_OPERATORS.ALL,
          );
        }
        setConditions(
          savedConditions.map((savedCondition) => ({
            logicalOperator:
              (savedCondition.logicalOperator as LogicalOperator) || LOGICAL_OPERATORS.ALL,
            type: savedCondition.type || CONDITION_TYPES.TAG_HAS,
            resource: savedCondition.resource || '',
            operator: savedCondition.operator || CONDITION_OPERATORS.EQUALS,
            value: savedCondition.value || '',
          })),
        );
      }
    }, [savedConditions]);

    const handleAddCondition = () => {
      setConditions([
        ...conditions,
        {
          logicalOperator: LOGICAL_OPERATORS.ALL,
          type: CONDITION_TYPES.TAG_HAS,
          resource: '',
          operator: CONDITION_OPERATORS.EQUALS,
          value: '',
        },
      ]);
    };

    const handleRemoveCondition = (index: number) => {
      setConditions(conditions.filter((_, i) => i !== index));
    };

    const handleChange = (
      index: number,
      field: keyof CreateWorkflowStepConditionDto,
      value: string,
    ) => {
      const newConditions = [...conditions];
      newConditions[index] = {
        ...newConditions[index],
        [field]: value,
      } as CreateWorkflowStepConditionDto;
      setConditions(newConditions);
      if (error) setError(null);
    };

    const handleSave = () => {
      const hasInvalid = conditions.some(
        (conditionItem) =>
          !conditionItem.type || !conditionItem.resource || !conditionItem.operator,
      );
      if (hasInvalid) {
        setError('Please complete all condition fields or remove empty ones before saving.');
        return;
      }
      setError(null);

      replaceConditions.mutate(
        conditions.map((conditionItem) => ({
          ...conditionItem,
          logicalOperator: matchType,
          value: conditionItem.value || null,
        })),
        {
          onSuccess: () => {
            if (onSuccess) onSuccess();
          },
          onError: (mutationError) =>
            setError(mutationError.message || 'Failed to update conditions.'),
        },
      );
    };

    useImperativeHandle(ref, () => ({
      save: handleSave,
    }));

    if (isLoading) {
      return <div className="text-sm text-gray-500 py-4 text-center">Loading conditions...</div>;
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
            Split Conditions
          </label>
          {!isActive && (
            <button
              type="button"
              onClick={handleAddCondition}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium border border-red-100 dark:border-red-900/50">
            {error}
          </div>
        )}

        {conditions.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
            <span>Match</span>
            <select
              value={matchType}
              onChange={(event) => setMatchType(event.target.value as LogicalOperator)}
              disabled={isActive}
              className="px-2 py-1 border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50 text-xs font-medium"
            >
              <option value={LOGICAL_OPERATORS.ALL}>ALL</option>
              <option value={LOGICAL_OPERATORS.ANY}>ANY</option>
              <option value={LOGICAL_OPERATORS.NONE}>NONE</option>
            </select>
            <span>of the following:</span>
          </div>
        )}

        {conditions.length === 0 ? (
          <div className="text-xs text-gray-500 dark:text-zinc-400 p-4 border border-dashed border-gray-300 dark:border-zinc-700 rounded-lg text-center bg-gray-50 dark:bg-zinc-800/50">
            No conditions defined. Contacts will always follow the{' '}
            <span className="text-red-400">false</span> path.
          </div>
        ) : (
          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg relative"
              >
                <div className="space-y-2 mt-1">
                  <select
                    value={condition.type}
                    onChange={(event) => handleChange(index, 'type', event.target.value)}
                    disabled={isActive}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    <option value={CONDITION_TYPES.TAG_HAS}>Has Tag</option>
                    <option value={CONDITION_TYPES.TAG_MISSING}>Missing Tag</option>
                    <option value={CONDITION_TYPES.CONTACT_FIELD}>Contact Field</option>
                  </select>

                  {condition.type.startsWith('tag_') ? (
                    <select
                      value={condition.resource}
                      onChange={(event) => handleChange(index, 'resource', event.target.value)}
                      disabled={isActive}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">Select a tag...</option>
                      {tags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={condition.resource}
                      onChange={(event) => handleChange(index, 'resource', event.target.value)}
                      disabled={isActive}
                      placeholder="Field name (e.g. status)"
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
                    />
                  )}

                  {!condition.type.startsWith('tag_') && (
                    <div className="flex gap-2">
                      <select
                        value={condition.operator}
                        onChange={(event) => handleChange(index, 'operator', event.target.value)}
                        disabled={isActive}
                        className="w-1/2 px-2 py-1.5 text-xs border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
                      >
                        <option value={CONDITION_OPERATORS.EQUALS}>Equals</option>
                        <option value={CONDITION_OPERATORS.NOT_EQUALS}>Not equals</option>
                        <option value={CONDITION_OPERATORS.CONTAINS}>Contains</option>
                      </select>
                      <input
                        type="text"
                        value={condition.value || ''}
                        onChange={(event) => handleChange(index, 'value', event.target.value)}
                        disabled={isActive}
                        placeholder="Value"
                        className="w-1/2 px-2 py-1.5 text-xs border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
                      />
                    </div>
                  )}
                </div>

                {!isActive && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(index)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

export default StepConditionsEditor;
