import Link from 'next/link';

/**
 * Home page - UI only, no business logic.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Scaffolded Learning
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Master coding interviews with structured practice, micro-drills,
          and daily sessions designed for efficient learning.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/daily"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Start Daily Session
          </Link>
          <Link
            href="/interview"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Interview Mode
          </Link>
          <Link
            href="/practice"
            className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Practice Problems
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <FeatureCard
            title="Daily Sessions"
            description="Curated 15-minute sessions with spaced repetition"
          />
          <FeatureCard
            title="Micro Drills"
            description="Quick exercises to reinforce pattern recognition"
          />
          <FeatureCard
            title="Scaffolded Problems"
            description="Step-by-step guidance for complex problems"
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
