// frontend/src/pages/CrearAvaluo/index.jsx
// SIMPLIFICADO:
//   - Eliminado: opción "Inteligente (IA)"
//   - Eliminado: paso de subir documentos (ya existe dentro del formulario)
//   - Flujo directo: elegir tipo → abrir formulario
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, PenLine, FileText, ChevronRight } from 'lucide-react'
import Navbar  from '../../components/Navbar'
import styles  from './CrearAvaluo.module.css'

// ── PASO ÚNICO: Elegir tipo de avalúo ──────────────────────────
const TIPOS = [
  {
    key:   'comercial',
    label: 'Avalúo Comercial',
    desc:  'Valor de mercado por comparables, enfoque físico y de rentas. El más solicitado para compraventa, hipotecas y créditos.',
    color: '#1e3a5f',
    emoji: '🏠',
  },
  {
    key:   'referido',
    label: 'Avalúo Referido',
    desc:  'Retrotrae el valor actual de un inmueble a una fecha pasada mediante el factor INPC. Usado en gestiones notariales y fiscales.',
    color: '#7c3aed',
    emoji: '📅',
  },
]

function PasoTipo() {
  const navigate = useNavigate()

  const elegir = (key) => {
    if (key === 'comercial') navigate('/valuacion/comercial/nuevo')
    else                     navigate('/valuacion/referido/nuevo')
  }

  return (
    <div className={styles.pasoWrap}>
      <div className={styles.pasoHeader}>
        <h2 className={styles.pasoTitle}>¿Qué tipo de avalúo vas a realizar?</h2>
        <p className={styles.pasoSub}>Selecciona el tipo que corresponde al encargo</p>
      </div>

      <div className={styles.tipoGrid}>
        {TIPOS.map(t => (
          <button key={t.key} className={styles.tipoCard} onClick={() => elegir(t.key)}>
            <div style={{fontSize:'2rem',marginBottom:'.5rem'}}>{t.emoji}</div>
            <h3 className={styles.tipoLabel}>{t.label}</h3>
            <p className={styles.tipoDesc}>{t.desc}</p>
            <span className={styles.tipoCta} style={{color:t.color}}>
              Crear <ChevronRight size={13}/>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Contenedor principal (sin barra de progreso — un solo paso) ──
export default function CrearAvaluo() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        {/* Botón regresar al dashboard */}
        <div style={{padding:'1rem 1.5rem 0'}}>
          <button className={styles.backLink} onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={14}/> Dashboard
          </button>
        </div>

        {/* Solo una ruta: la elección del tipo */}
        <Routes>
          <Route index    element={<PasoTipo />} />
          <Route path="*" element={<PasoTipo />} />
        </Routes>
      </main>
    </div>
  )
}