import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Building2, MapPin, User, FileText } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { createAvaluo, TIPOS_AVALUO, TIPOS_INMUEBLE } from '../data/mockData'
import styles from './NuevaValuacion.module.css'

const METODOLOGIAS = [
  { value: 'mercado',   label: 'Enfoque de Mercado' },
  { value: 'fisico',    label: 'Enfoque Físico (Costos)' },
  { value: 'renta',     label: 'Enfoque de Renta' },
  { value: 'combinado', label: 'Combinado' },
]

export default function NuevaValuacion() {
  const navigate   = useNavigate()
  const { user }   = useAuth()

  const [form, setForm] = useState({
    tipoAvaluo:    'comercial',
    tipoInmueble:  'Casa',
    metodologia:   'mercado',
    cliente:       '',
    calle:         '',
    numeroExterior:'',
    colonia:       '',
    codigoPostal:  '',
    municipio:     'Orizaba',
    estado:        'Veracruz',
    claveCatastral:'',
    proposito:     '',
  })

  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)

  const handleChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (errors[name]) setErrors(er => ({ ...er, [name]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.cliente.trim())       e.cliente       = 'El nombre del cliente es requerido.'
    if (!form.calle.trim())         e.calle         = 'La calle es requerida.'
    if (!form.colonia.trim())       e.colonia        = 'La colonia es requerida.'
    if (!form.codigoPostal.match(/^\d{5}$/)) e.codigoPostal = 'Código postal inválido (5 dígitos).'
    if (!form.municipio.trim())     e.municipio     = 'El municipio es requerido.'
    return e
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    await new Promise(r => setTimeout(r, 800))

    const ubicacion = `${form.calle} ${form.numeroExterior}, ${form.colonia}, ${form.municipio}, ${form.estado}`
    const nuevo = createAvaluo({
      ...form,
      ubicacion,
      valuador: user?.username || 'Sistema',
      valorTerreno:      0,
      valorConstruccion: 0,
      superficieTerreno: 0,
      superficieConstruccion: 0,
    })

    setLoading(false)
    setSuccess(true)
    setTimeout(() => navigate(`/valuacion/${nuevo.id}`), 1200)
  }

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} /> Volver
          </button>
          <div>
            <h1 className={styles.pageTitle}>Registrar Valuación</h1>
            <p className={styles.pageSubtitle}>Nuevo expediente de avalúo inmobiliario</p>
          </div>
        </div>

        {success && (
          <div className={styles.successBanner}>
            ✅ Valuación registrada correctamente. Redirigiendo al expediente...
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGrid}>

            {/* ── Tipo y Metodología ── */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <FileText size={16} /> Tipo de Avalúo
              </div>
              <div className={styles.row2}>
                <Field label="Tipo de Avalúo" error={errors.tipoAvaluo}>
                  <select name="tipoAvaluo" value={form.tipoAvaluo} onChange={handleChange} className={styles.select}>
                    {Object.entries(TIPOS_AVALUO).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Metodología" error={errors.metodologia}>
                  <select name="metodologia" value={form.metodologia} onChange={handleChange} className={styles.select}>
                    {METODOLOGIAS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className={styles.row2}>
                <Field label="Tipo de Inmueble">
                  <select name="tipoInmueble" value={form.tipoInmueble} onChange={handleChange} className={styles.select}>
                    {TIPOS_INMUEBLE.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Propósito">
                  <input
                    type="text"
                    name="proposito"
                    value={form.proposito}
                    onChange={handleChange}
                    placeholder="Compraventa, escrituración..."
                    className={styles.input}
                  />
                </Field>
              </div>
            </div>

            {/* ── Cliente ── */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <User size={16} /> Datos del Cliente
              </div>
              <Field label="Nombre completo del cliente" error={errors.cliente} required>
                <input
                  type="text"
                  name="cliente"
                  value={form.cliente}
                  onChange={handleChange}
                  placeholder="Nombre completo o razón social"
                  className={`${styles.input} ${errors.cliente ? styles.inputError : ''}`}
                />
              </Field>
            </div>

            {/* ── Ubicación ── */}
            <div className={`${styles.card} ${styles.cardFull}`}>
              <div className={styles.cardTitle}>
                <MapPin size={16} /> Ubicación del Inmueble
              </div>
              <div className={styles.row3}>
                <Field label="Calle" error={errors.calle} required>
                  <input type="text" name="calle" value={form.calle}
                    onChange={handleChange} placeholder="Nombre de la calle"
                    className={`${styles.input} ${errors.calle ? styles.inputError : ''}`} />
                </Field>
                <Field label="Número exterior">
                  <input type="text" name="numeroExterior" value={form.numeroExterior}
                    onChange={handleChange} placeholder="No. exterior"
                    className={styles.input} />
                </Field>
                <Field label="Colonia" error={errors.colonia} required>
                  <input type="text" name="colonia" value={form.colonia}
                    onChange={handleChange} placeholder="Colonia"
                    className={`${styles.input} ${errors.colonia ? styles.inputError : ''}`} />
                </Field>
              </div>
              <div className={styles.row3}>
                <Field label="Código Postal" error={errors.codigoPostal} required>
                  <input type="text" name="codigoPostal" value={form.codigoPostal}
                    onChange={handleChange} placeholder="00000" maxLength={5}
                    className={`${styles.input} ${errors.codigoPostal ? styles.inputError : ''}`} />
                </Field>
                <Field label="Municipio" error={errors.municipio} required>
                  <input type="text" name="municipio" value={form.municipio}
                    onChange={handleChange} placeholder="Municipio"
                    className={`${styles.input} ${errors.municipio ? styles.inputError : ''}`} />
                </Field>
                <Field label="Estado">
                  <input type="text" name="estado" value={form.estado}
                    onChange={handleChange} placeholder="Estado"
                    className={styles.input} />
                </Field>
              </div>
              <div className={styles.row2}>
                <Field label="Clave Catastral">
                  <input type="text" name="claveCatastral" value={form.claveCatastral}
                    onChange={handleChange} placeholder="Clave catastral (opcional)"
                    className={styles.input} />
                </Field>
              </div>
            </div>

          </div>

          {/* ── Submit ── */}
          <div className={styles.submitRow}>
            <button type="button" className={styles.cancelBtn}
              onClick={() => navigate('/dashboard')}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading || success}>
              {loading
                ? <span className={styles.spinner} />
                : <><Save size={16} /> Registrar Valuación</>
              }
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

/* ─── Field wrapper ─── */
function Field({ label, error, required, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.req}>*</span>}
      </label>
      {children}
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  )
}
