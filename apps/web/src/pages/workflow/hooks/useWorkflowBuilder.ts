import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useNodesState, useEdgesState, MarkerType, type Node, type Edge } from '@xyflow/react';
import {
  type WorkflowResponse,
  type WorkflowStepResponse,
  type WorkflowTriggerResponse,
} from '@email-automation-engine/shared';
import api from '../../../lib/api';
import { generateWorkflowGraph } from '../../../components/workflow/utils/graph-transformer';

export function useWorkflowGraphSync(
  workflow: WorkflowResponse | undefined,
  triggers: WorkflowTriggerResponse[],
  steps: WorkflowStepResponse[],
  handleAddNode: (parentId: string | null, branch: 'linear' | true | false) => void,
  handleAddTrigger: () => void,
  draggingNodeId: string | null,
) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

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
  }, [
    triggers,
    steps,
    workflow?.isActive,
    handleAddNode,
    draggingNodeId,
    setNodes,
    setEdges,
    handleAddTrigger,
  ]);

  return { nodes, edges, onNodesChange, onEdgesChange };
}

export function useDragAndDropReorder(
  tenantId: string | undefined,
  workflowId: string | undefined,
) {
  const queryClient = useQueryClient();
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const onNodeDragStart = useCallback((_: MouseEvent | TouchEvent, node: Node) => {
    if (node.id.startsWith('step-')) setDraggingNodeId(node.id);
  }, []);

  const handleDragStop = useCallback(
    (node: Node, nodes: Node[]) => {
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
        if (n.type !== 'addStepNode' || n.id.includes(`add-step-${stepId}`)) return false;

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
        const parentId = rawParentId ?? null;

        let branch = targetAddNode.data.branch;
        if (branch === 'true') branch = true;
        else if (branch === 'false') branch = false;
        else if (typeof branch !== 'boolean') branch = 'linear';

        void (async () => {
          try {
            await api.post(`/tenants/${tenantId}/workflows/${workflowId}/steps/${stepId}/reorder`, {
              parentId,
              branch,
            });
          } catch (error) {
            const err = error as AxiosError<{ message: string }>;
            alert(err.response?.data?.message || err.message || 'Failed to move step');
          } finally {
            void queryClient.invalidateQueries({ queryKey: ['workflow-steps'] });
          }
        })();
      } else {
        void queryClient.invalidateQueries({ queryKey: ['workflow-steps'] });
      }
    },
    [tenantId, workflowId, queryClient],
  );

  return { draggingNodeId, onNodeDragStart, handleDragStop };
}
