import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useTenant } from '../../contexts/TenantContext';
import api from '../../lib/api';
import {
  type WorkflowResponse,
  type WorkflowStepResponse,
  type WorkflowTriggerResponse,
  STEP_ACTIONS,
} from '@email-automation-engine/shared';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useState, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { generateWorkflowGraph } from '../../components/workflow/utils/graph-transformer';
import { StepNode } from '../../components/workflow/builder/StepNode';
import { TriggerNode } from '../../components/workflow/builder/TriggerNode';
import { AddTrigger as AddTriggerNode } from '../../components/workflow/builder/AddTrigger';
import { AddStep as AddStepNode } from '../../components/workflow/builder/AddStep';
import Sidebar from '../../components/workflow/builder/Sidebar';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import BuilderHeader from '../../components/workflow/builder/BuilderHeader';

import AddNode from '../../components/modals/AddNode';
import AddTrigger from '../../components/modals/AddTrigger';
import EmptyCanvas from '../../components/workflow/builder/EmptyCanvas';
import Alert from '../../components/modals/Alert';

import { Exit as ExitNode } from '../../components/workflow/builder/Exit';

const nodeTypes = {
  triggerNode: TriggerNode,
  stepNode: StepNode,
  addTriggerNode: AddTriggerNode,
  addStepNode: AddStepNode,
  exitNode: ExitNode,
};

export default function WorkflowBuilder() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const [selectedNode, setSelectedNode] = useState<
    | { type: 'trigger'; data: WorkflowTriggerResponse }
    | { type: 'step'; data: WorkflowStepResponse }
    | null
  >(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [addNodeConfig, setAddNodeConfig] = useState<{
    parentId: string | null;
    branch: 'linear' | true | false;
  } | null>(null);
  const [isAddTriggerModalOpen, setIsAddTriggerModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const { data: workflow, isLoading: isLoadingWorkflow } = useQuery({
    queryKey: ['workflow', currentTenant?.id, workflowId],
    queryFn: async () => {
      const res = await api.get<WorkflowResponse>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}`,
      );
      return res.data;
    },
    enabled: !!currentTenant && !!workflowId,
  });

  const { data: triggers = [], isLoading: isLoadingTriggers } = useQuery({
    queryKey: ['workflow-triggers', currentTenant?.id, workflowId],
    queryFn: async () => {
      const res = await api.get<WorkflowTriggerResponse[]>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/triggers`,
      );
      return res.data;
    },
    enabled: !!currentTenant && !!workflowId,
  });

  const { data: steps = [], isLoading: isLoadingSteps } = useQuery({
    queryKey: ['workflow-steps', currentTenant?.id, workflowId],
    queryFn: async () => {
      const res = await api.get<WorkflowStepResponse[]>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/steps`,
      );
      return res.data;
    },
    enabled: !!currentTenant && !!workflowId,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const handleAddNode = useCallback((parentId: string | null, branch: 'linear' | true | false) => {
    setAddNodeConfig({ parentId, branch });
  }, []);

  const handleAddTrigger = useCallback(() => {
    setIsAddTriggerModalOpen(true);
  }, []);

  useEffect(() => {
    if (triggers.length >= 0 && steps.length >= 0) {
      const graph = generateWorkflowGraph(
        triggers,
        steps,
        workflow?.isActive ?? false,
        handleAddNode,
        handleAddTrigger,
        !!draggingNodeId,
      );
      setNodes(graph.nodes);
      setEdges(
        graph.edges.map((edge) => ({
          ...edge,
          markerEnd: edge.target.startsWith('add-') ? undefined : { type: MarkerType.Arrow },
        })),
      );
    }
  }, [triggers, steps, workflow?.isActive, handleAddNode, draggingNodeId]);

  const onNodeDragStart = useCallback((event: MouseEvent | TouchEvent, node: Node) => {
    if (node.id.startsWith('step-')) {
      setDraggingNodeId(node.id);
    }
  }, []);

  const onNodeDragStop = useCallback(
    (event: MouseEvent | TouchEvent, node: Node) => {
      setDraggingNodeId(null);
      if (!node.id.startsWith('step-')) return;

      const draggedRect = {
        x: node.position.x,
        y: node.position.y,
        w: node.measured?.width || 280,
        h: node.measured?.height || 80,
      };

      const stepId = node.id.replace('step-', '');

      const targetAddNode = nodes.find((n) => {
        if (
          n.type !== 'addStepNode' ||
          n.id === `add-step-${stepId}-linear` ||
          n.id === `add-step-${stepId}-true` ||
          n.id === `add-step-${stepId}-false`
        ) {
          return false;
        }

        const targetRect = {
          x: n.position.x,
          y: n.position.y,
          w: n.measured?.width || 60,
          h: n.measured?.height || 60,
        };

        return (
          draggedRect.x < targetRect.x + targetRect.w &&
          draggedRect.x + draggedRect.w > targetRect.x &&
          draggedRect.y < targetRect.y + targetRect.h &&
          draggedRect.y + draggedRect.h > targetRect.y
        );
      });

      if (targetAddNode) {
        const rawParentId = targetAddNode.data.parentId as string | undefined;
        const parentId = rawParentId ? rawParentId : null;

        let branch = targetAddNode.data.branch;
        if (branch === 'true') branch = true;
        else if (branch === 'false') branch = false;
        else if (branch !== true && branch !== false) branch = 'linear';

        void (async () => {
          try {
            await api.post(
              `/tenants/${currentTenant?.id}/workflows/${workflowId}/steps/${stepId}/reorder`,
              {
                parentId,
                branch,
              },
            );
            void queryClient.invalidateQueries({ queryKey: ['workflow-steps'] });
          } catch (err) {
            const error = err as AxiosError<{ message: string }>;
            console.error(error);
            alert(error.response?.data?.message || error.message || 'Failed to move step');
            void queryClient.invalidateQueries({ queryKey: ['workflow-steps'] });
          }
        })();
      } else {
        // If not dropped on a target, invalidate to snap back to layout
        void queryClient.invalidateQueries({ queryKey: ['workflow-steps'] });
      }
    },
    [nodes, currentTenant?.id, workflowId, queryClient],
  );

  const addStepMutation = useMutation({
    mutationFn: async ({
      action,
      parentId,
      branch,
    }: {
      action: string;
      parentId: string | null;
      branch: 'linear' | true | false;
    }) => {
      let existingChild: WorkflowStepResponse | undefined;

      if (parentId === null) {
        existingChild = steps.find(
          (s) =>
            !s.parentWorkflowStepId &&
            !steps.some((p) => p.trueStepId === s.id || p.falseStepId === s.id),
        );
      } else {
        const parentStep = steps.find((s) => s.id === parentId);
        if (parentStep) {
          if (branch === true) {
            existingChild = steps.find((s) => s.id === parentStep.trueStepId);
          } else if (branch === false) {
            existingChild = steps.find((s) => s.id === parentStep.falseStepId);
          } else {
            existingChild = steps.find((s) => s.parentWorkflowStepId === parentId);
          }
        }
      }

      let config = {};
      if (action === STEP_ACTIONS.DELAY) config = { amount: 15, unit: 'minutes' };

      const res = await api.post<WorkflowStepResponse>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/steps`,
        {
          action,
          config,
          parentWorkflowStepId: branch === 'linear' ? parentId : undefined,
          trueStepId:
            action === STEP_ACTIONS.CONDITIONAL_SPLIT && existingChild
              ? existingChild.id
              : undefined,
        },
      );
      const newStep = res.data;

      if (parentId && (branch === true || branch === false)) {
        await api.patch(`/tenants/${currentTenant?.id}/workflows/${workflowId}/steps/${parentId}`, {
          [branch === true ? 'trueStepId' : 'falseStepId']: newStep.id,
        });
      }

      if (existingChild) {
        if (action === STEP_ACTIONS.CONDITIONAL_SPLIT) {
          await api.patch(
            `/tenants/${currentTenant?.id}/workflows/${workflowId}/steps/${existingChild.id}`,
            { parentWorkflowStepId: null },
          );
        } else {
          await api.patch(
            `/tenants/${currentTenant?.id}/workflows/${workflowId}/steps/${existingChild.id}`,
            { parentWorkflowStepId: newStep.id },
          );
        }
      }

      return newStep;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['workflow-steps', currentTenant?.id, workflowId],
      });
    },
  });

  const addTriggerMutation = useMutation({
    mutationFn: async (event: string) => {
      const res = await api.post<WorkflowTriggerResponse>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/triggers`,
        {
          event,
          filters: {},
        },
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['workflow-triggers', currentTenant?.id, workflowId],
      });
      setIsAddTriggerModalOpen(false);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      const endpoint = workflow?.isActive ? 'deactivate' : 'activate';
      const res = await api.patch<WorkflowResponse>(
        `/tenants/${currentTenant?.id}/workflows/${workflowId}/${endpoint}`,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['workflow', currentTenant?.id, workflowId],
      });
    },
    onError: (err: AxiosError<{ message: string }>) => {
      setAlertMessage(err?.response?.data?.message || err.message || 'Failed to toggle activation');
    },
  });

  const onNodeClick = useCallback((_: ReactMouseEvent, node: Node) => {
    if (node.type === 'addTriggerNode' || node.type === 'addStepNode' || node.type === 'exitNode') {
      return;
    }

    if (node.type === 'triggerNode') {
      setSelectedNode({
        type: 'trigger',
        data: node.data.trigger as WorkflowTriggerResponse,
      });
    } else {
      setSelectedNode({
        type: 'step',
        data: node.data.step as WorkflowStepResponse,
      });
    }
    setIsSidebarOpen(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setIsSidebarOpen(false);
    setSelectedNode(null);
  }, []);

  const isLoading = isLoadingWorkflow || isLoadingTriggers || isLoadingSteps;

  if (isLoading) {
    return <div className="p-8">Loading workflow...</div>;
  }

  if (!workflow) {
    return <div className="p-8">Workflow not found.</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-6">
      <BuilderHeader
        workflow={workflow}
        onToggleActive={() => toggleActiveMutation.mutate()}
        isTogglingActive={toggleActiveMutation.isPending}
      />

      <div className="flex-1 w-full h-full bg-gray-50/50 dark:bg-zinc-950/50 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges.map((e) => ({
            ...e,
            hidden: draggingNodeId
              ? e.source === draggingNodeId || e.target === draggingNodeId
              : false,
          }))}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-dot-pattern"
          proOptions={{ hideAttribution: true }}
          nodesDraggable={!workflow?.isActive}
          nodesConnectable={false}
          elementsSelectable={true}
        >
          <Background
            color="currentColor"
            className="text-gray-300 dark:text-zinc-700"
            gap={16}
            size={1.2}
          />
          <Controls showInteractive={false} />
        </ReactFlow>

        <EmptyCanvas
          show={triggers.length === 0 && steps.length === 0 && !isLoading}
          onAddTrigger={handleAddTrigger}
          isAddingTrigger={false}
        />

        <Sidebar
          isOpen={isSidebarOpen}
          selectedNode={selectedNode}
          workflowId={workflowId!}
          onClose={() => setIsSidebarOpen(false)}
          isActive={workflow.isActive}
          triggersCount={triggers.length}
        />

        <AddNode
          config={addNodeConfig}
          onClose={() => setAddNodeConfig(null)}
          onSelectAction={(action, parentId, branch) => {
            addStepMutation.mutate({ action, parentId, branch });
            setAddNodeConfig(null);
          }}
          isPending={addStepMutation.isPending}
        />

        <AddTrigger
          isOpen={isAddTriggerModalOpen}
          onClose={() => setIsAddTriggerModalOpen(false)}
          onSelectTrigger={(event) => addTriggerMutation.mutate(event)}
          isPending={addTriggerMutation.isPending}
        />

        <Alert
          isOpen={!!alertMessage}
          onClose={() => setAlertMessage(null)}
          title="Activation Failed"
          description={alertMessage || ''}
        />
      </div>
    </div>
  );
}
