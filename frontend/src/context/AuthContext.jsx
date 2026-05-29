import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// Se mantiene para el preview en tiempo real en el formulario de registro
// El username definitivo lo genera el backend
export function generateUsername(nombreCompleto) {
  const parts        = nombreCompleto.trim().split(' ')
  const inicial      = parts[0]?.[0]?.toUpperCase() || 'U'
  const apellido     = parts.length >= 2 ? parts[1] : parts[0]
  const apellidoFmt  = apellido.charAt(0).toUpperCase() + apellido.slice(1).toLowerCase()
  return `${inicial}.${apellidoFmt}XX`   // XX → número real asignado por el servidor
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('giaval_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) localStorage.setItem('giaval_user', JSON.stringify(user))
    else      localStorage.removeItem('giaval_user')
  }, [user])

  // ── LOGIN ──────────────────────────────────────────────────────
  const login = async (credentials) => {
    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        username:   credentials.usuario,
        contrasena: credentials.contrasena,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error al iniciar sesión.')
    localStorage.setItem('giaval_token', data.token)
    setUser(data.usuario)
    return data.usuario
  }

  // ── REGISTER ───────────────────────────────────────────────────
  const register = async (data) => {
    const res  = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        nombres:    data.nombres,
        apellidos:  data.apellidos,
        correo:     data.correo || '',
        contrasena: data.contrasena,
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message || 'Error al registrar usuario.')
    localStorage.setItem('giaval_token', json.token)
    setUser(json.usuario)
    return json.usuario
  }

  // ── LOGOUT ─────────────────────────────────────────────────────
  const logout = () => {
    setUser(null)
    localStorage.removeItem('giaval_token')
    localStorage.removeItem('giaval_user')
  }

  // ── Helper para peticiones autenticadas ───────────────────────
  const authFetch = (url, options = {}) => {
    const token = localStorage.getItem('giaval_token')
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
