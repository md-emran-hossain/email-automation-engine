import { useState, useEffect } from 'react';
import { useWorkflowExitConditions } from '../../../pages/workflow/hooks/useWorkflowExitConditions';
import { X, Plus, Trash2 } from 'lucide-react';
import { useTags } from '../../../pages/workflow/hooks/useTags';
import {
  LOGICAL_OPERATORS,
  type LogicalOperator,
  CONDITION_TYPES,
  CONDITION_OPERATORS,
} from '@email-automation-engine/shared';

interface ExitConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  isActive: boolean;
}

interface ConditionForm {
  id?: string;
  type: string;
  resource: string;
  operator: string;
  value: string;
}

export default function ExitConditionsModal({
  isOpen,
  onClose,
  workflowId,
  isActive,
}: ExitConditionsModalProps) {
  const { exitConditions, replaceConditions, isLoading } = useWorkflowExitConditions(workflowId);
  const { data: tags = [] } = useTags();

  const [conditions, setConditions] = useState<ConditionForm[]>([]);
  const [matchType, setMatchType] = useState<LogicalOperator>(LOGICAL_OPERATORS.ANY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (exitConditions) {
      if (exitConditions.length > 0) {
        setMatchType(
          (exitConditions[0]?.logicalOperator as LogicalOperator) || LOGICAL_OPERATORS.ANY,
        );
      }
      setConditions(
        exitConditions.map((c) => ({
          id: c.id,
          type: c.type || CONDITION_TYPES.TAG_HAS,
          resource: c.resource || '',
          operator: c.operator || CONDITION_OPERATORS.EQUALS,
          value: c.value || '',
        })),
      );
    }
  }, [exitConditions, isOpen]);

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
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

  const handleChange = (index: number, field: keyof ConditionForm, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value } as ConditionForm;
    setConditions(newConditions);
  };

  const handleSave = () => {
    // Basic validation
    const validConditions = conditions.filter((c) => c.type && c.resource && c.operator);
    replaceConditions.mutate(
      validConditions.map((c) => ({
        logicalOperator: matchType,
        type: c.type,
        resource: c.resource,
        operator: c.operator,
        value: c.value || null,
      })),
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err) => {
          setError(err.message || 'Failed to update exit conditions.');
        },
      },
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Exit Conditions</h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Contacts meeting any of these conditions will immediately exit the workflow.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {conditions.length > 0 && !isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
              <span>Exit if</span>
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as LogicalOperator)}
                disabled={isActive}
                className="px-2 py-1 border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50 text-xs font-medium"
              >
                <option value={LOGICAL_OPERATORS.ALL}>ALL</option>
                <option value={LOGICAL_OPERATORS.ANY}>ANY</option>
                <option value={LOGICAL_OPERATORS.NONE}>NONE</option>
              </select>
              <span>of the following match:</span>
            </div>
          )}

          {isLoading ? (
            <div className="text-center text-gray-500 py-4">Loading conditions...</div>
          ) : conditions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-zinc-400">
              No exit conditions defined. Contacts will complete the workflow normally.
            </div>
          ) : (
            conditions.map((condition, index) => (
              <div
                key={condition.id || index}
                className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl"
              >
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                      Type
                    </label>
                    <select
                      value={condition.type}
                      onChange={(e) => handleChange(index, 'type', e.target.value)}
                      disabled={isActive}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
                    >
                      <option value={CONDITION_TYPES.TAG_HAS}>Has Tag</option>
                      <option value={CONDITION_TYPES.TAG_MISSING}>Missing Tag</option>
                      <option value={CONDITION_TYPES.CONTACT_FIELD}>Contact Field</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                      {condition.type.startsWith('tag_') ? 'Select Tag' : 'Field Name'}
                    </label>
                    {condition.type.startsWith('tag_') ? (
                      <select
                        value={condition.resource}
                        onChange={(e) => handleChange(index, 'resource', e.target.value)}
                        disabled={isActive}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
                      >
                        <option value="">Select a tag...</option>
                        {tags.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={condition.resource}
                          onChange={(e) => handleChange(index, 'resource', e.target.value)}
                          disabled={isActive}
                          placeholder="e.g. status"
                          className="w-1/2 px-3 py-2 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
                        />
                        <select
                          value={condition.operator}
                          onChange={(e) => handleChange(index, 'operator', e.target.value)}
                          disabled={isActive}
                          className="w-1/4 px-2 py-2 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
                        >
                          <option value={CONDITION_OPERATORS.EQUALS}>Equals</option>
                          <option value={CONDITION_OPERATORS.NOT_EQUALS}>Not equals</option>
                          <option value={CONDITION_OPERATORS.CONTAINS}>Contains</option>
                        </select>
                        <input
                          type="text"
                          value={condition.value}
                          onChange={(e) => handleChange(index, 'value', e.target.value)}
                          disabled={isActive}
                          placeholder="Value"
                          className="w-1/4 px-3 py-2 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
                        />
                      </div>
                    )}
                  </div>
                </div>
                {!isActive && (
                  <button
                    onClick={() => handleRemoveCondition(index)}
                    className="p-2 mt-5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}

          {!isActive && (
            <button
              onClick={handleAddCondition}
              className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl text-sm font-medium text-gray-600 dark:text-zinc-400 hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Condition
            </button>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3 bg-gray-50 dark:bg-zinc-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
          >
            {isActive ? 'Close' : 'Cancel'}
          </button>
          {!isActive && (
            <button
              onClick={handleSave}
              disabled={replaceConditions.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {replaceConditions.isPending ? 'Saving...' : 'Save Conditions'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
