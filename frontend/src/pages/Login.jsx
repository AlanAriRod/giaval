import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, LogIn, Building2, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import styles from './AuthForm.module.css'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm]       = useState({ usuario: '', contrasena: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.usuario || !form.contrasena) {
      setError('Por favor completa todos los campos.')
      return
    }
    setLoading(true)
    try {
      await login({ usuario: form.usuario, contrasena: form.contrasena })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgPattern} />

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.cardLogo}>
          <div className={styles.logoBox}>
            <Building2 size={22} strokeWidth={1.5} />
          </div>
          <span className={styles.logoText}>GIAVAL</span>
          <span className={styles.logoSub}>SISTEMA DE AVALÚOS</span>
        </div>

        <h1 className={styles.title}>Inicio de Sesión</h1>
        <p className={styles.subtitle}>Ingresa tus credenciales para continuar</p>

        {error && (
          <div className={styles.errorBanner}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label className={styles.label}>Usuario</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                type="text"
                name="usuario"
                value={form.usuario}
                onChange={handleChange}
                placeholder="Ingresa tu usuario"
                className={styles.input}
                autoComplete="username"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Contraseña</label>
            <div className={styles.inputWrapper}>
              <input
                type={showPass ? 'text' : 'password'}
                name="contrasena"
                value={form.contrasena}
                onChange={handleChange}
                placeholder="Ingresa tu contraseña"
                className={`${styles.input} ${styles.inputPadRight}`}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass(s => !s)}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <LogIn size={17} />
                Iniciar Sesión
              </>
            )}
          </button>
        </form>

        <p className={styles.switchText}>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className={styles.switchLink}>
            Regístrate aquí
          </Link>
        </p>

        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={14} />
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
