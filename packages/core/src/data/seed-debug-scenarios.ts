/**
 * Seed Debug Scenarios
 *
 * 14 debug scenarios covering all major debugging pattern categories.
 * Each scenario includes buggy code, expected findings, fix strategies,
 * and a progressive hint ladder.
 */

import type {
  DebugScenario,
  CodeArtifact,
} from '../debug-track/entities.js';

import type {
  DebugPatternCategory,
  DebugDifficulty,
} from '../debug-track/types.js';

import type { SeedDebugScenario } from './seed-debug-track.js';

// ============================================================================
// FUNCTIONAL_LOGIC SCENARIOS (3)
// ============================================================================

/**
 * Scenario 1: Off-by-One Array Bug
 * Classic off-by-one error in loop iteration
 */
const OFF_BY_ONE_ARRAY: SeedDebugScenario = {
  id: 'func-off-by-one',
  category: 'FUNCTIONAL_LOGIC',
  patternKey: 'off_by_one',
  difficulty: 'BEGINNER',
  symptomDescription:
    'Function returns incorrect results for edge cases. Users report that the last element is sometimes skipped.',
  codeArtifacts: [
    {
      id: 'process-items-py',
      filename: 'process_items.py',
      code: `def process_items(items):
    """Process each item by doubling its value."""
    result = []
    for i in range(len(items) - 1):  # BUG: should be len(items)
        result.append(items[i] * 2)
    return result

# Expected: [2, 4, 6, 8, 10]
# Actual:   [2, 4, 6, 8]
print(process_items([1, 2, 3, 4, 5]))`,
      language: 'python',
      bugLines: [4],
    },
  ],
  expectedFindings: [
    'Loop iterates to len-1 instead of len',
    'Last element is never processed',
    'range(len(items) - 1) excludes final index',
  ],
  fixStrategies: [
    'Change range to len(items)',
    'Use enumerate or direct iteration: for item in items',
    'Use list comprehension: [x * 2 for x in items]',
  ],
  regressionExpectation:
    'Add test for single-element and empty arrays to catch boundary conditions',
  hintLadder: [
    'Look carefully at the loop bounds',
    'What is the maximum value of i in this loop?',
    'Compare range(len(items)-1) vs range(len(items))',
    'The -1 causes the last element to be skipped',
  ],
  tags: ['beginner', 'python', 'loops', 'arrays', 'off-by-one'],
};

/**
 * Scenario 2: Empty Input Division
 * Division by zero when input is empty
 */
const EMPTY_INPUT_DIVISION: SeedDebugScenario = {
  id: 'func-empty-input-div',
  category: 'FUNCTIONAL_LOGIC',
  patternKey: 'missing_guard',
  difficulty: 'BEGINNER',
  symptomDescription:
    'Calculate average function crashes with ZeroDivisionError when given an empty list. Works fine for non-empty lists.',
  codeArtifacts: [
    {
      id: 'stats-py',
      filename: 'stats.py',
      code: `def calculate_average(numbers):
    """Calculate the average of a list of numbers."""
    total = sum(numbers)
    return total / len(numbers)  # BUG: no guard for empty list

# Works fine:
print(calculate_average([1, 2, 3, 4, 5]))  # 3.0

# Crashes:
print(calculate_average([]))  # ZeroDivisionError`,
      language: 'python',
      bugLines: [4],
    },
  ],
  expectedFindings: [
    'No check for empty input before division',
    'len(numbers) is 0 for empty list',
    'Missing guard clause or input validation',
  ],
  fixStrategies: [
    'Add guard: if not numbers: return 0 (or raise ValueError)',
    'Add guard: if len(numbers) == 0: return None',
    'Use try/except for ZeroDivisionError',
  ],
  regressionExpectation:
    'Add explicit tests for empty list, single element, and None input',
  hintLadder: [
    'What happens when the list is empty?',
    'What is len(numbers) when numbers = []?',
    'Division by zero occurs when the denominator is 0',
    'Add a guard clause to handle empty input before dividing',
  ],
  tags: ['beginner', 'python', 'division', 'edge-case', 'guard-clause'],
};

/**
 * Scenario 3: Binary Search Boundary Bug
 * Classic binary search boundary condition error
 */
const BINARY_SEARCH_BOUNDARY: SeedDebugScenario = {
  id: 'func-binary-search-bound',
  category: 'FUNCTIONAL_LOGIC',
  patternKey: 'boundary_condition',
  difficulty: 'INTERMEDIATE',
  symptomDescription:
    'Binary search sometimes fails to find elements that exist in the array. Works for some inputs but not others. Occasionally returns wrong index.',
  codeArtifacts: [
    {
      id: 'binary-search-py',
      filename: 'binary_search.py',
      code: `def binary_search(arr, target):
    """Find target in sorted array, return index or -1."""
    left, right = 0, len(arr)  # BUG: should be len(arr) - 1

    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:  # May cause IndexError
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1

# Sometimes works:
print(binary_search([1, 2, 3, 4, 5], 3))  # 2

# Crashes on edge cases:
print(binary_search([1, 2, 3, 4, 5], 5))  # IndexError or wrong result`,
      language: 'python',
      bugLines: [3],
    },
  ],
  expectedFindings: [
    'right should be len(arr) - 1, not len(arr)',
    'arr[mid] can access index out of bounds',
    'Boundary initialization is incorrect for inclusive range',
  ],
  fixStrategies: [
    'Change right initialization to len(arr) - 1',
    'Use exclusive upper bound with while left < right',
    'Add bounds check before accessing arr[mid]',
  ],
  regressionExpectation:
    'Test with target at start, middle, end, and not present. Test single-element and empty arrays.',
  hintLadder: [
    'Check the initial values of left and right',
    'What is the valid index range for an array of length n?',
    'Is right = len(arr) a valid index?',
    'right should be len(arr) - 1 for inclusive bounds with while left <= right',
  ],
  tags: ['intermediate', 'python', 'binary-search', 'boundary', 'indexing'],
};

// ============================================================================
// ALGORITHMIC SCENARIOS (2)
// ============================================================================

/**
 * Scenario 4: Missing Memoization
 * Exponential time complexity without caching
 */
const MISSING_MEMOIZATION: SeedDebugScenario = {
  id: 'algo-missing-memo',
  category: 'ALGORITHMIC',
  patternKey: 'missing_memoization',
  difficulty: 'INTERMEDIATE',
  symptomDescription:
    'Fibonacci function works but times out for n > 35. Performance degrades exponentially. Users report the function "hangs" on moderately large inputs.',
  codeArtifacts: [
    {
      id: 'fibonacci-py',
      filename: 'fibonacci.py',
      code: `def fib(n):
    """Calculate the nth Fibonacci number."""
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)  # Exponential time without memoization

# Fast:
print(fib(10))   # 55 (instant)
print(fib(20))   # 6765 (fast)

# Slow:
print(fib(35))   # 9227465 (takes several seconds)
print(fib(40))   # 102334155 (takes minutes!)
print(fib(50))   # ... never completes`,
      language: 'python',
      bugLines: [5],
    },
  ],
  expectedFindings: [
    'No caching of computed values',
    'Exponential time complexity O(2^n)',
    'Redundant recursive calls - fib(2) computed many times',
    'Classic overlapping subproblems not leveraged',
  ],
  fixStrategies: [
    'Add memoization decorator: @functools.lru_cache',
    'Use iterative DP with two variables',
    'Manual memoization with dictionary cache',
  ],
  regressionExpectation:
    'Add benchmark test ensuring O(n) time complexity for n=1000',
  hintLadder: [
    'How many times is fib(2) called when computing fib(5)?',
    'Draw the call tree - notice repeated subproblems',
    'What technique eliminates redundant computation?',
    'Memoization or dynamic programming stores computed results',
  ],
  tags: ['intermediate', 'python', 'recursion', 'dp', 'performance', 'memoization'],
};

/**
 * Scenario 5: Incorrect Visited State in Graph Traversal
 * Missing visited check causes infinite loop
 */
const INCORRECT_VISITED_STATE: SeedDebugScenario = {
  id: 'algo-missing-visited',
  category: 'ALGORITHMIC',
  patternKey: 'missing_visited_check',
  difficulty: 'INTERMEDIATE',
  symptomDescription:
    'Graph traversal function hangs on some inputs. Works fine for tree-like structures but freezes on graphs with cycles. CPU usage spikes to 100%.',
  codeArtifacts: [
    {
      id: 'graph-traversal-py',
      filename: 'graph_traversal.py',
      code: `def find_path(graph, start, end):
    """Find if path exists from start to end using DFS."""
    def dfs(node):
        if node == end:
            return True
        for neighbor in graph.get(node, []):
            if dfs(neighbor):  # BUG: no visited check
                return True
        return False

    return dfs(start)

# Works for trees:
tree = {'A': ['B', 'C'], 'B': ['D'], 'C': ['E'], 'D': [], 'E': []}
print(find_path(tree, 'A', 'E'))  # True

# Hangs on cycles:
cyclic = {'A': ['B'], 'B': ['C'], 'C': ['A']}  # A -> B -> C -> A
print(find_path(cyclic, 'A', 'D'))  # Never terminates!`,
      language: 'python',
      bugLines: [7],
    },
  ],
  expectedFindings: [
    'No visited set to track explored nodes',
    'Cycles cause infinite recursion',
    'DFS without cycle detection',
    'Stack overflow risk on large cyclic graphs',
  ],
  fixStrategies: [
    'Add visited set parameter, mark nodes before recursing',
    'Check if node in visited before processing',
    'Use iterative DFS with explicit stack and visited set',
  ],
  regressionExpectation:
    'Test with cyclic graphs, self-loops, and disconnected components',
  hintLadder: [
    'What happens when the graph contains a cycle?',
    'Does the algorithm ever stop exploring the same nodes?',
    'How do you prevent revisiting nodes in graph traversal?',
    'Add a visited set and check/mark nodes before recursing',
  ],
  tags: ['intermediate', 'python', 'graph', 'dfs', 'cycles', 'visited'],
};

// ============================================================================
// PERFORMANCE SCENARIOS (2)
// ============================================================================

/**
 * Scenario 6: O(n^2) String Search
 * Quadratic complexity from nested string operations
 */
const QUADRATIC_STRING_SEARCH: SeedDebugScenario = {
  id: 'perf-string-count',
  category: 'PERFORMANCE',
  patternKey: 'quadratic_string_ops',
  difficulty: 'INTERMEDIATE',
  symptomDescription:
    'first_non_repeating_char function times out on strings longer than 10,000 characters. Works instantly on short strings but becomes unusable on large inputs.',
  codeArtifacts: [
    {
      id: 'string-util-py',
      filename: 'string_util.py',
      code: `def first_non_repeating(s):
    """Find first character that appears exactly once."""
    for char in s:
        if s.count(char) == 1:  # O(n) inside O(n) loop = O(n^2)
            return char
    return None

# Fast for small strings:
print(first_non_repeating("leetcode"))  # 'l' (instant)

# Slow for large strings:
large = "a" * 50000 + "b" + "c" * 50000
print(first_non_repeating(large))  # Takes forever!`,
      language: 'python',
      bugLines: [4],
    },
  ],
  expectedFindings: [
    's.count() is O(n) operation',
    'Nested inside O(n) loop gives O(n^2) total',
    'count() scans entire string for each character',
    'Redundant counting of same characters',
  ],
  fixStrategies: [
    'Pre-compute character counts with Counter in O(n)',
    'Single pass with hash map to count, second pass to find first',
    'Use OrderedDict to maintain insertion order with counts',
  ],
  regressionExpectation:
    'Add performance test with 100k character string, must complete under 1 second',
  hintLadder: [
    'What is the time complexity of s.count()?',
    'How many times is count() called in total?',
    'Can you precompute all counts in one pass?',
    'Use collections.Counter for O(n) counting, then iterate once',
  ],
  tags: ['intermediate', 'python', 'strings', 'complexity', 'performance'],
};

/**
 * Scenario 7: max_profit O(n^2)
 * Stock profit calculation with nested loops
 */
const MAX_PROFIT_NESTED: SeedDebugScenario = {
  id: 'perf-max-profit',
  category: 'PERFORMANCE',
  patternKey: 'nested_loop_optimization',
  difficulty: 'INTERMEDIATE',
  symptomDescription:
    'Stock profit calculator times out on large price histories. Works for a few hundred prices but fails on years of daily data (thousands of prices).',
  codeArtifacts: [
    {
      id: 'stock-profit-py',
      filename: 'stock_profit.py',
      code: `def max_profit(prices):
    """Find maximum profit from buying and selling once."""
    max_prof = 0

    for i in range(len(prices)):        # O(n)
        for j in range(i + 1, len(prices)):  # O(n) nested = O(n^2)
            profit = prices[j] - prices[i]
            max_prof = max(max_prof, profit)

    return max_prof

# Fast:
print(max_profit([7, 1, 5, 3, 6, 4]))  # 5 (instant)

# Slow:
import random
large_prices = [random.randint(1, 1000) for _ in range(50000)]
print(max_profit(large_prices))  # Takes forever!`,
      language: 'python',
      bugLines: [5, 6],
    },
  ],
  expectedFindings: [
    'Nested loops give O(n^2) complexity',
    'Comparing all pairs is unnecessary',
    'Only need to track minimum seen so far',
    'Can solve in single pass O(n)',
  ],
  fixStrategies: [
    'Track min_price seen so far, compute max profit at each step',
    'Single pass: min_so_far and max_profit variables',
    'Kadane-style approach for maximum subarray',
  ],
  regressionExpectation:
    'Performance test with 1 million prices, must complete under 1 second',
  hintLadder: [
    'Do you need to compare every pair of days?',
    'What information from past days is actually needed?',
    'If you know the minimum price so far, you know the best buy price',
    'Single pass: track min_price, update max_profit = max(max_profit, price - min_price)',
  ],
  tags: ['intermediate', 'python', 'arrays', 'complexity', 'optimization'],
};

// ============================================================================
// RESOURCE SCENARIOS (2)
// ============================================================================

/**
 * Scenario 8: Unbounded Cache Growth
 * Memory leak from cache without eviction
 */
const UNBOUNDED_CACHE: SeedDebugScenario = {
  id: 'resource-unbounded-cache',
  category: 'RESOURCE',
  patternKey: 'memory_leak_cache',
  difficulty: 'ADVANCED',
  symptomDescription:
    'Service memory usage grows unbounded over time. Eventually OOM kills the process after ~24 hours of running. Restart temporarily fixes but problem recurs.',
  codeArtifacts: [
    {
      id: 'cache-service-py',
      filename: 'cache_service.py',
      code: `class CacheService:
    """User data cache for fast lookups."""

    def __init__(self):
        self.cache = {}  # Grows forever!

    def get_user(self, user_id):
        """Get user from cache or fetch from database."""
        if user_id not in self.cache:
            self.cache[user_id] = self._fetch_user(user_id)
        return self.cache[user_id]

    def _fetch_user(self, user_id):
        # Simulated database fetch
        return {"id": user_id, "data": "x" * 1000}  # 1KB per user

# Usage pattern:
cache = CacheService()
for i in range(1_000_000):  # 1 million unique users
    cache.get_user(f"user_{i}")
    # Memory grows to ~1GB with no eviction!`,
      language: 'python',
      bugLines: [5],
    },
  ],
  expectedFindings: [
    'No cache eviction policy',
    'Memory grows with unique users indefinitely',
    'No TTL or size limit on cache',
    'Classic memory leak pattern',
  ],
  fixStrategies: [
    'Add LRU eviction with max size limit',
    'Add TTL expiration for cache entries',
    'Use functools.lru_cache with maxsize parameter',
    'Implement weak references for cache values',
  ],
  regressionExpectation:
    'Monitor memory usage over simulated time, ensure it stays bounded',
  hintLadder: [
    'What happens to self.cache over time with many unique users?',
    'Is there any limit on how big the cache can grow?',
    'What happens when millions of unique user_ids are accessed?',
    'Implement LRU, TTL-based eviction, or use @lru_cache(maxsize=N)',
  ],
  tags: ['advanced', 'python', 'memory', 'caching', 'resource-leak'],
};

/**
 * Scenario 9: String Concatenation in Loop
 * O(n^2) memory allocation from immutable strings
 */
const STRING_CONCAT_LOOP: SeedDebugScenario = {
  id: 'resource-string-concat',
  category: 'RESOURCE',
  patternKey: 'quadratic_string_concat',
  difficulty: 'INTERMEDIATE',
  symptomDescription:
    'Log builder function becomes extremely slow and memory-hungry when processing many log lines. Memory usage spikes and function takes minutes for large inputs.',
  codeArtifacts: [
    {
      id: 'log-builder-py',
      filename: 'log_builder.py',
      code: `def build_log_output(log_lines):
    """Concatenate all log lines into single output string."""
    output = ""
    for line in log_lines:
        output = output + line + "\\n"  # O(n^2) total allocations
    return output

# Fast for small logs:
small_logs = ["line " + str(i) for i in range(100)]
print(len(build_log_output(small_logs)))  # Instant

# Disastrously slow for large logs:
large_logs = ["line " + str(i) for i in range(100000)]
print(len(build_log_output(large_logs)))  # Takes forever, uses tons of memory`,
      language: 'python',
      bugLines: [5],
    },
  ],
  expectedFindings: [
    'Strings are immutable - each += creates new string',
    'Each concatenation copies entire string so far',
    'Total operations: O(1+2+3+...+n) = O(n^2)',
    'Memory churn from repeated allocations',
  ],
  fixStrategies: [
    'Use list.append() then "".join() at the end',
    'Use io.StringIO for efficient string building',
    'Use generator expression with join: "\\n".join(lines)',
  ],
  regressionExpectation:
    'Performance test with 1 million lines, must complete under 5 seconds',
  hintLadder: [
    'What happens in memory when you concatenate strings?',
    'How many bytes are copied during each += operation?',
    'Strings are immutable - each += allocates a new string',
    'Use list.append() and "".join() for O(n) string building',
  ],
  tags: ['intermediate', 'python', 'strings', 'memory', 'immutability'],
};

// ============================================================================
// CONCURRENCY SCENARIOS (3)
// ============================================================================

/**
 * Scenario 10: Bank Account Race Condition
 * Check-then-act race condition
 */
const BANK_RACE_CONDITION: SeedDebugScenario = {
  id: 'conc-bank-race',
  category: 'CONCURRENCY',
  patternKey: 'race_condition',
  difficulty: 'ADVANCED',
  symptomDescription:
    'Bank transfers occasionally result in incorrect balances. Some money "disappears" under high load. Issue is intermittent and hard to reproduce in testing.',
  codeArtifacts: [
    {
      id: 'bank-py',
      filename: 'bank.py',
      code: `import threading
import time

class BankAccount:
    def __init__(self, balance):
        self.balance = balance

    def withdraw(self, amount):
        """Withdraw money if sufficient balance."""
        if self.balance >= amount:  # Check
            # Race condition window here!
            time.sleep(0.001)  # Simulates some processing
            self.balance -= amount  # Act
            return True
        return False

# Demonstrate the race:
account = BankAccount(100)

def withdraw_50():
    if account.withdraw(50):
        print(f"Withdrew 50, balance: {account.balance}")

# Two threads try to withdraw simultaneously
t1 = threading.Thread(target=withdraw_50)
t2 = threading.Thread(target=withdraw_50)
t1.start()
t2.start()
t1.join()
t2.join()

# Expected: One succeeds, balance = 50
# Actual: Both may succeed, balance = 0 or even negative!
print(f"Final balance: {account.balance}")`,
      language: 'python',
      bugLines: [10, 13],
    },
  ],
  expectedFindings: [
    'Check-then-act is not atomic',
    'Multiple threads can pass the check before either subtracts',
    'Balance can go negative with concurrent withdrawals',
    'Time window between check and modification is vulnerable',
  ],
  fixStrategies: [
    'Use threading.Lock to make check-and-modify atomic',
    'Use atomic compare-and-swap operations',
    'Use database transactions for persistent accounts',
  ],
  regressionExpectation:
    'Concurrent stress test with assertions on final balance',
  hintLadder: [
    'What if two threads call withdraw() simultaneously?',
    'Can both threads pass the if check before either subtracts?',
    'This is called a check-then-act race condition',
    'Use threading.Lock to make the check-and-modify operation atomic',
  ],
  tags: ['advanced', 'python', 'concurrency', 'threading', 'race-condition'],
};

/**
 * Scenario 11: Counter Increment Race
 * Simple counter without synchronization
 */
const COUNTER_INCREMENT_RACE: SeedDebugScenario = {
  id: 'conc-counter-race',
  category: 'CONCURRENCY',
  patternKey: 'non_atomic_operation',
  difficulty: 'INTERMEDIATE',
  symptomDescription:
    'Hit counter shows fewer hits than expected. With 1000 concurrent requests, counter shows only 850-950. Loss increases with higher concurrency.',
  codeArtifacts: [
    {
      id: 'counter-py',
      filename: 'counter.py',
      code: `import threading

class HitCounter:
    def __init__(self):
        self.count = 0

    def increment(self):
        """Increment the counter."""
        self.count += 1  # Not atomic! read-modify-write race

# Simulate concurrent hits
counter = HitCounter()

def simulate_hits(n):
    for _ in range(n):
        counter.increment()

threads = []
for _ in range(10):
    t = threading.Thread(target=simulate_hits, args=(100,))
    threads.append(t)
    t.start()

for t in threads:
    t.join()

# Expected: 1000
# Actual: Often less than 1000 (e.g., 950, 980)
print(f"Total hits: {counter.count}")`,
      language: 'python',
      bugLines: [9],
    },
  ],
  expectedFindings: [
    '+= is not atomic - it is read-modify-write',
    'Two threads can read same value, both increment, both write',
    'Lost updates due to interleaving',
    'More threads = more lost increments',
  ],
  fixStrategies: [
    'Use threading.Lock around the increment',
    'Use atomic counter from queue module',
    'Use multiprocessing.Value with lock',
  ],
  regressionExpectation:
    'Stress test with 100 threads x 10000 increments, verify exact count',
  hintLadder: [
    'Is += a single operation or multiple steps?',
    'What steps does self.count += 1 involve?',
    '+= is read-modify-write: three separate operations',
    'Use a Lock or atomic operations to prevent interleaving',
  ],
  tags: ['intermediate', 'python', 'concurrency', 'atomic', 'counter'],
};

/**
 * Scenario 12: Deadlock Lock Ordering
 * Two locks acquired in different order
 */
const DEADLOCK_LOCK_ORDERING: SeedDebugScenario = {
  id: 'conc-deadlock-order',
  category: 'CONCURRENCY',
  patternKey: 'deadlock',
  difficulty: 'ADVANCED',
  symptomDescription:
    'Transfer between accounts occasionally freezes forever. System becomes unresponsive under load. Must restart service to recover. Happens more frequently with increased traffic.',
  codeArtifacts: [
    {
      id: 'transfer-py',
      filename: 'transfer.py',
      code: `import threading
import time

class Account:
    def __init__(self, id, balance):
        self.id = id
        self.balance = balance
        self.lock = threading.Lock()

def transfer(from_acc, to_acc, amount):
    """Transfer money between accounts."""
    with from_acc.lock:  # Lock order depends on call order!
        time.sleep(0.001)  # Increases deadlock probability
        with to_acc.lock:
            if from_acc.balance >= amount:
                from_acc.balance -= amount
                to_acc.balance += amount
                return True
    return False

# Setup accounts
alice = Account("alice", 1000)
bob = Account("bob", 1000)

# Concurrent transfers in opposite directions
def alice_to_bob():
    transfer(alice, bob, 100)  # Locks: alice, then bob

def bob_to_alice():
    transfer(bob, alice, 100)  # Locks: bob, then alice

# These can deadlock!
t1 = threading.Thread(target=alice_to_bob)
t2 = threading.Thread(target=bob_to_alice)
t1.start()
t2.start()
t1.join(timeout=5)
t2.join(timeout=5)

if t1.is_alive() or t2.is_alive():
    print("DEADLOCK DETECTED!")`,
      language: 'python',
      bugLines: [12, 14],
    },
  ],
  expectedFindings: [
    'Locks acquired in different order based on arguments',
    'Thread 1 holds A, waits for B; Thread 2 holds B, waits for A',
    'Classic ABBA deadlock pattern',
    'Circular wait condition satisfied',
  ],
  fixStrategies: [
    'Always acquire locks in consistent order (e.g., by account ID)',
    'Use timeout on lock acquisition',
    'Use a single global lock for all transfers',
    'Use lock-free data structures',
  ],
  regressionExpectation:
    'Stress test with many concurrent bidirectional transfers, verify no hangs',
  hintLadder: [
    'In what order are locks acquired in each function?',
    'Can two threads each hold one lock and wait for the other?',
    'This is a classic ABBA deadlock - circular dependency',
    'Always acquire locks in a consistent global order (e.g., by account ID)',
  ],
  tags: ['advanced', 'python', 'concurrency', 'deadlock', 'locking'],
};

// ============================================================================
// INTEGRATION SCENARIOS (2)
// ============================================================================

/**
 * Scenario 13: API Call Without Status Check
 * Missing error handling for HTTP responses
 */
const API_NO_STATUS_CHECK: SeedDebugScenario = {
  id: 'integ-no-status-check',
  category: 'INTEGRATION',
  patternKey: 'missing_error_handling',
  difficulty: 'INTERMEDIATE',
  symptomDescription:
    'Service crashes randomly when external API is slow or returns errors. Works fine in testing but fails unpredictably in production.',
  codeArtifacts: [
    {
      id: 'api-client-py',
      filename: 'api_client.py',
      code: `import requests

API_URL = "https://api.example.com"

def fetch_user_data(user_id):
    """Fetch user data from external API."""
    response = requests.get(f"{API_URL}/users/{user_id}")
    return response.json()  # No status check! Crashes on error responses

# Works when API is healthy:
user = fetch_user_data("123")
print(user["name"])

# Crashes when API returns error:
# - 500 Internal Server Error -> json() fails or returns error object
# - 404 Not Found -> json() may return error message
# - Timeout -> raises exception we don't catch
# - Rate limited (429) -> json() returns error, accessing user["name"] fails`,
      language: 'python',
      bugLines: [8],
    },
  ],
  expectedFindings: [
    'No response.raise_for_status() or status code check',
    'No try/except for network errors',
    'No timeout specified - can hang forever',
    'Error responses parsed as if successful',
  ],
  fixStrategies: [
    'Add response.raise_for_status() before parsing',
    'Wrap in try/except for RequestException',
    'Add timeout parameter to requests.get()',
    'Add retry logic with exponential backoff',
  ],
  regressionExpectation:
    'Test with mocked API errors (500, 404, timeout) and verify graceful handling',
  hintLadder: [
    'What happens if the API returns 500 Internal Server Error?',
    'What happens if the API times out?',
    'Always check response.status_code or use raise_for_status()',
    'Add timeout parameter and wrap in try/except RequestException',
  ],
  tags: ['intermediate', 'python', 'api', 'error-handling', 'network'],
};

/**
 * Scenario 14: Retry Without Backoff
 * Fixed delay retry causing thundering herd
 */
const RETRY_NO_BACKOFF: SeedDebugScenario = {
  id: 'integ-retry-no-backoff',
  category: 'INTEGRATION',
  patternKey: 'thundering_herd',
  difficulty: 'ADVANCED',
  symptomDescription:
    'When external service has brief outage, our service causes it to stay down. Recovery takes much longer than expected. Load on external service spikes after any failure.',
  codeArtifacts: [
    {
      id: 'retry-client-py',
      filename: 'retry_client.py',
      code: `import requests
import time

def fetch_with_retry(url, max_retries=5):
    """Fetch URL with retry on failure."""
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            return response.json()
        except requests.RequestException:
            if attempt < max_retries - 1:
                time.sleep(1)  # Fixed 1 second delay - thundering herd!
                continue
            raise

# Problem scenario:
# - 1000 clients all fail at once
# - All 1000 retry after exactly 1 second
# - Server gets hammered with 1000 requests simultaneously
# - Server fails again, cycle repeats
# - Service never recovers!

# In contrast, exponential backoff with jitter would spread out retries:
# - Client 1 retries after 1.2s, Client 2 after 1.8s, etc.
# - Load is distributed over time
# - Server can recover gradually`,
      language: 'python',
      bugLines: [13],
    },
  ],
  expectedFindings: [
    'Fixed retry delay causes synchronized retries',
    'All clients retry at same time = thundering herd',
    'Amplifies load on already struggling service',
    'No jitter to spread out retry attempts',
  ],
  fixStrategies: [
    'Add exponential backoff: delay = base * 2^attempt',
    'Add random jitter: delay += random(0, delay)',
    'Use circuit breaker pattern to stop retries entirely',
    'Cap maximum delay to prevent indefinite waits',
  ],
  regressionExpectation:
    'Simulate 100 concurrent clients with retries, measure request distribution over time',
  hintLadder: [
    'What happens when many clients fail at the same time?',
    'If all clients retry after exactly 1 second, what load hits the server?',
    'This is called the thundering herd problem',
    'Use exponential backoff with random jitter to distribute retry timing',
  ],
  tags: ['advanced', 'python', 'api', 'retry', 'backoff', 'distributed'],
};

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * All debug scenarios organized by category
 */
export const DEBUG_SCENARIOS_BY_CATEGORY: Record<DebugPatternCategory, readonly SeedDebugScenario[]> = {
  FUNCTIONAL_LOGIC: [OFF_BY_ONE_ARRAY, EMPTY_INPUT_DIVISION, BINARY_SEARCH_BOUNDARY],
  ALGORITHMIC: [MISSING_MEMOIZATION, INCORRECT_VISITED_STATE],
  PERFORMANCE: [QUADRATIC_STRING_SEARCH, MAX_PROFIT_NESTED],
  RESOURCE: [UNBOUNDED_CACHE, STRING_CONCAT_LOOP],
  CONCURRENCY: [BANK_RACE_CONDITION, COUNTER_INCREMENT_RACE, DEADLOCK_LOCK_ORDERING],
  INTEGRATION: [API_NO_STATUS_CHECK, RETRY_NO_BACKOFF],
  DISTRIBUTED: [], // Future expansion
  PRODUCTION_REALITY: [], // Future expansion
};

/**
 * All debug scenarios as a flat array
 */
export const ALL_DEBUG_SCENARIOS: readonly SeedDebugScenario[] = [
  // FUNCTIONAL_LOGIC (3)
  OFF_BY_ONE_ARRAY,
  EMPTY_INPUT_DIVISION,
  BINARY_SEARCH_BOUNDARY,
  // ALGORITHMIC (2)
  MISSING_MEMOIZATION,
  INCORRECT_VISITED_STATE,
  // PERFORMANCE (2)
  QUADRATIC_STRING_SEARCH,
  MAX_PROFIT_NESTED,
  // RESOURCE (2)
  UNBOUNDED_CACHE,
  STRING_CONCAT_LOOP,
  // CONCURRENCY (3)
  BANK_RACE_CONDITION,
  COUNTER_INCREMENT_RACE,
  DEADLOCK_LOCK_ORDERING,
  // INTEGRATION (2)
  API_NO_STATUS_CHECK,
  RETRY_NO_BACKOFF,
];

/**
 * Get debug scenarios by difficulty
 */
export function getDebugScenariosByDifficulty(
  difficulty: DebugDifficulty
): readonly SeedDebugScenario[] {
  return ALL_DEBUG_SCENARIOS.filter(s => s.difficulty === difficulty);
}

/**
 * Get debug scenarios by category
 */
export function getDebugScenariosByCategory(
  category: DebugPatternCategory
): readonly SeedDebugScenario[] {
  return DEBUG_SCENARIOS_BY_CATEGORY[category] ?? [];
}

/**
 * Get a specific debug scenario by ID
 */
export function getDebugScenarioById(id: string): SeedDebugScenario | null {
  return ALL_DEBUG_SCENARIOS.find(s => s.id === id) ?? null;
}

/**
 * Get debug scenarios by tag
 */
export function getDebugScenariosByTag(tag: string): readonly SeedDebugScenario[] {
  return ALL_DEBUG_SCENARIOS.filter(s => s.tags.includes(tag));
}

/**
 * Convert seed scenario to full DebugScenario entity
 */
export function toDebugScenario(seed: SeedDebugScenario): DebugScenario {
  return {
    ...seed,
    createdAt: new Date(),
  };
}
