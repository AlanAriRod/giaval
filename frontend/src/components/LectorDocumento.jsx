// frontend/src/components/LectorDocumento.jsx — v3
// CAMBIOS v3:
//  - Checkbox para seleccionar/deseleccionar cada campo antes de aplicar
//  - Arrays (medidas) se muestran correctamente como texto legible
//  - Botón "Seleccionar todo / Ninguno"

import { useState, useRef } from 'react'
import { Upload, X, FileText, Loader, CheckCircle2 } from 'lucide-react'

const TIPOS_DOCUMENTO = [
  { key:'escritura',      label:'Escritura Pública'       },
  { key:'predial',        label:'Boleta / Recibo Predial' },
  { key:'identificacion', label:'Identificación Oficial'  },
  { key:'plano',          label:'Plano / Croquis'         },
  { key:'catastral',      label:'Cédula Catastral'        },
  { key:'levantamiento',  label:'Levantamiento Físico'    },
  { key:'titulo',         label:'Título de Propiedad'     },
  { key:'avaluo_giaval',  label:'Avalúo GIAVAL (propio)'  },
  { key:'otro',           label:'Otro documento'          },
]

const CAMPO_LABELS = {
  nombrePropietario:'Propietario', nombrePoseedor:'Poseedor',
  nombreSolicitante:'Solicitante', folioInterno:'Folio',
  fechaAvaluo:'Fecha avalúo', fechaEscritura:'Fecha escritura',
  fechaAvaluoReferido:'Fecha referida',
  calle:'Calle', numeroExterior:'Núm. Exterior', colonia:'Colonia',
  municipio:'Municipio', codigoPostal:'C.P.', entidadFederativa:'Estado',
  areaTerreno:'Área terreno (m²)', areaConstruccion:'Área construcción (m²)',
  areaConstruccionHabitable:'Área habitable (m²)',
  latitud:'Latitud', longitud:'Longitud', altitud:'Altitud',
  regimenPropiedad:'Régimen', numeroEscritura:'Núm. escritura',
  notarioNombre:'Notario', notarioCiudad:'Ciudad notaría', numeroNotario:'Núm. notaría',
  cuentaPredial:'Cuenta predial', indiviso:'Indiviso (%)',
  topografia:'Topografía', numNiveles:'Niveles', numRecamaras:'Recámaras',
  numBanosCompletos:'Baños completos', estacionamientos:'Estacionamientos',
  tiposConstruccion:'Tipo construcción',
  descripcionInmueble:'Descripción del inmueble',
  descripcionPlano:'Descripción del inmueble',
  medidas:'Colindancias / Medidas',
  manzana:'Manzana', lote:'Lote',
}

function formatearValor(key, value) {
  if (Array.isArray(value)) {
    if (key === 'medidas') {
      return value.map(m =>
        `${m.orientacion||'?'}: ${m.distancia||'?'} m — ${m.colindante||''}`
      ).join(' | ')
    }
    return `${value.length} elemento(s)`
  }
  if (typeof value === 'object' && value !== null) return JSON.stringify(value)
  return String(value)
}

export default function LectorDocumento({ onAplicar, onCerrar }) {
  const [tipoDoc,   setTipoDoc]   = useState('escritura')
  const [archivo,   setArchivo]   = useState(null)
  const [cargando,  setCargando]  = useState(false)
  const [campos,    setCampos]    = useState(null)      // { key: value }
  const [seleccion, setSeleccion] = useState({})        // { key: bool }
  const [error,     setError]     = useState('')
  const [aplicado,  setAplicado]  = useState(false)
  const fileRef = useRef(null)

  const onFile = (e) => {
    const f = e.target.files?.[0]
    if (f) { setArchivo(f); setCampos(null); setSeleccion({}); setError(''); setAplicado(false) }
    e.target.value = ''
  }

  const leerDocumento = async () => {
    if (!archivo) { setError('Selecciona un archivo primero.'); return }
    setCargando(true); setError(''); setCampos(null); setSeleccion({})
    try {
      const token = localStorage.getItem('giaval_token')
      const fd = new FormData()
      fd.append('archivo', archivo)
      fd.append('tipoDocumento', tipoDoc)
      const r = await fetch('/api/ocr/leer-documento', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Error al procesar el documento')
      if (!data.campos || Object.keys(data.campos).length === 0) {
        setError('No se encontraron campos. Verifica que el tipo de documento sea correcto.')
        return
      }
      const nuevoCampos = data.campos
      // Seleccionar todos por defecto
      const sel = {}
      Object.keys(nuevoCampos).forEach(k => { sel[k] = true })
      setCampos(nuevoCampos)
      setSeleccion(sel)
    } catch (err) {
      setError(err.message || 'Error de conexión.')
    } finally {
      setCargando(false)
    }
  }

  const toggleCampo = (key) =>
    setSeleccion(s => ({ ...s, [key]: !s[key] }))

  const toggleTodos = () => {
    const hayTodos = Object.values(seleccion).every(v => v)
    const nuevo = {}
    Object.keys(seleccion).forEach(k => { nuevo[k] = !hayTodos })
    setSeleccion(nuevo)
  }

  const aplicar = () => {
    if (!campos) return
    // Solo aplica los campos que estén marcados
    const camposAplicar = {}
    Object.entries(campos).forEach(([k, v]) => {
      if (seleccion[k]) camposAplicar[k] = v
    })
    onAplicar(camposAplicar)
    setAplicado(true)
    setTimeout(() => onCerrar(), 700)
  }

  const camposVisibles = campos
    ? Object.entries(campos).filter(([, v]) =>
        v !== null && v !== undefined && v !== ''
        && !(Array.isArray(v) && v.length === 0)
      )
    : []

  const numSeleccionados = Object.values(seleccion).filter(Boolean).length
  const hayTodos = camposVisibles.length > 0 && numSeleccionados === camposVisibles.length

  return (
    <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',
      justifyContent:'center',background:'rgba(0,0,0,.55)',backdropFilter:'blur(4px)'}}>
      <div style={{background:'var(--bg-card)',borderRadius:'14px',padding:'1.75rem',
        width:'100%',maxWidth:'620px',maxHeight:'92vh',overflowY:'auto',
        boxShadow:'0 20px 60px rgba(0,0,0,.35)',position:'relative'}}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem'}}>
          <div>
            <h2 style={{fontWeight:800,fontSize:'1.1rem',color:'var(--text-primary)',marginBottom:'.2rem'}}>
              📎 Leer documento con IA
            </h2>
            <p style={{fontSize:'.8rem',color:'var(--text-muted)'}}>
              Gemini analiza el archivo — tú decides qué campos aplicar
            </p>
          </div>
          <button onClick={onCerrar} style={{padding:'.3rem',borderRadius:'6px',
            background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}>
            <X size={18}/>
          </button>
        </div>

        {/* Tipo de documento */}
        <div style={{marginBottom:'1rem'}}>
          <label style={{fontSize:'.82rem',fontWeight:700,color:'var(--text-secondary)',
            display:'block',marginBottom:'.4rem',textTransform:'uppercase',letterSpacing:'.04em'}}>
            Tipo de documento
          </label>
          <select value={tipoDoc} onChange={e=>{setTipoDoc(e.target.value);setCampos(null);setSeleccion({})}}
            style={{width:'100%',padding:'.55rem .75rem',borderRadius:'8px',
              border:'1px solid var(--border)',background:'var(--bg-input)',
              color:'var(--text-primary)',fontSize:'.9rem',cursor:'pointer'}}>
            {TIPOS_DOCUMENTO.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>

        {/* Zona de archivo */}
        <div onClick={()=>fileRef.current?.click()}
          style={{border:`2px dashed ${archivo?'#c9972a':'var(--border)'}`,borderRadius:'10px',
            padding:'1.25rem',textAlign:'center',cursor:'pointer',marginBottom:'1rem',
            background:archivo?'rgba(201,151,42,.04)':'var(--bg-input)',transition:'all .15s'}}>
          <input ref={fileRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={onFile}/>
          {archivo?(
            <>
              <FileText size={22} style={{color:'#c9972a',margin:'0 auto .4rem'}}/>
              <p style={{fontWeight:700,color:'var(--text-primary)',fontSize:'.88rem'}}>{archivo.name}</p>
              <p style={{fontSize:'.73rem',color:'var(--text-muted)',marginTop:'.15rem'}}>
                {(archivo.size/1024).toFixed(0)} KB — clic para cambiar
              </p>
            </>
          ):(
            <>
              <Upload size={22} style={{color:'var(--text-muted)',margin:'0 auto .4rem'}}/>
              <p style={{color:'var(--text-secondary)',fontSize:'.86rem',fontWeight:600}}>
                Haz clic para seleccionar el archivo
              </p>
              <p style={{fontSize:'.73rem',color:'var(--text-muted)',marginTop:'.2rem'}}>
                PDF, JPG, PNG, WEBP — máx. 20 MB
              </p>
            </>
          )}
        </div>

        {/* Error */}
        {error&&(
          <div style={{padding:'.6rem .85rem',background:'#fef2f2',border:'1px solid #fecaca',
            borderRadius:'7px',fontSize:'.82rem',color:'#dc2626',marginBottom:'1rem'}}>
            ⚠ {error}
          </div>
        )}

        {/* Botón Analizar */}
        {!campos&&(
          <button onClick={leerDocumento} disabled={!archivo||cargando}
            style={{width:'100%',padding:'.65rem',borderRadius:'9px',
              cursor:!archivo||cargando?'not-allowed':'pointer',
              background:!archivo||cargando?'#64748b':'#c9972a',color:'#fff',
              border:'none',fontSize:'.9rem',fontWeight:700,
              display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',
              opacity:!archivo?.6:1}}>
            {cargando
              ?<><Loader size={16} style={{animation:'spin 1s linear infinite'}}/> Analizando…</>
              :'✨ Analizar con Gemini IA'}
          </button>
        )}

        {/* Resultados con checkboxes */}
        {campos&&camposVisibles.length>0&&(
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'.6rem .85rem',background:'#f0fdf4',border:'1px solid #bbf7d0',
              borderRadius:'7px',marginBottom:'.75rem',gap:'.75rem',flexWrap:'wrap'}}>
              <span style={{fontSize:'.82rem',color:'#15803d',fontWeight:600}}>
                ✓ {camposVisibles.length} campos encontrados
              </span>
              <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
                <span style={{fontSize:'.78rem',color:'var(--text-muted)'}}>
                  {numSeleccionados} seleccionado{numSeleccionados!==1?'s':''}
                </span>
                <button onClick={toggleTodos}
                  style={{fontSize:'.76rem',padding:'.2rem .6rem',borderRadius:'5px',
                    border:'1px solid var(--border)',background:'var(--bg-card)',
                    color:'var(--text-secondary)',cursor:'pointer',fontWeight:600}}>
                  {hayTodos?'Deseleccionar todo':'Seleccionar todo'}
                </button>
              </div>
            </div>

            <div style={{background:'var(--bg-input)',border:'1px solid var(--border)',
              borderRadius:'10px',marginBottom:'1rem',maxHeight:'320px',overflowY:'auto'}}>
              {camposVisibles.map(([key, value])=>(
                <label key={key}
                  style={{display:'flex',gap:'.75rem',padding:'.5rem .85rem',
                    borderBottom:'1px solid var(--border)',cursor:'pointer',
                    alignItems:'flex-start',
                    background:seleccion[key]?'rgba(37,99,235,.04)':'transparent',
                    transition:'background .1s'}}>
                  <input type="checkbox" checked={!!seleccion[key]}
                    onChange={()=>toggleCampo(key)}
                    style={{marginTop:'.15rem',cursor:'pointer',flexShrink:0,
                      accentColor:'#2563eb',width:'15px',height:'15px'}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <span style={{fontSize:'.75rem',fontWeight:700,
                      color:seleccion[key]?'var(--text-primary)':'var(--text-muted)',
                      textTransform:'uppercase',letterSpacing:'.03em',display:'block',
                      marginBottom:'.15rem'}}>
                      {CAMPO_LABELS[key]||key}
                    </span>
                    <span style={{fontSize:'.82rem',
                      color:seleccion[key]?'var(--text-primary)':'var(--text-muted)',
                      wordBreak:'break-word',lineHeight:1.4,
                      textDecoration:seleccion[key]?'none':'line-through',
                      opacity:seleccion[key]?1:.6}}>
                      {formatearValor(key, value)}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            <div style={{display:'flex',gap:'.65rem'}}>
              <button onClick={()=>{setCampos(null);setArchivo(null);setSeleccion({})}}
                style={{flex:1,padding:'.55rem',borderRadius:'8px',
                  border:'1px solid var(--border)',background:'var(--bg-card)',
                  color:'var(--text-secondary)',fontSize:'.84rem',fontWeight:600,cursor:'pointer'}}>
                Cancelar
              </button>
              <button onClick={aplicar} disabled={numSeleccionados===0}
                style={{flex:2,padding:'.55rem',borderRadius:'8px',border:'none',
                  background:aplicado?'#16a34a':numSeleccionados===0?'#64748b':'#1e3a5f',
                  color:'#fff',fontSize:'.9rem',fontWeight:700,cursor:numSeleccionados===0?'not-allowed':'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:'.45rem'}}>
                {aplicado
                  ?<><CheckCircle2 size={16}/> ¡Aplicado!</>
                  :`✓ Aplicar ${numSeleccionados} campo${numSeleccionados!==1?'s':''}`}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}