/**
 * Seed Debug Track Scenarios
 *
 * Initial set of debugging scenarios for the Debug Track feature.
 * Each scenario presents a buggy codebase and guides users through
 * structured debugging gates.
 */

import type {
  DebugScenario,
  CodeArtifact,
} from '../debug-track/entities.js';
import type {
  DebugPatternCategory,
  DebugDifficulty,
} from '../debug-track/types.js';

/**
 * Seed scenario type without auto-generated fields
 */
export type SeedDebugScenario = Omit<DebugScenario, 'createdAt'>;

/**
 * All seed debug track scenarios
 */
export const SEED_DEBUG_SCENARIOS: SeedDebugScenario[] = [
  // ============ FUNCTIONAL_LOGIC Scenarios ============
  {
    id: 'debug-001',
    category: 'FUNCTIONAL_LOGIC',
    patternKey: 'OFF_BY_ONE',
    difficulty: 'BEGINNER',
    symptomDescription: `Users report that the pagination on the product listing page is broken.
When viewing 100 products with 10 items per page, clicking "Page 10" shows no products,
but clicking "Page 11" shows the last 10 products. The total page count displays correctly as 10.`,
    codeArtifacts: [
      {
        id: 'pagination-js',
        filename: 'pagination.js',
        language: 'javascript',
        code: `/**
 * Pagination utility for product listings
 */
export function paginate(items, pageNumber, pageSize) {
  if (!items || items.length === 0) {
    return { items: [], totalPages: 0, currentPage: 1 };
  }

  const totalPages = Math.ceil(items.length / pageSize);

  // Calculate slice indices
  const startIndex = pageNumber * pageSize;  // BUG: Should be (pageNumber - 1) * pageSize
  const endIndex = startIndex + pageSize;

  const pageItems = items.slice(startIndex, endIndex);

  return {
    items: pageItems,
    totalPages,
    currentPage: pageNumber,
  };
}

export function getTotalPages(totalItems, pageSize) {
  return Math.ceil(totalItems / pageSize);
}`,
        bugLines: [12],
        description: 'Pagination utility module',
      },
      {
        id: 'product-list-jsx',
        filename: 'ProductList.jsx',
        language: 'javascript',
        code: `import { paginate } from './pagination';

export function ProductList({ products, currentPage, pageSize }) {
  const { items, totalPages } = paginate(products, currentPage, pageSize);

  return (
    <div>
      <div className="products">
        {items.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <Pagination
        current={currentPage}
        total={totalPages}
        onChange={handlePageChange}
      />
    </div>
  );
}`,
        description: 'Product list component using pagination',
      },
    ],
    expectedFindings: [
      'Off-by-one error in pagination startIndex calculation',
      'Page numbers are 1-indexed but calculation treats them as 0-indexed',
      'startIndex should be (pageNumber - 1) * pageSize',
    ],
    fixStrategies: [
      'Change startIndex calculation to (pageNumber - 1) * pageSize',
      'Add input validation to ensure pageNumber >= 1',
      'Consider adding bounds checking for pageNumber > totalPages',
    ],
    regressionExpectation: 'Add unit tests for page 1, middle pages, and last page with various item counts',
    hintLadder: [
      'Think about what page 1 should show - the first items or items starting at index pageSize?',
      'Page numbers typically start at 1, but array indices start at 0. How does this affect the calculation?',
      'If pageNumber is 1 and pageSize is 10, what should startIndex be? What does the current code compute?',
      'The startIndex should be (pageNumber - 1) * pageSize to convert from 1-indexed pages to 0-indexed array.',
    ],
    tags: ['pagination', 'off-by-one', 'array-indexing', 'beginner'],
  },

  {
    id: 'debug-002',
    category: 'FUNCTIONAL_LOGIC',
    patternKey: 'BOUNDARY_CONDITION',
    difficulty: 'INTERMEDIATE',
    symptomDescription: `The discount calculator is giving incorrect results for edge cases.
When a customer has exactly $100 in their cart, they should get 10% off, but they're getting 0% off.
Also, customers with $99.99 carts are incorrectly getting the 10% discount.`,
    codeArtifacts: [
      {
        id: 'discount-calc-ts',
        filename: 'discountCalculator.ts',
        language: 'typescript',
        code: `interface DiscountTier {
  minAmount: number;
  discountPercent: number;
}

const DISCOUNT_TIERS: DiscountTier[] = [
  { minAmount: 200, discountPercent: 20 },
  { minAmount: 100, discountPercent: 10 },
  { minAmount: 50, discountPercent: 5 },
];

export function calculateDiscount(cartTotal: number): number {
  for (const tier of DISCOUNT_TIERS) {
    if (cartTotal > tier.minAmount) {  // BUG: Should be >=
      return tier.discountPercent;
    }
  }
  return 0;
}

export function applyDiscount(cartTotal: number): number {
  const discountPercent = calculateDiscount(cartTotal);
  // BUG: Floating point comparison issue with currency
  return cartTotal * (1 - discountPercent / 100);
}`,
        bugLines: [15, 17],
        description: 'Discount calculation module with tiered pricing',
      },
    ],
    expectedFindings: [
      'Boundary condition error: > should be >= for inclusive threshold',
      'Customers at exactly the threshold amount do not receive the discount',
      'Floating point arithmetic may cause precision issues with currency',
    ],
    fixStrategies: [
      'Change comparison from > to >= for inclusive boundaries',
      'Use cents/integers for money calculations to avoid floating point issues',
      'Add explicit test cases for boundary values',
    ],
    regressionExpectation: 'Test exact boundary values: $50.00, $100.00, $200.00, and values just below/above each',
    hintLadder: [
      'What happens when cartTotal exactly equals a tier\'s minAmount?',
      'Consider the difference between > and >= operators',
      'The symptom mentions $100 not working - trace through what happens when cartTotal === 100',
      'Line 15: cartTotal > 100 is false when cartTotal is exactly 100. Use >= instead.',
    ],
    tags: ['boundary', 'comparison-operators', 'discount', 'e-commerce'],
  },

  // ============ CONCURRENCY Scenarios ============
  {
    id: 'debug-003',
    category: 'CONCURRENCY',
    patternKey: 'RACE_CONDITION',
    difficulty: 'ADVANCED',
    symptomDescription: `Users occasionally see stale data after updating their profile.
The update appears successful (no errors), but refreshing the page sometimes shows old data.
This happens more frequently during peak hours. Logs show the update was persisted correctly.`,
    codeArtifacts: [
      {
        id: 'profile-service-ts',
        filename: 'profileService.ts',
        language: 'typescript',
        code: `import { cache } from './cache';
import { database } from './database';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  updatedAt: Date;
}

const CACHE_KEY_PREFIX = 'user_profile:';
const CACHE_TTL_SECONDS = 300;

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const cacheKey = CACHE_KEY_PREFIX + userId;

  const cached = await cache.get<UserProfile>(cacheKey);
  if (cached) {
    return cached;
  }

  const profile = await database.users.findById(userId);
  if (profile) {
    // Race condition: cache.set happens after DB read
    // Another request might read stale cache before this completes
    await cache.set(cacheKey, profile, CACHE_TTL_SECONDS);
  }
  return profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  // BUG: Cache invalidation happens AFTER the update
  // Another request can read stale cache between these operations
  const updated = await database.users.update(userId, {
    ...updates,
    updatedAt: new Date(),
  });

  // Race window: between DB update and cache invalidation,
  // other requests may cache the old value
  const cacheKey = CACHE_KEY_PREFIX + userId;
  await cache.delete(cacheKey);  // BUG: Should invalidate BEFORE or use atomic operation

  return updated;
}`,
        bugLines: [25, 26],
        description: 'Profile service with cache-aside pattern',
      },
      {
        id: 'cache-ts',
        filename: 'cache.ts',
        language: 'typescript',
        code: `// Redis cache wrapper
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    // Implementation
  },
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    // Implementation
  },
  async delete(key: string): Promise<void> {
    // Implementation
  },
};`,
        description: 'Cache abstraction layer',
      },
    ],
    expectedFindings: [
      'Race condition between database update and cache invalidation',
      'Another request can read stale cache in the window between DB write and cache delete',
      'Cache-aside pattern is not atomic',
    ],
    fixStrategies: [
      'Invalidate cache BEFORE updating database (cache-aside with pre-invalidation)',
      'Use write-through caching where DB and cache are updated atomically',
      'Implement cache versioning or use short TTL during updates',
      'Use distributed locks for critical sections',
    ],
    regressionExpectation: 'Load test with concurrent read/write operations, verify no stale reads',
    hintLadder: [
      'When do concurrent requests become a problem in this code?',
      'Trace what happens if Request A updates the profile while Request B is reading it',
      'The cache deletion happens AFTER the database update. What can happen in between?',
      'Request B might: 1) Check cache (miss), 2) Read DB (old value because A\'s update hasn\'t committed), 3) Set cache (with old value), even after A has updated and cleared cache',
    ],
    tags: ['race-condition', 'caching', 'concurrency', 'cache-invalidation'],
  },

  // ============ PERFORMANCE Scenarios ============
  {
    id: 'debug-004',
    category: 'PERFORMANCE',
    patternKey: 'N_PLUS_ONE',
    difficulty: 'INTERMEDIATE',
    symptomDescription: `The order history page is extremely slow for customers with many orders.
Database monitoring shows thousands of queries being executed for a single page load.
The page loads in 200ms for new users but takes 15+ seconds for users with 100+ orders.`,
    codeArtifacts: [
      {
        id: 'order-service-ts',
        filename: 'orderService.ts',
        language: 'typescript',
        code: `import { db } from './database';

interface Order {
  id: string;
  userId: string;
  createdAt: Date;
  items: OrderItem[];
  shippingAddress: Address;
}

interface OrderItem {
  productId: string;
  quantity: number;
  product?: Product;
}

export async function getOrderHistory(userId: string): Promise<Order[]> {
  const orders = await db.orders.findMany({ where: { userId } });

  // BUG: N+1 query - fetching items and products in a loop
  for (const order of orders) {
    order.items = await db.orderItems.findMany({ where: { orderId: order.id } });

    for (const item of order.items) {
      item.product = await db.products.findById(item.productId);
    }

    order.shippingAddress = await db.addresses.findById(order.addressId);
  }

  return orders;
}`,
        bugLines: [18, 19, 20],
        description: 'Order history service with N+1 query issue',
      },
    ],
    expectedFindings: [
      'N+1 query pattern: one query for orders, then N queries for items, N*M for products',
      'Each order triggers additional database roundtrips in a loop',
      'Query count scales with: orders + (orders * items) + orders for addresses',
    ],
    fixStrategies: [
      'Use eager loading/joins to fetch related data in single query',
      'Batch fetch all order items and products, then map in memory',
      'Use DataLoader pattern to deduplicate and batch queries',
      'Consider denormalizing frequently accessed data',
    ],
    regressionExpectation: 'Add query count assertions in tests, set up database query logging in staging',
    hintLadder: [
      'Count how many database queries are made for a user with N orders',
      'What pattern do you see with the nested loops and await statements?',
      'Each iteration of the for loop makes separate database calls. How can you batch these?',
      'Fetch all order items with: db.orderItems.findMany({ where: { orderId: { in: orderIds } } }), then group by orderId in memory',
    ],
    tags: ['n-plus-one', 'database', 'performance', 'orm'],
  },

  // ============ RESOURCE Scenarios ============
  {
    id: 'debug-005',
    category: 'RESOURCE',
    patternKey: 'CONNECTION_LEAK',
    difficulty: 'ADVANCED',
    symptomDescription: `The application crashes after running for several hours with "connection pool exhausted" errors.
Restarting the service fixes it temporarily. The problem correlates with traffic volume.
Memory usage appears stable, but connection metrics show steady growth until crash.`,
    codeArtifacts: [
      {
        id: 'report-gen-ts',
        filename: 'reportGenerator.ts',
        language: 'typescript',
        code: `import { pool } from './database';

interface ReportData {
  period: string;
  metrics: Record<string, number>;
}

export async function generateReport(
  startDate: Date,
  endDate: Date
): Promise<ReportData> {
  const connection = await pool.getConnection();

  try {
    const sales = await connection.query(
      'SELECT SUM(amount) as total FROM sales WHERE date BETWEEN ? AND ?',
      [startDate, endDate]
    );

    if (sales.total === 0) {
      // BUG: Early return without releasing connection
      return { period: formatPeriod(startDate, endDate), metrics: {} };
    }

    const breakdown = await connection.query(
      'SELECT category, SUM(amount) as total FROM sales WHERE date BETWEEN ? AND ? GROUP BY category',
      [startDate, endDate]
    );

    return {
      period: formatPeriod(startDate, endDate),
      metrics: breakdown.reduce((acc, row) => {
        acc[row.category] = row.total;
        return acc;
      }, {}),
    };
  } finally {
    connection.release();
  }
}

function formatPeriod(start: Date, end: Date): string {
  return \`\${start.toISOString()} - \${end.toISOString()}\`;
}`,
        bugLines: [23],
        description: 'Report generator with connection leak on early return',
      },
    ],
    expectedFindings: [
      'Connection leak on early return path (line 23)',
      'The finally block is bypassed when returning early before the try block completes normally',
      'Connections are not returned to pool when sales.total === 0',
    ],
    fixStrategies: [
      'Move the early return inside a condition that still reaches finally',
      'Use a try-finally wrapper around the entire function body',
      'Store result in a variable and return after finally',
      'Use a connection wrapper that implements automatic cleanup',
    ],
    regressionExpectation: 'Add connection pool monitoring, write test that exercises early return path and checks connection count',
    hintLadder: [
      'When does connection.release() get called? Follow all code paths.',
      'What happens to the connection when sales.total === 0?',
      'The return statement on line 23 exits the function before reaching the finally block.',
      'Actually, finally DOES run before return - but the bug is the early return happens inside try, so finally runs. The real bug may be elsewhere or this is a red herring. Check if getConnection itself has issues.',
    ],
    tags: ['connection-leak', 'resource-management', 'finally', 'database-pool'],
  },
];

/**
 * Get all seed debug scenarios as DebugScenario entities
 */
export function getAllSeedDebugScenarios(): DebugScenario[] {
  return SEED_DEBUG_SCENARIOS.map((seed) => ({
    ...seed,
    createdAt: new Date(),
  }));
}

/**
 * Get a seed debug scenario by ID
 */
export function getSeedDebugScenarioById(id: string): DebugScenario | undefined {
  const seed = SEED_DEBUG_SCENARIOS.find((s) => s.id === id);
  if (!seed) return undefined;
  return {
    ...seed,
    createdAt: new Date(),
  };
}
