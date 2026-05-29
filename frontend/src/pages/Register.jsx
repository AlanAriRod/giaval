import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, Building2, ArrowLeft, Clock } from 'lucide-react'
import { generateUsername } from '../context/AuthContext'
import styles from './AuthForm.module.css'

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm]         = useState({ nombres:'', apellidos:'', correo:'', contrasena:'', confirmar:'' })
  const [username, setUsername] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [errors,   setErrors]   = useState({})
  const [loading,  setLoading]  = useState(false)
  const [pendiente, setPendiente] = useState(null) // { username }

  const handleChange = e => {
    const { name, value } = e.target
    const next = { ...form, [name]: value }
    setForm(next)
    setErrors(er => ({ ...er, [name]: '' }))
    if (name === 'nombres' || name === 'apellidos') {
      const n = name === 'nombres'   ? value : form.nombres
      const a = name === 'apellidos' ? value : form.apellidos
      if (n.trim() && a.trim()) setUsername(generateUsername(`${n.trim()} ${a.trim()}`))
      else setUsername('')
    }
  }

  const validate = () => {
    const e = {}
    if (!form.nombres.trim())   e.nombres   = 'El nombre es requerido.'
    if (!form.apellidos.trim()) e.apellidos = 'El apellido es requerido.'
    if (!form.correo.trim() || !form.correo.includes('@'))
      e.correo = 'Escribe un correo válido.'
    if (form.contrasena.length < 8) e.contrasena = 'Mínimo 8 caracteres.'
    if (form.contrasena !== form.confirmar) e.confirmar = 'Las contraseñas no coinciden.'
    return e
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const r    = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          nombres:    form.nombres,
          apellidos:  form.apellidos,
          correo:     form.correo,
          contrasena: form.contrasena,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.message || 'Error al registrar.')

      if (data.message === 'pending_activation') {
        // Cuenta creada pero inactiva — mostrar pantalla de espera
        setPendiente({ username: data.username })
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setErrors({ general: err.message })
    } finally {
      setLoading(false)
    }
  }

  const passStrength = form.contrasena.length === 0 ? 0
    : form.contrasena.length < 8  ? 1
    : form.contrasena.length < 11 ? 2 : 3

  // ── Pantalla de activación pendiente ────────────────────────────
  if (pendiente) return (
    <div className={styles.page}>
      <div className={styles.bgPattern} />
      <div className={styles.card}>
        <div className={styles.cardLogo}>
          <div className={styles.logoBox}><Building2 size={22} strokeWidth={1.5}/></div>
          <span className={styles.logoText}>GIAVAL</span>
          <span className={styles.logoSub}>SISTEMA DE AVALÚOS</span>
        </div>

        <div style={{ textAlign:'center', padding:'1rem 0' }}>
          <div style={{
            width:'64px', height:'64px', borderRadius:'50%',
            background:'#fef3c7', display:'flex', alignItems:'center',
            justifyContent:'center', margin:'0 auto 1.25rem',
          }}>
            <Clock size={28} color="#c9972a" strokeWidth={1.5}/>
          </div>
          <h2 style={{ fontSize:'1.2rem', fontWeight:800, color:'#0f172a', marginBottom:'.75rem' }}>
            Cuenta creada — pendiente de activación
          </h2>
          <p style={{ fontSize:'.9rem', color:'#475569', lineHeight:1.6, marginBottom:'1rem' }}>
            Tu nombre de usuario es <strong style={{ color:'#1e3a5f' }}>@{pendiente.username}</strong>.
          </p>
          <p style={{
            fontSize:'.88rem', color:'#475569', lineHeight:1.65,
            background:'#f8fafc', borderRadius:'8px', padding:'1rem',
            border:'1px solid #e2e8f0', textAlign:'left',
          }}>
            Tu cuenta aún <strong>no está activa</strong>. Un administrador debe habilitarla
            antes de que puedas iniciar sesión. Comunícate con el administrador del sistema
            para solicitar la activación.
          </p>
        </div>

        <Link to="/login" className={styles.submitBtn}
          style={{ display:'flex', alignItems:'center', justifyContent:'center',
                   gap:'.5rem', textDecoration:'none', marginTop:'1rem' }}>
          Ir al inicio de sesión
        </Link>
      </div>
    </div>
  )

  // ── Formulario de registro ───────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.bgPattern} />
      <div className={styles.card}>
        <div className={styles.cardLogo}>
          <div className={styles.logoBox}><Building2 size={22} strokeWidth={1.5}/></div>
          <span className={styles.logoText}>GIAVAL</span>
          <span className={styles.logoSub}>SISTEMA DE AVALÚOS</span>
        </div>

        <h1 className={styles.title}>Registro de Usuario</h1>
        <p className={styles.subtitle}>
          Crea tu cuenta. Tu nombre de usuario se genera automáticamente.
        </p>

        {errors.general && <div className={styles.errorBanner}>{errors.general}</div>}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.rowTwo}>
            <div className={styles.field}>
              <label className={styles.label}>Nombre(s)</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><UserIcon /></span>
                <input type="text" name="nombres" value={form.nombres}
                  onChange={handleChange} placeholder="Andrea"
                  className={`${styles.input} ${errors.nombres ? styles.inputErr : ''}`}
                  autoComplete="given-name"/>
              </div>
              {errors.nombres && <span className={styles.fieldErr}>{errors.nombres}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Apellido(s)</label>
              <div className={styles.inputWrapper}>
                <input type="text" name="apellidos" value={form.apellidos}
                  onChange={handleChange} placeholder="Ríos"
                  className={`${styles.input} ${styles.inputNoIcon} ${errors.apellidos ? styles.inputErr : ''}`}
                  autoComplete="family-name"/>
              </div>
              {errors.apellidos && <span className={styles.fieldErr}>{errors.apellidos}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label className={`${styles.label} ${styles.labelUsername}`}>
              <span className={styles.atSign}>@</span> Nombre de Usuario
            </label>
            <div className={styles.inputWrapper}>
              <input type="text" readOnly value={username}
                placeholder="Se generará al escribir nombre y apellido"
                className={`${styles.input} ${styles.inputReadonly} ${styles.inputNoIcon}`}
                tabIndex={-1}/>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Correo electrónico</label>
            <div className={styles.inputWrapper}>
              <input type="email" name="correo" value={form.correo}
                onChange={handleChange} placeholder="correo@ejemplo.com"
                className={`${styles.input} ${styles.inputNoIcon} ${errors.correo ? styles.inputErr : ''}`}
                autoComplete="email"/>
            </div>
            {errors.correo && <span className={styles.fieldErr}>{errors.correo}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Contraseña</label>
            <div className={styles.inputWrapper}>
              <input type={showPass ? 'text' : 'password'} name="contrasena"
                value={form.contrasena} onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                className={`${styles.input} ${styles.inputNoIcon} ${styles.inputPadRight} ${errors.contrasena ? styles.inputErr : ''}`}
                autoComplete="new-password"/>
              <button type="button" className={styles.eyeBtn}
                onClick={() => setShowPass(s => !s)} tabIndex={-1}>
                {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {form.contrasena && (
              <div className={styles.strengthRow}>
                {[1,2,3].map(n => (
                  <div key={n} className={styles.strengthSegment} style={{
                    background: passStrength >= n
                      ? (passStrength===1 ? '#ef4444' : passStrength===2 ? '#f59e0b' : '#22c55e')
                      : 'var(--slate-200)'
                  }}/>
                ))}
                <span className={styles.strengthLabel}>
                  {passStrength===1 ? 'Débil' : passStrength===2 ? 'Regular' : 'Segura'}
                </span>
              </div>
            )}
            {errors.contrasena && <span className={styles.fieldErr}>{errors.contrasena}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Confirmar Contraseña</label>
            <div className={styles.inputWrapper}>
              <input type={showConf ? 'text' : 'password'} name="confirmar"
                value={form.confirmar} onChange={handleChange}
                placeholder="Repite la contraseña"
                className={`${styles.input} ${styles.inputNoIcon} ${styles.inputPadRight} ${errors.confirmar ? styles.inputErr : ''}`}
                autoComplete="new-password"/>
              <button type="button" className={styles.eyeBtn}
                onClick={() => setShowConf(s => !s)} tabIndex={-1}>
                {showConf ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {errors.confirmar && <span className={styles.fieldErr}>{errors.confirmar}</span>}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner}/> : <><UserPlus size={17}/> Crear Cuenta</>}
          </button>
        </form>

        <p className={styles.switchText}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className={styles.switchLink}>Inicia sesión aquí</Link>
        </p>
        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={14}/> Volver al inicio
        </Link>
      </div>
    </div>
  )
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}