import Sidebar from '@/components/layout/sidebar'
import Navbar from '@/components/layout/navbar'
import TrustPassport from '@/components/dashboard/TrustPassport'

export default function PassportsPage() {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">

      <Sidebar />

      <div className="flex-1">

        <Navbar />

        <div className="p-6">

          <h1 className="text-4xl font-bold mb-6">
            Digital Trust Passports
          </h1>

          <TrustPassport />

        </div>
      </div>
    </div>
  )
}