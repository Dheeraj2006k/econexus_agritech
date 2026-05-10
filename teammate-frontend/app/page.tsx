
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-6">

      <div className="text-center max-w-5xl">

        <p className="text-emerald-400 font-medium mb-4 tracking-widest uppercase">
          Trust-Aware Agricultural AI Infrastructure
        </p>

        <h1 className="text-6xl md:text-7xl font-bold leading-tight">
          AI Coordination
          <span className="text-emerald-400"> For Agriculture</span>
        </h1>

        <p className="text-zinc-400 text-lg mt-8 max-w-3xl mx-auto leading-relaxed">
          Econexus AI connects farmers, buyers,
          logistics providers, and cooperatives
          through intelligent negotiation,
          trust passports, and real-time coordination.
        </p>

        <div className="flex items-center justify-center gap-4 mt-10">
          <Link
            href="/dashboard"
            className="bg-emerald-500 text-black px-8 py-4 rounded-2xl font-semibold hover:scale-105 transition"
          >
            Launch Dashboard
          </Link>

          <button className="border border-zinc-700 px-8 py-4 rounded-2xl hover:border-emerald-500 transition">
            Live Demo
          </button>
        </div>
      </div>

    </div>
  )
}
