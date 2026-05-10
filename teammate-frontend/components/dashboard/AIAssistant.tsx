'use client'

import { Bot } from 'lucide-react'

export default function AIAssistant() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.1)]">

      <div className="flex items-center gap-3 mb-6">

        <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
          <Bot className="text-black" />
        </div>

        <div>
          <h2 className="text-2xl font-bold">
            AI Assistant
          </h2>

          <p className="text-zinc-400 text-sm">
            Autonomous agricultural intelligence
          </p>
        </div>

      </div>

      <div className="space-y-4">

        <div className="bg-zinc-800 rounded-xl p-4">
          Suggested cooperative formed for tomato supply.
        </div>

        <div className="bg-zinc-800 rounded-xl p-4">
          AI predicts 14% demand increase tomorrow.
        </div>

        <div className="bg-zinc-800 rounded-xl p-4">
          Smart logistics route reduced transport cost.
        </div>

      </div>

    </div>
  )
}