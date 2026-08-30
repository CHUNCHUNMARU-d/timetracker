import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Inicio from './pages/Inicio'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import ErrorBoundary from './components/ErrorBoundary'

// Inicio stays eager — it is the entry route. The rest split into their own
// chunks; Workbox precaches them all, so navigation still works offline.
const NuevoEvento = lazy(() => import('./pages/NuevoEvento'))
const DetalleEvento = lazy(() => import('./pages/DetalleEvento'))
const Timing = lazy(() => import('./pages/Timing'))
const Scan = lazy(() => import('./pages/Scan'))
const Resultados = lazy(() => import('./pages/Resultados'))
const Pantalla = lazy(() => import('./pages/Pantalla'))

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<div className="p-6 text-slate-400">Cargando…</div>}>
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/eventos/nuevo" element={<NuevoEvento />} />
            <Route path="/eventos/:id" element={<DetalleEvento />} />
            <Route path="/eventos/:id/timing" element={<Timing />} />
            <Route path="/eventos/:id/scan" element={<Scan />} />
            <Route path="/eventos/:id/resultados" element={<Resultados />} />
            <Route path="/pantalla" element={<Pantalla />} />
            <Route path="/pantalla/:id" element={<Pantalla />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <PWAUpdatePrompt />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
