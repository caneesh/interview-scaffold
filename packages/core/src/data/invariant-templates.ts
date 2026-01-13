/**
 * Default Invariant Templates by Pattern
 *
 * These templates provide scaffolded invariant building for each pattern.
 * Templates are organized by pattern and rung level.
 */

import type { InvariantTemplate } from '../entities/invariant-template.js';
import type { PatternId } from '../entities/pattern.js';

/**
 * Default invariant templates for each pattern
 */
export const DEFAULT_INVARIANT_TEMPLATES: Record<PatternId, InvariantTemplate[]> = {
  SLIDING_WINDOW: [
    {
      id: 'sw_window_bounds',
      pattern: 'SLIDING_WINDOW',
      rung: 1,
      prompt: 'The window [left, right] always contains {{constraint}} that satisfies {{condition}}.',
      slots: [
        {
          id: 'constraint',
          choices: ['at most k elements', 'exactly k elements', 'a contiguous subarray', 'all unique elements'],
          correctIndex: 2,
        },
        {
          id: 'condition',
          choices: ['the sum constraint', 'the length constraint', 'the target condition', 'the problem requirements'],
          correctIndex: 3,
        },
      ],
      explanation: 'A sliding window maintains a contiguous subarray that we expand or contract to satisfy the problem requirements.',
    },
    {
      id: 'sw_max_sum',
      pattern: 'SLIDING_WINDOW',
      rung: 1,
      prompt: 'At each step, the window sum equals {{sum_definition}}, and we {{action}} when {{trigger}}.',
      slots: [
        {
          id: 'sum_definition',
          choices: ['the sum of elements from left to right', 'the maximum element in range', 'the count of valid elements', 'the product of elements'],
          correctIndex: 0,
        },
        {
          id: 'action',
          choices: ['expand the window', 'shrink from left', 'update our answer', 'reset the window'],
          correctIndex: 2,
        },
        {
          id: 'trigger',
          choices: ['the window is full', 'we find a better result', 'the constraint is violated', 'we reach the end'],
          correctIndex: 1,
        },
      ],
      explanation: 'For sum-based sliding window problems, we track the running sum and update our answer when we find a better result.',
    },
  ],

  TWO_POINTERS: [
    {
      id: 'tp_sorted_search',
      pattern: 'TWO_POINTERS',
      rung: 1,
      prompt: 'The left pointer starts at {{left_start}} and right at {{right_start}}, moving {{movement}} until they {{termination}}.',
      slots: [
        {
          id: 'left_start',
          choices: ['index 0', 'the smallest element', 'the first valid position', 'the beginning'],
          correctIndex: 0,
        },
        {
          id: 'right_start',
          choices: ['the last index', 'index 0', 'the middle', 'the largest element'],
          correctIndex: 0,
        },
        {
          id: 'movement',
          choices: ['toward each other', 'in the same direction', 'away from each other', 'alternately'],
          correctIndex: 0,
        },
        {
          id: 'termination',
          choices: ['meet or cross', 'find the target', 'reach the end', 'exhaust all options'],
          correctIndex: 0,
        },
      ],
      explanation: 'Two pointers moving toward each other efficiently search a sorted array by eliminating half the search space with each comparison.',
    },
    {
      id: 'tp_partition',
      pattern: 'TWO_POINTERS',
      rung: 2,
      prompt: 'Elements before the {{first_pointer}} satisfy {{first_condition}}, while elements after the {{second_pointer}} satisfy {{second_condition}}.',
      slots: [
        {
          id: 'first_pointer',
          choices: ['left pointer', 'write pointer', 'slow pointer', 'read pointer'],
          correctIndex: 0,
        },
        {
          id: 'first_condition',
          choices: ['the partition condition', 'being processed', 'the target property', 'being less than pivot'],
          correctIndex: 2,
        },
        {
          id: 'second_pointer',
          choices: ['right pointer', 'read pointer', 'fast pointer', 'scan pointer'],
          correctIndex: 0,
        },
        {
          id: 'second_condition',
          choices: ['the opposite condition', 'being unprocessed', 'not having the property', 'being greater than pivot'],
          correctIndex: 2,
        },
      ],
      explanation: 'Partitioning with two pointers divides elements into regions based on properties, moving pointers to maintain the invariant.',
    },
  ],

  PREFIX_SUM: [
    {
      id: 'ps_range_query',
      pattern: 'PREFIX_SUM',
      rung: 1,
      prompt: 'prefix[i] stores {{stored_value}}, so the sum from index i to j equals {{formula}}.',
      slots: [
        {
          id: 'stored_value',
          choices: ['the sum of elements 0 to i', 'the element at index i', 'the count up to i', 'the maximum up to i'],
          correctIndex: 0,
        },
        {
          id: 'formula',
          choices: ['prefix[j] - prefix[i-1]', 'prefix[j] - prefix[i]', 'prefix[i] + prefix[j]', 'prefix[j+1] - prefix[i]'],
          correctIndex: 3,
        },
      ],
      explanation: 'Prefix sums enable O(1) range sum queries by precomputing cumulative sums and using subtraction.',
    },
  ],

  BINARY_SEARCH: [
    {
      id: 'bs_search_space',
      pattern: 'BINARY_SEARCH',
      rung: 1,
      prompt: 'The search space [left, right] always {{contains}}, and we {{eliminate}} based on the comparison at mid.',
      slots: [
        {
          id: 'contains',
          choices: ['contains the target if it exists', 'is sorted', 'has valid candidates', 'is non-empty'],
          correctIndex: 0,
        },
        {
          id: 'eliminate',
          choices: ['eliminate half the space', 'move left or right', 'update our answer', 'check the boundaries'],
          correctIndex: 0,
        },
      ],
      explanation: 'Binary search maintains the invariant that the target (if it exists) is always within the current search bounds.',
    },
  ],

  BFS: [
    {
      id: 'bfs_level_order',
      pattern: 'BFS',
      rung: 1,
      prompt: 'The queue contains {{queue_contents}}, and we process nodes {{order}} to ensure {{guarantee}}.',
      slots: [
        {
          id: 'queue_contents',
          choices: ['nodes at the current or next level', 'all unvisited nodes', 'the shortest path candidates', 'neighbors of current node'],
          correctIndex: 0,
        },
        {
          id: 'order',
          choices: ['level by level', 'in discovery order', 'by distance from source', 'in FIFO order'],
          correctIndex: 0,
        },
        {
          id: 'guarantee',
          choices: ['shortest path to each node', 'all nodes are visited', 'no cycles are followed', 'optimal solution is found'],
          correctIndex: 0,
        },
      ],
      explanation: 'BFS explores nodes level by level, guaranteeing that when we first reach a node, we have found the shortest path to it.',
    },
  ],

  DFS: [
    {
      id: 'dfs_exploration',
      pattern: 'DFS',
      rung: 1,
      prompt: 'At each node, we {{action}} before exploring {{children}}, and {{backtrack}} after all paths are exhausted.',
      slots: [
        {
          id: 'action',
          choices: ['mark as visited', 'process the node', 'check base case', 'update state'],
          correctIndex: 0,
        },
        {
          id: 'children',
          choices: ['all unvisited neighbors', 'the leftmost child first', 'children in order', 'valid next states'],
          correctIndex: 0,
        },
        {
          id: 'backtrack',
          choices: ['backtrack to parent', 'restore previous state', 'return the result', 'unmark as visited'],
          correctIndex: 0,
        },
      ],
      explanation: 'DFS explores as deep as possible before backtracking, marking nodes as visited to avoid cycles.',
    },
  ],

  DYNAMIC_PROGRAMMING: [
    {
      id: 'dp_subproblem',
      pattern: 'DYNAMIC_PROGRAMMING',
      rung: 1,
      prompt: 'dp[i] represents {{meaning}}, and is computed from {{dependency}} using the recurrence {{recurrence}}.',
      slots: [
        {
          id: 'meaning',
          choices: ['the optimal answer for subproblem i', 'whether state i is reachable', 'the count of ways to reach i', 'the minimum cost to reach i'],
          correctIndex: 0,
        },
        {
          id: 'dependency',
          choices: ['smaller subproblems', 'previous states', 'overlapping subproblems', 'base cases'],
          correctIndex: 0,
        },
        {
          id: 'recurrence',
          choices: ['that combines previous results', 'based on optimal substructure', 'using memoization', 'from the problem definition'],
          correctIndex: 1,
        },
      ],
      explanation: 'Dynamic programming breaks problems into overlapping subproblems and uses optimal substructure to build solutions.',
    },
  ],

  BACKTRACKING: [
    {
      id: 'bt_state_space',
      pattern: 'BACKTRACKING',
      rung: 1,
      prompt: 'At each step, we {{choice}}, recurse to explore further, then {{undo}} to try {{alternatives}}.',
      slots: [
        {
          id: 'choice',
          choices: ['make a choice and extend the current path', 'check if the solution is valid', 'prune invalid branches', 'mark the current state'],
          correctIndex: 0,
        },
        {
          id: 'undo',
          choices: ['undo the choice (backtrack)', 'restore the previous state', 'remove the last element', 'unmark the current state'],
          correctIndex: 0,
        },
        {
          id: 'alternatives',
          choices: ['other valid choices', 'remaining candidates', 'unexplored branches', 'different paths'],
          correctIndex: 0,
        },
      ],
      explanation: 'Backtracking systematically explores all possibilities by making choices, recursing, and undoing choices to try alternatives.',
    },
  ],

  GREEDY: [
    {
      id: 'greedy_local_optimal',
      pattern: 'GREEDY',
      rung: 1,
      prompt: 'At each step, we choose {{choice}} because {{justification}}, and this leads to {{outcome}}.',
      slots: [
        {
          id: 'choice',
          choices: ['the locally optimal option', 'the maximum/minimum element', 'the first valid candidate', 'the best immediate choice'],
          correctIndex: 0,
        },
        {
          id: 'justification',
          choices: ['it never hurts to be greedy here', 'we can prove optimality', 'it simplifies the problem', 'it reduces remaining work'],
          correctIndex: 1,
        },
        {
          id: 'outcome',
          choices: ['the global optimum', 'a valid solution', 'an approximation', 'the best possible result'],
          correctIndex: 0,
        },
      ],
      explanation: 'Greedy algorithms make locally optimal choices that can be proven to lead to globally optimal solutions.',
    },
  ],

  HEAP: [
    {
      id: 'heap_top_k',
      pattern: 'HEAP',
      rung: 1,
      prompt: 'The heap maintains {{contents}} so that we can efficiently {{operation}} in {{complexity}} time.',
      slots: [
        {
          id: 'contents',
          choices: ['the k smallest/largest elements seen so far', 'all elements in sorted order', 'the next element to process', 'candidates for the answer'],
          correctIndex: 0,
        },
        {
          id: 'operation',
          choices: ['get the min/max', 'insert and extract', 'find the kth element', 'maintain sorted order'],
          correctIndex: 0,
        },
        {
          id: 'complexity',
          choices: ['O(log k)', 'O(1)', 'O(n)', 'O(k)'],
          correctIndex: 0,
        },
      ],
      explanation: 'Heaps efficiently maintain the min/max of a dynamic set, supporting O(log n) insert and extract operations.',
    },
  ],

  TRIE: [
    {
      id: 'trie_prefix',
      pattern: 'TRIE',
      rung: 1,
      prompt: 'Each node in the trie represents {{node_meaning}}, and following a path from root to node gives {{path_meaning}}.',
      slots: [
        {
          id: 'node_meaning',
          choices: ['a character in a word', 'a complete word', 'a prefix', 'a pattern'],
          correctIndex: 0,
        },
        {
          id: 'path_meaning',
          choices: ['a prefix of one or more words', 'a complete word', 'all words with that prefix', 'the longest common prefix'],
          correctIndex: 0,
        },
      ],
      explanation: 'Tries store strings character by character, enabling efficient prefix queries and autocomplete operations.',
    },
  ],

  UNION_FIND: [
    {
      id: 'uf_components',
      pattern: 'UNION_FIND',
      rung: 1,
      prompt: 'Each element points to {{parent}}, and elements in the same {{structure}} share {{property}}.',
      slots: [
        {
          id: 'parent',
          choices: ['its parent or itself if root', 'the set representative', 'a higher rank element', 'the original element'],
          correctIndex: 0,
        },
        {
          id: 'structure',
          choices: ['connected component', 'set', 'tree', 'group'],
          correctIndex: 0,
        },
        {
          id: 'property',
          choices: ['the same root representative', 'the same rank', 'a common ancestor', 'the same size'],
          correctIndex: 0,
        },
      ],
      explanation: 'Union-Find tracks connected components efficiently using parent pointers and path compression.',
    },
  ],

  INTERVAL_MERGING: [
    {
      id: 'im_overlap',
      pattern: 'INTERVAL_MERGING',
      rung: 1,
      prompt: 'After sorting by {{sort_key}}, we merge intervals when {{merge_condition}}, extending {{extend}}.',
      slots: [
        {
          id: 'sort_key',
          choices: ['start time', 'end time', 'duration', 'both start and end'],
          correctIndex: 0,
        },
        {
          id: 'merge_condition',
          choices: ['current.start <= previous.end', 'intervals overlap', 'there is no gap', 'they share a boundary'],
          correctIndex: 0,
        },
        {
          id: 'extend',
          choices: ['the end of the merged interval', 'the current interval', 'the previous interval', 'both intervals'],
          correctIndex: 0,
        },
      ],
      explanation: 'Sorting by start time allows linear-time merging by comparing each interval with the last merged interval.',
    },
  ],
};

/**
 * Get templates for a specific pattern and rung
 */
export function getTemplatesForPattern(
  pattern: PatternId,
  rung?: number
): InvariantTemplate[] {
  const templates = DEFAULT_INVARIANT_TEMPLATES[pattern] ?? [];

  if (rung === undefined) {
    return [...templates];
  }

  // Return templates for this rung or lower
  return templates.filter(t => t.rung <= rung);
}

/**
 * Get a specific template by ID
 */
export function getTemplateById(templateId: string): InvariantTemplate | null {
  for (const templates of Object.values(DEFAULT_INVARIANT_TEMPLATES)) {
    const found = templates.find(t => t.id === templateId);
    if (found) return found;
  }
  return null;
}
