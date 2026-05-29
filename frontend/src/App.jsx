import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute   from './components/ProtectedRoute'

// Páginas públicas
import Landing   from './pages/Landing'
import Login     from './pages/Login'
import Register  from './pages/Register'
import Perfil    from './pages/Perfil'

// Páginas protegidas
import Dashboard        from './pages/Dashboard'
import ValuacionDetail  from './pages/ValuacionDetail'

// Flujo de creación de avalúos
import CrearAvaluo      from './pages/CrearAvaluo/index'

// Formulario comercial
import FormularioComercial from './pages/FormularioComercial/index'

// Formulario Referido
import FormularioReferido from './pages/FormularioReferido'

// Admin
import GestionUsuarios  from './pages/Admin/GestionUsuarios'

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Públicas ─────────────────────────────────── */}
          <Route path="/"         element={<Landing />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/perfil"   element={<P><Perfil /></P>} />

          {/* ── Dashboard ───────────────────────────────── */}
          <Route path="/dashboard"
            element={<P><Dashboard /></P>} />

          {/* ── Detalle de avalúo ────────────────────────── */}
          <Route path="/valuacion/:id"
            element={<P><ValuacionDetail /></P>} />

          {/* ── Flujo de creación (simplificado) ─────────── */}
          <Route path="/valuacion/nueva"
            element={<P><CrearAvaluo /></P>} />
          <Route path="/valuacion/nueva/*"
            element={<P><CrearAvaluo /></P>} />

          {/* ── Formulario Comercial ─────────────────────── */}
          <Route path="/valuacion/comercial/nuevo"
            element={<P><FormularioComercial /></P>} />
          <Route path="/valuacion/comercial/:id"
            element={<P><FormularioComercial /></P>} />

          {/* ── Formulario Referido ──────────────────────── */}
          <Route path="/valuacion/referido/nuevo"
            element={<P><FormularioReferido /></P>} />
          <Route path="/valuacion/referido/:id"
            element={<P><FormularioReferido /></P>} />

          {/* ── Admin ─────────────────────────────────────── */}
          <Route path="/admin/usuarios"
            element={<P><GestionUsuarios /></P>} />

          {/* ── Catch-all ─────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}