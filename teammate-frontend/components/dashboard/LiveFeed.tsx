const activities = [
  'Buyer matched in Hyderabad',
  'AI suggested fair price',
  'Cooperative deal formed',
  'Logistics route optimized',
]

export default function LiveFeed() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-6">
        Live Coordination Feed
      </h2>

      <div className="space-y-4">
        {activities.map((item) => (
          <div
            key={item}
            className="flex items-center gap-3"
          >
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>

            <p className="text-zinc-300">
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}