'use client'

import { motion } from 'framer-motion'

import Sidebar from '@/components/layout/sidebar'
import Navbar from '@/components/layout/navbar'

import Metrics from '@/components/dashboard/Metrics'
import LiveFeed from '@/components/dashboard/LiveFeed'

import MarketChart from '@/components/dashboard/MarketChart'
import AIInsights from '@/components/dashboard/AIInsights'
import SmartAlerts from '@/components/dashboard/SmartAlerts'

import AIAssistant from '@/components/dashboard/AIAssistant'
import LogisticsPanel from '@/components/dashboard/LogisticsPanel'

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">

      <Sidebar />

      <div className="flex-1">

        <Navbar />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="p-6"
        >

          <div id="dashboard">
            <Metrics />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <MarketChart />
            <AIInsights />
          </div>

          <div className="mt-6">
            <SmartAlerts />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">

            <AIAssistant />

            <LogisticsPanel />

          </div>

          <div className="mt-6">
            <LiveFeed />
          </div>

        </motion.div>

      </div>

    </div>
  )
}