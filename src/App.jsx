import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Inicio from './pages/Inicio'
import NuevoEvento from './pages/NuevoEvento'
import DetalleEvento from './pages/DetalleEvento'
import Timing from './pages/Timing'
import Scan from './pages/Scan'
import Resultados from './pages/Resultados'
import Pantalla from './pages/Pantalla'
import PWAUpdatePrompt from './components/PWAUpdatePrompt'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
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
        <PWAUpdatePrompt />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
