/**
 * Build Ladder Graph Use Case
 *
 * Assigns prerequisites and relationships between content items
 * to form a DAG (Directed Acyclic Graph) for learning progression.
 */

import type {
  GeneratorRepoPort,
  PatternLadderId,
  LadderNode,
  ContentItemEdge,
  EdgeType,
} from '../../ports/generator-repo.js';
import type { ContentBankRepoPort } from '../../ports/content-bank-repo.js';

export interface BuildLadderGraphInput {
  ladderId: PatternLadderId;
  /** Strategy for connecting nodes */
  connectionStrategy?: 'sequential' | 'branched' | 'minimal';
}

export interface BuildLadderGraphOutput {
  edgesCreated: number;
  nodesConnected: number;
  warnings: string[];
}

export interface BuildLadderGraphDeps {
  generatorRepo: GeneratorRepoPort;
  contentBankRepo: ContentBankRepoPort;
}

/**
 * Build the prerequisite graph for a ladder
 *
 * Creates edges between content items based on:
 * 1. Level progression (lower level -> higher level)
 * 2. Position within level (earlier -> later)
 * 3. Pattern relationships
 */
export async function buildLadderGraph(
  input: BuildLadderGraphInput,
  deps: BuildLadderGraphDeps
): Promise<BuildLadderGraphOutput> {
  const { generatorRepo } = deps;
  const warnings: string[] = [];

  // Get ladder and nodes
  const ladder = await generatorRepo.getLadder(input.ladderId);
  if (!ladder) {
    throw new Error(`Ladder not found: ${input.ladderId}`);
  }

  const nodes = await generatorRepo.getLadderNodes(input.ladderId);
  if (nodes.length === 0) {
    return { edgesCreated: 0, nodesConnected: 0, warnings: ['Ladder has no nodes'] };
  }

  // Group nodes by level
  const nodesByLevel = groupNodesByLevel(nodes);
  const strategy = input.connectionStrategy ?? 'sequential';

  // Create edges based on strategy
  const edges: Array<{
    from: string;
    to: string;
    type: EdgeType;
    reason: string;
  }> = [];

  switch (strategy) {
    case 'sequential':
      createSequentialEdges(nodesByLevel, edges);
      break;
    case 'branched':
      createBranchedEdges(nodesByLevel, edges);
      break;
    case 'minimal':
      createMinimalEdges(nodesByLevel, edges);
      break;
  }

  // Validate DAG (no cycles)
  const cycleCheck = detectCycles(nodes, edges);
  if (cycleCheck.hasCycle) {
    throw new Error(`Graph has cycles: ${cycleCheck.description}`);
  }

  // Create edges in database
  let edgesCreated = 0;
  const connectedNodes = new Set<string>();

  for (const edge of edges) {
    try {
      await generatorRepo.createEdge({
        fromContentItemId: edge.from,
        toContentItemId: edge.to,
        edgeType: edge.type,
        reason: edge.reason,
      });
      edgesCreated++;
      connectedNodes.add(edge.from);
      connectedNodes.add(edge.to);
    } catch (error) {
      // Edge might already exist, that's OK
      if (error instanceof Error && error.message.includes('unique')) {
        warnings.push(`Edge already exists: ${edge.from} -> ${edge.to}`);
      } else {
        throw error;
      }
    }
  }

  return {
    edgesCreated,
    nodesConnected: connectedNodes.size,
    warnings,
  };
}

/**
 * Group nodes by their level
 */
function groupNodesByLevel(nodes: readonly LadderNode[]): Map<number, LadderNode[]> {
  const byLevel = new Map<number, LadderNode[]>();

  for (const node of nodes) {
    const level = node.level;
    if (!byLevel.has(level)) {
      byLevel.set(level, []);
    }
    byLevel.get(level)!.push(node);
  }

  // Sort nodes within each level by position
  for (const [, levelNodes] of byLevel) {
    levelNodes.sort((a, b) => a.position - b.position);
  }

  return byLevel;
}

/**
 * Sequential strategy: each node at level N is a prereq for all nodes at level N+1
 */
function createSequentialEdges(
  nodesByLevel: Map<number, LadderNode[]>,
  edges: Array<{ from: string; to: string; type: EdgeType; reason: string }>
): void {
  const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

  for (let i = 0; i < levels.length - 1; i++) {
    const currentLevel = levels[i]!;
    const nextLevel = levels[i + 1]!;
    const currentNodes = nodesByLevel.get(currentLevel) ?? [];
    const nextNodes = nodesByLevel.get(nextLevel) ?? [];

    // Connect last node of current level to first node of next level
    if (currentNodes.length > 0 && nextNodes.length > 0) {
      const lastCurrent = currentNodes[currentNodes.length - 1]!;
      const firstNext = nextNodes[0]!;

      edges.push({
        from: lastCurrent.contentItemId,
        to: firstNext.contentItemId,
        type: 'prereq',
        reason: `Level ${currentLevel} -> Level ${nextLevel} progression`,
      });
    }

    // Connect nodes within next level sequentially
    for (let j = 0; j < nextNodes.length - 1; j++) {
      const current = nextNodes[j]!;
      const next = nextNodes[j + 1]!;

      edges.push({
        from: current.contentItemId,
        to: next.contentItemId,
        type: 'recommended',
        reason: `Sequential progression within level ${nextLevel}`,
      });
    }
  }
}

/**
 * Branched strategy: allows multiple paths through the ladder
 */
function createBranchedEdges(
  nodesByLevel: Map<number, LadderNode[]>,
  edges: Array<{ from: string; to: string; type: EdgeType; reason: string }>
): void {
  const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

  for (let i = 0; i < levels.length - 1; i++) {
    const currentLevel = levels[i]!;
    const nextLevel = levels[i + 1]!;
    const currentNodes = nodesByLevel.get(currentLevel) ?? [];
    const nextNodes = nodesByLevel.get(nextLevel) ?? [];

    // Each node at current level connects to first node at next level (prereq)
    // And recommends other nodes at next level
    for (const currentNode of currentNodes) {
      for (let j = 0; j < nextNodes.length; j++) {
        const nextNode = nextNodes[j]!;
        const isFirst = j === 0;

        edges.push({
          from: currentNode.contentItemId,
          to: nextNode.contentItemId,
          type: isFirst ? 'prereq' : 'recommended',
          reason: isFirst
            ? `Required: Level ${currentLevel} -> ${nextLevel}`
            : `Alternative: Level ${currentLevel} -> ${nextLevel}`,
        });
      }
    }
  }
}

/**
 * Minimal strategy: only connect first/last nodes of levels
 */
function createMinimalEdges(
  nodesByLevel: Map<number, LadderNode[]>,
  edges: Array<{ from: string; to: string; type: EdgeType; reason: string }>
): void {
  const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

  for (let i = 0; i < levels.length - 1; i++) {
    const currentLevel = levels[i]!;
    const nextLevel = levels[i + 1]!;
    const currentNodes = nodesByLevel.get(currentLevel) ?? [];
    const nextNodes = nodesByLevel.get(nextLevel) ?? [];

    if (currentNodes.length > 0 && nextNodes.length > 0) {
      // Only connect one node from current to next level
      const currentNode = currentNodes[0]!; // Use first (could also use any passing)
      const nextNode = nextNodes[0]!;

      edges.push({
        from: currentNode.contentItemId,
        to: nextNode.contentItemId,
        type: 'prereq',
        reason: `Minimal path: Level ${currentLevel} -> ${nextLevel}`,
      });
    }
  }
}

/**
 * Detect cycles in the graph using DFS
 */
function detectCycles(
  nodes: readonly LadderNode[],
  edges: Array<{ from: string; to: string; type: EdgeType; reason: string }>
): { hasCycle: boolean; description?: string } {
  // Build adjacency list
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    adj.set(node.contentItemId, []);
  }
  for (const edge of edges) {
    const neighbors = adj.get(edge.from) ?? [];
    neighbors.push(edge.to);
    adj.set(edge.from, neighbors);
  }

  // DFS with coloring: 0 = unvisited, 1 = visiting, 2 = visited
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();

  for (const node of nodes) {
    color.set(node.contentItemId, 0);
    parent.set(node.contentItemId, null);
  }

  function dfs(nodeId: string): string | null {
    color.set(nodeId, 1); // Mark as visiting

    for (const neighbor of adj.get(nodeId) ?? []) {
      const neighborColor = color.get(neighbor);

      if (neighborColor === 1) {
        // Back edge found - cycle!
        return `${nodeId} -> ${neighbor}`;
      }

      if (neighborColor === 0) {
        parent.set(neighbor, nodeId);
        const result = dfs(neighbor);
        if (result) return result;
      }
    }

    color.set(nodeId, 2); // Mark as visited
    return null;
  }

  for (const node of nodes) {
    if (color.get(node.contentItemId) === 0) {
      const cycleEdge = dfs(node.contentItemId);
      if (cycleEdge) {
        return { hasCycle: true, description: `Cycle detected at edge: ${cycleEdge}` };
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Validate that edge levels are monotonically increasing
 */
export function validateEdgeLevelMonotonicity(
  nodes: readonly LadderNode[],
  edges: readonly ContentItemEdge[]
): { valid: boolean; violations: string[] } {
  const nodeLevel = new Map<string, number>();
  for (const node of nodes) {
    nodeLevel.set(node.contentItemId, node.level);
  }

  const violations: string[] = [];

  for (const edge of edges) {
    if (edge.edgeType !== 'prereq') continue; // Only check prereqs

    const fromLevel = nodeLevel.get(edge.fromContentItemId);
    const toLevel = nodeLevel.get(edge.toContentItemId);

    if (fromLevel !== undefined && toLevel !== undefined) {
      if (fromLevel > toLevel) {
        violations.push(
          `Prereq edge goes backwards: Level ${fromLevel} -> Level ${toLevel} (${edge.fromContentItemId} -> ${edge.toContentItemId})`
        );
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
