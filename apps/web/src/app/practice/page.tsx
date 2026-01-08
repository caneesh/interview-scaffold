/**
 * Practice page - browse and select problems.
 * UI only, no business logic.
 */

import Link from 'next/link';

export default function PracticePage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            &larr; Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Practice Problems</h1>
          <p className="text-gray-600 mt-2">
            Choose a pattern to practice or continue where you left off
          </p>
        </header>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Patterns
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <PatternCard
              name="Two Pointers"
              description="Solve problems using two iterators moving through data"
              problems={12}
              completed={0}
            />
            <PatternCard
              name="Sliding Window"
              description="Track a range of elements in arrays or strings"
              problems={10}
              completed={0}
            />
            <PatternCard
              name="Binary Search"
              description="Efficiently search sorted data structures"
              problems={8}
              completed={0}
            />
            <PatternCard
              name="Dynamic Programming"
              description="Break problems into overlapping subproblems"
              problems={15}
              completed={0}
            />
            <PatternCard
              name="Tree Traversal"
              description="Navigate and process tree structures"
              problems={10}
              completed={0}
            />
            <PatternCard
              name="Graph Algorithms"
              description="Work with connected data structures"
              problems={12}
              completed={0}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function PatternCard({
  name,
  description,
  problems,
  completed,
}: {
  name: string;
  description: string;
  problems: number;
  completed: number;
}) {
  const progress = problems > 0 ? (completed / problems) * 100 : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
      <h3 className="font-semibold text-gray-900 mb-1">{name}</h3>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {completed} / {problems} problems
        </span>
        <div className="w-20 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
