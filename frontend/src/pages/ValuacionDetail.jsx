// ValuacionDetail.jsx
// Página de detalle del avalúo — muestra datos clave y botón flotante "Abrir Formulario"
// El botón flotante se coloca en la esquina inferior derecha, siempre visible,
// y se acompaña de los botones de scroll ↑↓.
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import FloatingNav from '../components/FloatingNav'
import { FileText, ArrowLeft, Edit3, Calendar, MapPin, User } from 'lucide-react'

const fmtMXN = (v) => v!=null&&!isNaN(v)&&parseFloat(v)>0
  ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(parseFloat(v)) : '—'

const ESTADO_COLORS = {
  borrador:   '#94a3b8',
  en_proceso: '#f59e0b',
  preliminar: '#3b82f6',
  final:      '#16a34a',
}
const ESTADOS_LISTA = [
  { v:'borrador',   label:'Borrador',    color:'#94a3b8' },
  { v:'en_proceso', label:'En proceso',  color:'#f59e0b' },
  { v:'preliminar', label:'Preliminar',  color:'#3b82f6' },
  { v:'final',      label:'Final',       color:'#16a34a' },
]

export default function ValuacionDetail() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { authFetch } = useAuth()
  const [avaluo, setAvaluo]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error,   setError]         = useState(null)
  const [estadoEdit, setEstadoEdit] = useState(null) // null = no editing
  const [saving,  setSaving]        = useState(false)
  const [saved,   setSaved]         = useState(false)

  useEffect(() => {
    if (!id) return
    authFetch(`/api/avaluos/${id}`)
      .then(r => r.json())
      .then(data => { setAvaluo(data); setLoading(false) })
      .catch(() => { setError('No se pudo cargar el avalúo'); setLoading(false) })
  }, [id, authFetch])

  const abrirFormulario = () => {
    const tipo = avaluo?.tipo_avaluo || avaluo?.datos_formulario?.tipoAvaluo || ''
    if (tipo === 'referido' || tipo.toLowerCase().includes('referido')) {
      navigate(`/valuacion/referido/${id}`)
    } else {
      navigate(`/valuacion/comercial/${id}`)
    }
  }

  const cambiarEstado = async (nuevoEstado) => {
    setSaving(true)
    try {
      const token = localStorage.getItem('giaval_token') ||
                    localStorage.getItem('token') || ''
      const r = await fetch(`/api/avaluos/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json',
                   'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ estado: nuevoEstado })
      })
      if (r.ok) {
        setAvaluo(prev => ({ ...prev, estado: nuevoEstado }))
        setEstadoEdit(null)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch(e) {
      console.error('[estado] Error:', e)
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{color:'var(--text-muted)'}}>Cargando avalúo…</p>
    </div>
  )
  if (error || !avaluo) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'1rem'}}>
      <p style={{color:'#dc2626'}}>{error||'Avalúo no encontrado'}</p>
      <button onClick={()=>navigate('/dashboard')}
        style={{padding:'.5rem 1rem',borderRadius:'7px',background:'var(--bg-card)',
          border:'1px solid var(--border)',cursor:'pointer',color:'var(--text-primary)'}}>
        Volver al Dashboard
      </button>
    </div>
  )

  const d = avaluo.datos_formulario || {}
  const estado = avaluo.estado || 'borrador'
  const colorEstado = ESTADO_COLORS[estado] || '#94a3b8'

  const Fila = ({icon:Icon, label, value}) => value ? (
    <div style={{display:'flex',gap:'.75rem',alignItems:'flex-start',padding:'.6rem 0',
      borderBottom:'1px solid var(--border)'}}>
      <Icon size={15} style={{color:'var(--text-muted)',flexShrink:0,marginTop:'.15rem'}}/>
      <div>
        <p style={{fontSize:'.72rem',color:'var(--text-muted)',textTransform:'uppercase',
          letterSpacing:'.05em',marginBottom:'.1rem'}}>{label}</p>
        <p style={{fontSize:'.88rem',color:'var(--text-primary)',fontWeight:500}}>{value}</p>
      </div>
    </div>
  ) : null

  return (
    <div style={{minHeight:'100vh',background:'var(--bg-page)',paddingBottom:'5rem'}}>
      <Navbar/>
      <main style={{maxWidth:'900px',margin:'0 auto',padding:'1.5rem 1rem'}}>

        {/* Barra superior */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
          marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem'}}>
          <button onClick={()=>navigate('/dashboard')}
            style={{display:'inline-flex',alignItems:'center',gap:'.4rem',padding:'.4rem .85rem',
              borderRadius:'7px',background:'var(--bg-card)',border:'1px solid var(--border)',
              color:'var(--text-secondary)',cursor:'pointer',fontSize:'.84rem',fontWeight:600}}>
            <ArrowLeft size={14}/> Dashboard
          </button>
          <button onClick={abrirFormulario}
            style={{display:'inline-flex',alignItems:'center',gap:'.5rem',padding:'.55rem 1.1rem',
              borderRadius:'8px',background:'#1e3a5f',border:'none',
              color:'#fff',cursor:'pointer',fontSize:'.88rem',fontWeight:700,
              boxShadow:'0 2px 8px rgba(0,0,0,.15)'}}>
            <Edit3 size={15}/> Abrir Formulario
          </button>
        </div>

        {/* Encabezado */}
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'12px',
          padding:'1.5rem',marginBottom:'1.5rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'1rem'}}>
            <div>
              <p style={{fontSize:'.72rem',color:'var(--text-muted)',fontWeight:700,
                textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.3rem'}}>
                {avaluo.folio_interno||'Sin folio asignado'}
              </p>
              <h1 style={{fontSize:'1.35rem',fontWeight:800,color:'var(--text-primary)',lineHeight:1.2}}>
                {avaluo.titulo||`Avalúo #${avaluo.id}`}
              </h1>
            </div>
            <span style={{padding:'.35rem .9rem',borderRadius:'9999px',fontSize:'.76rem',fontWeight:700,
              color:colorEstado,background:colorEstado+'18',border:`1.5px solid ${colorEstado}44`,
              textTransform:'uppercase',letterSpacing:'.05em',flexShrink:0}}>
              {(estado).replace('_',' ')}
            </span>
          </div>
        </div>

        {/* Grid de información */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.25rem',marginBottom:'1.5rem'}}>

          {/* Datos del inmueble */}
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',
            borderRadius:'10px',padding:'1.25rem'}}>
            <p style={{fontSize:'.78rem',fontWeight:700,color:'var(--text-muted)',
              textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.75rem'}}>
              Datos del Inmueble
            </p>
            <Fila icon={MapPin} label="Dirección"
              value={[avaluo.calle,avaluo.numero,avaluo.colonia,avaluo.municipio,avaluo.entidad_federativa]
                .filter(Boolean).join(', ')}/>
            <Fila icon={FileText} label="Tipo"        value={avaluo.bien_que_se_valua}/>
            <Fila icon={FileText} label="Uso de suelo" value={avaluo.uso_suelo}/>
            <Fila icon={FileText} label="Régimen"     value={avaluo.regimen_propiedad}/>
            {avaluo.area_terreno&&(
              <Fila icon={FileText} label="Área Terreno" value={`${avaluo.area_terreno} m²`}/>
            )}
            {avaluo.area_construccion&&(
              <Fila icon={FileText} label="Área Construcción" value={`${avaluo.area_construccion} m²`}/>
            )}
          </div>

          {/* Datos del solicitante */}
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',
            borderRadius:'10px',padding:'1.25rem'}}>
            <p style={{fontSize:'.78rem',fontWeight:700,color:'var(--text-muted)',
              textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.75rem'}}>
              Solicitante / Propietario
            </p>
            <Fila icon={User}     label="Solicitante"  value={avaluo.nombre_solicitante}/>
            <Fila icon={User}     label="Propietario"  value={avaluo.nombre_propietario}/>
            <Fila icon={Calendar} label="Fecha Avalúo" value={avaluo.fecha_avaluo}/>
            <Fila icon={FileText} label="Cuenta Predial" value={avaluo.cuenta_predial}/>
          </div>
        </div>

        {/* ── Valor Conclusivo destacado ── */}
        {(()=>{
          const enf  = d.enfoqueConclusivo || 'mercado'
          const vm   = parseFloat(d.valorMercado)||0
          const vf   = parseFloat(d.valorFisico)||0
          const vr   = parseFloat(d.valorRentas)||0
          const vc   = parseFloat(d.valorMercadoConclusion)||0
          const vRef = parseFloat(d.valorReferidoFinal)||0
          // valor_conclusivo: viene de la columna directa de la BD (el más confiable)
          const vBD  = parseFloat(avaluo.valor_conclusivo || avaluo.valor_conclusion)||0
          const calc = enf==='fisico'?vf : enf==='rentas'?vr
            : enf==='mayor'?Math.max(vm,vf,vr) : vm
          // Prioridad: BD directa > referido > conclusión manual > calculado
          const val  = vBD>0 ? vBD : vRef>0 ? vRef : vc>0 ? vc : calc>0 ? calc : 0
          return val>0 ? (
            <div style={{background:'#0f172a',borderRadius:'12px',padding:'1.5rem',
              marginBottom:'1.5rem',textAlign:'center'}}>
              <p style={{fontSize:'.68rem',color:'#94a3b8',fontWeight:700,
                textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'.5rem'}}>
                VALOR CONCLUSIVO DEL AVALÚO
                {enf && <span style={{color:'#475569',fontWeight:400,
                  marginLeft:'.5rem',textTransform:'capitalize'}}>
                  — Enfoque {enf==='mercado'?'Comercial':enf==='fisico'?'Físico':enf==='rentas'?'Rentas':'Mayor'}
                </span>}
              </p>
              <p style={{fontSize:'2.6rem',fontWeight:800,color:'#c9972a',
                fontVariantNumeric:'tabular-nums',lineHeight:1}}>
                {fmtMXN(val)}
              </p>
              {(vm>0||vf>0||vr>0) && (
                <div style={{display:'flex',gap:'1rem',justifyContent:'center',
                  marginTop:'1rem',flexWrap:'wrap'}}>
                  {vm>0&&<div style={{textAlign:'center'}}>
                    <p style={{fontSize:'.63rem',color:'#64748b',marginBottom:'.15rem'}}>Mercado</p>
                    <p style={{fontSize:'.88rem',fontWeight:700,color:'#c9972a',
                      fontVariantNumeric:'tabular-nums'}}>{fmtMXN(vm)}</p>
                  </div>}
                  {vf>0&&<div style={{textAlign:'center'}}>
                    <p style={{fontSize:'.63rem',color:'#64748b',marginBottom:'.15rem'}}>Físico</p>
                    <p style={{fontSize:'.88rem',fontWeight:700,color:'#2563eb',
                      fontVariantNumeric:'tabular-nums'}}>{fmtMXN(vf)}</p>
                  </div>}
                  {vr>0&&<div style={{textAlign:'center'}}>
                    <p style={{fontSize:'.63rem',color:'#64748b',marginBottom:'.15rem'}}>Rentas</p>
                    <p style={{fontSize:'.88rem',fontWeight:700,color:'#16a34a',
                      fontVariantNumeric:'tabular-nums'}}>{fmtMXN(vr)}</p>
                  </div>}
                </div>
              )}
            </div>
          ) : null
        })()}

        {/* ── Cambiar Estado del Avalúo ── */}
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',
          borderRadius:'12px',padding:'1.25rem',marginBottom:'1.5rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
            flexWrap:'wrap',gap:'.75rem'}}>
            <div>
              <p style={{fontSize:'.68rem',fontWeight:700,color:'var(--text-muted)',
                textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.3rem'}}>
                Estado del Expediente
              </p>
              <span style={{padding:'.3rem .8rem',borderRadius:'20px',fontSize:'.82rem',
                fontWeight:700,color:ESTADO_COLORS[estado]||'#94a3b8',
                background:(ESTADO_COLORS[estado]||'#94a3b8')+'18',
                border:`1.5px solid ${(ESTADO_COLORS[estado]||'#94a3b8')}44`}}>
                {estado.replace('_',' ').replace(/\w/g,l=>l.toUpperCase())}
              </span>
            </div>
            <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',alignItems:'center'}}>
              {saved && <span style={{fontSize:'.76rem',color:'#16a34a',fontWeight:700}}>✓ Estado actualizado</span>}
              {ESTADOS_LISTA.map(est=>(
                <button key={est.v}
                  onClick={()=>cambiarEstado(est.v)}
                  disabled={saving || estado===est.v}
                  style={{padding:'.3rem .75rem',borderRadius:'7px',cursor:'pointer',
                    border:`1.5px solid ${est.color}44`,
                    background: estado===est.v ? est.color+'22' : 'transparent',
                    color: estado===est.v ? est.color : 'var(--text-muted)',
                    fontSize:'.75rem',fontWeight:700,opacity:saving?.6:1,
                    transition:'all .15s'}}>
                  {est.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Campos adicionales desde datos_formulario */}
        {d.declaraciones&&(
          <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',
            borderRadius:'10px',padding:'1.25rem',marginBottom:'1.25rem'}}>
            <p style={{fontSize:'.78rem',fontWeight:700,color:'var(--text-muted)',
              textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.5rem'}}>
              Declaración del Valuador
            </p>
            <p style={{fontSize:'.88rem',color:'var(--text-secondary)',lineHeight:1.6}}>
              {d.declaraciones}
            </p>
            {d.valorConclusivoLetras&&(
              <div style={{marginTop:'1rem',padding:'.75rem 1rem',background:'var(--bg-input)',
                borderRadius:'7px',fontSize:'.88rem',fontWeight:600,color:'var(--text-primary)',
                textTransform:'uppercase',letterSpacing:'.02em'}}>
                {d.valorConclusivoLetras}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ── BOTÓN FLOTANTE "ABRIR FORMULARIO" + scroll ↑↓ ── */}
      <FloatingNav
        extraButton={
          <button onClick={abrirFormulario}
            style={{
              display:'inline-flex',alignItems:'center',gap:'.5rem',
              padding:'.6rem 1rem',borderRadius:'9999px',cursor:'pointer',
              background:'#1e3a5f',border:'none',color:'#fff',
              fontSize:'.82rem',fontWeight:700,whiteSpace:'nowrap',
              boxShadow:'0 4px 12px rgba(30,58,95,.35)',transition:'all .15s',
            }}
            onMouseEnter={e=>e.currentTarget.style.background='#2a4e7a'}
            onMouseLeave={e=>e.currentTarget.style.background='#1e3a5f'}
            title="Abrir el formulario de captura">
            <Edit3 size={14}/> Abrir Formulario
          </button>
        }
      />
    </div>
  )
}