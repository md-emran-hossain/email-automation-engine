import {
  type CreateWorkflowDto,
  CreateWorkflowSchema,
  type WorkflowResponse,
} from '@email-automation-engine/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { useTenant } from '../../contexts/TenantContext';
import api from '../../lib/api';

export default function CreateWorkflow() {
  const { currentTenant } = useTenant();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkflowDto>({
    resolver: zodResolver(CreateWorkflowSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateWorkflowDto) => {
      const res = await api.post<WorkflowResponse>(`/tenants/${currentTenant?.id}/workflows`, data);
      return res.data;
    },
    onSuccess: (workflow) => {
      void navigate(`/workflows/${workflow.id}`);
    },
  });

  const onSubmit = (data: CreateWorkflowDto) => {
    createMutation.mutate(data);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create workflow</h1>

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 max-w-md">
        <div>
          <label
            htmlFor="create-workflow-name"
            className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
          >
            Name
          </label>
          <input
            id="create-workflow-name"
            {...register('name')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name.message as string}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="create-workflow-description"
            className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
          >
            Description (optional)
          </label>
          <textarea
            id="create-workflow-description"
            {...register('description')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            rows={3}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-500">{errors.description.message as string}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
            className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => void navigate('/workflows')}
            className="px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
