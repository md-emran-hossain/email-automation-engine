import '@xyflow/react/dist/style.css';

import {
  type WorkflowStepResponse,
  type WorkflowTriggerResponse,
} from '@email-automation-engine/shared';
import { Background, Controls, type Node, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import type { AxiosError } from 'axios';
import { type MouseEvent as ReactMouseEvent, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';

import AddNode from '../../components/modals/AddNode';
import AddTrigger from '../../components/modals/AddTrigger';
import { AddStep as AddStepNode } from '../../components/workflow/builder/AddStep';
import { AddTrigger as AddTriggerNode } from '../../components/workflow/builder/AddTrigger';
import BuilderHeader from '../../components/workflow/builder/BuilderHeader';
import EmptyCanvas from '../../components/workflow/builder/EmptyCanvas';
import { Exit as ExitNode } from '../../components/workflow/builder/Exit';
import ExitConditionsModal from '../../components/workflow/builder/ExitConditionsModal';
import Sidebar from '../../components/workflow/builder/Sidebar';
import { StepNode } from '../../components/workflow/builder/StepNode';
import { TriggerNode } from '../../components/workflow/builder/TriggerNode';
import { useTenant } from '../../contexts/TenantContext';
import { toast } from '../../lib/toast';
import { useWorkflow } from './hooks/useWorkflow';
import { useDragAndDropReorder, useWorkflowGraphSync } from './hooks/useWorkflowBuilder';
import { useWorkflowSteps } from './hooks/useWorkflowSteps';
import { useWorkflowTriggers } from './hooks/useWorkflowTriggers';

const NODE_TYPES = {
  triggerNode: TriggerNode,
  stepNode: StepNode,
  addTriggerNode: AddTriggerNode,
  addStepNode: AddStepNode,
  exitNode: ExitNode,
};

type SelectedNodeState =
  | { type: 'trigger'; data: WorkflowTriggerResponse }
  | { type: 'step'; data: WorkflowStepResponse }
  | null;

type AddNodeConfig = {
  parentId: string | null;
  branch: 'linear' | true | false;
} | null;

function WorkflowBuilderContent() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { currentTenant } = useTenant();

  const [selectedNode, setSelectedNode] = useState<SelectedNodeState>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [addNodeConfig, setAddNodeConfig] = useState<AddNodeConfig>(null);
  const [isAddTriggerModalOpen, setIsAddTriggerModalOpen] = useState(false);
  const [isExitConditionsModalOpen, setIsExitConditionsModalOpen] = useState(false);

  const { workflow, isLoading: isLoadingWorkflow, toggleActive } = useWorkflow(workflowId);
  const { steps, isLoading: isLoadingSteps, addStep } = useWorkflowSteps(workflowId);
  const { triggers, isLoading: isLoadingTriggers, addTrigger } = useWorkflowTriggers(workflowId);

  const isLoading = Boolean(isLoadingWorkflow || isLoadingSteps || isLoadingTriggers);

  const handleAddNode = useCallback(
    (parentId: string | null, branch: 'linear' | true | false) =>
      setAddNodeConfig({ parentId, branch }),
    [],
  );
  const handleAddTrigger = useCallback(() => setIsAddTriggerModalOpen(true), []);

  const { draggingNodeId, onNodeDragStart, handleDragStop } = useDragAndDropReorder(
    currentTenant?.id,
    workflowId,
  );

  const { nodes, edges, onNodesChange, onEdgesChange } = useWorkflowGraphSync(
    workflow,
    triggers,
    steps,
    handleAddNode,
    handleAddTrigger,
    draggingNodeId,
  );

  const handleNodeDragStop = useCallback(
    (_e: MouseEvent | TouchEvent, node: Node) => {
      return handleDragStop(node, nodes);
    },
    [nodes, handleDragStop],
  );

  const onNodeClick = useCallback((_: ReactMouseEvent, node: Node) => {
    if (['addTriggerNode', 'addStepNode', 'exitNode'].includes(node.type || '')) return;

    setSelectedNode(
      node.type === 'triggerNode'
        ? { type: 'trigger', data: node.data.trigger as WorkflowTriggerResponse }
        : { type: 'step', data: node.data.step as WorkflowStepResponse },
    );
    setIsSidebarOpen(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setIsSidebarOpen(false);
    setSelectedNode(null);
  }, []);

  const handleToggleActive = () => {
    toggleActive.mutate(undefined, {
      onError: (err: Error) => {
        const axiosErr = err as AxiosError<{ message?: string | string[] }>;
        const responseMessage = axiosErr?.response?.data?.message;
        const message = Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : responseMessage;
        toast.error(message || err.message || 'Failed to toggle activation');
      },
    });
  };

  if (isLoading) return <div className="p-8">Loading workflow...</div>;
  if (!workflow) return <div className="p-8">Workflow not found.</div>;

  const visibleEdges = edges.map((edge) => ({
    ...edge,
    hidden: draggingNodeId
      ? edge.source === draggingNodeId || edge.target === draggingNodeId
      : false,
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-6">
      <BuilderHeader
        workflow={workflow}
        onToggleActive={handleToggleActive}
        isTogglingActive={toggleActive.isPending}
        onOpenExitConditions={() => setIsExitConditionsModalOpen(true)}
      />

      <div className="flex-1 w-full h-full bg-gray-50/50 dark:bg-zinc-950/50 relative">
        <ReactFlow
          nodes={nodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={NODE_TYPES}
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
            addStep.mutate({ action, parentId, branch });
            setAddNodeConfig(null);
          }}
          isPending={addStep.isPending}
        />

        <AddTrigger
          isOpen={isAddTriggerModalOpen}
          onClose={() => setIsAddTriggerModalOpen(false)}
          onSelectTrigger={(event) =>
            addTrigger.mutate(event, { onSuccess: () => setIsAddTriggerModalOpen(false) })
          }
          isPending={addTrigger.isPending}
        />

        <ExitConditionsModal
          isOpen={isExitConditionsModalOpen}
          onClose={() => setIsExitConditionsModalOpen(false)}
          workflowId={workflowId!}
          isActive={workflow.isActive}
        />
      </div>
    </div>
  );
}

export default function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderContent />
    </ReactFlowProvider>
  );
}
