// frontend/src/pages/FormularioComercial/tabs/TabMercadoRentas.jsx — v3
// Diseño idéntico a TabComparableCasa: tarjetas colapsables, fotos, URL, IA, tabla bidireccional
import { useState, useRef } from 'react'
import { Plus, Trash2, Sparkles, Camera, ChevronDown, ChevronUp, ExternalLink, RotateCcw } from 'lucide-react'
import styles from '../Formulario.module.css'
import BuscadorComparables from '../../../components/BuscadorComparables'
import { useAuth } from '../../../context/AuthContext'
import { ModalBancoBD } from './TabComparableCasa'

const BASE_FACTORES = ['neg','ubic','sup','calid','edoCons']
const BASE_LABELS   = { neg:'NEG',ubic:'UBIC',sup:'SUP',calid:'CALID',edoCons:'EDO.CONS' }

const fmtMXN = (v) => v&&!isNaN(v)&&parseFloat(v)>0
  ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(parseFloat(v)) : '—'

const calcFRe   = (c,todos) => todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
const calcVuHom = (c,todos) => {
  if(!c.oferta||!c.supM2) return null
  return parseFloat(c.oferta)/parseFloat(c.supM2)*calcFRe(c,todos)
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
    <div style={{border:'1px solid var(--border)',borderRadius:'10px',background:'var(--bg-card)',overflow:'hidden',marginBottom:'.75rem'}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:'.75rem',padding:'.65rem 1rem',background:'var(--bg-input)',borderBottom:open?'1px solid var(--border)':'none',cursor:'pointer'}}>
        <span style={{width:'26px',height:'26px',borderRadius:'50%',flexShrink:0,background:'#1e3a5f',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.76rem',fontWeight:800}}>{idx+1}</span>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontWeight:700,fontSize:'.88rem',color:'var(--text-primary)'}}>
            {comp.ciudad||comp.colonia?`${comp.ciudad||''}${comp.colonia?` — ${comp.colonia}`:''}`:`Comparable ${idx+1}`}
          </p>
          <p style={{fontSize:'.73rem',color:'var(--text-muted)',marginTop:'.08rem'}}>
            {comp.oferta?`${fmtMXN(comp.oferta)}/mes`:'Sin renta'}
            {comp.supM2?` · ${comp.supM2} m²`:''}
            {vuHom?` · ${fmtMXN(vuHom)}/m²/mes`:''}
            {comp.informante?` · ${comp.informante}`:''}
          </p>
        </div>
        <div style={{display:'flex',gap:'.4rem',alignItems:'center'}}>
          <button onClick={e=>{e.stopPropagation();onQuitar(idx)}} style={{padding:'.28rem .38rem',borderRadius:'5px',cursor:'pointer',background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626'}} title="Eliminar"><Trash2 size={13}/></button>
          {open?<ChevronUp size={15}/>:<ChevronDown size={15}/>}
        </div>
      </div>

      {open&&(
        <div style={{padding:'1rem'}}>
          <div className={styles.grid3} style={{marginBottom:'.85rem'}}>
            <div className={styles.field}><label className={styles.label}>Ciudad / Municipio</label><input className={styles.input} value={comp.ciudad||''} onChange={e=>upd('ciudad',e.target.value)} placeholder="Orizaba"/></div>
            <div className={styles.field}><label className={styles.label}>Colonia</label><input className={styles.input} value={comp.colonia||''} onChange={e=>upd('colonia',e.target.value)} placeholder="Centro"/></div>
            <div className={styles.field}><label className={styles.label}>Teléfono</label><input className={styles.input} value={comp.telefono||''} onChange={e=>upd('telefono',e.target.value)}/></div>
            <div className={styles.field}><label className={styles.label}>Informante / Fuente</label><input className={styles.input} value={comp.informante||''} onChange={e=>upd('informante',e.target.value)}/></div>
            <div className={`${styles.field} ${styles.req}`}>
              <label className={`${styles.label} ${styles.req}`}>Renta Mensual ($)</label>
              <input className={styles.input} type="number" value={comp.oferta||''} onChange={e=>upd('oferta',e.target.value)}/>
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
              <label className={`${styles.label} ${styles.req}`}>Superficie (m²)</label>
              <input className={styles.input} type="number" value={comp.supM2||''} onChange={e=>upd('supM2',e.target.value)}/>
            </div>
            <div className={`${styles.field} ${styles.span3}`}>
              <label className={styles.label}>Características</label>
              <textarea className={styles.textarea} value={comp.caracteristicas||''} onChange={e=>upd('caracteristicas',e.target.value)}/>
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
                  <a href={comp.url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'.3rem',padding:'.42rem .7rem',borderRadius:'7px',flexShrink:0,background:'rgba(37,99,235,.08)',border:'1px solid rgba(37,99,235,.25)',color:'#2563eb',fontSize:'.78rem',fontWeight:600,textDecoration:'none'}}>
                    <ExternalLink size={13}/> Ver
                  </a>
                )}
              </div>
            </div>
          </div>

          <p style={{fontSize:'.74rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.55rem'}}>Factores de Homologación</p>
          <div style={{display:'flex',flexWrap:'wrap',gap:'.5rem',marginBottom:'.55rem'}}>
            {todos.map(f=>(
              <div key={f.key} style={{minWidth:'72px'}}>
                <label style={{fontSize:'.66rem',color:'var(--text-muted)',textTransform:'uppercase',display:'block',marginBottom:'.18rem'}}>{f.label}</label>
                <input className={styles.input} type="number" step="0.01" min="0.5" max="1.5" style={{textAlign:'center',padding:'.28rem .35rem'}} value={comp.factores?.[f.key]||''} onChange={e=>updF(f.key,e.target.value)} placeholder="1.00"/>
              </div>
            ))}
          </div>

          <div style={{display:'flex',gap:'1.5rem',flexWrap:'wrap',padding:'.55rem .8rem',background:'#0f172a',borderRadius:'7px',marginBottom:'1rem'}}>
            <div><p style={{fontSize:'.66rem',color:'#64748b',textTransform:'uppercase'}}>$/m²/mes Base</p><p style={{fontSize:'.88rem',fontWeight:700,color:'#94a3b8'}}>{comp.oferta&&comp.supM2?fmtMXN(parseFloat(comp.oferta)/parseFloat(comp.supM2)):'—'}</p></div>
            <div><p style={{fontSize:'.66rem',color:'#64748b',textTransform:'uppercase'}}>FRe</p><p style={{fontSize:'.88rem',fontWeight:700,color:'#60a5fa'}}>{fre.toFixed(4)}</p></div>
            <div><p style={{fontSize:'.66rem',color:'#64748b',textTransform:'uppercase'}}>$/m²/mes Homologado</p><p style={{fontSize:'.88rem',fontWeight:700,color:'#c9972a'}}>{vuHom?fmtMXN(vuHom):'—'}</p></div>
          </div>

          <div>
            <p style={{fontSize:'.74rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.5rem'}}>Fotografías del comparable</p>
            <div style={{display:'flex',gap:'.65rem',flexWrap:'wrap',alignItems:'center'}}>
              {(comp.fotos||[]).map((src,fi)=>(
                <div key={fi} style={{position:'relative'}}>
                  <img src={src} alt="" style={{width:'80px',height:'64px',objectFit:'cover',borderRadius:'6px',border:'1px solid var(--border)'}}/>
                  <button style={{position:'absolute',top:'.2rem',right:'.2rem',background:'rgba(0,0,0,.55)',color:'#fff',borderRadius:'50%',width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.6rem',border:'none',cursor:'pointer'}} onClick={()=>upd('fotos',(comp.fotos||[]).filter((_,j)=>j!==fi))}>✕</button>
                </div>
              ))}
              <input type="file" accept="image/*" multiple hidden ref={fotoRef} onChange={onFoto}/>
              <button onClick={()=>fotoRef.current?.click()} style={{width:'80px',height:'64px',borderRadius:'6px',border:'2px dashed var(--border)',background:'var(--bg-input)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'.25rem',color:'var(--text-muted)',fontSize:'.68rem',cursor:'pointer'}}>
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
              <th style={{...thBase,minWidth:'95px'}}>Renta/mes ($)</th>
              <th style={thBase}>Sup.</th>
              <th style={thBase}>$/m²/mes</th>
              {todos.map(f=><th key={f.key} style={{...thBase,background:'#1a3050',color:'#93c5fd'}}>{f.label}</th>)}
              <th style={{...thBase,background:'#162030',color:'#60a5fa'}}>FRe</th>
              <th style={{...thBase,background:'#1e3a5f',color:'#c9972a'}}>$/m² Hom.</th>
              <th style={{...thBase,minWidth:'50px'}}>Fuente</th>
            </tr>
          </thead>
          <tbody>
            {comparables.map((c,i)=>{
              const fre=calcFRe(c,todos); const vuHom=calcVuHom(c,todos)
              const base=c.oferta&&c.supM2?parseFloat(c.oferta)/parseFloat(c.supM2):null
              const updF=(k,v)=>onUpdateComp(i,'factores',{...c.factores,[k]:v})
              return (
                <tr key={i} style={{background:i%2===0?'var(--bg-card)':'var(--bg-input)'}}>
                  <td style={{...tdBase,fontWeight:700,color:'#1e3a5f'}}>{i+1}</td>
                  <td style={{...tdBase,textAlign:'left'}}><input style={{...inputT,width:'78px',textAlign:'left'}} value={c.ciudad||''} onChange={e=>onUpdateComp(i,'ciudad',e.target.value)}/></td>
                  <td style={{...tdBase,textAlign:'left'}}><input style={{...inputT,width:'78px',textAlign:'left'}} value={c.colonia||''} onChange={e=>onUpdateComp(i,'colonia',e.target.value)}/></td>
                  <td style={tdBase}><input type="number" style={{...inputT,width:'88px'}} value={c.oferta||''} onChange={e=>onUpdateComp(i,'oferta',e.target.value)} placeholder="0"/></td>
                  <td style={tdBase}><input type="number" style={inputT} value={c.supM2||''} onChange={e=>onUpdateComp(i,'supM2',e.target.value)} placeholder="0"/></td>
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
                      <a href={c.url} target="_blank" rel="noopener noreferrer" title={c.informante||c.url} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'26px',height:'26px',borderRadius:'5px',background:'rgba(37,99,235,.08)',border:'1px solid rgba(37,99,235,.2)',color:'#2563eb',textDecoration:'none'}}><ExternalLink size={12}/></a>
                    ):<span style={{fontSize:'.7rem',color:'var(--text-muted)'}}>{c.informante||'—'}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{background:'#0f172a'}}>
              <td colSpan={6+todos.length} style={{padding:'.45rem .65rem',fontWeight:700,fontSize:'.72rem',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',textAlign:'right',border:'1px solid #1e293b'}}>EN N.R. — VALOR HOMOLOGADO PROMEDIO $/m²/mes:</td>
              <td style={{padding:'.45rem .65rem',fontWeight:800,fontSize:'.9rem',color:'#c9972a',textAlign:'center',border:'1px solid #1e293b',fontVariantNumeric:'tabular-nums'}}>{enNR?`$${enNR.toLocaleString('es-MX')}`:'—'}</td>
              <td style={{border:'1px solid #1e293b'}}/>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default function TabMercadoRentas({ form, update, updateNested, updateDeep }) {
    const [enviadoValorrentas, setEnviadoValorrentas] = useState(false)
const [mostrarBuscador,   setMostrarBuscador]   = useState(false)
  const [autoLlenando,      setAutoLlenando]      = useState(false)
  const archivoAutoRef = useRef(null)
  const [mostrarBuscBD,   setMostrarBuscBD]   = useState(false)
  const [comparablesBD,   setComparablesBD]   = useState([])
  const [cargandoBD,      setCargandoBD]      = useState(false)
  const { authFetch } = useAuth()
  const [botonActivo,     setBotonActivo]     = useState(false)
  const [nuevoFactor,     setNuevoFactor]     = useState('')

  const comparables    = form.comparablesRentas    || []
  const factoresCustom = form.factoresRentasCustom || []
  const todosFactores  = [...BASE_FACTORES.map(k=>({key:k,label:BASE_LABELS[k]})),...factoresCustom]

  const vusHom = comparables.map(c=>calcVuHom(c,todosFactores)).filter(v=>v!==null)
  const enNR   = vusHom.length?vusHom.reduce((a,b)=>a+b,0)/vusHom.length:null
  const enNRRedondeado = enNR?Math.round(enNR):null

  const cargarBD = async () => {
    setCargandoBD(true)
    try {
      const r = await authFetch('/api/comparables?tipo=rentas&limit=50')
      const d = await r.json()
      setComparablesBD(d.comparables||[])
    } catch(e){} finally{setCargandoBD(false)}
  }
  const usarComparableBD = (comp) => {
    update('comparablesRentas',[...comparables,{
      ciudad:comp.ciudad||'', colonia:comp.colonia||'',
      oferta:String(comp.oferta||''), supM2:String(comp.superficie||''),
      caracteristicas:comp.descripcion||'', informante:comp.informante||comp.fuente||'Banco BD',
      fuente:comp.fuente||'', url:comp.url||'', telefono:comp.telefono||'',
      factores:{neg:1,ubic:1,sup:1,calid:1,edoCons:1},fotos:[],
    }])
    setMostrarBuscBD(false)
  }
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
      const token = localStorage.getItem('giaval_token')
      const fd = new FormData()
      // IMPORTANTE: campos de texto ANTES del archivo para que multer los lea correctamente
      fd.append('tipoDocumento', 'comparable_rentas')
      // Prompt explícito: sin backticks, sin saltos de línea, sin llaves especiales
      fd.append('archivo', file)  // archivo siempre al final

      const r = await fetch('/api/ocr/leer-documento', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
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
      const supVal = raw.supM2 || raw.areaTerreno || raw.supConstruida || raw.areaConstruccion ||
        raw.sup_m2 || raw.superficie_terreno || raw.superficie || raw.terreno || 0
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

      update('comparablesRentas', [...comparables, {
        ciudad:      String(raw.ciudad || raw.municipio || ''),
        colonia:     String(raw.colonia || raw.ubicacion || ''),
        oferta:      oferta,
        supM2: sup,
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
    update('comparablesRentas',[...comparables,{ciudad:'',colonia:'',telefono:'',informante:'',url:'',caracteristicas:'',oferta:'',supM2:'',factores:{neg:1,ubic:1,sup:1,calid:1,edoCons:1},fotos:[]}])
  }
  const quitar = (i) => {
    if(!window.confirm('¿Desea eliminar este comparable?\nEsta acción no se puede deshacer.')) return
    update('comparablesRentas',comparables.filter((_,j)=>j!==i))
  }
  const actualizarCampo = (i,campo,valor) =>
    update('comparablesRentas',comparables.map((c,j)=>j===i?{...c,[campo]:valor}:c))
  const agregarDesdeIA = (comp) => {
    update('comparablesRentas',[...comparables,{
      ciudad:comp.ciudad||'',colonia:comp.colonia||'',
      oferta:String(comp.oferta||''),supM2:String(comp.supM2||''),
      caracteristicas:comp.descripcion||'',informante:comp.fuente||'Gemini IA',
      url:comp.url||'',telefono:'',
      factores:{neg:1,ubic:1,sup:1,calid:1,edoCons:1},fotos:[],
    }])
  }
  const agregarFactor = () => {
    const label=nuevoFactor.trim().toUpperCase(); if(!label) return
    update('factoresRentasCustom',[...factoresCustom,{key:`fr_${Date.now()}`,label}]); setNuevoFactor('')
  }
  const quitarFactor = (key) => update('factoresRentasCustom',factoresCustom.filter(f=>f.key!==key))

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem',flexWrap:'wrap',gap:'.65rem'}}>
        <div>
          <h3 style={{fontWeight:800,fontSize:'1rem',color:'var(--text-primary)',marginBottom:'.2rem'}}>Mercado de Rentas — Capitalización de Ingresos</h3>
          <p style={{fontSize:'.78rem',color:'var(--text-muted)'}}>Propiedades en renta similares para estimar el mercado de arrendamiento.</p>
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
          <button onClick={()=>setMostrarBuscador(true)} style={{display:'inline-flex',alignItems:'center',gap:'.4rem',padding:'.45rem .9rem',borderRadius:'8px',cursor:'pointer',border:'1.5px solid #c9972a',background:'rgba(201,151,42,.1)',color:'#c9972a',fontSize:'.82rem',fontWeight:700}}><Sparkles size={14}/> Buscar con IA</button>
          <button onClick={agregar} style={{display:'inline-flex',alignItems:'center',gap:'.4rem',padding:'.45rem .9rem',borderRadius:'8px',cursor:'pointer',border:`1.5px solid ${botonActivo?'#2563eb':'var(--border)'}`,background:botonActivo?'rgba(37,99,235,.15)':'var(--bg-card)',color:botonActivo?'#2563eb':'var(--text-secondary)',fontSize:'.82rem',fontWeight:botonActivo?700:600,boxShadow:botonActivo?'0 0 0 3px rgba(37,99,235,.2)':'none',transform:botonActivo?'scale(1.03)':'scale(1)',transition:'all .15s'}}><Plus size={14}/> Añadir Comparable</button>
        </div>
      </div>

      <div style={{padding:'.6rem .85rem',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:'8px',marginBottom:'1.1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.45rem'}}>
          <p style={{fontSize:'.73rem',fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'.05em'}}>Factores activos</p>
        </div>
        <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',alignItems:'center',marginBottom:'.5rem'}}>
          {todosFactores.map(f=>(
            <span key={f.key} style={{fontSize:'.71rem',padding:'.18rem .5rem',borderRadius:'4px',background:BASE_FACTORES.includes(f.key)?'#1e3a5f':'#7c3aed',color:'#fff',fontWeight:600,display:'flex',alignItems:'center',gap:'.28rem'}}>
              {f.label}
              {!BASE_FACTORES.includes(f.key)&&<button onClick={()=>quitarFactor(f.key)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.7)',fontSize:'.68rem',padding:0,lineHeight:1}}>✕</button>}
            </span>
          ))}
          <div style={{display:'flex',gap:'.35rem',alignItems:'center',marginLeft:'auto'}}>
            <input className={styles.input} style={{width:'150px',padding:'.25rem .5rem',fontSize:'.78rem'}} value={nuevoFactor} onChange={e=>setNuevoFactor(e.target.value)} onKeyDown={e=>e.key==='Enter'&&agregarFactor()} placeholder="Nuevo factor…"/>
            <button onClick={agregarFactor} style={{fontSize:'.75rem',padding:'.25rem .55rem',borderRadius:'5px',background:'var(--bg-card)',border:'1px solid var(--border)',cursor:'pointer',color:'var(--text-secondary)'}}>+ Agregar</button>
          </div>
        </div>
      </div>

      {comparables.length===0&&(
        <div style={{textAlign:'center',padding:'2.5rem 1rem',background:'var(--bg-input)',borderRadius:'10px',border:'2px dashed var(--border)'}}>
          <p style={{fontSize:'1.4rem',marginBottom:'.4rem'}}>🔑</p>
          <p style={{fontWeight:700,color:'var(--text-secondary)'}}>Sin comparables de renta</p>
          <p style={{fontSize:'.8rem',color:'var(--text-muted)',marginTop:'.3rem'}}>Usa <strong>"Buscar con IA"</strong> o <strong>"Añadir Comparable"</strong>.</p>
        </div>
      )}

      {comparables.map((comp,i)=>(
        <TarjetaComparable key={i} idx={i} comp={comp} todos={todosFactores} onUpdate={actualizarCampo} onQuitar={quitar}/>
      ))}

      <TablaAcumulada comparables={comparables} todos={todosFactores} onUpdateComp={actualizarCampo}/>

      {enNRRedondeado&&(
        <div style={{marginTop:'1rem',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
          <div style={{padding:'1rem 1.25rem',background:'#0f172a',borderRadius:'10px'}}>
            <p style={{fontSize:'.68rem',color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.3rem'}}>VALOR HOMOLOGADO</p>
            <p style={{fontSize:'1.6rem',fontWeight:800,color:'#c9972a',fontVariantNumeric:'tabular-nums'}}>{fmtMXN(enNR)}</p>
            <p style={{fontSize:'.7rem',color:'#475569',marginTop:'.2rem'}}>Promedio de {vusHom.length} comparable{vusHom.length!==1?'s':''}</p>
          </div>
          <div style={{padding:'1rem 1.25rem',background:'#0f172a',borderRadius:'10px'}}>
            <p style={{fontSize:'.68rem',color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.3rem'}}>EN N.R. $/m²/mes</p>
            <p style={{fontSize:'1.6rem',fontWeight:800,color:'#fff',fontVariantNumeric:'tabular-nums'}}>{fmtMXN(enNRRedondeado)}</p>
            <p style={{fontSize:'.7rem',color:'#475569',marginTop:'.2rem'}}>Redondeo estándar — referencia para tab Ingresos</p>
          </div>
        </div>
      )}
      {enNRRedondeado&&(
        <div style={{marginTop:'.75rem',display:'flex',gap:'.75rem',flexWrap:'wrap',alignItems:'center',
          padding:'.85rem 1rem',background:'rgba(30,58,95,.06)',border:'1px solid rgba(30,58,95,.25)',borderRadius:'9px'}}>
          <div style={{flex:1}}>
            <p style={{fontSize:'.7rem',fontWeight:700,color:'#1e3a5f',textTransform:'uppercase',
              letterSpacing:'.04em',marginBottom:'.2rem'}}>EN N.R. $/m²/mes redondeado</p>
            <p style={{fontSize:'1.1rem',fontWeight:800,color:'#1e3a5f',fontVariantNumeric:'tabular-nums'}}>
              {fmtMXN(enNRRedondeado)}
            </p>
          </div>
          <button onClick={()=>update('valorRentas',
            (Math.round(enNRRedondeado*(parseFloat(form.areaConstruccionHabitable)||0)/0.09)).toFixed(2))}
            style={{padding:'.4rem .9rem',borderRadius:'7px',border:'none',
              background:'#1e3a5f',color:'#fff',cursor:'pointer',fontSize:'.8rem',fontWeight:700}}>
            ↗ Enviar EN N.R. a Conclusión
          </button>
        </div>
      )}

      {mostrarBuscBD&&(
        <ModalBancoBD tipo="Renta" comparables={comparablesBD} cargando={cargandoBD}
          onUsar={usarComparableBD} onCerrar={()=>setMostrarBuscBD(false)}/>
      )}

      {mostrarBuscador&&(
        <BuscadorComparables tipo="rentas" form={form} onAgregar={agregarDesdeIA} onCerrar={()=>setMostrarBuscador(false)}/>
      )}

      {/* ── Barra de Resultado Final ── */}
      {enNRRedondeado>0&&(
        <div style={{marginTop:'1.5rem',padding:'1rem 1.25rem',
          background: enviadoValorrentas?'#d1fae5':'#0f172a',
          border: enviadoValorrentas?'2px solid #16a34a':'2px solid rgba(201,151,42,.4)',
          borderRadius:'12px',transition:'all .3s',
          display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:'200px'}}>
            <p style={{fontSize:'.68rem',fontWeight:700,
              color: enviadoValorrentas?'#15803d':'#94a3b8',
              textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.3rem'}}>
              {enviadoValorrentas?'✓ EN N.R. enviado → Tab Ingresos':'EN N.R. $/m²/mes — RESULTADO FINAL'}
            </p>
            <p style={{fontSize:'1.8rem',fontWeight:800,fontVariantNumeric:'tabular-nums',
              color: enviadoValorrentas?'#16a34a':'#c9972a',lineHeight:1}}>
              {new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(enNRRedondeado)}
            </p>
            <p style={{fontSize:'.7rem',color:'#64748b',marginTop:'.2rem'}}>
              Redondeado: {new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Math.round(enNRRedondeado))}
              {' · '}Tab Ingresos lo usa para capitalizar la renta
            </p>
          </div>
          <button type="button"
            onClick={()=>{
              update('enNRRentasManual', String(Math.round(enNRRedondeado)))
              setEnviadoValorrentas(true)
              setTimeout(()=>setEnviadoValorrentas(false),3000)
            }}
            style={{padding:'.55rem 1.2rem',borderRadius:'8px',
              background: enviadoValorrentas?'#16a34a':'#c9972a',
              border:'none',color:'#fff',cursor:'pointer',
              fontSize:'.84rem',fontWeight:800,whiteSpace:'nowrap',
              boxShadow:'0 2px 8px rgba(0,0,0,.3)',transition:'all .2s'}}>
            {enviadoValorrentas?'✓ Guardado':'↺ Redondear y enviar a Ingresos'}
          </button>
        </div>
      )}
      {enNRRedondeado>0&&(
        <div style={{marginTop:'1.5rem',padding:'1rem 1.25rem',
          background: enviadoValorrentas ?'#d1fae5':'#0f172a',
          border: enviadoValorrentas ?'2px solid #16a34a':'2px solid rgba(201,151,42,.4)',
          borderRadius:'12px',transition:'all .3s',
          display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:'200px'}}>
            <p style={{fontSize:'.68rem',fontWeight:700,
              color: enviadoValorrentas ?'#15803d':'#94a3b8',
              textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.3rem'}}>
              {enviadoValorrentas ?'✓ Enviado a Conclusión':'VALOR FINAL — Valor por Rentas'}
            </p>
            <p style={{fontSize:'1.8rem',fontWeight:800,fontVariantNumeric:'tabular-nums',
              color: enviadoValorrentas ?'#16a34a':'#c9972a',lineHeight:1}}>
              {new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(enNRRedondeado)}
            </p>
          </div>
          <div style={{display:'flex',gap:'.6rem',flexWrap:'wrap'}}>
            <button type="button"
              onClick={()=>{
                const r=Math.round(enNRRedondeado)
                update('valorRentas',String(r))
                setEnviadoValorrentas(true)
                setTimeout(()=>setEnviadoValorrentas(false),3000)
              }}
              style={{padding:'.5rem 1.1rem',borderRadius:'8px',
                background: enviadoValorrentas ?'#16a34a':'#c9972a',
                border:'none',color:'#fff',cursor:'pointer',
                fontSize:'.84rem',fontWeight:800,whiteSpace:'nowrap',
                boxShadow:'0 2px 8px rgba(0,0,0,.3)',transition:'all .2s'}}>
              {enviadoValorrentas ?'✓ Enviado':'↗ Enviar a Conclusión'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}