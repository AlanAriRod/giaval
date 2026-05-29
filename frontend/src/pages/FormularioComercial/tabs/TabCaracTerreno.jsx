// TabCaracTerreno.jsx — v3
// Cambios:
// - Notario: etiqueta 1 = "Nombre del Notario Público", etiqueta 2 = "Número de Notaría"
//   (antes se mostraban ambas como "Notario Público")
// - Mapa croquis: reemplaza OpenStreetMap Static (caído) por enlace que abre
//   Google Maps y un iframe embed de OSM para visualización confiable
import { useState, useRef } from 'react'
import { ChevronDown, ExternalLink, Plus, Trash2, Pencil, MapPin } from 'lucide-react'
import styles from '../Formulario.module.css'

const MEDIDAS_SEGUN=[
  'Escritura Pública','Título de Propiedad','Croquis Municipal',
  'Plano Arquitectónico','Croquis Catastral','Levantamiento Físico',
  'Sentencia Judicial','Resolución Administrativa','Otro',
]
const NUM_FRENTES_OPTS=['1 (UNO)','2 (DOS)','3 (TRES)','4 (CUATRO)']
const ORIENTACIONES=['Norte','Sur','Este','Oeste','Oriente','Poniente','Suroeste','Sureste','Noroeste','Noreste','Otro']
const MEDIDA_VACIA=()=>({id:Date.now()+Math.random(),orientacion:'Norte',orientacionOtro:'',distancia:'',colindante:''})

function SubtituloEditable({value,onChange,placeholder}){
  const [editando,setEditando]=useState(false)
  if(editando){
    return <input autoFocus value={value} onChange={e=>onChange(e.target.value)}
      onBlur={()=>setEditando(false)} onKeyDown={e=>e.key==='Enter'&&setEditando(false)}
      style={{fontSize:'.8rem',fontWeight:700,color:'var(--text-primary)',background:'var(--bg-input)',
        border:'1.5px solid var(--border-focus,#2563eb)',borderRadius:'5px',padding:'.2rem .5rem',
        width:'100%',textTransform:'uppercase',letterSpacing:'.04em',outline:'none'}} placeholder={placeholder}/>
  }
  return (
    <div onClick={()=>setEditando(true)} title="Clic para editar este título"
      style={{display:'inline-flex',alignItems:'center',gap:'.3rem',fontSize:'.8rem',fontWeight:700,
        color:'#1e3a5f',textTransform:'uppercase',letterSpacing:'.04em',cursor:'text',
        padding:'.1rem .25rem',borderRadius:'4px',border:'1px dashed transparent',transition:'border-color .15s',marginBottom:'.2rem'}}
      onMouseEnter={e=>e.currentTarget.style.borderColor='var(--border)'}
      onMouseLeave={e=>e.currentTarget.style.borderColor='transparent'}>
      {value||placeholder}<Pencil size={11} style={{opacity:.4,flexShrink:0}}/>
    </div>
  )
}

function Seccion({titulo,children,defaultOpen=true,extraHeader}){
  const [open,setOpen]=useState(defaultOpen)
  return (
    <div className={styles.section}>
      <div className={`${styles.sectHeader} ${open?styles.sectHeaderOpen:''}`}>
        <span className={styles.sectTitle} onClick={()=>setOpen(o=>!o)} style={{flex:1,cursor:'pointer'}}>{titulo}</span>
        {extraHeader&&<div onClick={e=>e.stopPropagation()} style={{marginRight:'.5rem'}}>{extraHeader}</div>}
        <ChevronDown size={16} className={`${styles.sectChevron} ${open?styles.sectChevronOpen:''}`}
          onClick={()=>setOpen(o=>!o)} style={{cursor:'pointer'}}/>
      </div>
      {open&&<div className={styles.sectBody}>{children}</div>}
    </div>
  )
}

// ── Escalas de mapa en metros ─────────────────────────────────
// zoom → descripción y radio visible aprox
const ZOOM_INFO = [
  {z:12, label:'Zona amplia',    radio:'~5 km'},
  {z:13, label:'Ciudad',         radio:'~2.5 km'},
  {z:14, label:'Barrio',         radio:'~1.2 km'},
  {z:15, label:'Calle',          radio:'~600 m'},  // macro recomendado
  {z:16, label:'Manzana',        radio:'~300 m'},
  {z:17, label:'Predio cercano', radio:'~150 m'},  // micro recomendado
  {z:18, label:'Predio detalle', radio:'~75 m'},
]

// ── Componente de mapa con escala manual y fijado como imagen ─────
function MapaSlot({ campo, label, lat, lon, form, update }) {
  const tieneCoord = lat && lon && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon))
  const [mostrar,  setMostrar]  = useState(false)
  const [zoom,     setZoom]     = useState(campo.includes('Macro') ? 14 : 17)
  const [fijando,  setFijando]  = useState(false)
  const imgRef    = useRef(null)

  const zInfo   = ZOOM_INFO.find(z=>z.z===zoom) || ZOOM_INFO[3]
  const d       = zoom<=12?0.15 : zoom<=13?0.07 : zoom<=14?0.035 : zoom<=15?0.018 : zoom<=16?0.009 : zoom<=17?0.004 : 0.002
  const bbox    = tieneCoord ? `${+lon-d},${+lat-d},${+lon+d},${+lat+d}` : null
  const osmUrl  = tieneCoord
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`
    : null
  const googleUrl = tieneCoord ? `https://maps.google.com/?q=${lat},${lon}&z=${zoom}` : null
  const croquisFijado = form[campo]

  // Fijar: genera URL del mapa estático y lo convierte a JPEG via Canvas
  const fijarMapa = async () => {
    if (!tieneCoord) return
    setFijando(true)
    // API estática de tiles de OSM — funciona sin CORS
    const size = 640
    const urlStatic = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=${zoom}&size=${size}x480&markers=${lat},${lon},red-pushpin`
    const tryLoad = (url) => new Promise((res, rej) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth||size; canvas.height = img.naturalHeight||480
          const ctx = canvas.getContext('2d')
          ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height)
          ctx.drawImage(img,0,0)
          res(canvas.toDataURL('image/jpeg',0.88))
        } catch(e){ rej(e) }
      }
      img.onerror = () => rej(new Error('No cargó'))
      img.src = url
    })
    try {
      const jpeg = await tryLoad(urlStatic)
      update(campo, jpeg)
    } catch {
      // Si el proveedor falla, indicar que capture pantalla manualmente
      alert(
        'La captura automática no está disponible en este momento.\n\n' +
        'ALTERNATIVA RÁPIDA:\n' +
        '1. Haz clic en "Abrir en Google Maps" abajo\n' +
        '2. Ajusta el zoom a nivel "' + zInfo.label + '" (' + zInfo.radio + ')\n' +
        '3. Toma una captura de pantalla (Win+Shift+S en Windows)\n' +
        '4. Súbela con el botón "Subir imagen de croquis"'
      )
    }
    setFijando(false)
  }

  return (
    <div style={{minWidth:'260px'}}>
      <p style={{fontSize:'.78rem',fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',
        letterSpacing:'.04em',marginBottom:'.5rem'}}>{label}</p>

      {!tieneCoord&&(
        <div style={{padding:'.6rem .85rem',background:'#fef9c3',border:'1px solid #fde047',
          borderRadius:'6px',fontSize:'.78rem',color:'#713f12',marginBottom:'.5rem'}}>
          ⚠ Captura Latitud y Longitud en Datos Generales para activar el mapa.
        </div>
      )}

      {tieneCoord&&!mostrar&&(
        <button className={styles.addRowBtn} style={{marginBottom:'.6rem'}}
          onClick={()=>setMostrar(true)}>
          <MapPin size={13}/> Mostrar mapa
        </button>
      )}

      {tieneCoord&&mostrar&&(
        <div>
          {/* ── Slider de zoom / escala ── */}
          <div style={{marginBottom:'.65rem',padding:'.65rem .85rem',
            background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:'8px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.4rem'}}>
              <label style={{fontSize:'.72rem',fontWeight:700,color:'var(--text-muted)',
                textTransform:'uppercase',letterSpacing:'.04em'}}>
                Proximidad / Escala
              </label>
              <span style={{fontSize:'.78rem',fontWeight:700,color:'#c9972a'}}>
                {zInfo.label} · {zInfo.radio}
              </span>
            </div>
            <input type="range" min={12} max={18} step={1} value={zoom}
              onChange={e=>setZoom(Number(e.target.value))}
              style={{width:'100%',accentColor:'#c9972a',cursor:'pointer'}}/>
            <div style={{display:'flex',justifyContent:'space-between',
              fontSize:'.62rem',color:'var(--text-muted)',marginTop:'.2rem'}}>
              <span>← Más alejado (ciudad)</span>
              <span>(predio) Más cercano →</span>
            </div>
          </div>

          <iframe key={zoom}
            src={osmUrl}
            title={label}
            style={{width:'100%',maxWidth:'360px',height:'220px',borderRadius:'8px',
              border:'1px solid var(--border)',display:'block'}}
            loading="lazy"
          />

          <div style={{display:'flex',gap:'.5rem',marginTop:'.55rem',flexWrap:'wrap'}}>
            <button onClick={fijarMapa} disabled={fijando}
              style={{display:'inline-flex',alignItems:'center',gap:'.3rem',padding:'.38rem .85rem',
                borderRadius:'6px',background:croquisFijado?'rgba(22,163,74,.1)':'rgba(201,151,42,.12)',
                border:`1px solid ${croquisFijado?'#16a34a':'#c9972a'}`,
                color:croquisFijado?'#16a34a':'#c9972a',
                fontSize:'.76rem',fontWeight:700,cursor:fijando?'wait':'pointer',
                opacity:fijando?.65:1}}>
              {fijando?'⏳ Capturando…':croquisFijado?'🔄 Actualizar croquis':'📌 Fijar como croquis'}
            </button>
            <a href={googleUrl} target="_blank" rel="noopener noreferrer"
              style={{display:'inline-flex',alignItems:'center',gap:'.3rem',padding:'.38rem .8rem',
                borderRadius:'6px',background:'#eff6ff',border:'1px solid #bfdbfe',
                color:'#1d4ed8',fontSize:'.76rem',fontWeight:700,textDecoration:'none'}}>
              <ExternalLink size={12}/> Google Maps
            </a>
            {croquisFijado&&(
              <button onClick={()=>update(campo,null)}
                style={{padding:'.38rem .8rem',borderRadius:'6px',background:'#fef2f2',
                  border:'1px solid #fecaca',color:'#dc2626',fontSize:'.76rem',
                  fontWeight:600,cursor:'pointer'}}>
                ✕ Limpiar croquis
              </button>
            )}
            <button onClick={()=>setMostrar(false)}
              style={{padding:'.38rem .7rem',borderRadius:'6px',background:'var(--bg-input)',
                border:'1px solid var(--border)',color:'var(--text-muted)',fontSize:'.76rem',cursor:'pointer'}}>
              Ocultar mapa
            </button>
          </div>

          {croquisFijado&&(
            <div style={{marginTop:'.65rem',padding:'.5rem',background:'#f0fdf4',
              border:'1px solid #bbf7d0',borderRadius:'7px',fontSize:'.75rem',color:'#15803d',fontWeight:600}}>
              ✓ Croquis fijado — se incluirá en el PDF
            </div>
          )}
          {!croquisFijado&&(
            <p style={{fontSize:'.69rem',color:'var(--text-muted)',marginTop:'.4rem',lineHeight:1.5}}>
              💡 Ajusta el slider hasta la proximidad deseada, luego presiona
              <strong> Fijar como croquis</strong> para guardarlo como imagen en el PDF.
              Si falla, usa el botón "Subir imagen de croquis" de abajo.
            </p>
          )}
        </div>
      )}

      {/* Slot para subir imagen de croquis personalizado */}
      <div style={{marginTop:'.75rem'}}>
        <p style={{fontSize:'.72rem',color:'var(--text-muted)',marginBottom:'.3rem'}}>
          O sube tu propia imagen de croquis:
        </p>
        <input type="file" accept="image/*" ref={imgRef} hidden
          onChange={e=>{
            const f=e.target.files[0]; if(!f) return
            const r=new FileReader(); r.onload=ev=>update(campo,ev.target.result); r.readAsDataURL(f)
            e.target.value=''
          }}/>
        {form[campo]?(
          <div style={{position:'relative',display:'inline-block'}}>
            <img src={form[campo]} alt="" style={{width:'200px',height:'130px',objectFit:'cover',
              borderRadius:'6px',border:'1px solid var(--border)',display:'block'}}/>
            <button style={{position:'absolute',top:'.3rem',right:'.3rem',background:'rgba(0,0,0,.5)',
              color:'#fff',borderRadius:'50%',width:'20px',height:'20px',border:'none',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.7rem'}}
              onClick={()=>update(campo,null)}>✕</button>
          </div>
        ):(
          <button onClick={()=>imgRef.current?.click()}
            style={{padding:'.4rem .85rem',borderRadius:'6px',border:'2px dashed var(--border)',
              background:'var(--bg-input)',color:'var(--text-muted)',fontSize:'.76rem',cursor:'pointer'}}>
            + Subir imagen
          </button>
        )}
      </div>
    </div>
  )
}

export default function TabCaracTerreno({ form, update, hideEscritura=false }) {
  const medidasSegunVal = form.medidasSegun||'Escritura Pública'

  const areaTerrenoSubtitulo =
    form.areaTerrenoSubtitulo!=null&&form.areaTerrenoSubtitulo!==''
      ? form.areaTerrenoSubtitulo
      : `ÁREA DE TERRENO SEGÚN ${medidasSegunVal.toUpperCase()}`

  const areaConstruccionHabitableSubtitulo =
    form.areaConstruccionHabitableSubtitulo!=null&&form.areaConstruccionHabitableSubtitulo!==''
      ? form.areaConstruccionHabitableSubtitulo
      : 'ÁREA DE CONSTRUCCIÓN HABITABLE'

  const medidas = form.medidas?.length>0
    ? form.medidas
    : [
        {id:1,orientacion:'Norte',   orientacionOtro:'',distancia:form.medNorte   ||'',colindante:form.colindNorte   ||''},
        {id:2,orientacion:'Sur',     orientacionOtro:'',distancia:form.medSur     ||'',colindante:form.colindSur     ||''},
        {id:3,orientacion:'Oriente', orientacionOtro:'',distancia:form.medOriente ||'',colindante:form.colindOriente ||''},
        {id:4,orientacion:'Poniente',orientacionOtro:'',distancia:form.medPoniente||'',colindante:form.colindPoniente||''},
      ]

  const updateMedida=(idx,campo,valor)=>update('medidas',medidas.map((m,i)=>i===idx?{...m,[campo]:valor}:m))
  const agregarMedida=()=>update('medidas',[...medidas,MEDIDA_VACIA()])
  const quitarMedida=(idx)=>{if(medidas.length<=1)return;update('medidas',medidas.filter((_,i)=>i!==idx))}

  const lat = parseFloat(form.latitud)  || null
  const lon = parseFloat(form.longitud) || null

  const selectMedidasSegun=(
    <div style={{display:'flex',gap:'.4rem',alignItems:'center',flexWrap:'wrap'}}>
      <select value={form.medidasSegun||'Escritura Pública'}
        onChange={e=>{
          update('medidasSegun',e.target.value)
          const defaultSub=`ÁREA DE TERRENO SEGÚN ${medidasSegunVal.toUpperCase()}`
          if(!form.areaTerrenoSubtitulo||form.areaTerrenoSubtitulo===defaultSub){
            update('areaTerrenoSubtitulo',`ÁREA DE TERRENO SEGÚN ${e.target.value.toUpperCase()}`)
          }
        }}
        style={{padding:'.3rem .6rem',borderRadius:'6px',fontSize:'.78rem',
          border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.1)',
          color:'#fff',cursor:'pointer',fontWeight:600}}>
        {MEDIDAS_SEGUN.map(m=><option key={m} style={{color:'#0f172a',background:'#fff'}}>{m}</option>)}
      </select>
      {(form.medidasSegun==='Otro')&&(
        <input
          value={form.medidasSegunOtro||''}
          onChange={e=>{
            update('medidasSegunOtro',e.target.value)
            update('areaTerrenoSubtitulo',`ÁREA DE TERRENO SEGÚN ${e.target.value.toUpperCase()}`)
          }}
          placeholder="Especifica la fuente…"
          style={{padding:'.3rem .6rem',borderRadius:'6px',fontSize:'.78rem',
            border:'1px solid rgba(255,255,255,.3)',background:'rgba(255,255,255,.15)',
            color:'#fff',fontWeight:500,minWidth:'160px'}}/>
      )}
    </div>
  )

  return (
    <div>
      {/* Dirección (solo lectura) */}
      <div style={{padding:'.75rem 1rem',background:'#f0f9ff',borderRadius:'8px',
        border:'1px solid #bae6fd',fontSize:'.84rem',color:'#0369a1',marginBottom:'1rem'}}>
        <strong>Dirección:</strong>&ensp;
        {[form.calle,form.numeroExterior,form.colonia,form.municipio,form.entidadFederativa]
          .filter(Boolean).join(', ')||'(Capturar en Datos Generales)'}
        {form.latitud&&form.longitud&&(
          <span style={{marginLeft:'1rem',color:'#16a34a',fontWeight:600}}>
            ✓ {form.latitud}, {form.longitud}
          </span>
        )}
      </div>

      {/* ── Escritura (solo en Comercial) ── */}
      {!hideEscritura&&(
      <Seccion titulo="Escritura">
        <div className={styles.grid3}>
          {/* CAMPO 1: NOMBRE del Notario Público */}
          <div className={styles.field}>
            <label className={styles.label}>Nombre del Notario Público</label>
            <input className={styles.input} value={form.notarioNombre||''}
              onChange={e=>update('notarioNombre',e.target.value)}
              placeholder="Lic. Juan García Pérez"/>
          </div>
          {/* CAMPO 2: Ciudad del Notario */}
          <div className={styles.field}>
            <label className={styles.label}>Ciudad del Notario</label>
            <input className={styles.input} value={form.notarioCiudad||''}
              onChange={e=>update('notarioCiudad',e.target.value)}/>
          </div>
          {/* CAMPO 3: Número de Notaría (DIFERENTE a "Notario Público") */}
          <div className={styles.field}>
            <label className={styles.label}>Número de Notaría</label>
            <input className={styles.input} value={form.numeroNotario||''}
              onChange={e=>update('numeroNotario',e.target.value)}
              placeholder="Ej: 12"/>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Núm. de Escritura</label>
            <input className={styles.input} value={form.numeroEscritura||''}
              onChange={e=>update('numeroEscritura',e.target.value)}/>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Fecha de Escritura</label>
            <input type="date" className={styles.input} value={form.fechaEscritura||''}
              onChange={e=>update('fechaEscritura',e.target.value)}/>
          </div>
        </div>
      </Seccion>
      )}

      {/* ── Medidas y Colindancias ── */}
      <Seccion titulo="Medidas y Colindancias según:" extraHeader={selectMedidasSegun}>
        <p style={{fontSize:'.82rem',color:'var(--text-secondary)',marginBottom:'1.25rem'}}>
          Fuente: <strong>{form.medidasSegun||'Escritura Pública'}</strong>.
        </p>
        {medidas.map((m,i)=>(
          <div key={m.id||i} style={{display:'grid',gridTemplateColumns:'150px 90px 1fr auto',
            gap:'.75rem',alignItems:'flex-start',marginBottom:'1rem'}}>
            <div className={styles.field}>
              {i===0&&<label className={styles.label}>Orientación</label>}
              <select className={styles.select} value={m.orientacion}
                onChange={e=>updateMedida(i,'orientacion',e.target.value)}>
                {ORIENTACIONES.map(o=><option key={o}>{o}</option>)}
              </select>
              {m.orientacion==='Otro'&&(
                <input className={styles.input} style={{marginTop:'.3rem'}} value={m.orientacionOtro}
                  onChange={e=>updateMedida(i,'orientacionOtro',e.target.value)} placeholder="Especifica…"/>
              )}
            </div>
            <div className={styles.field}>
              {i===0&&<label className={styles.label}>Dist. (m)</label>}
              <input className={styles.input} value={m.distancia}
                onChange={e=>updateMedida(i,'distancia',e.target.value)} placeholder="0.00"/>
            </div>
            <div className={styles.field}>
              {i===0&&<label className={styles.label}>Colindante</label>}
              <textarea className={styles.textarea} style={{minHeight:'42px',resize:'vertical'}}
                value={m.colindante} onChange={e=>updateMedida(i,'colindante',e.target.value)}
                placeholder={`Colindante al ${m.orientacion==='Otro'?(m.orientacionOtro||'lado'):m.orientacion}`}/>
            </div>
            <div style={{paddingTop:i===0?'1.4rem':'0'}}>
              {medidas.length>1&&(
                <button className={styles.removeRowBtn} onClick={()=>quitarMedida(i)} title="Eliminar">
                  <Trash2 size={14}/>
                </button>
              )}
            </div>
          </div>
        ))}
        <button className={styles.addRowBtn} onClick={agregarMedida}><Plus size={14}/> Agregar colindancia</button>
      </Seccion>

      {/* ── INDIVISO Y SUPERFICIES — solo 3 campos ── */}
      <Seccion titulo="Indiviso y Superficies">
        <p style={{fontSize:'.84rem',color:'var(--text-secondary)',marginBottom:'1.5rem',lineHeight:1.55}}>
          Los títulos en <strong>MAYÚSCULAS</strong> son editables. Haz clic sobre ellos para personalizarlos.
        </p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1.5rem',alignItems:'start'}}>

          {/* 1. Área de Terreno Según */}
          <div className={styles.field}>
            <SubtituloEditable value={areaTerrenoSubtitulo}
              onChange={v=>update('areaTerrenoSubtitulo',v)}
              placeholder={`ÁREA DE TERRENO SEGÚN ${medidasSegunVal.toUpperCase()}`}/>
            <label className={`${styles.label} ${styles.req}`} style={{marginTop:'.3rem'}}>
              Área de Terreno (m²)
            </label>
            <div style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
              <input className={styles.input} type="number" step="0.01" min="0"
                value={form.areaTerreno} onChange={e=>update('areaTerreno',e.target.value)}
                placeholder="0.00" style={{flex:1}}/>
              <span style={{fontSize:'.78rem',color:'var(--text-muted)',fontWeight:600,whiteSpace:'nowrap'}}>m²</span>
            </div>
            <span className={styles.calcNote}>Según {form.medidasSegun||'Escritura Pública'}</span>
          </div>

          {/* 2. Área de Construcción Habitable */}
          <div className={styles.field}>
            <SubtituloEditable value={areaConstruccionHabitableSubtitulo}
              onChange={v=>update('areaConstruccionHabitableSubtitulo',v)}
              placeholder="ÁREA DE CONSTRUCCIÓN HABITABLE"/>
            <label className={styles.label} style={{marginTop:'.3rem'}}>
              Área de Construcción Habitable (m²)
            </label>
            <div style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
              <input className={styles.input} type="number" step="0.01" min="0"
                value={form.areaConstruccionHabitable||''}
                onChange={e=>update('areaConstruccionHabitable',e.target.value)}
                placeholder="0.00" style={{flex:1}}/>
              <span style={{fontSize:'.78rem',color:'var(--text-muted)',fontWeight:600,whiteSpace:'nowrap'}}>m²</span>
            </div>
            <span className={styles.calcNote}>Acepta decimales. Compartido con Ingresos y Costos.</span>
          </div>

          {/* 3. Indiviso */}
          <div className={styles.field}>
            <label style={{fontSize:'.8rem',fontWeight:700,color:'#1e3a5f',textTransform:'uppercase',
              letterSpacing:'.04em',display:'block',marginBottom:'.2rem'}}>INDIVISO</label>
            <label className={styles.label}>Porcentaje de propiedad (%)</label>
            <div style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
              <input className={styles.input} type="number" step="0.01" min="1" max="100"
                value={form.indiviso??100} onChange={e=>update('indiviso',e.target.value)}
                placeholder="100" style={{flex:1}}/>
              <span style={{fontSize:'.78rem',color:'var(--text-muted)',fontWeight:600,whiteSpace:'nowrap'}}>%</span>
            </div>
            {form.indiviso&&parseFloat(form.indiviso)<100&&form.areaTerreno&&(
              <span className={styles.calcNote}>
                ≈ {(parseFloat(form.areaTerreno)*parseFloat(form.indiviso)/100).toFixed(2)} m² terreno
              </span>
            )}
            {form.indiviso&&parseFloat(form.indiviso)<100&&form.areaConstruccionHabitable&&(
              <span className={styles.calcNote}>
                ≈ {(parseFloat(form.areaConstruccionHabitable)*parseFloat(form.indiviso)/100).toFixed(2)} m² habitable
              </span>
            )}
          </div>
        </div>
      </Seccion>

      {/* ── Características del Predio ── */}
      <Seccion titulo="Características del Predio">
        <div className={styles.grid3}>
          <div className={`${styles.field} ${styles.span3}`}>
            <label className={styles.label}>Colindancias Generales / Tramos de Calle</label>
            <textarea className={styles.textarea} value={form.colindanciaGeneral}
              onChange={e=>update('colindanciaGeneral',e.target.value)}
              placeholder="Describe los tramos de calle y colindancias generales."/>
          </div>
          <div className={styles.field}><label className={styles.label}>Topografía</label>
            <input className={styles.input} value={form.topografia}
              onChange={e=>update('topografia',e.target.value)}/></div>
          <div className={styles.field}>
            <label className={styles.label}>Número de Frentes</label>
            <select className={styles.select} value={form.numeroFrente}
              onChange={e=>update('numeroFrente',e.target.value)}>
              {NUM_FRENTES_OPTS.map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Servidumbre o Restricciones</label>
            <input className={styles.input} value={form.servidumbre||''}
              onChange={e=>update('servidumbre',e.target.value)} placeholder="Ninguna / Por Escrito…"/>
          </div>
        </div>
      </Seccion>

      {/* ── Croquis de Localización (iframe embed de OSM) ── */}
      <Seccion titulo="Croquis de Localización">
        <p style={{fontSize:'.84rem',color:'var(--text-secondary)',marginBottom:'1.25rem',lineHeight:1.55}}>
          El mapa se genera a partir de las <strong>coordenadas capturadas en Datos Generales</strong>.
          Haz clic en "Abrir en Google Maps" para ver la ubicación exacta con imágenes satelitales.
          También puedes subir tu propia imagen de croquis.
        </p>
        {(!lat||!lon)&&(
          <div style={{padding:'.75rem 1rem',background:'#fef9c3',border:'1px solid #fde047',
            borderRadius:'8px',fontSize:'.84rem',color:'#713f12',marginBottom:'1.25rem'}}>
            ⚠ <strong>Coordenadas no capturadas.</strong> Ve a la pestaña Datos Generales y registra
            Latitud y Longitud para activar el mapa interactivo.
          </div>
        )}
        <div style={{display:'flex',gap:'2.5rem',flexWrap:'wrap'}}>
          <MapaSlot campo="imgMacro" label="Macro Localización (zona / ciudad)"
            lat={lat} lon={lon} form={form} update={update}/>
          <MapaSlot campo="imgMicro" label="Micro Localización (calle / predio)"
            lat={lat} lon={lon} form={form} update={update}/>
        </div>
      </Seccion>

    </div>
  )
}