import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Eye, EyeOff, CheckCircle2, User, Mail, Lock } from 'lucide-react'
import Navbar    from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

export default function Perfil() {
  const navigate            = useNavigate()
  const { user, authFetch, setUser } = useAuth()

  const [form, setForm] = useState({
    nombreCompleto:  user?.nombreCompleto || '',
    correo:          user?.correo         || '',
    contrasenaActual:'',
    contrasenaNueva: '',
    confirmar:       '',
  })
  const [showActual, setShowActual] = useState(false)
  const [showNueva,  setShowNueva]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [errors,     setErrors]     = useState({})

  const handle = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(er => ({ ...er, [e.target.name]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.nombreCompleto.trim()) e.nombreCompleto = 'El nombre no puede estar vacío.'
    if (form.correo && !form.correo.includes('@')) e.correo = 'Correo inválido.'
    if (form.contrasenaNueva) {
      if (!form.contrasenaActual) e.contrasenaActual = 'Ingresa tu contraseña actual.'
      if (form.contrasenaNueva.length < 8) e.contrasenaNueva = 'Mínimo 8 caracteres.'
      if (form.contrasenaNueva !== form.confirmar) e.confirmar = 'Las contraseñas no coinciden.'
    }
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      const payload = {
        nombreCompleto:  form.nombreCompleto,
        correo:          form.correo,
      }
      if (form.contrasenaNueva) {
        payload.contrasenaActual = form.contrasenaActual
        payload.contrasenaNueva  = form.contrasenaNueva
      }

      const r    = await authFetch('/api/auth/perfil', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await r.json()
      if (!r.ok) {
        setErrors({ general: data.message })
        return
      }

      // Actualizar usuario en contexto
      if (data.usuario) {
        localStorage.setItem('giaval_user', JSON.stringify(data.usuario))
        // AuthContext no tiene setUser expuesto aún — se recarga en el siguiente login
        // pero la sesión actual sigue funcionando
      }

      setSaved(true)
      setForm(f => ({ ...f, contrasenaActual:'', contrasenaNueva:'', confirmar:'' }))
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setErrors({ general: 'Error de conexión. Intenta de nuevo.' })
    } finally {
      setSaving(false)
    }
  }

  const campo = (label, name, type = 'text', placeholder = '') => (
    <div style={{ display:'flex', flexDirection:'column', gap:'.32rem', marginBottom:'1rem' }}>
      <label style={{ fontSize:'.73rem', fontWeight:700, color:'var(--text-secondary)',
                      letterSpacing:'.04em', textTransform:'uppercase' }}>
        {label}
      </label>
      <input
        type={type} name={name}
        value={form[name]} onChange={handle}
        placeholder={placeholder}
        style={{
          padding:'.6rem .85rem', borderRadius:'7px',
          border:`1.5px solid ${errors[name] ? '#fecaca' : 'var(--border)'}`,
          background:'var(--bg-input)', color:'var(--text-primary)',
          fontSize:'.9rem', width:'100%',
          outline:'none', transition:'border-color .15s',
        }}
        onFocus={e => e.target.style.borderColor = '#1e3a5f'}
        onBlur={e => e.target.style.borderColor = errors[name] ? '#fecaca' : 'var(--border)'}
      />
      {errors[name] && (
        <span style={{ fontSize:'.76rem', color:'#dc2626' }}>{errors[name]}</span>
      )}
    </div>
  )

  const campoPass = (label, name, show, setShow) => (
    <div style={{ display:'flex', flexDirection:'column', gap:'.32rem', marginBottom:'1rem' }}>
      <label style={{ fontSize:'.73rem', fontWeight:700, color:'var(--text-secondary)',
                      letterSpacing:'.04em', textTransform:'uppercase' }}>
        {label}
      </label>
      <div style={{ position:'relative' }}>
        <input
          type={show ? 'text' : 'password'} name={name}
          value={form[name]} onChange={handle}
          style={{
            padding:'.6rem 2.5rem .6rem .85rem', borderRadius:'7px',
            border:`1.5px solid ${errors[name] ? '#fecaca' : 'var(--border)'}`,
            background:'var(--bg-input)', color:'var(--text-primary)',
            fontSize:'.9rem', width:'100%', outline:'none',
          }}
        />
        <button type="button"
          style={{ position:'absolute', right:'.75rem', top:'50%',
                   transform:'translateY(-50%)', color:'var(--text-muted)',
                   background:'none', border:'none', cursor:'pointer' }}
          onClick={() => setShow(s => !s)}>
          {show ? <EyeOff size={16}/> : <Eye size={16}/>}
        </button>
      </div>
      {errors[name] && (
        <span style={{ fontSize:'.76rem', color:'#dc2626' }}>{errors[name]}</span>
      )}
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-page)' }}>
      <Navbar/>
      <main style={{ maxWidth:'560px', margin:'0 auto', padding:'2.5rem 1.25rem 4rem' }}>

        <button
          onClick={() => navigate(-1)}
          style={{ display:'inline-flex', alignItems:'center', gap:'.4rem',
                   fontSize:'.84rem', color:'var(--text-secondary)',
                   padding:'.4rem .75rem', borderRadius:'7px',
                   border:'1px solid var(--border)', background:'var(--bg-card)',
                   marginBottom:'1.75rem', cursor:'pointer' }}>
          <ArrowLeft size={15}/> Regresar
        </button>

        <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'var(--text-primary)',
                     marginBottom:'.4rem' }}>
          Mi Perfil
        </h1>
        <p style={{ fontSize:'.88rem', color:'var(--text-secondary)', marginBottom:'2rem' }}>
          Usuario: <strong>@{user?.username}</strong> — {user?.rol}
        </p>

        {errors.general && (
          <div style={{ padding:'.85rem 1rem', background:'#fef2f2',
                        border:'1px solid #fecaca', borderRadius:'8px',
                        color:'#dc2626', fontSize:'.88rem', marginBottom:'1.5rem' }}>
            {errors.general}
          </div>
        )}

        {saved && (
          <div style={{ padding:'.85rem 1rem', background:'#f0fdf4',
                        border:'1px solid #bbf7d0', borderRadius:'8px',
                        color:'#16a34a', fontSize:'.88rem', marginBottom:'1.5rem',
                        display:'flex', alignItems:'center', gap:'.5rem' }}>
            <CheckCircle2 size={16}/> Perfil actualizado correctamente.
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Datos personales */}
          <div style={{ background:'var(--bg-card)', borderRadius:'12px',
                        border:'1px solid var(--border)', padding:'1.5rem',
                        marginBottom:'1.25rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'.5rem',
                          marginBottom:'1.25rem' }}>
              <User size={16} color="var(--text-muted)"/>
              <span style={{ fontSize:'.8rem', fontWeight:700, color:'var(--text-secondary)',
                             textTransform:'uppercase', letterSpacing:'.05em' }}>
                Datos Personales
              </span>
            </div>
            {campo('Nombre Completo', 'nombreCompleto', 'text', 'Tu nombre completo')}
            <div style={{ display:'flex', flexDirection:'column', gap:'.32rem' }}>
              <label style={{ fontSize:'.73rem', fontWeight:700, color:'var(--text-secondary)',
                              letterSpacing:'.04em', textTransform:'uppercase' }}>
                Nombre de Usuario
              </label>
              <input value={`@${user?.username}`} readOnly
                style={{ padding:'.6rem .85rem', borderRadius:'7px',
                         border:'1.5px dashed var(--border)',
                         background:'var(--bg-input)', color:'var(--text-muted)',
                         fontSize:'.9rem', cursor:'default' }}/>
              <span style={{ fontSize:'.73rem', color:'var(--text-muted)' }}>
                El nombre de usuario no se puede cambiar.
              </span>
            </div>
          </div>

          {/* Correo */}
          <div style={{ background:'var(--bg-card)', borderRadius:'12px',
                        border:'1px solid var(--border)', padding:'1.5rem',
                        marginBottom:'1.25rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'.5rem',
                          marginBottom:'1.25rem' }}>
              <Mail size={16} color="var(--text-muted)"/>
              <span style={{ fontSize:'.8rem', fontWeight:700, color:'var(--text-secondary)',
                             textTransform:'uppercase', letterSpacing:'.05em' }}>
                Correo Electrónico
              </span>
            </div>
            {campo('Correo', 'correo', 'email', 'tu@correo.com')}
          </div>

          {/* Contraseña */}
          <div style={{ background:'var(--bg-card)', borderRadius:'12px',
                        border:'1px solid var(--border)', padding:'1.5rem',
                        marginBottom:'2rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'.5rem',
                          marginBottom:'.5rem' }}>
              <Lock size={16} color="var(--text-muted)"/>
              <span style={{ fontSize:'.8rem', fontWeight:700, color:'var(--text-secondary)',
                             textTransform:'uppercase', letterSpacing:'.05em' }}>
                Cambiar Contraseña
              </span>
            </div>
            <p style={{ fontSize:'.8rem', color:'var(--text-muted)', marginBottom:'1.25rem' }}>
              Déjalo vacío si no quieres cambiar tu contraseña.
            </p>
            {campoPass('Contraseña Actual', 'contrasenaActual', showActual, setShowActual)}
            {campoPass('Nueva Contraseña', 'contrasenaNueva', showNueva, setShowNueva)}
            {form.contrasenaNueva && (
              <div style={{ display:'flex', flexDirection:'column', gap:'.32rem' }}>
                <label style={{ fontSize:'.73rem', fontWeight:700, color:'var(--text-secondary)',
                                letterSpacing:'.04em', textTransform:'uppercase' }}>
                  Confirmar Nueva Contraseña
                </label>
                <input type="password" name="confirmar"
                  value={form.confirmar} onChange={handle}
                  style={{ padding:'.6rem .85rem', borderRadius:'7px',
                           border:`1.5px solid ${errors.confirmar ? '#fecaca' : 'var(--border)'}`,
                           background:'var(--bg-input)', color:'var(--text-primary)',
                           fontSize:'.9rem', outline:'none' }}/>
                {errors.confirmar && (
                  <span style={{ fontSize:'.76rem', color:'#dc2626' }}>{errors.confirmar}</span>
                )}
              </div>
            )}
          </div>

          <button type="submit" disabled={saving}
            style={{ width:'100%', padding:'.75rem', borderRadius:'9px',
                     background: saving ? '#cbd5e1' : '#c9972a',
                     color: '#0f172a', fontWeight:700, fontSize:'.95rem',
                     display:'flex', alignItems:'center', justifyContent:'center',
                     gap:'.5rem', transition:'all .2s', cursor: saving ? 'wait' : 'pointer' }}>
            <Save size={17}/>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </main>
    </div>
  )
}
