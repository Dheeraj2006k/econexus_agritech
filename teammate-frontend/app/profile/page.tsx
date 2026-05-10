import Sidebar from '@/components/layout/sidebar'
import Navbar from '@/components/layout/navbar'

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">

      <Sidebar />

      <div className="flex-1">

        <Navbar />

        <div className="p-6">

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-5xl">

            <div className="flex items-center gap-6 mb-10">

              <div className="w-28 h-28 rounded-full bg-emerald-500 flex items-center justify-center text-black text-4xl font-bold">
                C
              </div>

              <div>

                <h1 className="text-4xl font-bold">
                  Charan
                </h1>

                <p className="text-zinc-400 mt-2">
                  Frontend Developer • AgriMesh AI
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>

                  <span className="text-emerald-400">
                    Active
                  </span>
                </div>

              </div>

            </div>

            <div className="grid md:grid-cols-2 gap-6">

              <div className="bg-zinc-800 rounded-2xl p-6">

                <h2 className="text-2xl font-bold mb-6">
                  Profile Information
                </h2>

                <div className="space-y-4">

                  <div className="flex justify-between">
                    <span className="text-zinc-400">
                      User ID
                    </span>

                    <span>
                      AGRI-1020
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-zinc-400">
                      Role
                    </span>

                    <span>
                      Farmer Coordinator
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-zinc-400">
                      Region
                    </span>

                    <span>
                      Telangana
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-zinc-400">
                      Experience
                    </span>

                    <span>
                      5 Years
                    </span>
                  </div>

                </div>

              </div>

              <div className="bg-zinc-800 rounded-2xl p-6">

                <h2 className="text-2xl font-bold mb-6">
                  Trust Metrics
                </h2>

                <div className="space-y-5">

                  <div>
                    <div className="flex justify-between mb-2">
                      <span>
                        Trust Ratio
                      </span>

                      <span className="text-emerald-400">
                        91%
                      </span>
                    </div>

                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[91%]"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span>
                        Negotiation Success
                      </span>

                      <span className="text-blue-400">
                        84%
                      </span>
                    </div>

                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 w-[84%]"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span>
                        Delivery Reliability
                      </span>

                      <span className="text-orange-400">
                        88%
                      </span>
                    </div>

                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 w-[88%]"></div>
                    </div>
                  </div>

                </div>

              </div>

            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-6">

              <div className="bg-zinc-800 rounded-2xl p-6 text-center">

                <p className="text-zinc-400">
                  Total Negotiations
                </p>

                <h2 className="text-4xl font-bold text-emerald-400 mt-3">
                  182
                </h2>

              </div>

              <div className="bg-zinc-800 rounded-2xl p-6 text-center">

                <p className="text-zinc-400">
                  Cooperative Deals
                </p>

                <h2 className="text-4xl font-bold text-blue-400 mt-3">
                  48
                </h2>

              </div>

              <div className="bg-zinc-800 rounded-2xl p-6 text-center">

                <p className="text-zinc-400">
                  AI Recommendations
                </p>

                <h2 className="text-4xl font-bold text-orange-400 mt-3">
                  326
                </h2>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}