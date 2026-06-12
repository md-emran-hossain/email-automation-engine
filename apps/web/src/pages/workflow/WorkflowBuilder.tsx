import { useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { useTenant } from '../../contexts/TenantContext';
import {
  type WorkflowStepResponse,
  type WorkflowTriggerResponse,
} from '@email-automation-engine/shared';
import { ReactFlow, Background, Controls, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState, useCallback, type MouseEvent as ReactMouseEvent } from 'react';

import { useWorkflowGraphSync, useDragAndDropReorder } from './hooks/useWorkflowBuilder';
import { useWorkflow } from './hooks/useWorkflow';
import { useWorkflowSteps } from './hooks/useWorkflowSteps';
import { useWorkflowTriggers } from './hooks/useWorkflowTriggers';

import { StepNode } from '../../components/workflow/builder/StepNode';
import { TriggerNode } from '../../components/workflow/builder/TriggerNode';
import { AddTrigger as AddTriggerNode } from '../../components/workflow/builder/AddTrigger';
import { AddStep as AddStepNode } from '../../components/workflow/builder/AddStep';
import { Exit as ExitNode } from '../../components/workflow/builder/Exit';

import Sidebar from '../../components/workflow/builder/Sidebar';
import BuilderHeader from '../../components/workflow/builder/BuilderHeader';
import AddNode from '../../components/modals/AddNode';
import AddTrigger from '../../components/modals/AddTrigger';
import EmptyCanvas from '../../components/workflow/builder/EmptyCanvas';
import Alert from '../../components/modals/Alert';

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

export default function WorkflowBuilder() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { currentTenant } = useTenant();

  const [selectedNode, setSelectedNode] = useState<SelectedNodeState>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [addNodeConfig, setAddNodeConfig] = useState<AddNodeConfig>(null);
  const [isAddTriggerModalOpen, setIsAddTriggerModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

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

  const boundOnNodeDragStop = useCallback(
    (e: MouseEvent | TouchEvent, node: Node) => {
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
        const axiosErr = err as AxiosError<{ message: string }>;
        setAlertMessage(
          axiosErr?.response?.data?.message || err.message || 'Failed to toggle activation',
        );
      },
    });
  };

  if (isLoading) return <div className="p-8">Loading workflow...</div>;
  if (!workflow) return <div className="p-8">Workflow not found.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-6">
      <BuilderHeader
        workflow={workflow}
        onToggleActive={handleToggleActive}
        isTogglingActive={toggleActive.isPending}
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
          onNodeDragStop={boundOnNodeDragStop}
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
