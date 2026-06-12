import {
  type WorkflowTriggerResponse,
  type WorkflowStepResponse,
} from '@email-automation-engine/shared';
import { type Node, type Edge } from '@xyflow/react';
import dagre from 'dagre';

const nodeWidth = 280;
const nodeHeight = 80;

const trueLabelOptions = {
  label: 'True',
  labelStyle: { fill: '#16a34a', fontWeight: 600, fontSize: 12 },
  labelBgStyle: { fill: '#f0fdf4', stroke: '#16a34a', strokeWidth: 1 },
  labelBgPadding: [8, 4] as [number, number],
  labelBgBorderRadius: 4,
};

const falseLabelOptions = {
  label: 'False',
  labelStyle: { fill: '#dc2626', fontWeight: 600, fontSize: 12 },
  labelBgStyle: { fill: '#fef2f2', stroke: '#dc2626', strokeWidth: 1 },
  labelBgPadding: [8, 4] as [number, number],
  labelBgBorderRadius: 4,
};

export function generateWorkflowGraph(
  triggers: WorkflowTriggerResponse[],
  steps: WorkflowStepResponse[],
  isActive: boolean,
  onAddNode: (parentId: string | null, branch: 'linear' | true | false) => void,
  onAddTrigger: () => void,
  isDragging: boolean = false,
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 40 });

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 1. Add Triggers
  // Multiple triggers all point to the first step (or an implicit start node if there are no steps)
  // To keep it simple, if multiple triggers exist, we link them to a dummy "Start" node or just straight to first step
  const firstStep = steps.find(
    (s) =>
      !s.parentWorkflowStepId &&
      !steps.some((p) => p.trueStepId === s.id || p.falseStepId === s.id),
  );

  triggers.forEach((trigger, idx) => {
    const id = `trigger-${trigger.id}`;
    nodes.push({
      id,
      type: 'triggerNode',
      position: { x: 0, y: 0 },
      data: { trigger, isFirst: idx === 0, isActive, onAddNode },
    });
    dagreGraph.setNode(id, { width: nodeWidth, height: nodeHeight });
  });

  const addExitNode = (
    parentId: string,
    idSuffix: string,
    sourceHandle?: string,
    label?: string,
  ) => {
    const exitId = `exit-${idSuffix}`;
    nodes.push({
      id: exitId,
      type: 'exitNode',
      position: { x: 0, y: 0 },
      data: {},
    });
    dagreGraph.setNode(exitId, { width: 280, height: 80 });
    const edge: Edge = {
      id: `edge-${parentId}-${exitId}`,
      source: parentId,
      target: exitId,
      type: 'smoothstep',
      ...(sourceHandle && { sourceHandle }),
    };

    if (label === 'True') {
      Object.assign(edge, trueLabelOptions);
    } else if (label === 'False') {
      Object.assign(edge, falseLabelOptions);
    } else if (label) {
      edge.label = label;
    }

    edges.push(edge);
    dagreGraph.setEdge(parentId, exitId);
  };

  if (!isActive) {
    const addStepBtnId = 'add-first-step-btn';
    nodes.push({
      id: addStepBtnId,
      type: 'addStepNode',
      position: { x: 0, y: 0 },
      data: { onAddNode, isDragging },
    });
    dagreGraph.setNode(addStepBtnId, { width: 60, height: 60 });

    if (triggers.length > 0) {
      triggers.forEach((trigger) => {
        const id = `trigger-${trigger.id}`;
        edges.push({
          id: `edge-${id}-${addStepBtnId}`,
          source: id,
          target: addStepBtnId,
          type: 'smoothstep',
        });
        dagreGraph.setEdge(id, addStepBtnId);
      });
    }

    if (firstStep) {
      edges.push({
        id: `edge-${addStepBtnId}-${firstStep.id}`,
        source: addStepBtnId,
        target: `step-${firstStep.id}`,
        type: 'smoothstep',
      });
      dagreGraph.setEdge(addStepBtnId, `step-${firstStep.id}`);
    } else {
      addExitNode(addStepBtnId, 'empty-workflow-exit');
    }
  } else if (isActive && triggers.length > 0) {
    if (firstStep) {
      triggers.forEach((trigger) => {
        const id = `trigger-${trigger.id}`;
        edges.push({
          id: `edge-${id}-${firstStep.id}`,
          source: id,
          target: `step-${firstStep.id}`,
          type: 'smoothstep',
        });
        dagreGraph.setEdge(id, `step-${firstStep.id}`);
      });
    } else {
      const exitId = 'exit-empty-active';
      nodes.push({
        id: exitId,
        type: 'exitNode',
        position: { x: 0, y: 0 },
        data: {},
      });
      dagreGraph.setNode(exitId, { width: 280, height: 80 });
      triggers.forEach((trigger) => {
        const id = `trigger-${trigger.id}`;
        edges.push({
          id: `edge-${id}-${exitId}`,
          source: id,
          target: exitId,
          type: 'smoothstep',
        });
        dagreGraph.setEdge(id, exitId);
      });
    }
  }

  if (triggers.length < 3 && !isActive) {
    const addBtnId = 'add-trigger-btn';
    nodes.push({
      id: addBtnId,
      type: 'addTriggerNode',
      position: { x: 0, y: 0 },
      data: { onAddTrigger },
    });
    dagreGraph.setNode(addBtnId, { width: nodeWidth, height: nodeHeight });

    if (triggers.length === 0) {
      // Connect the add trigger button to the first step button if no triggers exist
      const addStepBtnId = 'add-first-step-btn';
      edges.push({
        id: `edge-${addBtnId}-${addStepBtnId}`,
        source: addBtnId,
        target: addStepBtnId,
        type: 'smoothstep',
      });
      dagreGraph.setEdge(addBtnId, addStepBtnId);
    }
  }

  // 2. Add Steps
  steps.forEach((step) => {
    const id = `step-${step.id}`;
    nodes.push({
      id,
      type: 'stepNode',
      position: { x: 0, y: 0 },
      data: { step, isActive, onAddNode },
    });
    dagreGraph.setNode(id, { width: nodeWidth, height: nodeHeight });

    // Link based on conditional vs linear
    if (step.action === 'conditional_split') {
      const trueStep = steps.find((s) => s.id === step.trueStepId);
      const falseStep = steps.find((s) => s.id === step.falseStepId);

      if (!isActive) {
        // True branch add node
        const addTrueBtnId = `add-step-${step.id}-true`;
        nodes.push({
          id: addTrueBtnId,
          type: 'addStepNode',
          position: { x: 0, y: 0 },
          data: { parentId: step.id, branch: true, onAddNode, isDragging },
        });
        dagreGraph.setNode(addTrueBtnId, { width: 60, height: 60 });
        edges.push({
          id: `edge-${id}-${addTrueBtnId}`,
          source: id,
          target: addTrueBtnId,
          sourceHandle: 'true',
          type: 'smoothstep',
          ...trueLabelOptions,
        });
        dagreGraph.setEdge(id, addTrueBtnId);

        if (trueStep) {
          edges.push({
            id: `edge-${addTrueBtnId}-${trueStep.id}`,
            source: addTrueBtnId,
            target: `step-${trueStep.id}`,
            type: 'smoothstep',
          });
          dagreGraph.setEdge(addTrueBtnId, `step-${trueStep.id}`);
        } else {
          addExitNode(addTrueBtnId, `${step.id}-true-exit`);
        }

        // False branch add node
        const addFalseBtnId = `add-step-${step.id}-false`;
        nodes.push({
          id: addFalseBtnId,
          type: 'addStepNode',
          position: { x: 0, y: 0 },
          data: { parentId: step.id, branch: false, onAddNode, isDragging },
        });
        dagreGraph.setNode(addFalseBtnId, { width: 60, height: 60 });
        edges.push({
          id: `edge-${id}-${addFalseBtnId}`,
          source: id,
          target: addFalseBtnId,
          sourceHandle: 'false',
          type: 'smoothstep',
          ...falseLabelOptions,
        });
        dagreGraph.setEdge(id, addFalseBtnId);

        if (falseStep) {
          edges.push({
            id: `edge-${addFalseBtnId}-${falseStep.id}`,
            source: addFalseBtnId,
            target: `step-${falseStep.id}`,
            type: 'smoothstep',
          });
          dagreGraph.setEdge(addFalseBtnId, `step-${falseStep.id}`);
        } else {
          addExitNode(addFalseBtnId, `${step.id}-false-exit`);
        }
      } else {
        if (trueStep) {
          edges.push({
            id: `edge-true-${id}-${trueStep.id}`,
            source: id,
            target: `step-${trueStep.id}`,
            sourceHandle: 'true',
            type: 'smoothstep',
            ...trueLabelOptions,
          });
          dagreGraph.setEdge(id, `step-${trueStep.id}`);
        } else {
          addExitNode(id, `${step.id}-true`, 'true', 'True');
        }

        if (falseStep) {
          edges.push({
            id: `edge-false-${id}-${falseStep.id}`,
            source: id,
            target: `step-${falseStep.id}`,
            sourceHandle: 'false',
            type: 'smoothstep',
            ...falseLabelOptions,
          });
          dagreGraph.setEdge(id, `step-${falseStep.id}`);
        } else {
          addExitNode(id, `${step.id}-false`, 'false', 'False');
        }
      }
    } else {
      const nextStep = steps.find((s) => s.parentWorkflowStepId === step.id);

      if (!isActive) {
        const addLinearBtnId = `add-step-${step.id}-linear`;
        nodes.push({
          id: addLinearBtnId,
          type: 'addStepNode',
          position: { x: 0, y: 0 },
          data: { parentId: step.id, branch: 'linear', onAddNode, isDragging },
        });
        dagreGraph.setNode(addLinearBtnId, { width: 60, height: 60 });
        edges.push({
          id: `edge-${id}-${addLinearBtnId}`,
          source: id,
          target: addLinearBtnId,
          type: 'smoothstep',
        });
        dagreGraph.setEdge(id, addLinearBtnId);

        if (nextStep) {
          edges.push({
            id: `edge-${addLinearBtnId}-${nextStep.id}`,
            source: addLinearBtnId,
            target: `step-${nextStep.id}`,
            type: 'smoothstep',
          });
          dagreGraph.setEdge(addLinearBtnId, `step-${nextStep.id}`);
        } else {
          addExitNode(addLinearBtnId, `${step.id}-linear-exit`);
        }
      } else {
        if (nextStep) {
          edges.push({
            id: `edge-${id}-${nextStep.id}`,
            source: id,
            target: `step-${nextStep.id}`,
            type: 'smoothstep',
          });
          dagreGraph.setEdge(id, `step-${nextStep.id}`);
        } else {
          addExitNode(id, `${step.id}-linear`);
        }
      }
    }
  });

  // 3. Layout the graph
  dagre.layout(dagreGraph);

  // Apply positions
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
