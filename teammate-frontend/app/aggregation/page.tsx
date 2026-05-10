import Sidebar from '@/components/layout/sidebar'
import Navbar from '@/components/layout/navbar'
import AggregationView from '@/components/dashboard/AggregationView'

export default function AggregationPage() {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">

      <Sidebar />

      <div className="flex-1">

        <Navbar />

        <div className="p-6">

          <h1 className="text-4xl font-bold mb-6">
            Cooperative Aggregation
          </h1>

          <AggregationView />

        </div>
      </div>
    </div>
  )
}