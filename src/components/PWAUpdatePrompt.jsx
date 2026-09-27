import { useEffect, useRef, useState } from 'react'
// virtual: module supplied by vite-plugin-pwa at build time.
import { registerSW } from 'virtual:pwa-register'
import NeonButton from './ui/NeonButton'

export default function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const updateSW = useRef(null) // only the Recargar button reads it

  useEffect(() => {
    updateSW.current = registerSW({
      onNeedRefresh() { setNeedRefresh(true) },
      onOfflineReady() { /* silent */ },
    })
  }, [])

  if (!needRefresh) return null

  return (
    <div
      role="alertdialog"
      aria-labelledby="pwa-update-title"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-elevated border border-activa px-5 py-4 max-w-sm w-[calc(100%-2rem)] glow-activa"
    >
      <p id="pwa-update-title" className="text-text-hi font-display uppercase tracking-widest text-sm mb-3">
        Nueva versión disponible
      </p>
      <div className="flex gap-2">
        <NeonButton variant="ghost" size="sm" onClick={() => setNeedRefresh(false)} className="flex-1">
          Después
        </NeonButton>
        <NeonButton variant="primary" size="sm" onClick={() => updateSW.current?.(true)} className="flex-1">
          Recargar
        </NeonButton>
      </div>
    </div>
  )
}
