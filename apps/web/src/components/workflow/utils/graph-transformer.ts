import {
  type WorkflowTriggerResponse,
  type WorkflowStepResponse,
} from '@email-automation-engine/shared';
import { type Node, type Edge } from '@xyflow/react';
import dagre from 'dagre';

const DIMENSIONS = {
  NODE_WIDTH: 280,
  NODE_HEIGHT: 80,
  BTN_SIZE: 60,
};

const STYLES = {
  trueBranch: {
    label: 'True',
    labelStyle: { fill: '#16a34a', fontWeight: 600, fontSize: 12 },
    labelBgStyle: { fill: '#f0fdf4', stroke: '#16a34a', strokeWidth: 1 },
    labelBgPadding: [8, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
  falseBranch: {
    label: 'False',
    labelStyle: { fill: '#dc2626', fontWeight: 600, fontSize: 12 },
    labelBgStyle: { fill: '#fef2f2', stroke: '#dc2626', strokeWidth: 1 },
    labelBgPadding: [8, 4] as [number, number],
    labelBgBorderRadius: 4,
  },
};

type AddNodeCallback = (parentId: string | null, branch: 'linear' | true | false) => void;

interface GraphContext {
  isActive: boolean;
  isDragging: boolean;
  onAddNode: AddNodeCallback;
  onAddTrigger: () => void;
  steps: WorkflowStepResponse[];
  triggers: WorkflowTriggerResponse[];
  firstStep: WorkflowStepResponse | undefined;
}

class WorkflowGraphBuilder {
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private dagreGraph: dagre.graphlib.Graph;

  constructor(private context: GraphContext) {
    this.dagreGraph = new dagre.graphlib.Graph();
    this.dagreGraph.setDefaultEdgeLabel(() => ({}));
    this.dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 40 });
  }

  public build(): { nodes: Node[]; edges: Edge[] } {
    this.buildTriggers();
    this.buildSteps();
    this.buildAddTriggerButton();
    return this.applyLayout();
  }

  private buildTriggers(): void {
    const { triggers, isActive, onAddNode } = this.context;

    triggers.forEach((trigger, idx) => {
      const id = `trigger-${trigger.id}`;
      this.addGraphNode(
        {
          id,
          type: 'triggerNode',
          position: { x: 0, y: 0 },
          data: { trigger, isFirst: idx === 0, isActive, onAddNode },
        },
        DIMENSIONS.NODE_WIDTH,
        DIMENSIONS.NODE_HEIGHT,
      );
    });

    this.connectTriggersToFirstStep();
  }

  private connectTriggersToFirstStep(): void {
    const { triggers, isActive, isDragging, onAddNode, firstStep } = this.context;

    if (!isActive) {
      const addStepBtnId = 'add-first-step-btn';
      this.addGraphNode(
        {
          id: addStepBtnId,
          type: 'addStepNode',
          position: { x: 0, y: 0 },
          data: { onAddNode, isDragging },
        },
        DIMENSIONS.BTN_SIZE,
        DIMENSIONS.BTN_SIZE,
      );

      triggers.forEach((trigger) =>
        this.addGraphEdge({
          id: `edge-trigger-${trigger.id}-${addStepBtnId}`,
          source: `trigger-${trigger.id}`,
          target: addStepBtnId,
          type: 'smoothstep',
        }),
      );

      if (firstStep) {
        this.addGraphEdge({
          id: `edge-${addStepBtnId}-${firstStep.id}`,
          source: addStepBtnId,
          target: `step-${firstStep.id}`,
          type: 'smoothstep',
        });
      } else {
        this.addExitNode(addStepBtnId, 'empty-workflow-exit');
      }
    } else if (triggers.length > 0) {
      if (firstStep) {
        triggers.forEach((trigger) =>
          this.addGraphEdge({
            id: `edge-trigger-${trigger.id}-${firstStep.id}`,
            source: `trigger-${trigger.id}`,
            target: `step-${firstStep.id}`,
            type: 'smoothstep',
          }),
        );
      } else {
        const exitId = 'exit-empty-active';
        this.addGraphNode(
          { id: exitId, type: 'exitNode', position: { x: 0, y: 0 }, data: {} },
          DIMENSIONS.NODE_WIDTH,
          DIMENSIONS.NODE_HEIGHT,
        );
        triggers.forEach((trigger) =>
          this.addGraphEdge({
            id: `edge-trigger-${trigger.id}-${exitId}`,
            source: `trigger-${trigger.id}`,
            target: exitId,
            type: 'smoothstep',
          }),
        );
      }
    }
  }

  private buildAddTriggerButton(): void {
    const { triggers, isActive, onAddTrigger } = this.context;

    if (triggers.length < 3 && !isActive) {
      const addBtnId = 'add-trigger-btn';
      this.addGraphNode(
        {
          id: addBtnId,
          type: 'addTriggerNode',
          position: { x: 0, y: 0 },
          data: { onAddTrigger },
        },
        DIMENSIONS.NODE_WIDTH,
        DIMENSIONS.NODE_HEIGHT,
      );

      if (triggers.length === 0) {
        this.addGraphEdge({
          id: `edge-${addBtnId}-add-first-step-btn`,
          source: addBtnId,
          target: 'add-first-step-btn',
          type: 'smoothstep',
        });
      }
    }
  }

  private buildSteps(): void {
    const { steps, isActive, onAddNode } = this.context;

    steps.forEach((step) => {
      const stepId = `step-${step.id}`;
      this.addGraphNode(
        {
          id: stepId,
          type: 'stepNode',
          position: { x: 0, y: 0 },
          data: { step, isActive, onAddNode },
        },
        DIMENSIONS.NODE_WIDTH,
        DIMENSIONS.NODE_HEIGHT,
      );

      if (step.action === 'conditional_split') {
        this.buildConditionalBranches(step);
      } else {
        this.buildLinearBranch(step);
      }
    });
  }

  private buildConditionalBranches(step: WorkflowStepResponse): void {
    const trueStep = this.context.steps.find((s) => s.id === step.trueStepId);
    const falseStep = this.context.steps.find((s) => s.id === step.falseStepId);

    this.connectBranch(step, trueStep, true, STYLES.trueBranch);
    this.connectBranch(step, falseStep, false, STYLES.falseBranch);
  }

  private buildLinearBranch(step: WorkflowStepResponse): void {
    const nextStep = this.context.steps.find((s) => s.parentWorkflowStepId === step.id);
    this.connectBranch(step, nextStep, 'linear', {});
  }

  private connectBranch(
    step: WorkflowStepResponse,
    targetStep: WorkflowStepResponse | undefined,
    branchType: 'linear' | true | false,
    edgeStyles: Partial<Edge>,
  ): void {
    const { isActive, isDragging, onAddNode } = this.context;
    const sourceId = `step-${step.id}`;
    const branchHandle = typeof branchType === 'boolean' ? String(branchType) : undefined;
    const branchSuffix = branchHandle || 'linear';

    if (!isActive) {
      const addBtnId = `add-step-${step.id}-${branchSuffix}`;

      this.addGraphNode(
        {
          id: addBtnId,
          type: 'addStepNode',
          position: { x: 0, y: 0 },
          data: { parentId: step.id, branch: branchType, onAddNode, isDragging },
        },
        DIMENSIONS.BTN_SIZE,
        DIMENSIONS.BTN_SIZE,
      );

      this.addGraphEdge({
        id: `edge-${sourceId}-${addBtnId}`,
        source: sourceId,
        target: addBtnId,
        type: 'smoothstep',
        ...(branchHandle && { sourceHandle: branchHandle }),
        ...edgeStyles,
      });

      if (targetStep) {
        this.addGraphEdge({
          id: `edge-${addBtnId}-${targetStep.id}`,
          source: addBtnId,
          target: `step-${targetStep.id}`,
          type: 'smoothstep',
        });
      } else {
        this.addExitNode(addBtnId, `${step.id}-${branchSuffix}-exit`);
      }
    } else {
      if (targetStep) {
        this.addGraphEdge({
          id: `edge-${branchSuffix}-${sourceId}-${targetStep.id}`,
          source: sourceId,
          target: `step-${targetStep.id}`,
          type: 'smoothstep',
          ...(branchHandle && { sourceHandle: branchHandle }),
          ...edgeStyles,
        });
      } else {
        const labelText =
          typeof branchType === 'boolean' ? (branchType ? 'True' : 'False') : undefined;
        this.addExitNode(
          sourceId,
          `${step.id}-${branchSuffix}`,
          branchHandle,
          labelText,
          edgeStyles,
        );
      }
    }
  }

  private addExitNode(
    parentId: string,
    idSuffix: string,
    sourceHandle?: string,
    label?: string,
    extraStyles?: Partial<Edge>,
  ): void {
    const exitId = `exit-${idSuffix}`;
    this.addGraphNode(
      { id: exitId, type: 'exitNode', position: { x: 0, y: 0 }, data: {} },
      DIMENSIONS.NODE_WIDTH,
      DIMENSIONS.NODE_HEIGHT,
    );

    const edge: Edge = {
      id: `edge-${parentId}-${exitId}`,
      source: parentId,
      target: exitId,
      type: 'smoothstep',
      ...(sourceHandle && { sourceHandle }),
      ...extraStyles,
    };

    if (label && !extraStyles?.label) {
      if (label === 'True') Object.assign(edge, STYLES.trueBranch);
      else if (label === 'False') Object.assign(edge, STYLES.falseBranch);
      else edge.label = label;
    }

    this.addGraphEdge(edge);
  }

  private addGraphNode(node: Node, width: number, height: number): void {
    this.nodes.push(node);
    this.dagreGraph.setNode(node.id, { width, height });
  }

  private addGraphEdge(edge: Edge): void {
    this.edges.push(edge);
    this.dagreGraph.setEdge(edge.source, edge.target);
  }

  private applyLayout(): { nodes: Node[]; edges: Edge[] } {
    dagre.layout(this.dagreGraph);

    const layoutedNodes = this.nodes.map((node) => {
      const nodeWithPosition = this.dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWithPosition.width / 2,
          y: nodeWithPosition.y - nodeWithPosition.height / 2,
        },
      };
    });

    // Enforce "True" branch on the left, "False" branch on the right
    this.context.steps.forEach((step) => {
      if (step.action === 'conditional_split') {
        const splitNodeId = `step-${step.id}`;
        const splitNode = layoutedNodes.find((n) => n.id === splitNodeId);

        // Find the direct children IDs
        let trueNodeId = step.trueStepId ? `step-${step.trueStepId}` : undefined;
        let falseNodeId = step.falseStepId ? `step-${step.falseStepId}` : undefined;

        if (!trueNodeId) {
          trueNodeId = this.edges.find(
            (e) => e.source === splitNodeId && e.sourceHandle === 'true',
          )?.target;
        }
        if (!falseNodeId) {
          falseNodeId = this.edges.find(
            (e) => e.source === splitNodeId && e.sourceHandle === 'false',
          )?.target;
        }

        const trueNode = layoutedNodes.find((n) => n.id === trueNodeId);
        const falseNode = layoutedNodes.find((n) => n.id === falseNodeId);

        if (splitNode && trueNode && falseNode && trueNode.position.x > falseNode.position.x) {
          // They are swapped! True is on the right. We must mirror their subtrees.
          const parentWidth = this.dagreGraph.node(splitNode.id).width;
          const parentCenterX = splitNode.position.x + parentWidth / 2;

          // Find all descendants of both trueNodeId and falseNodeId
          const descendants = new Set<string>();
          const queue = [trueNodeId, falseNodeId];

          while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (!descendants.has(currentId)) {
              descendants.add(currentId);
              const children = this.edges
                .filter((e) => e.source === currentId)
                .map((e) => e.target);
              queue.push(...children);
            }
          }

          // Mirror X coordinates across the parent's center
          descendants.forEach((descendantId) => {
            const nodeToMirror = layoutedNodes.find((n) => n.id === descendantId);
            if (nodeToMirror) {
              const nodeWidth = this.dagreGraph.node(nodeToMirror.id).width;
              nodeToMirror.position.x = 2 * parentCenterX - nodeToMirror.position.x - nodeWidth;
            }
          });
        }
      }
    });

    return { nodes: layoutedNodes, edges: this.edges };
  }
}

export function generateWorkflowGraph(
  triggers: WorkflowTriggerResponse[],
  steps: WorkflowStepResponse[],
  isActive: boolean,
  onAddNode: AddNodeCallback,
  onAddTrigger: () => void,
  isDragging: boolean = false,
): { nodes: Node[]; edges: Edge[] } {
  const firstStep = steps.find(
    (s) =>
      !s.parentWorkflowStepId &&
      !steps.some((p) => p.trueStepId === s.id || p.falseStepId === s.id),
  );

  const builder = new WorkflowGraphBuilder({
    isActive,
    isDragging,
    onAddNode,
    onAddTrigger,
    steps,
    triggers,
    firstStep,
  });

  return builder.build();
}
