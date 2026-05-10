'use client';
import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === 'accepted') setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-emerald-500/50 rounded-2xl p-4 flex items-center gap-4 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
      <div>
        <p className="text-white font-semibold text-sm">Install EcoNexus</p>
        <p className="text-zinc-400 text-xs">Add to home screen for demo</p>
      </div>
      <button onClick={install}
        className="bg-emerald-500 text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-emerald-400 transition">
        Install
      </button>
      <button onClick={() => setVisible(false)} className="text-zinc-500 hover:text-white text-xs">✕</button>
    </div>
  );
}
