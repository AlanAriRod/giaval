// frontend/src/pages/FormularioComercial/tabs/TabComparableCasa.jsx — v5
// CAMBIOS v5: fotos en tarjeta individual restauradas, URL, excedente, IA, diseño tarjetas
import { useState, useRef } from 'react'
import { Plus, Trash2, Sparkles, Camera, ChevronDown, ChevronUp, ExternalLink, RotateCcw } from 'lucide-react'
import styles from '../Formulario.module.css'
import BuscadorComparables from '../../../components/BuscadorComparables'
import { useAuth } from '../../../context/AuthContext'

const BASE_FACTORES = ['neg','ubic','sup','calid','edoCons','zona']
const BASE_LABELS   = { neg:'NEG',ubic:'UBIC',sup:'SUP',calid:'CALID',edoCons:'EDO.CONS',zona:'ZONA' }

const fmtMXN = (v) => v&&!isNaN(v)&&parseFloat(v)>0
  ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(parseFloat(v)) : '—'

const calcFRe   = (c,todos) => todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
const calcVuHom = (c,todos) => {
  if(!c.oferta||!c.supConst) return null
  return parseFloat(c.oferta)/parseFloat(c.supConst)*calcFRe(c,todos)
}

function TarjetaComparable({ comp, idx, todos, onUpdate, onQuitar }) {
  const [open, setOpen] = useState(true)
  const fotoRef = useRef(null)
  const vuHom = calcVuHom(comp,todos)
  const fre   = calcFRe(comp,todos)
  const upd   = (k,v) => onUpdate(idx,k,v)
  const updF  = (k,v) => onUpdate(idx,'factores',{...comp.factores,[k]:v})

  const onFoto = (e) => {
    Promise.all(Array.from(e.target.files).map(f=>new Promise(res=>{
      const r=new FileReader(); r.onload=ev=>res(ev.target.result); r.readAsDataURL(f)
    }))).then(imgs=>upd('fotos',[...(comp.fotos||[]),...imgs]))
    e.target.value=''
  }

  return (
    <div style={{border:'1px solid var(--border)',borderRadius:'10px',
      background:'var(--bg-card)',overflow:'hidden',marginBottom:'.75rem'}}>
      {/* Cabecera */}
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:'flex',alignItems:'center',gap:'.75rem',padding:'.65rem 1rem',
          background:'var(--bg-input)',borderBottom:open?'1px solid var(--border)':'none',cursor:'pointer'}}>
        <span style={{width:'26px',height:'26px',borderRadius:'50%',flexShrink:0,
          background:'#1e3a5f',color:'#fff',display:'flex',alignItems:'center',
          justifyContent:'center',fontSize:'.76rem',fontWeight:800}}>{idx+1}</span>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontWeight:700,fontSize:'.88rem',color:'var(--text-primary)'}}>
            {comp.ciudad||comp.colonia?`${comp.ciudad||''}${comp.colonia?` — ${comp.colonia}`:''}`:`Comparable ${idx+1}`}
          </p>
          <p style={{fontSize:'.73rem',color:'var(--text-muted)',marginTop:'.08rem'}}>
            {comp.oferta?fmtMXN(comp.oferta):'Sin precio'}
            {comp.supConst?` · ${comp.supConst} m²`:''}
            {vuHom?` · ${fmtMXN(vuHom)}/m²`:''}
            {comp.fuente?` · ${comp.fuente}`:''}
          </p>
        </div>
        <div style={{display:'flex',gap:'.4rem',alignItems:'center'}}>
          <button onClick={e=>{e.stopPropagation();onQuitar(idx)}}
            style={{padding:'.28rem .38rem',borderRadius:'5px',cursor:'pointer',
              background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626'}}
            title="Eliminar"><Trash2 size={13}/></button>
          {open?<ChevronUp size={15}/>:<ChevronDown size={15}/>}
        </div>
      </div>

      {open&&(
        <div style={{padding:'1rem'}}>
          {/* Campos básicos */}
          <div className={styles.grid3} style={{marginBottom:'.85rem'}}>
            <div className={styles.field}>
              <label className={styles.label}>Ciudad / Municipio</label>
              <input className={styles.input} value={comp.ciudad||''} onChange={e=>upd('ciudad',e.target.value)} placeholder="Orizaba"/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Colonia</label>
              <input className={styles.input} value={comp.colonia||''} onChange={e=>upd('colonia',e.target.value)} placeholder="Centro"/>
            </div>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Oferta ($)</label>
              <input className={styles.input} type="number" step="1" value={comp.oferta||''} onChange={e=>upd('oferta',e.target.value)} placeholder="0.00"/>
            {parseFloat(comp.oferta)>0&&(
              <button type="button"
                onClick={()=>upd('oferta',String(Math.round(parseFloat(comp.oferta))))}
                style={{marginTop:'.22rem',padding:'.18rem .5rem',borderRadius:'5px',
                  fontSize:'.68rem',fontWeight:700,cursor:'pointer',display:'block',width:'100%',
                  border:'1px solid #c9972a',background:'rgba(201,151,42,.08)',color:'#c9972a'}}>
                ↺ {Math.round(parseFloat(comp.oferta)||0).toLocaleString('es-MX')}
              </button>
            )}
            </div>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Sup. Construida (m²)</label>
              <input className={styles.input} type="number" step="0.01" value={comp.supConst||''} onChange={e=>upd('supConst',e.target.value)} placeholder="0.00"/>
            </div>
            <div className={`${styles.field} ${styles.span2}`}>
              <label className={styles.label}>Descripción / Fuente</label>
              <input className={styles.input} value={comp.descripcion||comp.fuente||''} onChange={e=>upd('descripcion',e.target.value)} placeholder="Portal, características…"/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Teléfono</label>
              <input className={styles.input} value={comp.telefono||''} onChange={e=>upd('telefono',e.target.value)} placeholder="(222) 123-4567"/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Informante</label>
              <input className={styles.input} value={comp.informante||''} onChange={e=>upd('informante',e.target.value)} placeholder="Nombre del informante"/>
            </div>
            <div className={`${styles.field} ${styles.span3}`}>
              <label className={styles.label}>URL / Link del anuncio</label>
              <div style={{display:'flex',gap:'.5rem',alignItems:'center'}}>
                <input className={styles.input} value={comp.url||''} onChange={e=>upd('url',e.target.value)} placeholder="https://www.inmuebles24.com/…"/>
                {comp.url&&(
                  <a href={comp.url} target="_blank" rel="noopener noreferrer"
                    style={{display:'inline-flex',alignItems:'center',gap:'.3rem',padding:'.42rem .7rem',
                      borderRadius:'7px',flexShrink:0,background:'rgba(37,99,235,.08)',
                      border:'1px solid rgba(37,99,235,.25)',color:'#2563eb',fontSize:'.78rem',
                      fontWeight:600,textDecoration:'none'}}>
                    <ExternalLink size={13}/> Ver
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Factores */}
          <p style={{fontSize:'.74rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.55rem'}}>Factores de Homologación</p>
          <div style={{display:'flex',flexWrap:'wrap',gap:'.5rem',marginBottom:'.55rem'}}>
            {todos.map(f=>(
              <div key={f.key} style={{minWidth:'72px'}}>
                <label style={{fontSize:'.66rem',color:'var(--text-muted)',textTransform:'uppercase',display:'block',marginBottom:'.18rem'}}>{f.label}</label>
                <input className={styles.input} type="number" step="0.01" min="0.5" max="1.5"
                  style={{textAlign:'center',padding:'.28rem .35rem'}}
                  value={comp.factores?.[f.key]||''} onChange={e=>updF(f.key,e.target.value)} placeholder="1.00"/>
              </div>
            ))}
          </div>

          {/* Resultado FRe */}
          <div style={{display:'flex',gap:'1.5rem',flexWrap:'wrap',padding:'.55rem .8rem',background:'#0f172a',borderRadius:'7px',marginBottom:'1rem'}}>
            <div>
              <p style={{fontSize:'.66rem',color:'#64748b',textTransform:'uppercase'}}>$/m² Base</p>
              <p style={{fontSize:'.88rem',fontWeight:700,color:'#94a3b8'}}>
                {comp.oferta&&comp.supConst?fmtMXN(parseFloat(comp.oferta)/parseFloat(comp.supConst)):'—'}
              </p>
            </div>
            <div>
              <p style={{fontSize:'.66rem',color:'#64748b',textTransform:'uppercase'}}>FRe</p>
              <p style={{fontSize:'.88rem',fontWeight:700,color:'#60a5fa'}}>{fre.toFixed(4)}</p>
            </div>
            <div>
              <p style={{fontSize:'.66rem',color:'#64748b',textTransform:'uppercase'}}>$/m² Homologado</p>
              <p style={{fontSize:'.88rem',fontWeight:700,color:'#c9972a'}}>{vuHom?fmtMXN(vuHom):'—'}</p>
            </div>
          </div>

          {/* Fotos */}
          <div>
            <p style={{fontSize:'.74rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.5rem'}}>Fotografías del comparable</p>
            <div style={{display:'flex',gap:'.65rem',flexWrap:'wrap',alignItems:'center'}}>
              {(comp.fotos||[]).map((src,fi)=>(
                <div key={fi} style={{position:'relative'}}>
                  <img src={src} alt="" style={{width:'80px',height:'64px',objectFit:'cover',borderRadius:'6px',border:'1px solid var(--border)'}}/>
                  <button style={{position:'absolute',top:'.2rem',right:'.2rem',background:'rgba(0,0,0,.55)',
                    color:'#fff',borderRadius:'50%',width:'18px',height:'18px',display:'flex',
                    alignItems:'center',justifyContent:'center',fontSize:'.6rem',border:'none',cursor:'pointer'}}
                    onClick={()=>upd('fotos',(comp.fotos||[]).filter((_,j)=>j!==fi))}>✕</button>
                </div>
              ))}
              <input type="file" accept="image/*" multiple hidden ref={fotoRef} onChange={onFoto}/>
              <button onClick={()=>fotoRef.current?.click()}
                style={{width:'80px',height:'64px',borderRadius:'6px',border:'2px dashed var(--border)',
                  background:'var(--bg-input)',display:'flex',flexDirection:'column',alignItems:'center',
                  justifyContent:'center',gap:'.25rem',color:'var(--text-muted)',fontSize:'.68rem',cursor:'pointer'}}>
                <Camera size={16}/> Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TablaAcumulada({ comparables, todos, onUpdateComp }) {
  if(!comparables.length) return null
  const thBase = {padding:'.42rem .5rem',background:'#0f172a',color:'#94a3b8',fontSize:'.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em',textAlign:'center',border:'1px solid #1e293b',whiteSpace:'nowrap'}
  const tdBase = {padding:'.35rem .42rem',borderBottom:'1px solid var(--border)',verticalAlign:'middle',textAlign:'center',fontSize:'.76rem'}
  const inputT = {padding:'.2rem .3rem',border:'1px solid var(--border)',borderRadius:'4px',fontSize:'.75rem',background:'var(--bg-card)',color:'var(--text-primary)',textAlign:'center',width:'62px'}
  const vusHom = comparables.map(c=>calcVuHom(c,todos)).filter(v=>v!==null)
  const enNR   = vusHom.length?Math.round(vusHom.reduce((a,b)=>a+b,0)/vusHom.length):null
  return (
    <div style={{marginTop:'1.5rem'}}>
      <p style={{fontWeight:700,fontSize:'.78rem',color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.75rem'}}>Tabla de Homologación Acumulada</p>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:'750px'}}>
          <thead>
            <tr>
              <th style={{...thBase,width:'28px'}}>#</th>
              <th style={{...thBase,textAlign:'left',minWidth:'80px'}}>Ciudad</th>
              <th style={{...thBase,textAlign:'left',minWidth:'80px'}}>Colonia</th>
              <th style={{...thBase,minWidth:'95px'}}>Oferta ($)</th>
              <th style={thBase}>Sup.</th>
              <th style={thBase}>$/m²</th>
              {todos.map(f=><th key={f.key} style={{...thBase,background:'#1a3050',color:'#93c5fd'}}>{f.label}</th>)}
              <th style={{...thBase,background:'#162030',color:'#60a5fa'}}>FRe</th>
              <th style={{...thBase,background:'#1e3a5f',color:'#c9972a'}}>$/m² Hom.</th>
              <th style={{...thBase,minWidth:'50px'}}>Fuente</th>
            </tr>
          </thead>
          <tbody>
            {comparables.map((c,i)=>{
              const fre=calcFRe(c,todos); const vuHom=calcVuHom(c,todos)
              const base=c.oferta&&c.supConst?parseFloat(c.oferta)/parseFloat(c.supConst):null
              const updF=(k,v)=>onUpdateComp(i,'factores',{...c.factores,[k]:v})
              return (
                <tr key={i} style={{background:i%2===0?'var(--bg-card)':'var(--bg-input)'}}>
                  <td style={{...tdBase,fontWeight:700,color:'#1e3a5f'}}>{i+1}</td>
                  <td style={{...tdBase,textAlign:'left'}}><input style={{...inputT,width:'78px',textAlign:'left'}} value={c.ciudad||''} onChange={e=>onUpdateComp(i,'ciudad',e.target.value)}/></td>
                  <td style={{...tdBase,textAlign:'left'}}><input style={{...inputT,width:'78px',textAlign:'left'}} value={c.colonia||''} onChange={e=>onUpdateComp(i,'colonia',e.target.value)}/></td>
                  <td style={tdBase}><input type="number" style={{...inputT,width:'88px'}} value={c.oferta||''} onChange={e=>onUpdateComp(i,'oferta',e.target.value)} placeholder="0"/></td>
                  <td style={tdBase}><input type="number" style={inputT} value={c.supConst||''} onChange={e=>onUpdateComp(i,'supConst',e.target.value)} placeholder="0"/></td>
                  <td style={{...tdBase,color:'#475569',fontVariantNumeric:'tabular-nums'}}>{base?`$${Math.round(base).toLocaleString('es-MX')}`:'—'}</td>
                  {todos.map(f=>(
                    <td key={f.key} style={{...tdBase,background:'rgba(30,64,175,.04)'}}>
                      <input type="number" step="0.01" min="0.5" max="1.5" style={inputT} value={c.factores?.[f.key]||''} onChange={e=>updF(f.key,e.target.value)} placeholder="1.00"/>
                    </td>
                  ))}
                  <td style={{...tdBase,background:'rgba(96,165,250,.06)'}}><span style={{fontWeight:700,color:'#60a5fa',fontVariantNumeric:'tabular-nums'}}>{fre.toFixed(4)}</span></td>
                  <td style={{...tdBase,background:'rgba(201,151,42,.06)'}}><span style={{fontWeight:700,color:'#c9972a',fontVariantNumeric:'tabular-nums'}}>{vuHom?`$${Math.round(vuHom).toLocaleString('es-MX')}`:'—'}</span></td>
                  <td style={{...tdBase,textAlign:'center'}}>
                    {c.url?(
                      <a href={c.url} target="_blank" rel="noopener noreferrer" title={c.fuente||c.descripcion||c.url}
                        style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'26px',height:'26px',borderRadius:'5px',background:'rgba(37,99,235,.08)',border:'1px solid rgba(37,99,235,.2)',color:'#2563eb',textDecoration:'none'}}>
                        <ExternalLink size={12}/>
                      </a>
                    ):<span style={{fontSize:'.7rem',color:'var(--text-muted)'}}>{c.fuente||c.descripcion||'—'}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{background:'#0f172a'}}>
              <td colSpan={6+todos.length} style={{padding:'.45rem .65rem',fontWeight:700,fontSize:'.72rem',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',textAlign:'right',border:'1px solid #1e293b'}}>EN N.R. — VALOR HOMOLOGADO PROMEDIO $/m²:</td>
              <td style={{padding:'.45rem .65rem',fontWeight:800,fontSize:'.9rem',color:'#c9972a',textAlign:'center',border:'1px solid #1e293b',fontVariantNumeric:'tabular-nums'}}>{enNR?`$${enNR.toLocaleString('es-MX')}`:'—'}</td>
              <td style={{border:'1px solid #1e293b'}}/>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default function TabComparableCasa({ form, update }) {
    const [enviadoValormercado, setEnviadoValormercado] = useState(false)
const [mostrarBuscador,    setMostrarBuscador]    = useState(false)
  const [mostrarBuscadorBD,  setMostrarBuscadorBD]  = useState(false)
  const [comparablesBD,      setComparablesBD]      = useState([])
  const [cargandoBD,         setCargandoBD]         = useState(false)
  const { authFetch } = useAuth()
  const [botonActivo,      setBotonActivo]       = useState(false)
  const [autoLlenando,     setAutoLlenando]      = useState(false)
  const archivoAutoRef = useRef(null)
  // incluyeExcedente persiste en el formulario (no se pierde al cambiar de tab)
  const incluyeExcedente = !!form.incluyeExcedenteTerreno
  const setIncluyeExcedente = (val) => {
    const newVal = typeof val === 'function' ? val(incluyeExcedente) : val
    update('incluyeExcedenteTerreno', newVal)
  }

  const comparables    = form.comparablesCasa    || []
  const factoresCustom = form.factoresCasaCustom || []
  const todosFactores  = [...BASE_FACTORES.map(k=>({key:k,label:BASE_LABELS[k]})),...factoresCustom]

  const vusHom = comparables.map(c=>calcVuHom(c,todosFactores)).filter(v=>v!==null)
  const enNR   = vusHom.length?vusHom.reduce((a,b)=>a+b,0)/vusHom.length:null
  const enNRRedondeado = enNR?Math.round(enNR):null

  const areaCH = parseFloat(form.areaConstruccionHabitable||form.areaConstruccion)||0
  const areaT  = parseFloat(form.areaTerreno)||0
  const excedenteAuto = areaT>areaCH&&areaCH>0?parseFloat((areaT-areaCH).toFixed(2)):0
  const excedente     = parseFloat(form.terrenoExcedente)||excedenteAuto

  const enNRTerrenoAuto = (()=>{
    const customF=form.factoresTerrenoCustom||[]
    const baseKeys=['neg','zona','ubica','frente','sup','forma']
    const todos=[...baseKeys.map(k=>({key:k})),...customF]
    const vus=(form.comparablesTerreno||[]).filter(c=>c.oferta&&c.supM2).map(c=>{
      const fre=todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
      return parseFloat(c.oferta)/parseFloat(c.supM2)*fre
    })
    return vus.length>0?Math.round(vus.reduce((a,b)=>a+b,0)/vus.length):null
  })()

  const enNRTerrenoManual = parseFloat(form.enNRTerrenoManualCasa)||0
  const enNRTerrenoFinal  = enNRTerrenoManual||enNRTerrenoAuto||0
  const valorExcedente    = incluyeExcedente&&excedente&&enNRTerrenoFinal?excedente*enNRTerrenoFinal:0
  const t1Total = (enNRRedondeado&&areaCH?enNRRedondeado*areaCH:0)+valorExcedente

  // Auto llenar un comparable desde un archivo (captura de portal inmobiliario)
  // ─────────────────────────────────────────────────────────────────
  // Auto Llenar Con Archivo — extrae datos de captura de portal inmobiliario
  // El prompt pide JSON con claves fijas; Gemini no puede usar backticks ni markdown
  // ─────────────────────────────────────────────────────────────────
  const autoLlenarConArchivo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setAutoLlenando(true)
    try {
      const fd = new FormData()
      // IMPORTANTE: campos de texto ANTES del archivo para que multer los lea correctamente
      fd.append('tipoDocumento', 'comparable_casa')
      // Prompt explícito: sin backticks, sin saltos de línea, sin llaves especiales
      fd.append('archivo', file)  // archivo siempre al final

      // Obtener token — intentar múltiples claves posibles
      const token = (
        localStorage.getItem('giaval_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('jwt') ||
        sessionStorage.getItem('giaval_token') ||
        sessionStorage.getItem('token') ||
        ''
      )
      if (!token) {
        throw new Error('No hay sesión activa. Por favor inicia sesión de nuevo.')
      }
      const r = await fetch('/api/ocr/leer-documento', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        // SIN Content-Type: el navegador lo pone automáticamente con el boundary del FormData
        body: fd,
      })
      // Verificar que la respuesta sea JSON antes de parsear
      const ct = r.headers.get('content-type') || ''
      if (!ct.includes('json')) {
        if (r.status === 401) throw new Error('Sesión expirada — cierra sesión, vuelve a entrar e intenta de nuevo.')
        if (r.status === 400) throw new Error('Error 400: el servidor no recibió los campos correctamente. Recarga la página.')
        const txt = await r.text()
        throw new Error(`Respuesta inesperada del servidor (${r.status}). Recarga e intenta de nuevo.`)
      }
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Error al procesar la imagen')
      const raw = data.campos || {}

      // Log para diagnóstico (ver en consola del navegador)
      console.log('[AutoLlenar] Gemini devolvió:', raw)

      // Convertir cualquier valor a numero string limpio
      const toN = (v, entero) => {
        if (!v && v !== 0) return ''
        // Quitar todo excepto dígitos, punto y coma (para decimales como 1.234,56)
        let s = String(v).replace(/[^0-9.,]/g, '')
        // Si tiene coma Y punto, asumir que la coma es separador de miles
        if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '')
        else s = s.replace(/,/g, '.')
        const n = parseFloat(s)
        if (isNaN(n) || n <= 0) return ''
        return entero ? String(Math.round(n)) : String(n)
      }

      // Leer precio con todos los nombres posibles
      // Gemini puede usar cualquiera de estos nombres para el precio
      // Gemini devuelve 'oferta' con el nuevo prompt comparable_*
      const oferta = toN(raw.oferta || raw.precio || raw.precio_venta || raw.precioVenta || raw.price || 0, true)

      // Leer superficie construida con todos los nombres posibles
      // areaConstruccion/areaTerreno son los nombres que usa construirPrompt('otro')
      // Los añadimos como fallback por si Gemini usa ese prompt
      const supVal = raw.supConst || raw.supConstruida || raw.areaConstruccion ||
        raw.areaConstruccionHabitable || raw.sup_construida ||
        raw.superficie_construida || raw.m2_construccion || raw.constr || raw.superficie || 0
      const sup = toN(supVal)

      // Descripción: unir campos de características si Gemini los separó
      // descripcion viene directamente del nuevo prompt, o se ensambla de campos individuales
      const desc = [
        raw.descripcion, raw.caracteristicas, raw.resumen,
        raw.recamaras ? raw.recamaras + ' rec' : '',
        raw.banos ? raw.banos + ' baños' : '',
        raw.estacionamientos ? raw.estacionamientos + ' estac' : '',
        raw.antiguedad || raw.anos || '',
      ].filter(Boolean).join(', ')

      update('comparablesCasa', [...comparables, {
        ciudad:      String(raw.ciudad || raw.municipio || ''),
        colonia:     String(raw.colonia || raw.ubicacion || ''),
        oferta:      oferta,
        supConst: sup,
        descripcion: desc || String(raw.descripcion || ''),
        fuente:      String(raw.fuente || raw.portal || 'Portal inmobiliario'),
        url:         String(raw.url || ''),
        telefono:    String(raw.telefono || ''),
        informante:  String(raw.informante || raw.agente || ''),
        factores:    {},
        fotos:       [],
      }])
    } catch (err) {
      console.error('[AutoLlenar] Error:', err)
      alert('No se pudieron extraer datos: ' + err.message)
    } finally {
      setAutoLlenando(false)
    }
  }

  const agregar = () => {
    setBotonActivo(true); setTimeout(()=>setBotonActivo(false),600)
    update('comparablesCasa',[...comparables,{ciudad:'',colonia:'',oferta:'',supConst:'',url:'',descripcion:'',fuente:'',telefono:'',informante:'',factores:{},fotos:[]}])
  }

  const cargarComparablesBD = async () => {
    setCargandoBD(true)
    try {
      const r = await authFetch('/api/comparables?tipo=casa&limit=50')
      const d = await r.json()
      setComparablesBD(d.comparables||[])
    } catch(e){ console.error(e) }
    finally { setCargandoBD(false) }
  }

  const abrirBuscadorBD = () => {
    setMostrarBuscadorBD(true)
    cargarComparablesBD()
  }

  const usarComparableBD = (comp) => {
    update('comparablesCasa',[...comparables,{
      ciudad:      comp.ciudad      ||'',
      colonia:     comp.colonia     ||'',
      oferta:      String(comp.oferta||''),
      supConst:    String(comp.superficie||''),
      descripcion: comp.descripcion ||'',
      fuente:      comp.fuente      ||'Banco de Comparables',
      url:         comp.url         ||'',
      telefono:    comp.telefono    ||'',
      informante:  comp.informante  ||'',
      factores:{},fotos:[],
    }])
    setMostrarBuscadorBD(false)
  }

  const guardarEnBD = async (comp) => {
    if (!comp.oferta) return
    try {
      await authFetch('/api/comparables',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          tipo:'casa', ciudad:comp.ciudad, colonia:comp.colonia,
          oferta:comp.oferta, superficie:comp.supConst,
          descripcion:comp.descripcion||comp.fuente,
          fuente:comp.fuente, url:comp.url,
          telefono:comp.telefono, informante:comp.informante,
        }),
      })
    } catch(e){ console.error(e) }
  }
  const quitar = (i) => {
    if(!window.confirm('¿Desea eliminar este comparable?\nEsta acción no se puede deshacer.')) return
    update('comparablesCasa',comparables.filter((_,j)=>j!==i))
  }
  const actualizarCampo = (i,campo,valor) =>
    update('comparablesCasa',comparables.map((c,j)=>j===i?{...c,[campo]:valor}:c))
  const agregarDesdeIA = (comp) => {
    update('comparablesCasa',[...comparables,{
      ciudad:comp.ciudad||'',colonia:comp.colonia||'',
      oferta:String(comp.oferta||''),supConst:String(comp.supConst||''),
      descripcion:comp.descripcion||'',fuente:comp.fuente||'Gemini IA',
      url:comp.url||'',factores:{},fotos:[],
    }])
  }
  const agregarFactor = () => {
    const label=window.prompt('Nombre del factor personalizado:'); if(!label?.trim()) return
    const key=label.trim().toLowerCase().replace(/\s+/g,'_')
    if(factoresCustom.find(f=>f.key===key)) return
    update('factoresCasaCustom',[...factoresCustom,{key,label:label.trim().toUpperCase()}])
  }
  const quitarFactor = (key) => {
    if(!window.confirm('¿Eliminar este factor?')) return
    update('factoresCasaCustom',factoresCustom.filter(f=>f.key!==key))
    update('comparablesCasa',comparables.map(c=>{const f={...c.factores};delete f[key];return{...c,factores:f}}))
  }

  return (
    <div>
      {/* Encabezado */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem',flexWrap:'wrap',gap:'.65rem'}}>
        <div>
          <h3 style={{fontWeight:800,fontSize:'1rem',color:'var(--text-primary)',marginBottom:'.2rem'}}>Comparables de Casa — Enfoque de Mercado</h3>
          <p style={{fontSize:'.78rem',color:'var(--text-muted)'}}>Propiedades similares para calcular el valor por homologación.</p>
        </div>
        <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
          <input type="file" accept="image/*,.pdf" hidden ref={archivoAutoRef}
            onChange={autoLlenarConArchivo}/>
          <button onClick={()=>archivoAutoRef.current?.click()} disabled={autoLlenando}
            style={{display:'inline-flex',alignItems:'center',gap:'.4rem',
              padding:'.45rem .9rem',borderRadius:'8px',cursor:'pointer',
              border:'1.5px solid #16a34a',background:'rgba(22,163,74,.08)',
              color:'#16a34a',fontSize:'.82rem',fontWeight:700,
              opacity:autoLlenando?.7:1}}>
            {autoLlenando?'⏳ Extrayendo…':'📷 Auto Llenar Con Archivo'}
          </button>
          <button onClick={()=>setMostrarBuscador(true)} style={{display:'inline-flex',alignItems:'center',gap:'.4rem',padding:'.45rem .9rem',borderRadius:'8px',cursor:'pointer',border:'1.5px solid #c9972a',background:'rgba(201,151,42,.1)',color:'#c9972a',fontSize:'.82rem',fontWeight:700}}>
            <Sparkles size={14}/> Buscar con IA
          </button>
          <button onClick={agregar} style={{display:'inline-flex',alignItems:'center',gap:'.4rem',padding:'.45rem .9rem',borderRadius:'8px',cursor:'pointer',border:`1.5px solid ${botonActivo?'#2563eb':'var(--border)'}`,background:botonActivo?'rgba(37,99,235,.15)':'var(--bg-card)',color:botonActivo?'#2563eb':'var(--text-secondary)',fontSize:'.82rem',fontWeight:botonActivo?700:600,boxShadow:botonActivo?'0 0 0 3px rgba(37,99,235,.2)':'none',transform:botonActivo?'scale(1.03)':'scale(1)',transition:'all .15s'}}>
            <Plus size={14}/> Añadir Comparable
          </button>
        </div>
      </div>

      {/* Factores activos */}
      <div style={{padding:'.6rem .85rem',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:'8px',marginBottom:'1.1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.45rem'}}>
          <p style={{fontSize:'.73rem',fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'.05em'}}>Factores activos</p>
          <button onClick={agregarFactor} style={{fontSize:'.71rem',padding:'.18rem .45rem',borderRadius:'4px',background:'var(--bg-card)',border:'1px solid var(--border)',cursor:'pointer',color:'var(--text-secondary)'}}>+ Factor personalizado</button>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'.38rem'}}>
          {todosFactores.map(f=>(
            <span key={f.key} style={{fontSize:'.71rem',padding:'.18rem .5rem',borderRadius:'4px',background:BASE_FACTORES.includes(f.key)?'#1e3a5f':'#7c3aed',color:'#fff',fontWeight:600,display:'flex',alignItems:'center',gap:'.28rem'}}>
              {f.label}
              {!BASE_FACTORES.includes(f.key)&&<button onClick={()=>quitarFactor(f.key)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.7)',fontSize:'.68rem',padding:0,lineHeight:1}}>✕</button>}
            </span>
          ))}
        </div>
      </div>

      {comparables.length===0&&(
        <div style={{textAlign:'center',padding:'2.5rem 1rem',background:'var(--bg-input)',borderRadius:'10px',border:'2px dashed var(--border)'}}>
          <p style={{fontSize:'1.4rem',marginBottom:'.4rem'}}>🏠</p>
          <p style={{fontWeight:700,color:'var(--text-secondary)'}}>Sin comparables</p>
          <p style={{fontSize:'.8rem',color:'var(--text-muted)',marginTop:'.3rem'}}>Usa <strong>"Buscar con IA"</strong> o <strong>"Añadir Comparable"</strong>.</p>
        </div>
      )}

      {comparables.map((comp,i)=>(
        <TarjetaComparable key={i} idx={i} comp={comp} todos={todosFactores} onUpdate={actualizarCampo} onQuitar={quitar}/>
      ))}

      <TablaAcumulada comparables={comparables} todos={todosFactores} onUpdateComp={actualizarCampo}/>

      {/* Resumen */}
      {enNRRedondeado&&(
        <div style={{marginTop:'1rem',display:'grid',gridTemplateColumns:areaCH?'1fr 1fr':'1fr',gap:'1rem'}}>
          <div style={{padding:'1rem 1.25rem',background:'#0f172a',borderRadius:'10px'}}>
            <p style={{fontSize:'.68rem',color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.3rem'}}>VALOR HOMOLOGADO</p>
            <p style={{fontSize:'1.6rem',fontWeight:800,color:'#c9972a',fontVariantNumeric:'tabular-nums'}}>{fmtMXN(enNR)}</p>
            <p style={{fontSize:'.7rem',color:'#475569',marginTop:'.2rem'}}>Promedio de {vusHom.length} comparable{vusHom.length!==1?'s':''}</p>
          </div>
          {areaCH>0&&(
            <div style={{padding:'1rem 1.25rem',background:'#0f172a',borderRadius:'10px'}}>
              <p style={{fontSize:'.68rem',color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.3rem'}}>EN N.R. $/M²</p>
              <p style={{fontSize:'1.6rem',fontWeight:800,color:'#fff',fontVariantNumeric:'tabular-nums'}}>{fmtMXN(enNRRedondeado)}</p>
              <p style={{fontSize:'.7rem',color:'#475569',marginTop:'.2rem'}}>Redondeo estándar (≥.5 sube)</p>
            </div>
          )}
        </div>
      )}

      {enNRRedondeado&&areaCH>0&&(
        <div style={{marginTop:'1rem',padding:'1rem 1.25rem',background:'rgba(37,99,235,.06)',border:'1.5px solid rgba(37,99,235,.25)',borderRadius:'10px'}}>
          <p style={{fontSize:'.72rem',fontWeight:700,color:'#1d4ed8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.3rem'}}>T-1 — VALOR SUP. CONST. {areaCH} M²</p>
          <p style={{fontSize:'1.5rem',fontWeight:800,color:'#1d4ed8',fontVariantNumeric:'tabular-nums'}}>{fmtMXN(t1Total)}</p>
          <p style={{fontSize:'.72rem',color:'#475569',marginTop:'.2rem'}}>
            {areaCH} m² × {fmtMXN(enNRRedondeado)}/m²
            {incluyeExcedente&&valorExcedente>0?` + ${fmtMXN(valorExcedente)} (terreno excedente)`:''}
          </p>
          {/* ── Botón Enviar a Conclusión ── */}
          {t1Total>0&&(
            <button onClick={()=>update('valorMercado',t1Total.toFixed(2))}
              style={{marginTop:'.75rem',fontSize:'.78rem',padding:'.3rem .85rem',
                borderRadius:'7px',background:'rgba(37,99,235,.15)',
                color:'#1d4ed8',border:'1px solid rgba(37,99,235,.35)',
                cursor:'pointer',fontWeight:700,transition:'all .15s'}}>
              ↗ Enviar a Conclusión como Valor de Mercado
            </button>
          )}
        </div>
      )}

      {/* Botón excedente — visible cuando hay EN N.R. calculado */}
      {enNRRedondeado&&(
        <div style={{marginTop:'1rem'}}>
          <button onClick={()=>setIncluyeExcedente(v=>!v)} style={{display:'inline-flex',alignItems:'center',gap:'.45rem',padding:'.45rem 1rem',borderRadius:'8px',cursor:'pointer',border:`1.5px solid ${incluyeExcedente?'#c9972a':'var(--border)'}`,background:incluyeExcedente?'rgba(201,151,42,.1)':'var(--bg-input)',color:incluyeExcedente?'#c9972a':'var(--text-secondary)',fontSize:'.84rem',fontWeight:incluyeExcedente?700:500,transition:'all .15s'}}>
            {incluyeExcedente?'✓':'+'} Incluir Valor Terreno Excedente
          </button>

          {incluyeExcedente&&(
            <div style={{marginTop:'.85rem',padding:'1rem 1.1rem',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:'10px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem',alignItems:'start'}}>
              <div>
                <label style={{fontSize:'.72rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'.45rem'}}>Terreno Excedente (m²)</label>
                <input className={styles.input} type="number" step="0.01" value={form.terrenoExcedente||''} onChange={e=>update('terrenoExcedente',e.target.value)} placeholder={excedenteAuto>0?String(excedenteAuto):'0.00'}/>
                {excedenteAuto>0&&!form.terrenoExcedente&&<span style={{fontSize:'.7rem',color:'var(--text-muted)',marginTop:'.2rem',display:'block'}}>Auto: {excedenteAuto} m²</span>}
              </div>
              <div>
                <label style={{fontSize:'.72rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'.45rem'}}>EN N.R. $/M² (Comp. Terreno)</label>
                {enNRTerrenoAuto?(
                  <div style={{padding:'.5rem .75rem',background:'rgba(22,163,74,.08)',border:'1px solid rgba(22,163,74,.3)',borderRadius:'7px',fontSize:'.84rem',color:'#16a34a',fontWeight:700}}>✓ Auto: {fmtMXN(enNRTerrenoAuto)}</div>
                ):(
                  <div style={{padding:'.4rem .65rem',background:'#fef9c3',border:'1px solid #fde047',borderRadius:'7px',fontSize:'.78rem',color:'#713f12'}}>Llena Comp. Terreno primero</div>
                )}
                <input className={styles.input} type="number" step="0.01" style={{marginTop:'.45rem'}} value={form.enNRTerrenoManualCasa||''} onChange={e=>update('enNRTerrenoManualCasa',e.target.value)} placeholder={enNRTerrenoAuto?`Override (auto: ${enNRTerrenoAuto})`:'Ingresa $/m² manual'}/>
              </div>
              <div style={{padding:'.85rem 1rem',background:valorExcedente>0?'rgba(22,163,74,.06)':'var(--bg-input)',border:`1.5px solid ${valorExcedente>0?'rgba(22,163,74,.3)':'var(--border)'}`,borderRadius:'9px'}}>
                <p style={{fontSize:'.7rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.3rem'}}>Valor Terreno Excedente {excedente?`${excedente} m²`:''}</p>
                <p style={{fontSize:'1.2rem',fontWeight:800,color:valorExcedente>0?'#16a34a':'var(--text-muted)',fontVariantNumeric:'tabular-nums'}}>{valorExcedente>0?fmtMXN(valorExcedente):'—'}</p>
                {valorExcedente>0&&<p style={{fontSize:'.7rem',color:'#475569',marginTop:'.2rem'}}>{excedente} m² × {fmtMXN(enNRTerrenoFinal)}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {mostrarBuscador&&(
        <BuscadorComparables tipo="casa" form={form} onAgregar={agregarDesdeIA} onCerrar={()=>setMostrarBuscador(false)}/>
      )}

      {/* ── Modal banco de comparables BD ── */}
      {mostrarBuscadorBD&&(
        <ModalBancoBD
          tipo="Casa"
          comparables={comparablesBD}
          cargando={cargandoBD}
          onUsar={usarComparableBD}
          onCerrar={()=>setMostrarBuscadorBD(false)}
        />
      )}
    </div>
  )
}

// ── ModalBancoBD: modal para reciclar comparables de la BD ──────
// (usado en TabComparableCasa, TabComparableTerreno, TabMercadoRentas)
export function ModalBancoBD({ tipo, comparables, cargando, onUsar, onCerrar }) {
  const fmtMXN = v => v ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:0}).format(v) : '—'
  const fmtF   = f => f ? new Date(f).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'2-digit'}) : ''

  return (
    <div style={{position:'fixed',inset:0,zIndex:1100,display:'flex',alignItems:'center',
      justifyContent:'center',background:'rgba(0,0,0,.55)',backdropFilter:'blur(4px)'}}>
      <div style={{background:'var(--bg-card)',borderRadius:'14px',padding:'1.5rem',
        width:'100%',maxWidth:'600px',maxHeight:'80vh',overflowY:'auto',
        boxShadow:'0 20px 60px rgba(0,0,0,.35)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <h3 style={{fontWeight:800,fontSize:'1rem',color:'var(--text-primary)'}}>
            ♻️ Reciclar comparable de {tipo} — Banco
          </h3>
          <button onClick={onCerrar} style={{padding:'.25rem .45rem',borderRadius:'5px',
            background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:'1.1rem'}}>✕</button>
        </div>
        {cargando&&<p style={{textAlign:'center',color:'var(--text-muted)',padding:'2rem'}}>Cargando…</p>}
        {!cargando&&comparables.length===0&&(
          <p style={{textAlign:'center',color:'var(--text-muted)',padding:'2rem',fontSize:'.88rem'}}>
            Sin comparables guardados de este tipo.<br/>
            <small>Se guardan automáticamente cuando los agregas desde la IA.</small>
          </p>
        )}
        {!cargando&&comparables.map(c=>{
          const vuM2 = c.oferta&&c.superficie ? Math.round(c.oferta/c.superficie) : null
          return (
            <div key={c.id} style={{border:'1px solid var(--border)',borderRadius:'8px',
              padding:'.8rem 1rem',marginBottom:'.6rem',display:'flex',
              justifyContent:'space-between',alignItems:'flex-start',gap:'1rem'}}>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontWeight:700,fontSize:'.86rem',color:'var(--text-primary)',marginBottom:'.15rem'}}>
                  {[c.ciudad,c.colonia].filter(Boolean).join(' — ')||'Sin ubicación'}
                </p>
                <p style={{fontSize:'.8rem',color:'#c9972a',fontWeight:700,marginBottom:'.1rem',fontVariantNumeric:'tabular-nums'}}>
                  {fmtMXN(c.oferta)}{c.superficie?` · ${c.superficie} m²`:''}
                  {vuM2?<span style={{fontWeight:400,color:'var(--text-muted)'}}> · {fmtMXN(vuM2)}/m²</span>:null}
                </p>
                {c.descripcion&&<p style={{fontSize:'.74rem',color:'var(--text-muted)',lineHeight:1.4}}>{c.descripcion}</p>}
                <p style={{fontSize:'.7rem',color:'var(--text-muted)',marginTop:'.2rem'}}>
                  {fmtF(c.fecha_consulta)}{c.fuente?` · ${c.fuente}`:''}
                </p>
              </div>
              <button onClick={()=>onUsar(c)}
                style={{flexShrink:0,padding:'.35rem .75rem',borderRadius:'7px',
                  background:'#1e3a5f',color:'#fff',border:'none',
                  fontSize:'.8rem',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                + Usar
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Barra de Resultado Final ── */}
      {enNRRedondeado>0&&(
        <div style={{marginTop:'1.5rem',padding:'1rem 1.25rem',
          background: enviadoValormercado ?'#d1fae5':'#0f172a',
          border: enviadoValormercado ?'2px solid #16a34a':'2px solid rgba(201,151,42,.4)',
          borderRadius:'12px',transition:'all .3s',
          display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:'200px'}}>
            <p style={{fontSize:'.68rem',fontWeight:700,
              color: enviadoValormercado ?'#15803d':'#94a3b8',
              textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.3rem'}}>
              {enviadoValormercado ?'✓ Enviado a Conclusión':'VALOR FINAL — Valor de Mercado'}
            </p>
            <p style={{fontSize:'1.8rem',fontWeight:800,fontVariantNumeric:'tabular-nums',
              color: enviadoValormercado ?'#16a34a':'#c9972a',lineHeight:1}}>
              {new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(t1Total>0?t1Total:enNRRedondeado)}
            </p>
          </div>
          <div style={{display:'flex',gap:'.6rem',flexWrap:'wrap'}}>
            <button type="button"
              onClick={()=>{
                const r=Math.round(t1Total>0?t1Total:enNRRedondeado)
                update('valorMercado',String(r))
                setEnviadoValormercado(true)
                setTimeout(()=>setEnviadoValormercado(false),3000)
              }}
              style={{padding:'.5rem 1.1rem',borderRadius:'8px',
                background: enviadoValormercado ?'#16a34a':'#c9972a',
                border:'none',color:'#fff',cursor:'pointer',
                fontSize:'.84rem',fontWeight:800,whiteSpace:'nowrap',
                boxShadow:'0 2px 8px rgba(0,0,0,.3)',transition:'all .2s'}}>
              {enviadoValormercado ?'✓ Enviado':'↗ Enviar a Conclusión'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}