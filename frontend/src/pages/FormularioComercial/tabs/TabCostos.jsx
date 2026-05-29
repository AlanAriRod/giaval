// TabCostos.jsx — v4
// I-Espec reformateado fiel al Excel:
// p/c | Obras Complementarias | Unidad | Cantidad | Edad | V.R.N.(unitario) |
//   Factor Demérito (Cons, Edad, Otro, FRe) | V.N.R.(unitario) | Valor Parcial
// FRe = Cons × Edad × Otro
// V.N.R.(unitario) = V.R.N. × FRe
// Valor Parcial = Cantidad × V.N.R.
import { useState } from 'react'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import styles from '../Formulario.module.css'

function calcEnNRTerreno(comparablesTerreno, factoresTerrenoCustom) {
  const customF = factoresTerrenoCustom || []
  const todos = [{key:'neg'},{key:'zona'},{key:'ubica'},{key:'frente'},{key:'sup'},{key:'forma'},...customF]
  const fre = (c) => todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
  const vus = (comparablesTerreno||[])
    .map(c=>c.oferta&&c.supM2?parseFloat(c.oferta)/parseFloat(c.supM2)*fre(c):null).filter(v=>v!==null)
  return vus.length>0?Math.round(vus.reduce((a,b)=>a+b,0)/vus.length):null
}

const fmtMXN=(v)=>v!=null&&!isNaN(v)&&parseFloat(v)>0
  ?new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(parseFloat(v)):'—'
const num=(v)=>parseFloat(v)||0

const MOTIVOS_FIJOS=['NINGUNO','EXCEDENTE','IRREGULAR','RESERVA','PASO','SERVIDUMBRE','OTRO']

function Seccion({titulo,children,defaultOpen=true}){
  const [open,setOpen]=useState(defaultOpen)
  return (
    <div className={styles.section}>
      <div className={`${styles.sectHeader} ${open?styles.sectHeaderOpen:''}`}>
        <span className={styles.sectTitle} onClick={()=>setOpen(o=>!o)} style={{flex:1,cursor:'pointer'}}>{titulo}</span>
        <ChevronDown size={16} className={`${styles.sectChevron} ${open?styles.sectChevronOpen:''}`}
          onClick={()=>setOpen(o=>!o)} style={{cursor:'pointer'}}/>
      </div>
      {open&&<div className={styles.sectBody}>{children}</div>}
    </div>
  )
}

export default function TabCostos({ form, update }) {
  const [enviadoFisico, setEnviadoFisico] = useState(false)
  const enNRTerrenoAuto = calcEnNRTerreno(form.comparablesTerreno, form.factoresTerrenoCustom)
  const areaTerrenoAuto = form.areaTerreno ? parseFloat(form.areaTerreno) : null
  const indivisoAuto    = form.indiviso ? parseFloat(form.indiviso)/100 : 1
  const areaCHAuto      = form.areaConstruccionHabitable ? parseFloat(form.areaConstruccionHabitable) : null

  // ── Fracciones de terreno ─────────────────────────────────────
  const fracciones = form.fraccionesTerreno||[{sup:'',valorUnit:'',coeficiente:'',motivo:'NINGUNO',motivoOtro:''}]
  const addFraccion=()=>update('fraccionesTerreno',[...fracciones,{sup:'',valorUnit:'',coeficiente:'',motivo:'NINGUNO',motivoOtro:''}])
  const delFraccion=(i)=>update('fraccionesTerreno',fracciones.filter((_,j)=>j!==i))
  const updFrac=(i,k,v)=>update('fraccionesTerreno',fracciones.map((f,j)=>j===i?{...f,[k]:v}:f))

  const getSupFrac  =(f)=>f.sup!==undefined&&f.sup!==''?num(f.sup):(areaTerrenoAuto||0)
  const getVUFrac   =(f)=>f.valorUnit!==undefined&&f.valorUnit!==''?num(f.valorUnit):(enNRTerrenoAuto||0)
  const getCoefFrac =(f)=>f.coeficiente!==undefined&&f.coeficiente!==''?num(f.coeficiente):indivisoAuto

  const fracCalcs = fracciones.map(f=>({
    ...f, supEf:getSupFrac(f), vuEf:getVUFrac(f), coefEf:getCoefFrac(f),
    vur:getVUFrac(f), valorParcial:getSupFrac(f)*getVUFrac(f)*getCoefFrac(f)
  }))
  const totalTerreno = fracCalcs.reduce((a,f)=>a+f.valorParcial,0)

  // ── Construcciones ────────────────────────────────────────────
  const construcciones = form.construcciones||[{tipo:'T-1',descripcion:'',area:'',crn:'',factorDemeritoEdad:'',factorDemeritoCalidad:''}]
  const addCons=()=>update('construcciones',[...construcciones,{tipo:`T-${construcciones.length+1}`,descripcion:'',area:'',crn:'',factorDemeritoEdad:'',factorDemeritoCalidad:''}])
  const delCons=(i)=>update('construcciones',construcciones.filter((_,j)=>j!==i))
  const updCons=(i,k,v)=>update('construcciones',construcciones.map((c,j)=>j===i?{...c,[k]:v}:c))

  const consCalcs = construcciones.map(c=>{
    const area  = c.area!==''&&c.area!==undefined?num(c.area):0  // no auto-vinculado
    const crn   = num(c.crn)
    const edad  = num(c.factorDemeritoEdad||0)
    const cal   = num(c.factorDemeritoCalidad||0)
    const fre   = edad*cal
    const cnrU  = fre>0?fre*crn:crn
    return { ...c, areaEf:area, fre, cnrUnitario:cnrU, valorTotal:area*cnrU }
  })
  const totalConstruccion = consCalcs.reduce((a,c)=>a+c.valorTotal,0)

  // ── Instalaciones Especiales (I-Espec) ─────────────────────────
  // Nueva estructura fiel al Excel:
  // p/c | Descripción | Unidad | Cantidad | Edad | V.R.N.(unitario)
  //   | Factor Demérito: Cons | Edad | Otro | FRe | V.N.R.(unitario) | Valor Parcial
  const instalaciones = form.instalaciones||[]
  const addInst=()=>update('instalaciones',[...instalaciones,{
    descripcion:'',unidad:'pza',cantidad:'1',edad:'',
    vrn:'',factorCons:'1.00',factorEdad:'1.00',factorOtro:'1.00'
  }])
  const delInst=(i)=>update('instalaciones',instalaciones.filter((_,j)=>j!==i))
  const updInst=(i,k,v)=>update('instalaciones',instalaciones.map((x,j)=>j===i?{...x,[k]:v}:x))

  const instCalcs = instalaciones.map(x=>{
    const fc   = num(x.factorCons  )||1
    const fe   = num(x.factorEdad  )||1
    const fo   = num(x.factorOtro  )||1
    const fre  = fc*fe*fo
    const vnr  = num(x.vrn)*fre
    const parc = num(x.cantidad)*vnr
    return { ...x, fc, fe, fo, fre, vnr, valorParcial:parc }
  })
  const totalInst = instCalcs.reduce((a,x)=>a+x.valorParcial,0)

  const valorFisicoTotal = totalTerreno + totalConstruccion + totalInst

  const thStyle={padding:'.45rem .5rem',background:'#0f172a',color:'#94a3b8',fontSize:'.65rem',
    fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em',textAlign:'center',whiteSpace:'nowrap',
    border:'1px solid #1e293b'}
  const tdStyle={padding:'.4rem .45rem',borderBottom:'1px solid var(--border)',verticalAlign:'middle',
    textAlign:'center',fontSize:'.78rem'}
  const inputS={padding:'.22rem .35rem',border:'1px solid var(--border)',borderRadius:'4px',
    fontSize:'.78rem',background:'var(--bg-card)',color:'var(--text-primary)',textAlign:'center'}

  return (
    <div>
      {/* ══ SECCIÓN 1: VALOR DEL TERRENO ══ */}
      <Seccion titulo="Valor del Terreno — Fracciones">
        <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap',marginBottom:'1rem'}}>
          {areaTerrenoAuto&&(
            <div style={{padding:'.35rem .7rem',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'6px',fontSize:'.76rem',color:'#15803d'}}>
              ✓ Sup. auto: <strong>{areaTerrenoAuto} m²</strong>
            </div>
          )}
          {enNRTerrenoAuto&&(
            <div style={{padding:'.35rem .7rem',background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:'6px',fontSize:'.76rem',color:'#1d4ed8'}}>
              ✓ V.U. auto: <strong>{fmtMXN(enNRTerrenoAuto)}/m²</strong> (Comp. Terreno)
            </div>
          )}
          {!enNRTerrenoAuto&&(
            <div style={{padding:'.35rem .7rem',background:'#fef9c3',border:'1px solid #fde047',borderRadius:'6px',fontSize:'.76rem',color:'#713f12'}}>
              ⚠ V.U. pendiente — completa Comp. Terreno
            </div>
          )}
          <div style={{padding:'.35rem .7rem',background:'#f8fafc',border:'1px solid var(--border)',borderRadius:'6px',fontSize:'.76rem',color:'var(--text-secondary)'}}>
            Coef. auto: {(indivisoAuto*100).toFixed(0)}% → {indivisoAuto.toFixed(4)}
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:'780px'}}>
            <thead>
              <tr>
                <th style={thStyle}>Sup. (m²)</th>
                <th style={thStyle}>V.U. ($/m²)</th>
                <th style={thStyle}>Coeficiente</th>
                <th style={{...thStyle,minWidth:'200px'}}>Motivo Diferenciación</th>
                <th style={{...thStyle,background:'#1e3a5f',color:'#c9972a'}}>V.U. RESULTANTE</th>
                <th style={{...thStyle,background:'#0d2140'}}>Valor Parcial</th>
                <th style={{...thStyle,width:'28px'}}></th>
              </tr>
            </thead>
            <tbody>
              {fracCalcs.map((f,i)=>(
                <tr key={i}>
                  <td style={tdStyle}>
                    <input type="number" step="0.01" value={fracciones[i].sup}
                      onChange={e=>updFrac(i,'sup',e.target.value)}
                      placeholder={areaTerrenoAuto?String(areaTerrenoAuto):'0.00'}
                      style={{...inputS,width:'85px'}}/>
                    {(!fracciones[i].sup||fracciones[i].sup==='')&&areaTerrenoAuto&&(
                      <div style={{fontSize:'.64rem',color:'#64748b',marginTop:'.1rem'}}>auto: {areaTerrenoAuto}</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <input type="number" step="0.01" value={fracciones[i].valorUnit}
                      onChange={e=>updFrac(i,'valorUnit',e.target.value)}
                      placeholder={enNRTerrenoAuto?String(enNRTerrenoAuto):'0.00'}
                      style={{...inputS,width:'95px'}}/>
                    {(!fracciones[i].valorUnit||fracciones[i].valorUnit==='')&&enNRTerrenoAuto&&(
                      <div style={{fontSize:'.64rem',color:'#1d4ed8',marginTop:'.1rem'}}>auto: {fmtMXN(enNRTerrenoAuto)}</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <input type="number" step="0.0001" min="0.0001" max="1" value={fracciones[i].coeficiente}
                      onChange={e=>updFrac(i,'coeficiente',e.target.value)}
                      placeholder={indivisoAuto.toFixed(4)}
                      style={{...inputS,width:'75px'}}/>
                    {(!fracciones[i].coeficiente||fracciones[i].coeficiente==='')&&(
                      <div style={{fontSize:'.64rem',color:'#64748b',marginTop:'.1rem'}}>auto: {indivisoAuto.toFixed(4)}</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <select value={fracciones[i].motivo||'NINGUNO'} onChange={e=>updFrac(i,'motivo',e.target.value)}
                      style={{...inputS,width:'140px',cursor:'pointer',marginBottom:fracciones[i].motivo==='OTRO'?'.3rem':'0'}}>
                      {MOTIVOS_FIJOS.map(m=><option key={m}>{m}</option>)}
                    </select>
                    {fracciones[i].motivo==='OTRO'&&(
                      <input value={fracciones[i].motivoOtro||''}
                        onChange={e=>updFrac(i,'motivoOtro',e.target.value)}
                        placeholder="Especifica el motivo…"
                        style={{...inputS,width:'140px',textAlign:'left',display:'block'}}/>
                    )}
                  </td>
                  <td style={{...tdStyle,background:'rgba(201,151,42,.06)'}}>
                    <span style={{fontWeight:700,color:'#c9972a',fontVariantNumeric:'tabular-nums'}}>
                      {f.vuEf>0?fmtMXN(f.vuEf):'—'}
                    </span>
                  </td>
                  <td style={{...tdStyle,fontWeight:700,color:'#1e3a5f',fontVariantNumeric:'tabular-nums'}}>
                    {f.valorParcial>0?fmtMXN(f.valorParcial):'—'}
                  </td>
                  <td style={tdStyle}>
                    {fracciones.length>1&&<button className={styles.removeRowBtn} onClick={()=>delFraccion(i)}><Trash2 size={12}/></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className={styles.addRowBtn} style={{marginTop:'.85rem'}} onClick={addFraccion}>
          <Plus size={14}/> Agregar fracción
        </button>
        {totalTerreno>0&&(
          <div style={{marginTop:'1rem',padding:'.75rem 1.1rem',background:'#0f172a',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:'#94a3b8',fontWeight:700,fontSize:'.8rem',textTransform:'uppercase',letterSpacing:'.05em'}}>TOTAL VALOR DEL TERRENO:</span>
            <span style={{color:'#c9972a',fontWeight:800,fontSize:'1.15rem',fontVariantNumeric:'tabular-nums'}}>{fmtMXN(totalTerreno)}</span>
          </div>
        )}
      </Seccion>

      {/* ══ SECCIÓN 2: VALOR DE CONSTRUCCIÓN ══ */}
      <Seccion titulo="Valor de Construcción">
        
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:'860px'}}>
            <thead>
              <tr>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Descripción</th>
                <th style={thStyle}>Área (m²)</th>
                <th style={thStyle}>C.R.N. Unit.</th>
                <th style={{...thStyle,background:'#1a3050'}}>Dem. Edad</th>
                <th style={{...thStyle,background:'#1a3050'}}>Dem. Calidad</th>
                <th style={{...thStyle,background:'#162030',color:'#60a5fa'}}>Fre</th>
                <th style={{...thStyle,background:'#1e3a5f',color:'#c9972a'}}>C.N.R. Unit.</th>
                <th style={{...thStyle,background:'#0d2140'}}>Valor Total</th>
                <th style={{...thStyle,width:'28px'}}></th>
              </tr>
              <tr style={{background:'#0f172a'}}>
                <td colSpan={4}></td>
                <td colSpan={2} style={{padding:'.18rem',textAlign:'center',color:'#64748b',fontSize:'.62rem',fontWeight:600,textTransform:'uppercase',border:'1px solid #1e293b'}}>Factor de Demérito</td>
                <td style={{padding:'.18rem',textAlign:'center',color:'#60a5fa',fontSize:'.62rem',border:'1px solid #1e293b'}}>(Edad×Cal)</td>
                <td style={{padding:'.18rem',textAlign:'center',color:'#c9972a',fontSize:'.62rem',border:'1px solid #1e293b'}}>(Fre×CRN)</td>
                <td style={{padding:'.18rem',textAlign:'center',color:'#94a3b8',fontSize:'.62rem',border:'1px solid #1e293b'}}>(Área×CNR.U)</td>
                <td></td>
              </tr>
            </thead>
            <tbody>
              {consCalcs.map((c,i)=>(
                <tr key={i}>
                  <td style={tdStyle}><input value={construcciones[i].tipo} onChange={e=>updCons(i,'tipo',e.target.value)} style={{...inputS,width:'52px'}}/></td>
                  <td style={tdStyle}><input value={construcciones[i].descripcion} onChange={e=>updCons(i,'descripcion',e.target.value)} placeholder="Descripción…" style={{...inputS,width:'150px',textAlign:'left'}}/></td>
                  <td style={tdStyle}>
                    <input type="number" step="0.01" value={construcciones[i].area} onChange={e=>updCons(i,'area',e.target.value)} placeholder="0.00" style={{...inputS,width:'82px'}}/>
                  </td>
                  <td style={tdStyle}><input type="number" step="0.01" value={construcciones[i].crn} onChange={e=>updCons(i,'crn',e.target.value)} placeholder="0.00" style={{...inputS,width:'85px'}}/></td>
                  <td style={{...tdStyle,background:'rgba(30,64,175,.04)'}}><input type="number" step="0.01" min="0" max="1" value={construcciones[i].factorDemeritoEdad} onChange={e=>updCons(i,'factorDemeritoEdad',e.target.value)} placeholder="0.00" style={{...inputS,width:'70px'}}/></td>
                  <td style={{...tdStyle,background:'rgba(30,64,175,.04)'}}><input type="number" step="0.01" min="0" max="1" value={construcciones[i].factorDemeritoCalidad} onChange={e=>updCons(i,'factorDemeritoCalidad',e.target.value)} placeholder="0.00" style={{...inputS,width:'70px'}}/></td>
                  <td style={{...tdStyle,background:'rgba(96,165,250,.06)'}}>
                    <div style={{padding:'.25rem .4rem',borderRadius:'4px',background:'rgba(96,165,250,.12)',fontWeight:700,color:'#60a5fa',fontSize:'.82rem',fontVariantNumeric:'tabular-nums'}}>{c.fre>0?c.fre.toFixed(4):'—'}</div>
                  </td>
                  <td style={{...tdStyle,background:'rgba(201,151,42,.05)'}}>
                    <div style={{padding:'.25rem .4rem',borderRadius:'4px',background:'rgba(201,151,42,.1)',fontWeight:700,color:'#c9972a',fontSize:'.82rem',fontVariantNumeric:'tabular-nums'}}>{c.cnrUnitario>0?`$${c.cnrUnitario.toLocaleString('es-MX',{minimumFractionDigits:2})}`:'—'}</div>
                  </td>
                  <td style={{...tdStyle,fontWeight:700,color:'#1e3a5f',fontVariantNumeric:'tabular-nums'}}>{c.valorTotal>0?fmtMXN(c.valorTotal):'—'}</td>
                  <td style={tdStyle}>{construcciones.length>1&&<button className={styles.removeRowBtn} onClick={()=>delCons(i)}><Trash2 size={12}/></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
                {/* Área Total de todas las construcciones */}
        {(()=>{
          const total=construcciones.reduce((s,c)=>s+(parseFloat(c.area)||0),0)
          return total>0?(
            <div style={{margin:'.5rem 0',padding:'.55rem 1rem',
              background:'rgba(37,99,235,.06)',border:'1px solid rgba(37,99,235,.25)',
              borderRadius:'7px',display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
              <span style={{fontSize:'.8rem',fontWeight:700,color:'#2563eb'}}>Área Total Construcción:</span>
              <span style={{fontSize:'1rem',fontWeight:800,color:'#2563eb',fontVariantNumeric:'tabular-nums'}}>
                {total.toFixed(2)} m²
              </span>
              {construcciones.length>1&&(
                <span style={{fontSize:'.72rem',color:'var(--text-muted)'}}>
                  {construcciones.map((x,i)=>`T-${i+1}: ${x.area||0}`).join(' + ')} m²
                </span>
              )}
            </div>
          ):null
        })()}
        <button className={styles.addRowBtn} style={{marginTop:'.85rem'}} onClick={addCons}><Plus size={14}/> Agregar construcción</button>
        {totalConstruccion>0&&(
          <div style={{marginTop:'1rem',padding:'.75rem 1.1rem',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:'var(--text-secondary)',fontWeight:700,fontSize:'.8rem',textTransform:'uppercase',letterSpacing:'.05em'}}>SUBTOTAL VALOR DE CONSTRUCCIÓN:</span>
            <span style={{color:'#1e3a5f',fontWeight:800,fontSize:'1.1rem',fontVariantNumeric:'tabular-nums'}}>{fmtMXN(totalConstruccion)}</span>
          </div>
        )}
      </Seccion>

      {/* ══ SECCIÓN 3: I-ESPEC — FORMATO FIEL AL EXCEL ══ */}
      <Seccion titulo="c) Instalaciones Especiales, Elementos Accesorios y Obras Complementarias (I-Espec)" defaultOpen={false}>
        <p style={{fontSize:'.82rem',color:'var(--text-secondary)',marginBottom:'1rem',lineHeight:1.55}}>
          Cada fila: <strong>FRe = Cons × Edad × Otro</strong> →
          <strong> V.N.R.(unitario) = V.R.N. × FRe</strong> →
          <strong> Valor Parcial = Cantidad × V.N.R.</strong>
        </p>

        {instalaciones.length===0&&(
          <p style={{fontSize:'.82rem',color:'var(--text-muted)',fontStyle:'italic',marginBottom:'.85rem'}}>
            Sin instalaciones especiales. Haz clic en "Agregar" para añadir.
          </p>
        )}

        {instalaciones.length>0&&(
          <div style={{overflowX:'auto',marginBottom:'1rem'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:'1020px'}}>
              <thead>
                <tr>
                  {/* Columnas fijas */}
                  <th style={{...thStyle,width:'36px'}}>p/c</th>
                  <th style={{...thStyle,minWidth:'180px',textAlign:'left'}}>OBRAS COMPLEMENTARIAS</th>
                  <th style={thStyle}>Unidad</th>
                  <th style={thStyle}>Cantidad</th>
                  <th style={thStyle}>EDAD</th>
                  <th style={thStyle}>V.R.N.<br/>(unitario)</th>
                  {/* Factor de Demérito — 4 subcolumnas */}
                  <th style={{...thStyle,background:'#1a3050'}}>Cons.</th>
                  <th style={{...thStyle,background:'#1a3050'}}>Edad</th>
                  <th style={{...thStyle,background:'#1a3050'}}>Otro</th>
                  <th style={{...thStyle,background:'#162030',color:'#60a5fa'}}>FRe</th>
                  {/* Resultados */}
                  <th style={{...thStyle,background:'#1e3a5f',color:'#c9972a'}}>V.N.R.<br/>(unitario)</th>
                  <th style={{...thStyle,background:'#0d2140'}}>VALOR<br/>PARCIAL</th>
                  <th style={{...thStyle,width:'28px'}}></th>
                </tr>
                <tr style={{background:'#0a1628'}}>
                  <td colSpan={6}></td>
                  <td colSpan={4} style={{padding:'.18rem',textAlign:'center',color:'#64748b',fontSize:'.62rem',fontWeight:600,textTransform:'uppercase',border:'1px solid #1e293b',letterSpacing:'.04em'}}>
                    FACTOR DE DEMÉRITO
                  </td>
                  <td colSpan={2} style={{padding:'.18rem',textAlign:'center',color:'#475569',fontSize:'.62rem',border:'1px solid #1e293b'}}>
                    (V.R.N. × FRe) | (Cant. × V.N.R.)
                  </td>
                  <td></td>
                </tr>
              </thead>
              <tbody>
                {instCalcs.map((x,i)=>(
                  <tr key={i}>
                    <td style={{...tdStyle,fontWeight:700,color:'#1e3a5f'}}>{i+1}</td>
                    <td style={{...tdStyle,textAlign:'left'}}>
                      <input value={instalaciones[i].descripcion} onChange={e=>updInst(i,'descripcion',e.target.value)}
                        placeholder="Ej: Cisterna, Barda perimetral…"
                        style={{...inputS,width:'100%',minWidth:'160px',textAlign:'left'}}/>
                    </td>
                    <td style={tdStyle}>
                      <input value={instalaciones[i].unidad} onChange={e=>updInst(i,'unidad',e.target.value)}
                        placeholder="ml/pza/m²" style={{...inputS,width:'55px'}}/>
                    </td>
                    <td style={tdStyle}>
                      <input type="number" step="0.01" value={instalaciones[i].cantidad}
                        onChange={e=>updInst(i,'cantidad',e.target.value)} placeholder="0"
                        style={{...inputS,width:'60px'}}/>
                    </td>
                    <td style={tdStyle}>
                      <input type="number" step="1" min="0" value={instalaciones[i].edad}
                        onChange={e=>updInst(i,'edad',e.target.value)} placeholder="0"
                        style={{...inputS,width:'50px'}}/>
                    </td>
                    <td style={tdStyle}>
                      <input type="number" step="0.01" value={instalaciones[i].vrn}
                        onChange={e=>updInst(i,'vrn',e.target.value)} placeholder="0.00"
                        style={{...inputS,width:'90px'}}/>
                    </td>
                    {/* Factores Demérito */}
                    <td style={{...tdStyle,background:'rgba(30,64,175,.04)'}}>
                      <input type="number" step="0.01" min="0" max="1" value={instalaciones[i].factorCons}
                        onChange={e=>updInst(i,'factorCons',e.target.value)} placeholder="1.00"
                        style={{...inputS,width:'60px'}}/>
                    </td>
                    <td style={{...tdStyle,background:'rgba(30,64,175,.04)'}}>
                      <input type="number" step="0.01" min="0" max="1" value={instalaciones[i].factorEdad}
                        onChange={e=>updInst(i,'factorEdad',e.target.value)} placeholder="1.00"
                        style={{...inputS,width:'60px'}}/>
                    </td>
                    <td style={{...tdStyle,background:'rgba(30,64,175,.04)'}}>
                      <input type="number" step="0.01" min="0" max="1" value={instalaciones[i].factorOtro}
                        onChange={e=>updInst(i,'factorOtro',e.target.value)} placeholder="1.00"
                        style={{...inputS,width:'60px'}}/>
                    </td>
                    {/* FRe calculado */}
                    <td style={{...tdStyle,background:'rgba(96,165,250,.06)'}}>
                      <div style={{fontWeight:700,color:'#60a5fa',fontSize:'.82rem',fontVariantNumeric:'tabular-nums'}}>
                        {x.fre.toFixed(4)}
                      </div>
                    </td>
                    {/* V.N.R. unitario */}
                    <td style={{...tdStyle,background:'rgba(201,151,42,.06)'}}>
                      <div style={{fontWeight:700,color:'#c9972a',fontSize:'.82rem',fontVariantNumeric:'tabular-nums'}}>
                        {x.vnr>0?fmtMXN(x.vnr):'—'}
                      </div>
                    </td>
                    {/* Valor Parcial */}
                    <td style={{...tdStyle,fontWeight:700,color:'#1e3a5f',fontVariantNumeric:'tabular-nums'}}>
                      {x.valorParcial>0?fmtMXN(x.valorParcial):'—'}
                    </td>
                    <td style={tdStyle}>
                      <button className={styles.removeRowBtn} onClick={()=>delInst(i)}><Trash2 size={12}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button className={styles.addRowBtn} onClick={addInst}><Plus size={14}/> Agregar instalación / accesorio</button>

        {totalInst>0&&(
          <div style={{marginTop:'.85rem',padding:'.75rem 1.1rem',background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:'var(--text-secondary)',fontWeight:700,fontSize:'.8rem',textTransform:'uppercase',letterSpacing:'.05em'}}>SUBTOTAL I-ESPEC:</span>
            <span style={{color:'#c9972a',fontWeight:800,fontSize:'1.1rem',fontVariantNumeric:'tabular-nums'}}>{fmtMXN(totalInst)}</span>
          </div>
        )}
      </Seccion>

      {/* ══ SECCIÓN 4: VALOR FÍSICO TOTAL ══ */}
      {(totalTerreno>0||totalConstruccion>0||totalInst>0)&&(
        <div style={{marginTop:'1.5rem',background:'#0f172a',borderRadius:'12px',padding:'1.25rem 1.5rem'}}>
          <p style={{fontSize:'.72rem',color:'#94a3b8',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'1rem'}}>
            VALOR FÍSICO TOTAL (TERRENO + CONSTRUCCIÓN{totalInst>0?' + I-ESPEC':''})
          </p>
          <div style={{display:'grid',gridTemplateColumns:`repeat(${totalInst>0?4:3},1fr)`,gap:'1rem',alignItems:'center'}}>
            <div style={{textAlign:'center',padding:'.75rem',borderRadius:'8px',background:'rgba(255,255,255,.04)'}}>
              <p style={{fontSize:'.68rem',color:'#64748b',marginBottom:'.25rem'}}>Terreno</p>
              <p style={{fontSize:'1.05rem',fontWeight:700,color:'#c9972a',fontVariantNumeric:'tabular-nums'}}>{fmtMXN(totalTerreno)}</p>
            </div>
            <div style={{textAlign:'center',padding:'.75rem',borderRadius:'8px',background:'rgba(255,255,255,.04)'}}>
              <p style={{fontSize:'.68rem',color:'#64748b',marginBottom:'.25rem'}}>Construcción</p>
              <p style={{fontSize:'1.05rem',fontWeight:700,color:'#2563eb',fontVariantNumeric:'tabular-nums'}}>{fmtMXN(totalConstruccion)}</p>
            </div>
            {totalInst>0&&(
              <div style={{textAlign:'center',padding:'.75rem',borderRadius:'8px',background:'rgba(255,255,255,.04)'}}>
                <p style={{fontSize:'.68rem',color:'#64748b',marginBottom:'.25rem'}}>I-Espec</p>
                <p style={{fontSize:'1.05rem',fontWeight:700,color:'#7c3aed',fontVariantNumeric:'tabular-nums'}}>{fmtMXN(totalInst)}</p>
              </div>
            )}
            <div style={{textAlign:'center',padding:'1rem',borderRadius:'10px',border:'2px solid #c9972a',background:'rgba(201,151,42,.08)'}}>
              <p style={{fontSize:'.7rem',color:'#94a3b8',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.25rem'}}>VALOR FÍSICO TOTAL</p>
              <p style={{fontSize:'1.4rem',fontWeight:800,color:'#c9972a',fontVariantNumeric:'tabular-nums'}}>{fmtMXN(valorFisicoTotal)}</p>
            </div>
          </div>
          <div style={{marginTop:'1rem',textAlign:'center'}}>
            <button onClick={()=>update('valorFisico',valorFisicoTotal.toFixed(2))}
              style={{fontSize:'.78rem',padding:'.3rem .85rem',borderRadius:'7px',background:'rgba(201,151,42,.15)',
                color:'#c9972a',border:'1px solid rgba(201,151,42,.35)',cursor:'pointer',fontWeight:700}}>
              ↗ Enviar a Conclusión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}