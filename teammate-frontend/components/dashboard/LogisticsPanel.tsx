export default function LogisticsPanel() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

      <h2 className="text-2xl font-bold mb-6">
        Logistics Optimization
      </h2>

      <div className="space-y-4">

        <div className="bg-zinc-800 rounded-xl p-4 flex justify-between">
          <span>Route Efficiency</span>
          <span className="text-emerald-400 font-bold">
            +28%
          </span>
        </div>

        <div className="bg-zinc-800 rounded-xl p-4 flex justify-between">
          <span>Fuel Reduction</span>
          <span className="text-emerald-400 font-bold">
            -16%
          </span>
        </div>

        <div className="bg-zinc-800 rounded-xl p-4 flex justify-between">
          <span>Delivery Speed</span>
          <span className="text-emerald-400 font-bold">
            +22%
          </span>
        </div>

      </div>

    </div>
  )
}