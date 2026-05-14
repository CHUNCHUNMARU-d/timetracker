import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Inicio from './pages/Inicio'
import NuevoEvento from './pages/NuevoEvento'
import DetalleEvento from './pages/DetalleEvento'
import Timing from './pages/Timing'
import Resultados from './pages/Resultados'
import Pantalla from './pages/Pantalla'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/eventos/nuevo" element={<NuevoEvento />} />
        <Route path="/eventos/:id" element={<DetalleEvento />} />
        <Route path="/eventos/:id/timing" element={<Timing />} />
        <Route path="/eventos/:id/resultados" element={<Resultados />} />
        <Route path="/pantalla" element={<Pantalla />} />
        <Route path="/pantalla/:id" element={<Pantalla />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
