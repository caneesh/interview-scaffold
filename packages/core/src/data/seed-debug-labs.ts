/**
 * Seed Debug Lab Items
 *
 * 12 debug lab challenges covering the full defect taxonomy.
 * Each item is a mini-repo (3-6 files, 80-200 LOC) with intentional bugs.
 * Tests use inline assertions that run in Piston without external dependencies.
 */

import type {
  DebugLabFile,
  DefectCategory,
  SeverityLevel,
  PriorityLevel,
  DebugSignal,
  DebugTool,
  DebugLabDifficulty,
  DebugLabLanguage,
  TriageRubric,
  ObservabilitySnapshot,
} from '../entities/debug-lab.js';

/**
 * Seed item without tenantId and createdAt (added at runtime)
 */
export interface SeedDebugLabItem {
  id: string;
  title: string;
  description: string;
  difficulty: DebugLabDifficulty;
  language: DebugLabLanguage;
  files: DebugLabFile[];
  testCommand: string;
  hiddenTests?: DebugLabFile[];
  defectCategory: DefectCategory;
  severity: SeverityLevel;
  priority: PriorityLevel;
  signals: DebugSignal[];
  toolsExpected: DebugTool[];
  requiredTriage: boolean;
  triageRubric?: TriageRubric;
  observabilitySnapshot?: ObservabilitySnapshot;
  solutionExplanation?: string;
  solutionFiles?: DebugLabFile[];
}

// ============================================================================
// LAB 1: Functional - Off-by-one / Integer Overflow in Binary Search Midpoint
// ============================================================================
const binarySearchOverflow: SeedDebugLabItem = {
  id: 'debug-lab-binary-search-overflow',
  title: 'Binary Search Midpoint Bug',
  description: `Users report that our binary search function crashes or returns wrong results on very large arrays.
The function works fine for small arrays but fails for arrays with more than ~1 billion elements.
Investigation shows the issue occurs during index calculations.`,
  difficulty: 'MEDIUM',
  language: 'javascript',
  files: [
    {
      path: 'search.js',
      content: `/**
 * Binary search implementation
 * @param {number[]} arr - Sorted array
 * @param {number} target - Value to find
 * @returns {number} Index of target, or -1 if not found
 */
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    // Bug: (left + right) can overflow for large indices
    // In JS this won't overflow but demonstrates the classic bug pattern
    // The issue manifests as incorrect midpoint for very large arrays
    const mid = Math.floor((left + right) / 2);

    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}

/**
 * Find insertion point (first element >= target)
 * Bug: Off-by-one error in boundary condition
 */
function findInsertionPoint(arr, target) {
  let left = 0;
  let right = arr.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    // Bug: should be arr[mid] < target for lower bound
    if (arr[mid] <= target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

module.exports = { binarySearch, findInsertionPoint };
`,
      editable: true,
    },
    {
      path: 'test.js',
      content: `const { binarySearch, findInsertionPoint } = require('./search.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('✓ ' + name);
  } catch (e) {
    failed++;
    console.log('✗ ' + name);
    console.log('  Error: ' + e.message);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error('Expected ' + expected + ' but got ' + actual);
      }
    }
  };
}

// Binary search tests
test('finds element in middle', () => {
  expect(binarySearch([1, 2, 3, 4, 5], 3)).toBe(2);
});

test('finds element at start', () => {
  expect(binarySearch([1, 2, 3, 4, 5], 1)).toBe(0);
});

test('finds element at end', () => {
  expect(binarySearch([1, 2, 3, 4, 5], 5)).toBe(4);
});

test('returns -1 for missing element', () => {
  expect(binarySearch([1, 2, 3, 4, 5], 6)).toBe(-1);
});

// Insertion point tests - these expose the off-by-one bug
test('insertion point for existing element returns its index', () => {
  // Should return index of first element >= 3, which is index 2
  expect(findInsertionPoint([1, 2, 3, 4, 5], 3)).toBe(2);
});

test('insertion point for duplicate returns first occurrence', () => {
  // Should return index 2 (first 3)
  expect(findInsertionPoint([1, 2, 3, 3, 3, 4, 5], 3)).toBe(2);
});

test('insertion point at start', () => {
  expect(findInsertionPoint([2, 3, 4], 1)).toBe(0);
});

test('insertion point at end', () => {
  expect(findInsertionPoint([1, 2, 3], 4)).toBe(3);
});

console.log('');
console.log('Tests: ' + passed + ' passed, ' + (passed + failed) + ' total');
process.exit(failed > 0 ? 1 : 0);
`,
      editable: false,
    },
  ],
  testCommand: 'node test.js',
  defectCategory: 'Functional',
  severity: 'Major',
  priority: 'Medium',
  signals: ['failing_tests'],
  toolsExpected: ['unit_tests', 'code_review'],
  requiredTriage: true,
  triageRubric: {
    expectedCategory: 'Functional',
    expectedSeverity: 'Major',
    expectedPriority: 'Medium',
    expectedFirstActions: ['run tests', 'review binary search', 'check boundary', 'off-by-one'],
    explanation: 'The findInsertionPoint function has an off-by-one error: using <= instead of < causes it to skip past the target element.',
  },
  observabilitySnapshot: {
    logs: [
      '[DEBUG] binarySearch called with array length: 5, target: 3',
      '[DEBUG] mid calculation: left=0, right=4, mid=2',
      '[DEBUG] findInsertionPoint called with target: 3',
      '[DEBUG] Expected index: 2, Got: 3',
      '[ERROR] Assertion failed: insertion point incorrect',
    ],
  },
  solutionExplanation: `The bug is in findInsertionPoint at the comparison. Using \`arr[mid] <= target\` moves left past equal elements, returning the index AFTER the target instead of AT it.

**Fix:** Change \`arr[mid] <= target\` to \`arr[mid] < target\` for lower bound semantics.`,
  solutionFiles: [
    {
      path: 'search.js',
      content: `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    // Fixed: Use subtraction to avoid potential overflow
    const mid = left + Math.floor((right - left) / 2);

    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}

function findInsertionPoint(arr, target) {
  let left = 0;
  let right = arr.length;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    // Fixed: Use < for lower bound (first element >= target)
    if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

module.exports = { binarySearch, findInsertionPoint };
`,
      editable: true,
    },
  ],
};

// ============================================================================
// LAB 2: Functional - Floating Point Equality
// ============================================================================
const floatingPointEquality: SeedDebugLabItem = {
  id: 'debug-lab-floating-point',
  title: 'Currency Calculator Rounding Errors',
  description: `Our payment system is rejecting valid transactions. Users report that totals like $19.99 + $5.01 don't equal $25.00.
The QA team says the math "looks right" but the equality checks fail intermittently.
This is blocking checkout for approximately 3% of transactions.`,
  difficulty: 'EASY',
  language: 'javascript',
  files: [
    {
      path: 'currency.js',
      content: `/**
 * Currency calculation utilities
 */

/**
 * Add two currency amounts
 */
function addCurrency(a, b) {
  return a + b;
}

/**
 * Calculate total with tax
 */
function calculateTotal(subtotal, taxRate) {
  return subtotal + (subtotal * taxRate);
}

/**
 * Check if two amounts are equal
 * Bug: Direct floating point comparison
 */
function amountsEqual(a, b) {
  return a === b;
}

/**
 * Validate that items sum to expected total
 */
function validateCart(items, expectedTotal) {
  const calculated = items.reduce((sum, item) => sum + item.price, 0);
  return amountsEqual(calculated, expectedTotal);
}

/**
 * Split bill evenly among people
 */
function splitBill(total, numPeople) {
  const perPerson = total / numPeople;
  // Bug: Doesn't handle rounding for currency
  return Array(numPeople).fill(perPerson);
}

module.exports = { addCurrency, calculateTotal, amountsEqual, validateCart, splitBill };
`,
      editable: true,
    },
    {
      path: 'test.js',
      content: `const { addCurrency, calculateTotal, amountsEqual, validateCart, splitBill } = require('./currency.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('✓ ' + name);
  } catch (e) {
    failed++;
    console.log('✗ ' + name);
    console.log('  Error: ' + e.message);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error('Expected ' + expected + ' but got ' + actual);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error('Expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
      }
    }
  };
}

test('adds simple amounts', () => {
  expect(addCurrency(10.00, 5.00)).toBe(15.00);
});

test('adds amounts that cause floating point issues', () => {
  // 0.1 + 0.2 = 0.30000000000000004 in JS
  const result = addCurrency(0.1, 0.2);
  expect(amountsEqual(result, 0.3)).toBe(true);
});

test('validates cart with classic floating point trap', () => {
  const items = [
    { name: 'Item A', price: 19.99 },
    { name: 'Item B', price: 5.01 },
  ];
  // 19.99 + 5.01 should equal 25.00
  expect(validateCart(items, 25.00)).toBe(true);
});

test('calculates tax correctly', () => {
  // $100 + 8.25% tax = $108.25
  const total = calculateTotal(100, 0.0825);
  expect(amountsEqual(total, 108.25)).toBe(true);
});

test('splits bill evenly with proper rounding', () => {
  // $100 split 3 ways should round to cents
  const splits = splitBill(100, 3);
  const sum = splits.reduce((a, b) => a + b, 0);
  // Sum of splits should equal original total
  expect(amountsEqual(sum, 100)).toBe(true);
});

console.log('');
console.log('Tests: ' + passed + ' passed, ' + (passed + failed) + ' total');
process.exit(failed > 0 ? 1 : 0);
`,
      editable: false,
    },
  ],
  testCommand: 'node test.js',
  defectCategory: 'Functional',
  severity: 'Critical',
  priority: 'High',
  signals: ['failing_tests'],
  toolsExpected: ['unit_tests', 'code_review'],
  requiredTriage: true,
  triageRubric: {
    expectedCategory: 'Functional',
    expectedSeverity: 'Critical',
    expectedPriority: 'High',
    expectedFirstActions: ['floating point', 'epsilon', 'tolerance', 'rounding'],
    explanation: 'Floating point numbers cannot represent all decimals exactly. Direct equality comparison fails for values like 0.1 + 0.2.',
  },
  observabilitySnapshot: {
    logs: [
      '[INFO] Processing transaction #12847',
      '[DEBUG] Cart subtotal calculated: 24.999999999999996',
      '[DEBUG] Expected total: 25',
      '[ERROR] Cart validation failed: totals do not match',
      '[WARN] Transaction rejected - amount mismatch',
    ],
  },
  solutionExplanation: `JavaScript floating point cannot exactly represent decimals like 0.1. The fix is to use epsilon-based comparison:

**Fix:** \`return Math.abs(a - b) < 0.001;\` or work in cents (integers).`,
  solutionFiles: [
    {
      path: 'currency.js',
      content: `const EPSILON = 0.001; // Tolerance for currency comparison

function addCurrency(a, b) {
  return a + b;
}

function calculateTotal(subtotal, taxRate) {
  return subtotal + (subtotal * taxRate);
}

// Fixed: Use epsilon comparison for floating point
function amountsEqual(a, b) {
  return Math.abs(a - b) < EPSILON;
}

function validateCart(items, expectedTotal) {
  const calculated = items.reduce((sum, item) => sum + item.price, 0);
  return amountsEqual(calculated, expectedTotal);
}

function splitBill(total, numPeople) {
  const perPerson = Math.round((total / numPeople) * 100) / 100;
  return Array(numPeople).fill(perPerson);
}

module.exports = { addCurrency, calculateTotal, amountsEqual, validateCart, splitBill };
`,
      editable: true,
    },
  ],
};

// ============================================================================
// LAB 3: Resource - Connection Pool Leak (missing finally/close)
// ============================================================================
const connectionPoolLeak: SeedDebugLabItem = {
  id: 'debug-lab-connection-pool-leak',
  title: 'Database Connection Pool Exhaustion',
  description: `Production alert: "Connection pool exhausted" errors appearing after ~4 hours of uptime.
Monitoring shows active connections growing steadily. Memory usage is stable, so it's not a general memory leak.
The issue correlates with error rates - more errors = faster pool exhaustion.`,
  difficulty: 'MEDIUM',
  language: 'javascript',
  files: [
    {
      path: 'db-pool.js',
      content: `/**
 * Database connection pool simulator
 */
class ConnectionPool {
  constructor(maxSize = 10) {
    this.maxSize = maxSize;
    this.activeConnections = 0;
    this.totalCreated = 0;
  }

  async getConnection() {
    if (this.activeConnections >= this.maxSize) {
      throw new Error('Connection pool exhausted');
    }
    this.activeConnections++;
    this.totalCreated++;
    return {
      id: this.totalCreated,
      query: async (sql) => {
        await new Promise(r => setTimeout(r, 5));
        return { rows: [], sql };
      },
      release: () => {
        this.activeConnections--;
      }
    };
  }

  getStats() {
    return {
      active: this.activeConnections,
      max: this.maxSize,
      totalCreated: this.totalCreated
    };
  }
}

module.exports = { ConnectionPool };
`,
      editable: false,
    },
    {
      path: 'user-service.js',
      content: `const { ConnectionPool } = require('./db-pool.js');

const pool = new ConnectionPool(5);

/**
 * Get user by ID
 * Bug: Connection not released on error path
 */
async function getUserById(id) {
  const conn = await pool.getConnection();

  if (!id || id < 0) {
    throw new Error('Invalid user ID');
  }

  const result = await conn.query('SELECT * FROM users WHERE id = ' + id);
  conn.release();
  return result.rows[0] || null;
}

/**
 * Create new user
 * Bug: Connection not released if validation fails
 */
async function createUser(userData) {
  const conn = await pool.getConnection();

  if (!userData.email || !userData.email.includes('@')) {
    throw new Error('Invalid email address');
  }

  if (!userData.name || userData.name.length < 2) {
    throw new Error('Name must be at least 2 characters');
  }

  const result = await conn.query('INSERT INTO users ...');
  conn.release();
  return { id: 1, ...userData };
}

/**
 * Update user - correctly uses try/finally
 */
async function updateUser(id, userData) {
  const conn = await pool.getConnection();
  try {
    if (!id) throw new Error('ID required');
    const result = await conn.query('UPDATE users SET ...');
    return result;
  } finally {
    conn.release();
  }
}

function getPoolStats() {
  return pool.getStats();
}

// Reset pool for testing
function resetPool() {
  pool.activeConnections = 0;
  pool.totalCreated = 0;
}

module.exports = { getUserById, createUser, updateUser, getPoolStats, resetPool };
`,
      editable: true,
    },
    {
      path: 'test.js',
      content: `const { getUserById, createUser, updateUser, getPoolStats, resetPool } = require('./user-service.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return fn().then(() => {
    passed++;
    console.log('✓ ' + name);
  }).catch((e) => {
    failed++;
    console.log('✗ ' + name);
    console.log('  Error: ' + e.message);
  });
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error('Expected ' + expected + ' but got ' + actual);
      }
    }
  };
}

async function runTests() {
  // Test 1: Normal operation works
  resetPool();
  await test('getUserById works for valid ID', async () => {
    await getUserById(1);
    expect(getPoolStats().active).toBe(0);
  });

  // Test 2: Error path leaks connection
  resetPool();
  await test('getUserById releases connection on invalid ID', async () => {
    try {
      await getUserById(-1);
    } catch (e) {
      // Expected error
    }
    expect(getPoolStats().active).toBe(0);
  });

  // Test 3: Multiple errors exhaust pool
  resetPool();
  await test('createUser releases connection on validation error', async () => {
    try {
      await createUser({ email: 'invalid', name: 'Test' });
    } catch (e) {
      // Expected error
    }
    expect(getPoolStats().active).toBe(0);
  });

  // Test 4: Repeated errors should not exhaust pool
  resetPool();
  await test('repeated errors do not exhaust connection pool', async () => {
    for (let i = 0; i < 10; i++) {
      try {
        await createUser({ email: 'bad', name: 'x' });
      } catch (e) {
        // Expected
      }
    }
    // Should not have exhausted pool (max 5)
    expect(getPoolStats().active).toBe(0);
  });

  // Test 5: updateUser correctly releases (reference implementation)
  resetPool();
  await test('updateUser releases connection even on error', async () => {
    try {
      await updateUser(null, {});
    } catch (e) {
      // Expected
    }
    expect(getPoolStats().active).toBe(0);
  });

  console.log('');
  console.log('Tests: ' + passed + ' passed, ' + (passed + failed) + ' total');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
`,
      editable: false,
    },
  ],
  testCommand: 'node test.js',
  defectCategory: 'Resource',
  severity: 'Critical',
  priority: 'High',
  signals: ['failing_tests', 'connection_errors'],
  toolsExpected: ['unit_tests', 'code_review', 'metrics_analysis'],
  requiredTriage: true,
  triageRubric: {
    expectedCategory: 'Resource',
    expectedSeverity: 'Critical',
    expectedPriority: 'High',
    expectedFirstActions: ['connection', 'release', 'finally', 'try/catch', 'cleanup'],
    explanation: 'Connections acquired but not released on error paths cause pool exhaustion. Always use try/finally for resource cleanup.',
  },
  observabilitySnapshot: {
    use: [
      { resource: 'db_connections', utilization: 0.2, saturation: 0, errors: 0, label: 't=0' },
      { resource: 'db_connections', utilization: 0.4, saturation: 0, errors: 2, label: 't=1h' },
      { resource: 'db_connections', utilization: 0.8, saturation: 5, errors: 8, label: 't=2h' },
      { resource: 'db_connections', utilization: 1.0, saturation: 47, errors: 156, label: 't=4h' },
    ],
    logs: [
      '[INFO] Connection pool initialized: max=5',
      '[ERROR] Invalid user ID: -1',
      '[ERROR] Invalid email address',
      '[WARN] Connection pool at 80% capacity',
      '[ERROR] Connection pool exhausted',
    ],
  },
  solutionExplanation: `getUserById and createUser acquire connections but don't release them when validation throws.

**Fix:** Wrap the function body in try/finally:
\`\`\`javascript
const conn = await pool.getConnection();
try {
  // validation and query
  return result;
} finally {
  conn.release();
}
\`\`\``,
  solutionFiles: [
    {
      path: 'user-service.js',
      content: `const { ConnectionPool } = require('./db-pool.js');

const pool = new ConnectionPool(5);

async function getUserById(id) {
  const conn = await pool.getConnection();
  try {
    if (!id || id < 0) {
      throw new Error('Invalid user ID');
    }
    const result = await conn.query('SELECT * FROM users WHERE id = ' + id);
    return result.rows[0] || null;
  } finally {
    conn.release();
  }
}

async function createUser(userData) {
  const conn = await pool.getConnection();
  try {
    if (!userData.email || !userData.email.includes('@')) {
      throw new Error('Invalid email address');
    }
    if (!userData.name || userData.name.length < 2) {
      throw new Error('Name must be at least 2 characters');
    }
    const result = await conn.query('INSERT INTO users ...');
    return { id: 1, ...userData };
  } finally {
    conn.release();
  }
}

async function updateUser(id, userData) {
  const conn = await pool.getConnection();
  try {
    if (!id) throw new Error('ID required');
    const result = await conn.query('UPDATE users SET ...');
    return result;
  } finally {
    conn.release();
  }
}

function getPoolStats() {
  return pool.getStats();
}

function resetPool() {
  pool.activeConnections = 0;
  pool.totalCreated = 0;
}

module.exports = { getUserById, createUser, updateUser, getPoolStats, resetPool };
`,
      editable: true,
    },
  ],
};

// ============================================================================
// LAB 4: Resource - File Descriptor Leak
// ============================================================================
const fileDescriptorLeak: SeedDebugLabItem = {
  id: 'debug-lab-file-descriptor-leak',
  title: 'Log Processor File Handle Leak',
  description: `Our log processing service crashes with "EMFILE: too many open files" after processing ~500 files.
The service reads log files, extracts metrics, and writes summaries. Works fine for small batches.
Memory profiler shows no memory leak. The issue is specifically with file handles.`,
  difficulty: 'MEDIUM',
  language: 'javascript',
  files: [
    {
      path: 'file-system.js',
      content: `/**
 * Simulated file system for testing
 */
const MAX_OPEN_FILES = 10;
let openFiles = new Set();
let totalOpened = 0;

function openFile(path, mode) {
  if (openFiles.size >= MAX_OPEN_FILES) {
    throw new Error('EMFILE: too many open files');
  }
  const handle = { path, mode, id: ++totalOpened };
  openFiles.add(handle.id);
  return handle;
}

function readFile(handle) {
  if (!openFiles.has(handle.id)) {
    throw new Error('EBADF: bad file descriptor');
  }
  return 'line1\\nline2\\nERROR: something failed\\nline4';
}

function writeFile(handle, content) {
  if (!openFiles.has(handle.id)) {
    throw new Error('EBADF: bad file descriptor');
  }
  return content.length;
}

function closeFile(handle) {
  openFiles.delete(handle.id);
}

function getOpenFileCount() {
  return openFiles.size;
}

function resetFileSystem() {
  openFiles = new Set();
  totalOpened = 0;
}

module.exports = { openFile, readFile, writeFile, closeFile, getOpenFileCount, resetFileSystem };
`,
      editable: false,
    },
    {
      path: 'log-processor.js',
      content: `const fs = require('./file-system.js');

/**
 * Count error lines in a log file
 * Bug: File not closed if error occurs during read
 */
function countErrors(logPath) {
  const handle = fs.openFile(logPath, 'r');
  const content = fs.readFile(handle);

  // Bug: If this throws, file is never closed
  const lines = content.split('\\n');
  const errorCount = lines.filter(line => line.includes('ERROR')).length;

  fs.closeFile(handle);
  return errorCount;
}

/**
 * Process log and write summary
 * Bug: Input file not closed if write fails
 */
function processLog(inputPath, outputPath) {
  const inHandle = fs.openFile(inputPath, 'r');
  const content = fs.readFile(inHandle);

  const summary = 'Processed: ' + content.length + ' bytes';

  const outHandle = fs.openFile(outputPath, 'w');
  fs.writeFile(outHandle, summary);
  fs.closeFile(outHandle);

  // Bug: inHandle closed after outHandle, but if outHandle ops fail, inHandle leaks
  fs.closeFile(inHandle);

  return summary;
}

/**
 * Batch process multiple files
 * Bug: Accumulates open file handles on errors
 */
function batchProcess(paths) {
  const results = [];

  for (const path of paths) {
    const handle = fs.openFile(path, 'r');

    try {
      const content = fs.readFile(handle);
      results.push({ path, size: content.length });
    } catch (e) {
      // Bug: handle not closed on error
      results.push({ path, error: e.message });
      continue;
    }

    fs.closeFile(handle);
  }

  return results;
}

module.exports = { countErrors, processLog, batchProcess };
`,
      editable: true,
    },
    {
      path: 'test.js',
      content: `const { countErrors, processLog, batchProcess } = require('./log-processor.js');
const fs = require('./file-system.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('✓ ' + name);
  } catch (e) {
    failed++;
    console.log('✗ ' + name);
    console.log('  Error: ' + e.message);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error('Expected ' + expected + ' but got ' + actual);
      }
    }
  };
}

// Test 1
fs.resetFileSystem();
test('countErrors closes file after success', () => {
  countErrors('app.log');
  expect(fs.getOpenFileCount()).toBe(0);
});

// Test 2
fs.resetFileSystem();
test('processLog closes both files', () => {
  processLog('input.log', 'output.txt');
  expect(fs.getOpenFileCount()).toBe(0);
});

// Test 3 - This exposes the leak
fs.resetFileSystem();
test('batchProcess closes files even on errors', () => {
  // Process files, some may have issues
  const paths = ['file1.log', 'file2.log', 'file3.log'];
  batchProcess(paths);
  expect(fs.getOpenFileCount()).toBe(0);
});

// Test 4 - Multiple batches should not accumulate handles
fs.resetFileSystem();
test('multiple batchProcess calls do not leak handles', () => {
  for (let i = 0; i < 5; i++) {
    batchProcess(['a.log', 'b.log']);
  }
  expect(fs.getOpenFileCount()).toBe(0);
});

console.log('');
console.log('Tests: ' + passed + ' passed, ' + (passed + failed) + ' total');
process.exit(failed > 0 ? 1 : 0);
`,
      editable: false,
    },
  ],
  testCommand: 'node test.js',
  defectCategory: 'Resource',
  severity: 'Major',
  priority: 'Medium',
  signals: ['failing_tests', 'connection_errors'],
  toolsExpected: ['unit_tests', 'code_review'],
  requiredTriage: true,
  triageRubric: {
    expectedCategory: 'Resource',
    expectedSeverity: 'Major',
    expectedPriority: 'Medium',
    expectedFirstActions: ['file handle', 'close', 'finally', 'EMFILE'],
    explanation: 'File handles opened but not closed in error paths accumulate until the OS limit is hit.',
  },
  observabilitySnapshot: {
    logs: [
      '[INFO] Starting batch processing of 100 files',
      '[DEBUG] Processing file: logs/app-001.log',
      '[WARN] Parse error in logs/app-047.log',
      '[ERROR] EMFILE: too many open files',
      '[ERROR] Batch processing aborted at file 98',
    ],
    use: [
      { resource: 'file_descriptors', utilization: 0.1, saturation: 0, errors: 0, label: 'batch 1' },
      { resource: 'file_descriptors', utilization: 0.5, saturation: 0, errors: 3, label: 'batch 3' },
      { resource: 'file_descriptors', utilization: 1.0, saturation: 12, errors: 12, label: 'batch 5' },
    ],
  },
  solutionExplanation: `The batchProcess function opens files but only closes them in the success path. When an error occurs in the try block, the continue statement skips closeFile.

**Fix:** Move closeFile to a finally block or close before continue:
\`\`\`javascript
try {
  // ...
} catch (e) {
  results.push({ path, error: e.message });
} finally {
  fs.closeFile(handle);
}
\`\`\``,
};

// ============================================================================
// LAB 5: Performance - Accidental O(n²)
// ============================================================================
const accidentalQuadratic: SeedDebugLabItem = {
  id: 'debug-lab-quadratic-performance',
  title: 'Slow Tag Deduplication',
  description: `The tag deduplication endpoint times out for users with many items. Small datasets work fine.
A user with 10,000 items reports 30+ second response times. Our SLA is 500ms.
The algorithm looks correct - it removes duplicates - but something is causing O(n²) behavior.`,
  difficulty: 'MEDIUM',
  language: 'javascript',
  files: [
    {
      path: 'tags.js',
      content: `/**
 * Tag management utilities
 */

/**
 * Remove duplicate tags from a list
 * Bug: O(n²) due to array.includes() in loop
 */
function deduplicate(tags) {
  const result = [];

  for (const tag of tags) {
    // Bug: includes() is O(n), making this O(n²)
    if (!result.includes(tag)) {
      result.push(tag);
    }
  }

  return result;
}

/**
 * Find common tags between two lists
 * Bug: O(n*m) instead of O(n+m)
 */
function findCommonTags(tags1, tags2) {
  const common = [];

  for (const tag of tags1) {
    // Bug: includes() makes this O(n*m)
    if (tags2.includes(tag) && !common.includes(tag)) {
      common.push(tag);
    }
  }

  return common;
}

/**
 * Remove specific tags from a list
 * Bug: Repeated indexOf/splice is O(n²)
 */
function removeTags(allTags, tagsToRemove) {
  const result = [...allTags];

  for (const tag of tagsToRemove) {
    const index = result.indexOf(tag);
    if (index !== -1) {
      // Bug: splice shifts all elements, O(n) per removal
      result.splice(index, 1);
    }
  }

  return result;
}

/**
 * Merge and deduplicate multiple tag arrays
 * This one is correct - O(n) using Set
 */
function mergeTags(...tagArrays) {
  const seen = new Set();
  const result = [];

  for (const tags of tagArrays) {
    for (const tag of tags) {
      if (!seen.has(tag)) {
        seen.add(tag);
        result.push(tag);
      }
    }
  }

  return result;
}

module.exports = { deduplicate, findCommonTags, removeTags, mergeTags };
`,
      editable: true,
    },
    {
      path: 'test.js',
      content: `const { deduplicate, findCommonTags, removeTags, mergeTags } = require('./tags.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('✓ ' + name);
  } catch (e) {
    failed++;
    console.log('✗ ' + name);
    console.log('  Error: ' + e.message);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error('Expected ' + expected + ' but got ' + actual);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error('Expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
      }
    }
  };
}

// Correctness tests
test('deduplicate removes duplicates', () => {
  expect(deduplicate(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c']);
});

test('findCommonTags finds intersection', () => {
  expect(findCommonTags(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual(['b', 'c']);
});

test('removeTags removes specified tags', () => {
  expect(removeTags(['a', 'b', 'c', 'd'], ['b', 'd'])).toEqual(['a', 'c']);
});

// Performance tests - these should complete in reasonable time
test('deduplicate handles 1000 items in under 50ms', () => {
  const tags = [];
  for (let i = 0; i < 1000; i++) {
    tags.push('tag-' + (i % 100)); // 100 unique tags, repeated
  }

  const start = Date.now();
  const result = deduplicate(tags);
  const elapsed = Date.now() - start;

  expect(result.length).toBe(100);
  if (elapsed > 50) {
    throw new Error('Too slow: ' + elapsed + 'ms (max 50ms)');
  }
});

test('findCommonTags handles large lists in under 50ms', () => {
  const tags1 = [];
  const tags2 = [];
  for (let i = 0; i < 1000; i++) {
    tags1.push('tag-' + i);
    tags2.push('tag-' + (i + 500));
  }

  const start = Date.now();
  const result = findCommonTags(tags1, tags2);
  const elapsed = Date.now() - start;

  expect(result.length).toBe(500);
  if (elapsed > 50) {
    throw new Error('Too slow: ' + elapsed + 'ms (max 50ms)');
  }
});

test('removeTags handles large removals in under 50ms', () => {
  const allTags = [];
  const toRemove = [];
  for (let i = 0; i < 1000; i++) {
    allTags.push('tag-' + i);
    if (i % 2 === 0) toRemove.push('tag-' + i);
  }

  const start = Date.now();
  const result = removeTags(allTags, toRemove);
  const elapsed = Date.now() - start;

  expect(result.length).toBe(500);
  if (elapsed > 50) {
    throw new Error('Too slow: ' + elapsed + 'ms (max 50ms)');
  }
});

console.log('');
console.log('Tests: ' + passed + ' passed, ' + (passed + failed) + ' total');
process.exit(failed > 0 ? 1 : 0);
`,
      editable: false,
    },
  ],
  testCommand: 'node test.js',
  defectCategory: 'Performance',
  severity: 'Major',
  priority: 'High',
  signals: ['failing_tests', 'timeout'],
  toolsExpected: ['unit_tests', 'profiling', 'code_review'],
  requiredTriage: true,
  triageRubric: {
    expectedCategory: 'Performance',
    expectedSeverity: 'Major',
    expectedPriority: 'High',
    expectedFirstActions: ['O(n^2)', 'includes', 'indexOf', 'Set', 'complexity'],
    explanation: 'Array.includes() and indexOf() are O(n), causing O(n²) when used in loops. Use Set for O(1) lookups.',
  },
  observabilitySnapshot: {
    red: [
      { rate: 100, errorRate: 0.01, duration: { p50: 50, p95: 200, p99: 500 }, label: '100 items' },
      { rate: 50, errorRate: 0.05, duration: { p50: 500, p95: 2000, p99: 5000 }, label: '1000 items' },
      { rate: 10, errorRate: 0.30, duration: { p50: 5000, p95: 30000, p99: 60000 }, label: '10000 items' },
    ],
    logs: [
      '[INFO] Deduplicating 10000 tags',
      '[WARN] Request taking longer than expected',
      '[ERROR] Request timeout after 30000ms',
    ],
  },
  solutionExplanation: `All three functions use Array.includes() or indexOf() inside loops, causing O(n²) complexity.

**Fix:** Use Set for O(1) lookups:
\`\`\`javascript
function deduplicate(tags) {
  return [...new Set(tags)];
}

function findCommonTags(tags1, tags2) {
  const set2 = new Set(tags2);
  return [...new Set(tags1.filter(t => set2.has(t)))];
}

function removeTags(allTags, tagsToRemove) {
  const removeSet = new Set(tagsToRemove);
  return allTags.filter(t => !removeSet.has(t));
}
\`\`\``,
};

// ============================================================================
// LAB 6: Observability - Missing Correlation ID
// ============================================================================
const missingCorrelationId: SeedDebugLabItem = {
  id: 'debug-lab-missing-correlation',
  title: 'Untraceable Request Failures',
  description: `We're seeing intermittent 500 errors in production but can't trace them to specific requests.
Logs show errors but we can't correlate them across services. The log aggregator finds 50+ error entries
but they lack context to identify which user/request triggered them. Users report issues we cannot reproduce.`,
  difficulty: 'MEDIUM',
  language: 'javascript',
  files: [
    {
      path: 'logger.js',
      content: `/**
 * Simple logger utility
 */
const logs = [];

function log(level, message, context = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };
  logs.push(entry);
  return entry;
}

function info(message, context) {
  return log('INFO', message, context);
}

function error(message, context) {
  return log('ERROR', message, context);
}

function warn(message, context) {
  return log('WARN', message, context);
}

function debug(message, context) {
  return log('DEBUG', message, context);
}

function getLogs() {
  return logs;
}

function clearLogs() {
  logs.length = 0;
}

module.exports = { info, error, warn, debug, getLogs, clearLogs };
`,
      editable: false,
    },
    {
      path: 'order-service.js',
      content: `const logger = require('./logger.js');

/**
 * Process an order
 * Bug: Logs don't include correlationId or orderId consistently
 */
async function processOrder(order, correlationId) {
  // Bug: correlationId not passed to logger
  logger.info('Processing order', { amount: order.amount });

  try {
    // Validate
    if (!order.items || order.items.length === 0) {
      // Bug: No correlationId, no orderId in error log
      logger.error('Order validation failed: no items');
      throw new Error('Order must have items');
    }

    // Check inventory
    logger.debug('Checking inventory');
    const available = await checkInventory(order.items);

    if (!available) {
      // Bug: Missing context
      logger.warn('Some items out of stock');
      throw new Error('Items not available');
    }

    // Process payment
    logger.info('Processing payment');
    await processPayment(order);

    // Bug: Success log missing orderId
    logger.info('Order completed', { amount: order.amount });

    return { success: true, orderId: order.id };
  } catch (err) {
    // Bug: Error log missing correlationId and orderId
    logger.error('Order processing failed', { error: err.message });
    throw err;
  }
}

async function checkInventory(items) {
  // Simulated check
  return items.every(item => item.quantity <= 10);
}

async function processPayment(order) {
  // Simulated payment
  if (order.amount > 10000) {
    throw new Error('Amount exceeds limit');
  }
  return { transactionId: 'txn-123' };
}

module.exports = { processOrder };
`,
      editable: true,
    },
    {
      path: 'test.js',
      content: `const { processOrder } = require('./order-service.js');
const logger = require('./logger.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return fn().then(() => {
    passed++;
    console.log('✓ ' + name);
  }).catch((e) => {
    failed++;
    console.log('✗ ' + name);
    console.log('  Error: ' + e.message);
  });
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error('Expected ' + expected + ' but got ' + actual);
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error('Expected "' + actual + '" to contain "' + expected + '"');
      }
    }
  };
}

async function runTests() {
  // Test 1: Successful order includes correlationId in all logs
  logger.clearLogs();
  await test('successful order logs include correlationId', async () => {
    const order = { id: 'ord-123', items: [{ sku: 'ABC', quantity: 2 }], amount: 99.99 };
    await processOrder(order, 'corr-456');

    const logs = logger.getLogs();
    const allHaveCorrelationId = logs.every(log => log.correlationId === 'corr-456');

    if (!allHaveCorrelationId) {
      const missing = logs.filter(l => !l.correlationId);
      throw new Error('Missing correlationId in ' + missing.length + ' log entries');
    }
    expect(allHaveCorrelationId).toBe(true);
  });

  // Test 2: All logs include orderId
  logger.clearLogs();
  await test('all logs include orderId for traceability', async () => {
    const order = { id: 'ord-789', items: [{ sku: 'XYZ', quantity: 1 }], amount: 50 };
    await processOrder(order, 'corr-111');

    const logs = logger.getLogs();
    const allHaveOrderId = logs.every(log => log.orderId === 'ord-789');

    if (!allHaveOrderId) {
      const missing = logs.filter(l => !l.orderId);
      throw new Error('Missing orderId in ' + missing.length + ' log entries');
    }
    expect(allHaveOrderId).toBe(true);
  });

  // Test 3: Error logs include full context
  logger.clearLogs();
  await test('error logs include correlationId and orderId', async () => {
    const order = { id: 'ord-error', items: [], amount: 10 };
    try {
      await processOrder(order, 'corr-error');
    } catch (e) {
      // Expected
    }

    const errorLogs = logger.getLogs().filter(l => l.level === 'ERROR');
    if (errorLogs.length === 0) {
      throw new Error('No error logs found');
    }

    const hasContext = errorLogs.every(l => l.correlationId && l.orderId);
    if (!hasContext) {
      throw new Error('Error logs missing correlationId or orderId');
    }
    expect(hasContext).toBe(true);
  });

  console.log('');
  console.log('Tests: ' + passed + ' passed, ' + (passed + failed) + ' total');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
`,
      editable: false,
    },
  ],
  testCommand: 'node test.js',
  defectCategory: 'Observability',
  severity: 'Minor',
  priority: 'High', // Low severity but high priority - hard to debug without it
  signals: ['failing_tests'],
  toolsExpected: ['logging', 'code_review'],
  requiredTriage: true,
  triageRubric: {
    expectedCategory: 'Observability',
    expectedSeverity: 'Minor',
    expectedPriority: 'High',
    expectedFirstActions: ['correlationId', 'tracing', 'context', 'structured logging'],
    explanation: 'Missing correlation IDs make it impossible to trace requests across log entries. Each log entry needs consistent context.',
  },
  observabilitySnapshot: {
    logs: [
      '[ERROR] Order validation failed: no items',
      '[ERROR] Order processing failed { error: "Amount exceeds limit" }',
      '[WARN] Some items out of stock',
      '[INFO] Order completed { amount: 99.99 }',
      '--- Cannot correlate above errors to specific requests ---',
    ],
  },
  solutionExplanation: `Logs are missing correlationId and orderId, making debugging impossible in production.

**Fix:** Add context object to all logger calls:
\`\`\`javascript
const ctx = { correlationId, orderId: order.id };
logger.info('Processing order', { ...ctx, amount: order.amount });
// ... use ctx in all log calls
\`\`\``,
};

// ============================================================================
// LAB 7: Concurrency - Check-Then-Act Race Condition
// ============================================================================
const checkThenActRace: SeedDebugLabItem = {
  id: 'debug-lab-check-then-act',
  title: 'Inventory Double-Booking',
  description: `Customers are receiving "out of stock" errors after successfully placing orders, or worse,
we're overselling inventory. The issue happens most during flash sales when multiple users
checkout simultaneously. Individual operations pass all tests but concurrent ones fail.`,
  difficulty: 'HARD',
  language: 'javascript',
  files: [
    {
      path: 'inventory.js',
      content: `/**
 * Inventory management with simulated async storage
 */
const inventory = new Map();

// Simulate async storage operations
async function getStock(sku) {
  await delay(5);
  return inventory.get(sku) || 0;
}

async function setStock(sku, quantity) {
  await delay(5);
  inventory.set(sku, quantity);
}

function resetInventory(initialStock = {}) {
  inventory.clear();
  for (const [sku, qty] of Object.entries(initialStock)) {
    inventory.set(sku, qty);
  }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Reserve inventory for an order
 * Bug: Check-then-act race condition
 */
async function reserveStock(sku, quantity) {
  // Bug: Reading and writing are not atomic
  const current = await getStock(sku);

  // Check
  if (current < quantity) {
    return { success: false, error: 'Insufficient stock', available: current };
  }

  // Act (but another request may have modified stock between check and act)
  await setStock(sku, current - quantity);

  return { success: true, reserved: quantity, remaining: current - quantity };
}

/**
 * Reserve multiple items atomically
 * Bug: Same check-then-act issue, compounded
 */
async function reserveMultiple(items) {
  // First check all items
  for (const item of items) {
    const stock = await getStock(item.sku);
    if (stock < item.quantity) {
      return { success: false, error: 'Insufficient stock for ' + item.sku };
    }
  }

  // Then reserve all (but stock may have changed!)
  for (const item of items) {
    const stock = await getStock(item.sku);
    await setStock(item.sku, stock - item.quantity);
  }

  return { success: true };
}

function getCurrentStock(sku) {
  return inventory.get(sku) || 0;
}

module.exports = { reserveStock, reserveMultiple, resetInventory, getCurrentStock };
`,
      editable: true,
    },
    {
      path: 'test.js',
      content: `const { reserveStock, reserveMultiple, resetInventory, getCurrentStock } = require('./inventory.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return fn().then(() => {
    passed++;
    console.log('✓ ' + name);
  }).catch((e) => {
    failed++;
    console.log('✗ ' + name);
    console.log('  Error: ' + e.message);
  });
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error('Expected ' + expected + ' but got ' + actual);
      }
    }
  };
}

async function runTests() {
  // Test 1: Basic reservation works
  resetInventory({ 'SKU-A': 10 });
  await test('single reservation works', async () => {
    const result = await reserveStock('SKU-A', 3);
    expect(result.success).toBe(true);
    expect(getCurrentStock('SKU-A')).toBe(7);
  });

  // Test 2: Sequential reservations work
  resetInventory({ 'SKU-B': 10 });
  await test('sequential reservations work', async () => {
    await reserveStock('SKU-B', 3);
    await reserveStock('SKU-B', 3);
    await reserveStock('SKU-B', 3);
    expect(getCurrentStock('SKU-B')).toBe(1);
  });

  // Test 3: Concurrent reservations should not oversell
  resetInventory({ 'SKU-C': 5 });
  await test('concurrent reservations do not oversell', async () => {
    // 5 concurrent requests each trying to reserve 2 items
    // Only 2 should succeed (5 / 2 = 2 full reservations)
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(reserveStock('SKU-C', 2));
    }

    const results = await Promise.all(promises);
    const successes = results.filter(r => r.success).length;
    const finalStock = getCurrentStock('SKU-C');

    // Stock should never go negative
    if (finalStock < 0) {
      throw new Error('Stock went negative: ' + finalStock);
    }

    // Should have reserved exactly floor(5/2)*2 = 4 items
    // So final stock should be 1, and successes should be 2
    if (successes > 2) {
      throw new Error('Oversold! ' + successes + ' reservations succeeded, expected max 2');
    }

    expect(finalStock >= 0).toBe(true);
  });

  // Test 4: Concurrent multi-item reservations
  resetInventory({ 'X': 3, 'Y': 3 });
  await test('concurrent multi-item reservations are atomic', async () => {
    // Both requests want 2 of each. Only one should succeed.
    const p1 = reserveMultiple([{ sku: 'X', quantity: 2 }, { sku: 'Y', quantity: 2 }]);
    const p2 = reserveMultiple([{ sku: 'X', quantity: 2 }, { sku: 'Y', quantity: 2 }]);

    const [r1, r2] = await Promise.all([p1, p2]);
    const successes = [r1, r2].filter(r => r.success).length;

    // At most one should succeed with 3 of each item
    if (successes > 1) {
      throw new Error('Both concurrent reservations succeeded - race condition!');
    }

    // Stock should not go negative
    const xStock = getCurrentStock('X');
    const yStock = getCurrentStock('Y');
    if (xStock < 0 || yStock < 0) {
      throw new Error('Stock went negative: X=' + xStock + ', Y=' + yStock);
    }

    expect(successes <= 1).toBe(true);
  });

  console.log('');
  console.log('Tests: ' + passed + ' passed, ' + (passed + failed) + ' total');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
`,
      editable: false,
    },
  ],
  testCommand: 'node test.js',
  defectCategory: 'Concurrency',
  severity: 'Critical',
  priority: 'High',
  signals: ['failing_tests', 'inconsistent_repro'],
  toolsExpected: ['unit_tests', 'code_review', 'logging'],
  requiredTriage: true,
  triageRubric: {
    expectedCategory: 'Concurrency',
    expectedSeverity: 'Critical',
    expectedPriority: 'High',
    expectedFirstActions: ['race condition', 'atomic', 'lock', 'compare-and-swap', 'concurrent'],
    explanation: 'Check-then-act pattern without atomicity allows concurrent requests to read the same value before any write occurs.',
  },
  observabilitySnapshot: {
    logs: [
      '[DEBUG] reserveStock called: SKU-C, qty=2, current=5',
      '[DEBUG] reserveStock called: SKU-C, qty=2, current=5',
      '[DEBUG] reserveStock called: SKU-C, qty=2, current=5',
      '[DEBUG] setStock: SKU-C = 3',
      '[DEBUG] setStock: SKU-C = 3',
      '[DEBUG] setStock: SKU-C = 3',
      '[ERROR] Final stock: -1 (NEGATIVE!)',
    ],
  },
  solutionExplanation: `The check (getStock) and act (setStock) are separate async operations. Multiple concurrent calls read the same "current" value.

**Fix:** Use a lock or atomic compare-and-set:
\`\`\`javascript
const locks = new Map();

async function reserveStock(sku, quantity) {
  // Acquire lock
  while (locks.get(sku)) {
    await delay(1);
  }
  locks.set(sku, true);

  try {
    const current = await getStock(sku);
    if (current < quantity) {
      return { success: false, error: 'Insufficient stock' };
    }
    await setStock(sku, current - quantity);
    return { success: true };
  } finally {
    locks.delete(sku);
  }
}
\`\`\``,
};

// ============================================================================
// LAB 8: Heisenbug - Stale Cache / Memoization Bug
// ============================================================================
const staleCacheBug: SeedDebugLabItem = {
  id: 'debug-lab-stale-cache',
  title: 'User Settings Not Updating',
  description: `Users report that changing their settings doesn't take effect. They change theme to "dark"
but the app keeps showing light theme. Restarting the app fixes it.
The database shows the correct value, but the API returns stale data.`,
  difficulty: 'MEDIUM',
  language: 'javascript',
  files: [
    {
      path: 'database.js',
      content: `/**
 * Simulated database
 */
const db = new Map();

async function get(key) {
  await delay(10);
  return db.get(key);
}

async function set(key, value) {
  await delay(10);
  db.set(key, value);
}

function reset(initial = {}) {
  db.clear();
  for (const [k, v] of Object.entries(initial)) {
    db.set(k, v);
  }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { get, set, reset };
`,
      editable: false,
    },
    {
      path: 'settings-service.js',
      content: `const db = require('./database.js');

/**
 * Cache for user settings
 * Bug: Cache is never invalidated on write
 */
const cache = new Map();

/**
 * Get user settings
 * Bug: Returns cached value even after update
 */
async function getSettings(userId) {
  // Check cache first
  if (cache.has(userId)) {
    return cache.get(userId);
  }

  // Load from database
  const settings = await db.get('settings:' + userId);

  // Cache the result
  if (settings) {
    cache.set(userId, settings);
  }

  return settings || { theme: 'light', notifications: true };
}

/**
 * Update user settings
 * Bug: Does not invalidate cache
 */
async function updateSettings(userId, newSettings) {
  const current = await getSettings(userId);
  const updated = { ...current, ...newSettings };

  // Save to database
  await db.set('settings:' + userId, updated);

  // Bug: Cache not updated/invalidated!
  // cache.delete(userId);  // This line is missing

  return updated;
}

/**
 * Clear all settings (for testing)
 */
function clearCache() {
  cache.clear();
}

module.exports = { getSettings, updateSettings, clearCache };
`,
      editable: true,
    },
    {
      path: 'test.js',
      content: `const { getSettings, updateSettings, clearCache } = require('./settings-service.js');
const db = require('./database.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return fn().then(() => {
    passed++;
    console.log('✓ ' + name);
  }).catch((e) => {
    failed++;
    console.log('✗ ' + name);
    console.log('  Error: ' + e.message);
  });
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error('Expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
      }
    }
  };
}

async function runTests() {
  // Test 1: Initial read works
  db.reset();
  clearCache();
  await test('getSettings returns defaults for new user', async () => {
    const settings = await getSettings('user-1');
    expect(settings.theme).toBe('light');
  });

  // Test 2: Update persists
  db.reset();
  clearCache();
  await test('updateSettings saves to database', async () => {
    await updateSettings('user-2', { theme: 'dark' });
    // Directly check database
    const dbValue = await db.get('settings:user-2');
    expect(dbValue.theme).toBe('dark');
  });

  // Test 3: This exposes the cache bug
  db.reset();
  clearCache();
  await test('getSettings returns updated value after update', async () => {
    // First read - caches default
    const initial = await getSettings('user-3');
    expect(initial.theme).toBe('light');

    // Update to dark
    await updateSettings('user-3', { theme: 'dark' });

    // Read again - should see update
    const updated = await getSettings('user-3');
    expect(updated.theme).toBe('dark');
  });

  // Test 4: Multiple updates should all be visible
  db.reset();
  clearCache();
  await test('multiple updates are all reflected in reads', async () => {
    await updateSettings('user-4', { theme: 'dark' });
    const s1 = await getSettings('user-4');
    expect(s1.theme).toBe('dark');

    await updateSettings('user-4', { theme: 'light' });
    const s2 = await getSettings('user-4');
    expect(s2.theme).toBe('light');

    await updateSettings('user-4', { notifications: false });
    const s3 = await getSettings('user-4');
    expect(s3.notifications).toBe(false);
  });

  console.log('');
  console.log('Tests: ' + passed + ' passed, ' + (passed + failed) + ' total');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
`,
      editable: false,
    },
  ],
  testCommand: 'node test.js',
  defectCategory: 'Functional',
  severity: 'Major',
  priority: 'High',
  signals: ['failing_tests'],
  toolsExpected: ['unit_tests', 'code_review'],
  requiredTriage: true,
  triageRubric: {
    expectedCategory: 'Functional',
    expectedSeverity: 'Major',
    expectedPriority: 'High',
    expectedFirstActions: ['cache', 'invalidation', 'stale', 'memoization'],
    explanation: 'The cache is populated on read but never invalidated on write, causing stale data to be returned.',
  },
  observabilitySnapshot: {
    logs: [
      '[DEBUG] getSettings user-3: cache miss, loading from DB',
      '[DEBUG] getSettings user-3: caching result {theme: light}',
      '[DEBUG] updateSettings user-3: saving {theme: dark} to DB',
      '[DEBUG] getSettings user-3: cache hit, returning {theme: light}',
      '[BUG] User sees light theme despite DB having dark',
    ],
  },
  solutionExplanation: `The cache is set on read but never cleared on write. After updateSettings writes to DB, getSettings still returns the old cached value.

**Fix:** Invalidate or update cache in updateSettings:
\`\`\`javascript
async function updateSettings(userId, newSettings) {
  const current = await getSettings(userId);
  const updated = { ...current, ...newSettings };
  await db.set('settings:' + userId, updated);

  // Fix: Invalidate cache
  cache.delete(userId);
  // Or: cache.set(userId, updated);

  return updated;
}
\`\`\``,
};

// ============================================================================
// LAB 9: Heisenbug - Bug Disappears with Debug Logging
// ============================================================================
const heisenDebugBug: SeedDebugLabItem = {
  id: 'debug-lab-heisenbug-timing',
  title: 'Disappearing Race Condition',
  description: `We have a bug that disappears when we add console.log statements to debug it!
The data processing pipeline occasionally produces wrong results, but adding logging
to trace the issue makes it work correctly. Classic Heisenbug behavior.`,
  difficulty: 'HARD',
  language: 'javascript',
  files: [
    {
      path: 'processor.js',
      content: `/**
 * Data processing pipeline
 */
let processingResult = null;

/**
 * Process data through multiple stages
 * Bug: Race condition masked by logging delay
 */
async function processData(input) {
  processingResult = null;

  // Stage 1: Transform
  transformAsync(input);

  // Bug: Not waiting for transform to complete
  // When DEBUG logging is on, the delay lets transform finish

  // Stage 2: Use result
  const result = processingResult;

  if (result === null) {
    return { error: 'Processing failed', input };
  }

  return { success: true, output: result * 2 };
}

/**
 * Async transform that sets global result
 * Bug: Sets result after small delay
 */
function transformAsync(value) {
  // This setTimeout simulates async work
  // The bug: we're not awaiting this
  setTimeout(() => {
    processingResult = value * 10;
  }, 1);
}

/**
 * Version with debug logging that "works"
 * The console.log adds enough delay for transform to complete
 */
async function processDataWithDebug(input) {
  processingResult = null;

  console.log('[DEBUG] Starting transform for:', input);
  transformAsync(input);
  console.log('[DEBUG] Transform initiated');

  // These console.log calls add ~1-2ms delay, enough for setTimeout(1) to fire

  console.log('[DEBUG] Reading result');
  const result = processingResult;
  console.log('[DEBUG] Result is:', result);

  if (result === null) {
    return { error: 'Processing failed', input };
  }

  return { success: true, output: result * 2 };
}

/**
 * Properly fixed version using await
 */
async function processDataFixed(input) {
  processingResult = null;

  // Properly await the async operation
  await transformAsyncFixed(input);

  const result = processingResult;

  if (result === null) {
    return { error: 'Processing failed', input };
  }

  return { success: true, output: result * 2 };
}

function transformAsyncFixed(value) {
  return new Promise(resolve => {
    setTimeout(() => {
      processingResult = value * 10;
      resolve();
    }, 1);
  });
}

// Export both for comparison
module.exports = { processData, processDataWithDebug, processDataFixed };
`,
      editable: true,
    },
    {
      path: 'test.js',
      content: `const { processData, processDataWithDebug, processDataFixed } = require('./processor.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return fn().then(() => {
    passed++;
    console.log('✓ ' + name);
  }).catch((e) => {
    failed++;
    console.log('✗ ' + name);
    console.log('  Error: ' + e.message);
  });
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error('Expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
      }
    }
  };
}

async function runTests() {
  // Test 1: processData should work correctly
  await test('processData returns correct output', async () => {
    const result = await processData(5);
    // Expected: 5 * 10 * 2 = 100
    expect(result.success).toBe(true);
    expect(result.output).toBe(100);
  });

  // Test 2: Multiple calls should all work
  await test('processData works consistently over multiple calls', async () => {
    for (let i = 1; i <= 5; i++) {
      const result = await processData(i);
      expect(result.success).toBe(true);
      expect(result.output).toBe(i * 10 * 2);
    }
  });

  // Test 3: Compare with fixed version
  await test('processData matches fixed version behavior', async () => {
    const buggy = await processData(7);
    const fixed = await processDataFixed(7);

    // Fixed version should always work
    expect(fixed.success).toBe(true);
    expect(fixed.output).toBe(140);

    // Buggy version should also work (if fixed)
    expect(buggy.success).toBe(true);
    expect(buggy.output).toBe(140);
  });

  console.log('');
  console.log('Tests: ' + passed + ' passed, ' + (passed + failed) + ' total');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
`,
      editable: false,
    },
  ],
  testCommand: 'node test.js',
  defectCategory: 'Heisenbug',
  severity: 'Major',
  priority: 'Medium',
  signals: ['failing_tests', 'inconsistent_repro'],
  toolsExpected: ['unit_tests', 'code_review', 'logging'],
  requiredTriage: true,
  triageRubric: {
    expectedCategory: 'Heisenbug',
    expectedSeverity: 'Major',
    expectedPriority: 'Medium',
    expectedFirstActions: ['timing', 'async', 'await', 'race condition', 'heisenbug'],
    explanation: 'The bug disappears with logging because console.log adds delay. The root cause is not awaiting the async transform.',
  },
  observabilitySnapshot: {
    logs: [
      '[TEST] Running without debug: FAIL - result is null',
      '[TEST] Running with debug: PASS - result is 50',
      '[TEST] Adding console.log "fixes" the bug?!',
      '[INSIGHT] Debug logging adds timing delay',
    ],
  },
  solutionExplanation: `transformAsync uses setTimeout but processData doesn't await it. The result is read before transform completes.

**Fix:** Make transformAsync return a Promise and await it:
\`\`\`javascript
async function processData(input) {
  processingResult = null;
  await transformAsync(input);  // Add await
  const result = processingResult;
  // ...
}

function transformAsync(value) {
  return new Promise(resolve => {
    setTimeout(() => {
      processingResult = value * 10;
      resolve();
    }, 1);
  });
}
\`\`\``,
};

// ============================================================================
// LAB 10: Environment - Timezone Parsing Bug
// ============================================================================
const timezoneBug: SeedDebugLabItem = {
  id: 'debug-lab-timezone',
  title: 'Scheduled Jobs Running at Wrong Time',
  description: `Users in different timezones report scheduled jobs running at wrong times.
A job scheduled for "9:00 AM" runs at different actual times depending on where the user is.
The backend is in UTC but doesn't properly handle user timezone preferences.`,
  difficulty: 'MEDIUM',
  language: 'javascript',
  files: [
    {
      path: 'scheduler.js',
      content: `/**
 * Job scheduler with timezone support
 */

/**
 * Parse a time string into hours and minutes
 */
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Convert local time to UTC
 * Bug: Incorrect timezone offset direction
 */
function localToUtc(hours, minutes, timezoneOffset) {
  // timezoneOffset is in hours (e.g., -5 for EST, +9 for JST)
  // Bug: Adding instead of subtracting
  let utcHours = hours + timezoneOffset;  // Should be: hours - timezoneOffset

  // Handle day wraparound
  if (utcHours < 0) utcHours += 24;
  if (utcHours >= 24) utcHours -= 24;

  return { hours: utcHours, minutes };
}

/**
 * Convert UTC to local time
 * Bug: Incorrect timezone offset direction
 */
function utcToLocal(hours, minutes, timezoneOffset) {
  // Bug: Subtracting instead of adding
  let localHours = hours - timezoneOffset;  // Should be: hours + timezoneOffset

  if (localHours < 0) localHours += 24;
  if (localHours >= 24) localHours -= 24;

  return { hours: localHours, minutes };
}

/**
 * Schedule a job at user's local time
 * Returns the UTC time it will actually run
 */
function scheduleJob(localTimeStr, userTimezoneOffset) {
  const { hours, minutes } = parseTime(localTimeStr);
  const utcTime = localToUtc(hours, minutes, userTimezoneOffset);

  return {
    scheduledLocalTime: localTimeStr,
    userTimezone: userTimezoneOffset >= 0 ? 'UTC+' + userTimezoneOffset : 'UTC' + userTimezoneOffset,
    utcExecutionTime: String(utcTime.hours).padStart(2, '0') + ':' + String(utcTime.minutes).padStart(2, '0'),
  };
}

/**
 * Get the local time a UTC job will appear to run at
 */
function getLocalExecutionTime(utcTimeStr, userTimezoneOffset) {
  const { hours, minutes } = parseTime(utcTimeStr);
  const localTime = utcToLocal(hours, minutes, userTimezoneOffset);

  return String(localTime.hours).padStart(2, '0') + ':' + String(localTime.minutes).padStart(2, '0');
}

module.exports = { parseTime, localToUtc, utcToLocal, scheduleJob, getLocalExecutionTime };
`,
      editable: true,
    },
    {
      path: 'test.js',
      content: `const { parseTime, localToUtc, utcToLocal, scheduleJob, getLocalExecutionTime } = require('./scheduler.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('✓ ' + name);
  } catch (e) {
    failed++;
    console.log('✗ ' + name);
    console.log('  Error: ' + e.message);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error('Expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error('Expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
      }
    }
  };
}

// Basic parsing
test('parseTime parses time string', () => {
  expect(parseTime('09:30')).toEqual({ hours: 9, minutes: 30 });
  expect(parseTime('14:00')).toEqual({ hours: 14, minutes: 0 });
});

// EST (UTC-5): 9:00 AM EST = 14:00 UTC
test('localToUtc converts EST to UTC correctly', () => {
  // 9:00 AM in EST (UTC-5) should be 14:00 UTC
  const result = localToUtc(9, 0, -5);
  expect(result.hours).toBe(14);
  expect(result.minutes).toBe(0);
});

// JST (UTC+9): 9:00 AM JST = 00:00 UTC
test('localToUtc converts JST to UTC correctly', () => {
  // 9:00 AM in JST (UTC+9) should be 00:00 UTC
  const result = localToUtc(9, 0, 9);
  expect(result.hours).toBe(0);
  expect(result.minutes).toBe(0);
});

// UTC to EST: 14:00 UTC = 9:00 AM EST
test('utcToLocal converts UTC to EST correctly', () => {
  const result = utcToLocal(14, 0, -5);
  expect(result.hours).toBe(9);
  expect(result.minutes).toBe(0);
});

// UTC to JST: 00:00 UTC = 9:00 AM JST
test('utcToLocal converts UTC to JST correctly', () => {
  const result = utcToLocal(0, 0, 9);
  expect(result.hours).toBe(9);
  expect(result.minutes).toBe(0);
});

// Round trip: local -> UTC -> local should be identity
test('round trip conversion preserves time', () => {
  const originalHours = 15;
  const originalMinutes = 30;
  const timezone = -7; // PDT

  const utc = localToUtc(originalHours, originalMinutes, timezone);
  const backToLocal = utcToLocal(utc.hours, utc.minutes, timezone);

  expect(backToLocal.hours).toBe(originalHours);
  expect(backToLocal.minutes).toBe(originalMinutes);
});

// Schedule job integration test
test('job scheduled for 9am EST runs at 14:00 UTC', () => {
  const job = scheduleJob('09:00', -5);
  expect(job.utcExecutionTime).toBe('14:00');
});

console.log('');
console.log('Tests: ' + passed + ' passed, ' + (passed + failed) + ' total');
process.exit(failed > 0 ? 1 : 0);
`,
      editable: false,
    },
  ],
  testCommand: 'node test.js',
  defectCategory: 'Environment',
  severity: 'Major',
  priority: 'High',
  signals: ['failing_tests'],
  toolsExpected: ['unit_tests', 'code_review'],
  requiredTriage: true,
  triageRubric: {
    expectedCategory: 'Environment',
    expectedSeverity: 'Major',
    expectedPriority: 'High',
    expectedFirstActions: ['timezone', 'UTC', 'offset', 'conversion'],
    explanation: 'Timezone offset is applied in the wrong direction. To convert local to UTC, subtract the offset; to convert UTC to local, add it.',
  },
  observabilitySnapshot: {
    logs: [
      '[INFO] User in EST (UTC-5) scheduled job for 09:00',
      '[DEBUG] Calculated UTC time: 04:00 (WRONG - should be 14:00)',
      '[ERROR] Job ran at 4:00 AM UTC instead of 2:00 PM UTC',
      '[REPORT] User complaint: "My 9am job ran at 11pm!"',
    ],
  },
  solutionExplanation: `The timezone conversion is backwards. To go from local to UTC, subtract the offset. To go from UTC to local, add the offset.

**Fix:**
\`\`\`javascript
function localToUtc(hours, minutes, timezoneOffset) {
  let utcHours = hours - timezoneOffset;  // Subtract to go to UTC
  // ...
}

function utcToLocal(hours, minutes, timezoneOffset) {
  let localHours = hours + timezoneOffset;  // Add to go to local
  // ...
}
\`\`\``,
};

// ============================================================================
// LAB 11: Container/Environment - Missing Env Var
// ============================================================================
const missingEnvVar: SeedDebugLabItem = {
  id: 'debug-lab-missing-env',
  title: 'Service Crashes on Startup',
  description: `The new deployment keeps crashing with "Configuration error" but works locally.
The container starts, logs one line, then exits with code 1.
DevOps says "it works in staging" but production keeps failing. Check environment differences.`,
  difficulty: 'EASY',
  language: 'javascript',
  files: [
    {
      path: 'config.js',
      content: `/**
 * Application configuration loader
 */

/**
 * Required configuration keys
 */
const REQUIRED_KEYS = [
  'DATABASE_URL',
  'API_KEY',
  'LOG_LEVEL'
];

/**
 * Load configuration from environment
 * Bug: Doesn't check for undefined values, only missing keys
 */
function loadConfig() {
  const config = {};
  const missing = [];

  for (const key of REQUIRED_KEYS) {
    const value = process.env[key];

    // Bug: Empty string passes this check but shouldn't
    if (value === undefined) {
      missing.push(key);
    } else {
      config[key] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error('Missing required config: ' + missing.join(', '));
  }

  return config;
}

/**
 * Validate configuration values
 * Bug: Doesn't validate empty strings
 */
function validateConfig(config) {
  // Bug: These checks don't catch empty strings
  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  if (!config.API_KEY) {
    throw new Error('API_KEY is required');
  }

  // Bug: Empty string is falsy but this doesn't throw a helpful error
  if (!config.LOG_LEVEL) {
    config.LOG_LEVEL = 'info'; // Default, but masks the real issue
  }

  return config;
}

/**
 * Get a specific config value with fallback
 * Bug: Doesn't distinguish between missing and empty
 */
function getConfigValue(key, defaultValue) {
  const value = process.env[key];
  // Bug: Returns default for empty string, hiding config issues
  return value || defaultValue;
}

/**
 * Initialize application
 */
function initialize() {
  console.log('Starting application...');

  try {
    const rawConfig = loadConfig();
    const config = validateConfig(rawConfig);

    console.log('Configuration loaded successfully');
    return config;
  } catch (error) {
    console.error('Configuration error:', error.message);
    throw error;
  }
}

// For testing: allow setting env vars
function setEnv(key, value) {
  process.env[key] = value;
}

function clearEnv(key) {
  delete process.env[key];
}

module.exports = { loadConfig, validateConfig, getConfigValue, initialize, setEnv, clearEnv, REQUIRED_KEYS };
`,
      editable: true,
    },
    {
      path: 'test.js',
      content: `const { loadConfig, validateConfig, getConfigValue, initialize, setEnv, clearEnv, REQUIRED_KEYS } = require('./config.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('✓ ' + name);
  } catch (e) {
    failed++;
    console.log('✗ ' + name);
    console.log('  Error: ' + e.message);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error('Expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
      }
    },
    toThrow(expectedMessage) {
      // actual should be a function
      try {
        actual();
        throw new Error('Expected function to throw but it did not');
      } catch (e) {
        if (expectedMessage && !e.message.includes(expectedMessage)) {
          throw new Error('Expected error containing "' + expectedMessage + '" but got "' + e.message + '"');
        }
      }
    }
  };
}

// Clean up env before each test
function resetEnv() {
  for (const key of REQUIRED_KEYS) {
    clearEnv(key);
  }
}

// Test 1: Valid config loads
resetEnv();
setEnv('DATABASE_URL', 'postgres://localhost/db');
setEnv('API_KEY', 'secret123');
setEnv('LOG_LEVEL', 'debug');
test('loads valid configuration', () => {
  const config = loadConfig();
  expect(config.DATABASE_URL).toBe('postgres://localhost/db');
  expect(config.API_KEY).toBe('secret123');
});

// Test 2: Missing env var throws
resetEnv();
setEnv('DATABASE_URL', 'postgres://localhost/db');
// API_KEY intentionally missing
setEnv('LOG_LEVEL', 'debug');
test('throws error for missing required key', () => {
  expect(() => loadConfig()).toThrow('Missing required config');
});

// Test 3: Empty string should be rejected
resetEnv();
setEnv('DATABASE_URL', 'postgres://localhost/db');
setEnv('API_KEY', '');  // Empty string - should be rejected
setEnv('LOG_LEVEL', 'debug');
test('rejects empty string as invalid config value', () => {
  expect(() => {
    const config = loadConfig();
    validateConfig(config);
  }).toThrow('API_KEY');
});

// Test 4: getConfigValue should not return default for empty string
resetEnv();
setEnv('LOG_LEVEL', '');
test('getConfigValue distinguishes empty string from missing', () => {
  // If LOG_LEVEL is explicitly set to empty, we should know it's misconfigured
  // not silently use a default
  const value = getConfigValue('LOG_LEVEL', 'info');
  // Current bug: returns 'info' because '' || 'info' = 'info'
  // Should either return '' or throw
  expect(value).toBe('');
});

// Test 5: Initialize with invalid config fails clearly
resetEnv();
setEnv('DATABASE_URL', 'postgres://localhost/db');
setEnv('API_KEY', '');
setEnv('LOG_LEVEL', 'debug');
test('initialize fails with clear error for empty API_KEY', () => {
  expect(() => initialize()).toThrow('API_KEY');
});

console.log('');
console.log('Tests: ' + passed + ' passed, ' + (passed + failed) + ' total');
process.exit(failed > 0 ? 1 : 0);
`,
      editable: false,
    },
  ],
  testCommand: 'node test.js',
  defectCategory: 'Container',
  severity: 'Critical',
  priority: 'High',
  signals: ['failing_tests', 'crash'],
  toolsExpected: ['unit_tests', 'code_review', 'logging'],
  requiredTriage: true,
  triageRubric: {
    expectedCategory: 'Container',
    expectedSeverity: 'Critical',
    expectedPriority: 'High',
    expectedFirstActions: ['environment', 'env var', 'empty string', 'config', 'validation'],
    explanation: 'Empty strings pass undefined checks but fail in use. Config validation must check for empty strings explicitly.',
  },
  observabilitySnapshot: {
    logs: [
      '[INFO] Starting application...',
      '[ERROR] Configuration error: API_KEY is required',
      '[INFO] Container exited with code 1',
      '[DEBUG] Environment dump: API_KEY="" (empty string, not undefined)',
    ],
  },
  solutionExplanation: `Empty string values pass the \`value === undefined\` check but are still invalid. Also, \`value || default\` treats empty string as falsy.

**Fix:** Check for both undefined and empty string:
\`\`\`javascript
function loadConfig() {
  for (const key of REQUIRED_KEYS) {
    const value = process.env[key];
    if (value === undefined || value === '') {
      missing.push(key);
    } else {
      config[key] = value;
    }
  }
}

function getConfigValue(key, defaultValue) {
  const value = process.env[key];
  return value !== undefined ? value : defaultValue;
}
\`\`\``,
};

// ============================================================================
// LAB 12: Distributed - Stale Read / Eventual Consistency
// ============================================================================
const eventualConsistencyBug: SeedDebugLabItem = {
  id: 'debug-lab-eventual-consistency',
  title: 'Order Status Inconsistency',
  description: `Users see inconsistent order statuses. They place an order, get a "confirmed" response,
but then the order page shows "pending". Refreshing sometimes shows "confirmed", sometimes "pending".
The system uses a read replica that may lag behind the primary.`,
  difficulty: 'HARD',
  language: 'javascript',
  files: [
    {
      path: 'database.js',
      content: `/**
 * Simulated primary/replica database with replication lag
 */
const primary = new Map();
const replica = new Map();
let replicaLag = 0;
let pendingReplications = [];

async function writeToPrimary(key, value) {
  await delay(5);
  primary.set(key, { value, timestamp: Date.now() });

  // Schedule replication with lag
  pendingReplications.push({
    key,
    value,
    replicateAt: Date.now() + replicaLag
  });

  return value;
}

async function readFromPrimary(key) {
  await delay(5);
  const entry = primary.get(key);
  return entry ? entry.value : null;
}

async function readFromReplica(key) {
  // Process pending replications
  const now = Date.now();
  pendingReplications = pendingReplications.filter(rep => {
    if (rep.replicateAt <= now) {
      replica.set(rep.key, rep.value);
      return false;
    }
    return true;
  });

  await delay(2);
  return replica.get(key) || null;
}

function setReplicaLag(ms) {
  replicaLag = ms;
}

function reset() {
  primary.clear();
  replica.clear();
  pendingReplications = [];
  replicaLag = 0;
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Force sync replica (for testing initial state)
function syncReplica() {
  for (const [key, entry] of primary) {
    replica.set(key, entry.value);
  }
  pendingReplications = [];
}

module.exports = { writeToPrimary, readFromPrimary, readFromReplica, setReplicaLag, reset, syncReplica };
`,
      editable: false,
    },
    {
      path: 'order-service.js',
      content: `const db = require('./database.js');

/**
 * Create a new order
 * Writes to primary, returns success
 */
async function createOrder(orderId, items) {
  const order = {
    id: orderId,
    items,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };

  await db.writeToPrimary('order:' + orderId, order);

  return { success: true, order };
}

/**
 * Get order status
 * Bug: Reads from replica without considering replication lag
 */
async function getOrderStatus(orderId) {
  // Bug: Always reads from replica, which may be stale
  const order = await db.readFromReplica('order:' + orderId);

  if (!order) {
    return { found: false };
  }

  return { found: true, status: order.status, order };
}

/**
 * Update order status
 */
async function updateOrderStatus(orderId, newStatus) {
  const current = await db.readFromPrimary('order:' + orderId);

  if (!current) {
    throw new Error('Order not found');
  }

  const updated = { ...current, status: newStatus, updatedAt: new Date().toISOString() };
  await db.writeToPrimary('order:' + orderId, updated);

  return updated;
}

/**
 * Read-your-writes pattern (correct approach)
 * Uses primary for reads immediately after writes
 */
async function getOrderStatusConsistent(orderId) {
  // Read from primary to ensure consistency
  const order = await db.readFromPrimary('order:' + orderId);

  if (!order) {
    return { found: false };
  }

  return { found: true, status: order.status, order };
}

module.exports = { createOrder, getOrderStatus, updateOrderStatus, getOrderStatusConsistent };
`,
      editable: true,
    },
    {
      path: 'test.js',
      content: `const { createOrder, getOrderStatus, updateOrderStatus, getOrderStatusConsistent } = require('./order-service.js');
const db = require('./database.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return fn().then(() => {
    passed++;
    console.log('✓ ' + name);
  }).catch((e) => {
    failed++;
    console.log('✗ ' + name);
    console.log('  Error: ' + e.message);
  });
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error('Expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
      }
    }
  };
}

async function runTests() {
  // Test 1: Create order works
  db.reset();
  db.setReplicaLag(0);
  await test('createOrder creates order successfully', async () => {
    const result = await createOrder('order-1', [{ sku: 'ABC', qty: 1 }]);
    expect(result.success).toBe(true);
    expect(result.order.status).toBe('confirmed');
  });

  // Test 2: With no lag, read works
  db.reset();
  db.setReplicaLag(0);
  await test('getOrderStatus returns order when no replication lag', async () => {
    await createOrder('order-2', []);
    // Wait for replication
    await new Promise(r => setTimeout(r, 10));
    const status = await getOrderStatus('order-2');
    expect(status.found).toBe(true);
    expect(status.status).toBe('confirmed');
  });

  // Test 3: With lag, immediate read fails (exposes the bug)
  db.reset();
  db.setReplicaLag(100); // 100ms lag
  await test('getOrderStatus returns correct status immediately after create', async () => {
    const createResult = await createOrder('order-3', []);
    expect(createResult.order.status).toBe('confirmed');

    // Immediately read - should see 'confirmed' but replica has lag
    const status = await getOrderStatus('order-3');
    expect(status.found).toBe(true);
    expect(status.status).toBe('confirmed');
  });

  // Test 4: Update then read consistency
  db.reset();
  db.setReplicaLag(100);
  await test('getOrderStatus sees updates immediately', async () => {
    await createOrder('order-4', []);
    await new Promise(r => setTimeout(r, 150)); // Wait for initial replication

    await updateOrderStatus('order-4', 'shipped');

    // Immediately read - should see 'shipped'
    const status = await getOrderStatus('order-4');
    expect(status.status).toBe('shipped');
  });

  // Test 5: Consistent read works even with lag
  db.reset();
  db.setReplicaLag(100);
  await test('getOrderStatusConsistent returns correct status with lag', async () => {
    await createOrder('order-5', []);

    // Consistent read should work immediately
    const status = await getOrderStatusConsistent('order-5');
    expect(status.found).toBe(true);
    expect(status.status).toBe('confirmed');
  });

  console.log('');
  console.log('Tests: ' + passed + ' passed, ' + (passed + failed) + ' total');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
`,
      editable: false,
    },
  ],
  testCommand: 'node test.js',
  defectCategory: 'Distributed',
  severity: 'Major',
  priority: 'Medium',
  signals: ['failing_tests', 'inconsistent_repro'],
  toolsExpected: ['unit_tests', 'code_review', 'logging'],
  requiredTriage: true,
  triageRubric: {
    expectedCategory: 'Distributed',
    expectedSeverity: 'Major',
    expectedPriority: 'Medium',
    expectedFirstActions: ['replication', 'consistency', 'replica lag', 'read-your-writes', 'primary'],
    explanation: 'Read from replica immediately after write to primary can return stale data. Use read-your-writes pattern or read from primary after writes.',
  },
  observabilitySnapshot: {
    logs: [
      '[INFO] Order order-123 created successfully on primary',
      '[DEBUG] Replication lag: 50ms',
      '[INFO] Reading order order-123 from replica',
      '[WARN] Order not found in replica (not yet replicated)',
      '[USER] "I just created this order but it shows not found!"',
    ],
  },
  solutionExplanation: `getOrderStatus reads from replica which may not have received the write yet. Users see stale data immediately after creating/updating orders.

**Fix:** Use read-your-writes pattern - read from primary after recent writes:
\`\`\`javascript
async function getOrderStatus(orderId, options = {}) {
  // If caller indicates recent write, use primary
  if (options.afterWrite) {
    return getOrderStatusConsistent(orderId);
  }
  // Otherwise replica is fine for reads
  const order = await db.readFromReplica('order:' + orderId);
  // ...
}
\`\`\`
Or always read from primary for order status to ensure consistency.`,
};

// ============================================================================
// Export all seed items
// ============================================================================

export const SEED_DEBUG_LAB_ITEMS: readonly SeedDebugLabItem[] = [
  binarySearchOverflow,        // 1. Functional - off-by-one, midpoint
  floatingPointEquality,       // 2. Functional - floating point
  connectionPoolLeak,          // 3. Resource - connection pool
  fileDescriptorLeak,          // 4. Resource - file descriptor
  accidentalQuadratic,         // 5. Performance - O(n²)
  missingCorrelationId,        // 6. Observability - correlation ID (Low severity, High priority)
  checkThenActRace,            // 7. Concurrency - check-then-act
  staleCacheBug,               // 8. Visibility - stale cache
  heisenDebugBug,              // 9. Heisenbug - timing
  timezoneBug,                 // 10. Environment - timezone
  missingEnvVar,               // 11. Container - env var
  eventualConsistencyBug,      // 12. Distributed - eventual consistency
];

export function getAllDebugLabItems(): readonly SeedDebugLabItem[] {
  return SEED_DEBUG_LAB_ITEMS;
}

export function getDebugLabItemById(id: string): SeedDebugLabItem | undefined {
  return SEED_DEBUG_LAB_ITEMS.find(item => item.id === id);
}
