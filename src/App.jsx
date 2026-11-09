import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Inicio from './pages/Inicio.jsx'
import Canje from './pages/Canje.jsx'

// El panel se carga aparte para que la página del cliente pese lo mínimo.
const Admin = lazy(() => import('./pages/admin/Admin.jsx'))
const ImprimirLote = lazy(() => import('./pages/admin/ImprimirLote.jsx'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/q/:codigo" element={<Canje />} />
        <Route path="/admin/imprimir/:lote" element={<ImprimirLote />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="*" element={<Inicio />} />
      </Routes>
    </Suspense>
  )
}
