'use client'

import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const data = [
  { day: 'Mon', price: 22 },
  { day: 'Tue', price: 24 },
  { day: 'Wed', price: 21 },
  { day: 'Thu', price: 26 },
  { day: 'Fri', price: 27 },
]

export default function MarketChart() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

      <h2 className="text-2xl font-bold mb-6">
        Market Trend Analytics
      </h2>

      <div className="h-72">

        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>

            <XAxis dataKey="day" />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="price"
              stroke="#10b981"
              strokeWidth={3}
            />

          </LineChart>
        </ResponsiveContainer>

      </div>
    </div>
  )
}