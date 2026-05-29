
// TabIngresos.jsx — XI. Enfoque de Ingresos
// Cascade fiel al Excel:
//   RENTA BRUTA MENSUAL (= suma de RENTA MENS.)
//   TOTAL DEDUCCIONES: % | $
//   RENTA NETA MENSUAL
//   RENTA NETA ANUAL (× meses configurable)
//   CAPITALIZANDO AL: tasa%
//   subtítulo "TASA DE CAPITALIZACIÓN APLICABLE AL CASO..."
//   VALOR POR CAPITALIZACIÓN DE RENTAS = RENTA NETA ANUAL / tasa
import { useState,  useMemo } from 'react'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import styles from '../Formulario.module.css'

const TASAS    = [7, 8, 9, 10, 11, 12]
const FACTORES = TASAS.map(t => t / 7)

const CRITERIOS = [
  { key:'scoreEdad',         label:'EDAD (años)',            opciones:['0 - 5','5 - 20','20 - 40','40 - 50','50 - 60','MÁS DE 60'] },
  { key:'scoreVidaUtil',     label:'VIDA ÚTIL REMANENTE',    opciones:['MÁS DE 60','50 - 60','40 - 50','20 - 40','5 - 20','TERMINADA'] },
  { key:'scoreConservacion', label:'ESTADO DE CONSERV.',     opciones:['NUEVA','MUY BUENO','BUENO','REGULAR','MALO','RUINOSO'] },
  { key:'scoreProyecto',     label:'PROYECTO',               opciones:['MUY BUENO','BUENO','ADECUADO','REGULAR','DEFICIENTE','MALO'] },
  { key:'scoreRelSup',       label:'REL. SUP. (TERR/CONST)', opciones:['CONST > TERR\nMAYOR 3-1','CONST > TERR\nHASTA 3-1','CONST > TERR\nHASTA 2-1','TERR = CONST','TERR > CONST\nHASTA 3-1','TERR > CONST\nMAYOR 3-1'] },
  { key:'scoreUsoInmueble',  label:'USO DEL INMUEBLE',       opciones:['CASA\nUNIF.','EDIF. PROD.\nHAB-COM.','DEPTO/CASA\nCOND.','OFNA/LOCAL\nCOND.','OFNA/LOCAL\nUNIF.','BODEGA/\nIND.'] },
  { key:'scoreClasifZona',   label:'CLASIF. ZONA',           opciones:['LUJO','1er ORDEN','2o. ORDEN','3er ORDEN','PROL. SERV.COM.','Proll. SERV/INC.'] },
]

function calcAutoScores(form) {
  const edad=parseInt(form.edadAproximada)||null, vt=parseInt(form.vidaTotal)||60
  const rem=edad!=null?vt-edad:null
  const scoreEdad=edad==null?null:edad<=5?1:edad<=20?2:edad<=40?3:edad<=50?4:edad<=60?5:6
  const scoreVidaUtil=rem==null?null:rem>60?1:rem>50?2:rem>40?3:rem>20?4:rem>5?5:6
  const ec=(form.estadoConservacion||'').toUpperCase()
  const scoreConservacion=ec.includes('NUEVA')||ec.includes('EXCELENTE')?1:ec.includes('MUY BUENO')?2:ec.includes('BUENO')&&!ec.includes('MUY')?3:ec.includes('REGULAR')?4:ec.includes('MALO')||ec.includes('DETERIORADO')?5:ec.includes('RUINOSO')?6:null
  const cp=(form.calidadProyecto||'').toUpperCase()
  const scoreProyecto=cp.includes('MUY BUENO')?1:cp.includes('BUENO')&&!cp.includes('MUY')?2:cp.includes('ADECUADO')?3:cp.includes('REGULAR')?4:cp.includes('DEFICIENTE')?5:cp.includes('MALO')?6:null
  const terr=parseFloat(form.areaTerreno)||null,cons=parseFloat(form.areaConstruccion)||null
  let scoreRelSup=null
  if(terr&&cons){const r=terr/cons;scoreRelSup=r<0.33?1:r<0.50?2:r<0.90?3:r<=1.10?4:r<=3?5:6}
  const bien=(form.bienQueSeValua||form.tiposConstruccion||'').toUpperCase()
  const scoreUsoInmueble=bien.includes('CASA')&&!bien.includes('DEPTO')&&!bien.includes('COND')?1:bien.includes('EDIFICIO')||bien.includes('EDIF')?2:bien.includes('DEPARTAMENTO')||bien.includes('DEPTO')||bien.includes('COND')?3:bien.includes('OFICINA')||bien.includes('LOCAL')?4:bien.includes('BODEGA')||bien.includes('INDUSTRIAL')?6:null
  const zona=(form.clasificacionZona||'').toUpperCase()
  const scoreClasifZona=zona.includes('LUJO')?1:zona.includes('PRIMER')||zona.includes('1ER')?2:zona.includes('SEGUNDO')||zona.includes('2O')||zona.includes('2DO')?3:zona.includes('TERCER')||zona.includes('3ER')||zona.includes('3O')?4:zona.includes('PROL')?5:null
  return {scoreEdad,scoreVidaUtil,scoreConservacion,scoreProyecto,scoreRelSup,scoreUsoInmueble,scoreClasifZona}
}

const fmtMXN=(v)=>v!=null&&!isNaN(v)&&Math.abs(parseFloat(v))>0.0001
  ?new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(parseFloat(v)):'—'
const num=(v)=>parseFloat(v)||0

export default function TabIngresos({ form, update }) {
  const [enviadoConcl, setEnviadoConcl] = useState(false)
  const ing=form.ingresos||{}
  const upd=(k,v)=>update('ingresos',{...ing,[k]:v})
  const updMulti=(obj)=>update('ingresos',{...ing,...obj})

  const autoScores=useMemo(()=>calcAutoScores(form),[
    form.edadAproximada,form.vidaTotal,form.estadoConservacion,form.calidadProyecto,
    form.areaTerreno,form.areaConstruccion,form.bienQueSeValua,form.tiposConstruccion,form.clasificacionZona,
  ])
  const getScore=(key)=>{const m=ing[key];return m!=null?m:(autoScores[key]??null)}
  const isManual=(key)=>ing[key]!=null
  const resetScores=()=>{const r={};CRITERIOS.forEach(c=>{r[c.key]=null});updMulti(r)}

  // Deducciones (defaults 0%)
  const pVacios=num(ing.porcVacios??'0'),pPredial=num(ing.porcPredial??'0'),pAgua=num(ing.porcAgua??'0')
  const pConsManto=num(ing.porcConsManto??'0'),pAdmon=num(ing.porcAdmon??'0'),pEnergElec=num(ing.porcEnergElec??'0')
  const pSeguros=num(ing.porcSeguros??'0'),pISR=num(ing.porcISR??'0'),pOtros=num(ing.porcOtros??'0')
  const totalDeducc=pVacios+pPredial+pAgua+pConsManto+pAdmon+pEnergElec+pSeguros+pISR+pOtros

  // Tasa
  const scores=CRITERIOS.map(c=>getScore(c.key))
  const scoredItems=scores.filter(s=>s!==null)
  const totalCriteri=scoredItems.length
  const sumaCal=TASAS.map((_,ci)=>scores.filter(s=>s!==null&&s-1===ci).length)
  const tasasParciales=sumaCal.map((count,i)=>count*FACTORES[i])
  const tasaResultante=totalCriteri>0?scoredItems.reduce((acc,s)=>acc+TASAS[s-1],0)/totalCriteri:0
  const tasaEfectiva=tasaResultante>0?tasaResultante:num(ing.tasaManual)

  // Promedio $/m²/mes de comparables de renta
  const rentasAvgM2=useMemo(()=>{
    const valid=(form.comparablesRentas||[])
      .filter(c=>c.oferta&&c.supM2&&parseFloat(c.supM2)>0)
      .map(c=>parseFloat(c.oferta)/parseFloat(c.supM2))
    return valid.length>0?valid.reduce((a,b)=>a+b,0)/valid.length:null
  },[form.comparablesRentas])

  // Tipos de renta — supM2 default a areaConstruccionHabitable
  const areaCH=form.areaConstruccionHabitable||''
  const tiposRenta=ing.tiposRenta||[{id:1,tipo:'R-1',destino:'',supM2:areaCH,valorM2:''}]
  const addTipo=()=>upd('tiposRenta',[...tiposRenta,{id:Date.now(),tipo:`R-${tiposRenta.length+1}`,destino:'',supM2:'',valorM2:''}])
  const delTipo=(i)=>upd('tiposRenta',tiposRenta.filter((_,j)=>j!==i))
  const updTipo=(i,k,v)=>upd('tiposRenta',tiposRenta.map((t,j)=>j===i?{...t,[k]:v}:t))

  const tiposCalc=tiposRenta.map(t=>({...t,rentaCalc:num(t.supM2)*num(t.valorM2)}))
  const supTotal=tiposCalc.reduce((a,t)=>a+num(t.supM2),0)
  const rentaBruta=tiposCalc.reduce((a,t)=>a+t.rentaCalc,0)

  // Cascada
  const totalDeduccImporte=rentaBruta*totalDeducc/100
  const rentaNetaMensual=rentaBruta-totalDeduccImporte
  const multiplicador=num(ing.multiplicadorAnual??'15')
  const rentaNetaAnual=rentaNetaMensual*multiplicador
  const valorCapitalizacion=tasaEfectiva>0?rentaNetaAnual/(tasaEfectiva/100):0

  const InputPct=({campo,def='0'})=>(
    <input type="number" step="1" min="0" max="100" value={ing[campo]??def}
      onChange={e=>upd(campo,e.target.value)}
      style={{width:'54px',padding:'.25rem .35rem',border:'1px solid var(--border)',borderRadius:'5px',
        fontSize:'.82rem',textAlign:'center',background:'var(--bg-card)',color:'var(--text-primary)'}}/>
  )
  const FilaDed=({label,campo})=>(
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
      padding:'.3rem 0',borderBottom:'1px solid var(--border)'}}>
      <span style={{fontSize:'.82rem',color:'var(--text-secondary)',fontWeight:600}}>{label}</span>
      <div style={{display:'flex',alignItems:'center',gap:'.3rem'}}>
        <InputPct campo={campo}/><span style={{fontSize:'.78rem',color:'var(--text-muted)'}}>%</span>
      </div>
    </div>
  )

  return (
    <div>
      {/* Encabezado */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
        padding:'.75rem 1rem',background:'#0f172a',borderRadius:'8px',marginBottom:'1.25rem',flexWrap:'wrap',gap:'.5rem'}}>
        <span style={{color:'#c9972a',fontWeight:800,fontSize:'.88rem',textTransform:'uppercase',letterSpacing:'.07em'}}>
          XI. ENFOQUE DE INGRESOS — Capitalización de Rentas
        </span>
        <div style={{display:'flex',gap:'1.5rem'}}>
          <span style={{fontSize:'.78rem',color:'#94a3b8'}}>Folio: <strong style={{color:'#e6edf3'}}>{form.folioInterno||'—'}</strong></span>
          <span style={{fontSize:'.78rem',color:'#94a3b8'}}>Fecha: <strong style={{color:'#e6edf3'}}>{form.fechaAvaluo||'—'}</strong></span>
        </div>
      </div>

      {/* SECCIÓN 1: DEDUCCIONES */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>DEDUCCIONES</span>
        </div>
        <div className={styles.sectBody}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem 2.5rem'}}>
            <div>
              <FilaDed label="VACÍOS"               campo="porcVacios"/>
              <FilaDed label="IMP. PREDIAL"          campo="porcPredial"/>
              <FilaDed label="SERV. DE AGUA"         campo="porcAgua"/>
              <FilaDed label="CONS / MANTENIMIENTO"  campo="porcConsManto"/>
            </div>
            <div>
              <FilaDed label="ADMÓN."       campo="porcAdmon"/>
              <FilaDed label="ENERG. ELÉC." campo="porcEnergElec"/>
              <FilaDed label="SEGUROS"      campo="porcSeguros"/>
            </div>
            <div>
              <FilaDed label="DEDUCC. FISCALES (ISR)" campo="porcISR"/>
              <FilaDed label="OTROS"                  campo="porcOtros"/>
              <input className={styles.input} style={{marginTop:'.4rem',fontSize:'.82rem'}}
                value={ing.descripOtros||''} onChange={e=>upd('descripOtros',e.target.value)}
                placeholder="Descripción de Otros…"/>
              <p style={{fontSize:'.72rem',color:'var(--text-muted)',marginTop:'.4rem'}}>ISR típico: 1 mes ÷ 36 meses ≈ 2.78%</p>
            </div>
          </div>
          <div style={{marginTop:'1.25rem',padding:'.75rem 1.1rem',background:'#0f172a',borderRadius:'8px',
            display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:'#94a3b8',fontSize:'.82rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em'}}>TOTAL DEDUCCIONES:</span>
            <span style={{color:'#c9972a',fontSize:'1.15rem',fontWeight:800,fontVariantNumeric:'tabular-nums'}}>{totalDeducc.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: CÁLCULO DE TASA */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>CÁLCULO DE TASA DE CAPITALIZACIÓN</span>
        </div>
        <div className={styles.sectBody}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'1rem',marginBottom:'1rem'}}>
            <div>
              <p style={{fontSize:'.82rem',color:'var(--text-secondary)',lineHeight:1.55}}>
                Valores auto-detectados desde el formulario. Clic para sobreescribir. Clic en celda seleccionada = deseleccionar.
              </p>
              <div style={{display:'flex',gap:'1.5rem',marginTop:'.5rem',fontSize:'.76rem',flexWrap:'wrap'}}>
                <span style={{display:'flex',alignItems:'center',gap:'.35rem'}}>
                  <span style={{width:'14px',height:'14px',borderRadius:'3px',background:'#1e3a5f',border:'2px solid #c9972a',display:'inline-block'}}/>Manual
                </span>
                <span style={{display:'flex',alignItems:'center',gap:'.35rem'}}>
                  <span style={{width:'14px',height:'14px',borderRadius:'3px',background:'rgba(37,99,235,.18)',border:'2px solid #3b82f6',display:'inline-block'}}/>Auto
                </span>
              </div>
            </div>
            <button onClick={resetScores} style={{display:'flex',alignItems:'center',gap:'.35rem',padding:'.45rem .85rem',borderRadius:'7px',cursor:'pointer',
              border:'1.5px solid var(--border)',background:'var(--bg-card)',color:'var(--text-secondary)',fontSize:'.8rem',fontWeight:600}}>
              <RefreshCw size={13}/> Resetear a auto
            </button>
          </div>

          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.78rem',minWidth:'720px'}}>
              <thead>
                <tr style={{background:'#0f172a'}}>
                  <th style={{padding:'.6rem .85rem',textAlign:'left',color:'#94a3b8',fontSize:'.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',minWidth:'170px'}}>
                    CONCEPTO<div style={{fontWeight:400,fontSize:'.68rem',color:'#475569',textTransform:'none',letterSpacing:0,marginTop:'.1rem'}}>T A S A S</div>
                  </th>
                  {TASAS.map(t=><th key={t} style={{padding:'.6rem .5rem',textAlign:'center',color:'#c9972a',fontSize:'.86rem',fontWeight:800,width:'95px'}}>{t}%</th>)}
                </tr>
              </thead>
              <tbody>
                {CRITERIOS.map((crit,rowIdx)=>{
                  const effectiveCol=getScore(crit.key)
                  const isAutoForRow=!isManual(crit.key)&&autoScores[crit.key]!=null
                  return (
                    <tr key={crit.key} style={{background:rowIdx%2===0?'var(--bg-card)':'var(--bg-input)',borderBottom:'1px solid var(--border)'}}>
                      <td style={{padding:'.6rem .85rem',fontWeight:700,color:'var(--text-secondary)',fontSize:'.75rem',textTransform:'uppercase',letterSpacing:'.04em'}}>
                        {crit.label}
                        {isAutoForRow&&<div style={{fontSize:'.66rem',color:'#3b82f6',fontWeight:500,textTransform:'none',letterSpacing:0,marginTop:'.1rem'}}>Auto</div>}
                        {isManual(crit.key)&&<div style={{fontSize:'.66rem',color:'#c9972a',fontWeight:500,textTransform:'none',letterSpacing:0,marginTop:'.1rem'}}>Manual</div>}
                      </td>
                      {crit.opciones.map((opc,colIdx)=>{
                        const isSelected=effectiveCol===colIdx+1
                        const isAuto=isSelected&&!isManual(crit.key)
                        const isMan=isSelected&&isManual(crit.key)
                        return (
                          <td key={colIdx}
                            onClick={()=>{
                              if(isManual(crit.key)&&ing[crit.key]===colIdx+1)upd(crit.key,null)
                              else upd(crit.key,colIdx+1)
                            }}
                            style={{padding:'.45rem .3rem',textAlign:'center',cursor:'pointer',
                              background:isMan?'#1e3a5f':isAuto?'rgba(37,99,235,.18)':'transparent',
                              border:isMan?'2px solid #c9972a':isAuto?'2px solid #3b82f6':'1px solid var(--border)',
                              color:isMan?'#c9972a':isAuto?'#93c5fd':'var(--text-secondary)',
                              fontWeight:isSelected?800:400,fontSize:'.72rem',lineHeight:1.35,whiteSpace:'pre-line',transition:'all .12s'}}>
                            {opc}
                            {isSelected&&<div style={{fontSize:'.65rem',marginTop:'.15rem',color:isMan?'#c9972a':'#93c5fd',fontWeight:800}}>● 1</div>}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                <tr style={{background:'#162030',borderTop:'2px solid rgba(201,151,42,.3)'}}>
                  <td style={{padding:'.5rem .85rem',color:'#64748b',fontSize:'.72rem',fontWeight:700,textTransform:'uppercase'}}>CAPITALIZACIÓN (tasa ÷ 7)</td>
                  {FACTORES.map((f,i)=><td key={i} style={{padding:'.5rem .4rem',textAlign:'center',color:'#94a3b8',fontSize:'.76rem',fontWeight:600}}>{f.toFixed(4)}</td>)}
                </tr>
                <tr style={{background:'#1c2a3a'}}>
                  <td style={{padding:'.5rem .85rem',color:'#c9972a',fontSize:'.76rem',fontWeight:700,textTransform:'uppercase'}}>SUMA CALIF.</td>
                  {sumaCal.map((sc,i)=><td key={i} style={{padding:'.5rem .4rem',textAlign:'center',color:sc>0?'#c9972a':'var(--text-muted)',fontWeight:sc>0?800:400,fontSize:'.86rem'}}>{sc>0?sc:''}</td>)}
                </tr>
                <tr style={{background:'#0f172a',borderBottom:'2px solid #c9972a'}}>
                  <td style={{padding:'.5rem .85rem',color:'#94a3b8',fontSize:'.72rem',fontWeight:700,textTransform:'uppercase'}}>TASAS PARCIALES</td>
                  {tasasParciales.map((tp,i)=><td key={i} style={{padding:'.5rem .4rem',textAlign:'center',color:tp>0?'#e6edf3':'var(--text-muted)',fontWeight:tp>0?700:400,fontSize:'.8rem'}}>{tp>0?tp.toFixed(4):''}</td>)}
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{marginTop:'1rem',padding:'.75rem 1.1rem',background:'#0f172a',borderRadius:'8px',
            display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'.75rem'}}>
            <span style={{color:'#94a3b8',fontSize:'.82rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em'}}>TASA RESULTANTE:</span>
            <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
              {tasaResultante>0
                ?<span style={{color:'#c9972a',fontSize:'1.4rem',fontWeight:800,fontVariantNumeric:'tabular-nums'}}>{tasaResultante.toFixed(2)}%</span>
                :<div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                  <span style={{color:'#64748b',fontSize:'.8rem'}}>Sin criterios — ingresa manualmente:</span>
                  <input type="number" step="0.01" min="1" max="30" value={ing.tasaManual||''}
                    onChange={e=>upd('tasaManual',e.target.value)} placeholder="Ej: 8.57"
                    style={{width:'80px',padding:'.35rem .5rem',borderRadius:'6px',border:'1.5px solid #c9972a',
                      background:'var(--bg-input)',color:'#c9972a',fontWeight:700,fontSize:'.9rem',textAlign:'center'}}/>
                  <span style={{color:'#94a3b8',fontSize:'.8rem'}}>%</span>
                </div>
              }
              {totalCriteri>0&&<span style={{color:'#475569',fontSize:'.76rem'}}>({totalCriteri} criterios)</span>}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: DETERMINACIÓN DEL VALOR */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>DETERMINACIÓN DEL VALOR POR CAPITALIZACIÓN DE RENTAS</span>
        </div>
        <div className={styles.sectBody}>

          {areaCH&&(
            <div style={{padding:'.6rem .9rem',background:'#f0fdf4',borderRadius:'6px',border:'1px solid #bbf7d0',
              fontSize:'.8rem',color:'#15803d',marginBottom:'.85rem'}}>
              ✓ <strong>Área de Construcción Habitable</strong> desde Carac. Terreno: <strong>{areaCH} m²</strong>
            </div>
          )}

          {rentasAvgM2!==null&&(
            <div style={{padding:'.6rem .9rem',background:'#eff6ff',borderRadius:'6px',border:'1px solid #bfdbfe',
              fontSize:'.8rem',color:'#1d4ed8',marginBottom:'.85rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>📊 <strong>Promedio Mercado Rentas:</strong> {fmtMXN(rentasAvgM2)} /m²/mes — desde pestaña Mercado Rentas</span>
              <button onClick={()=>{const nuevos=tiposRenta.map((t,i)=>i===0?{...t,valorM2:rentasAvgM2.toFixed(2)}:t);upd('tiposRenta',nuevos)}}
                style={{padding:'.25rem .6rem',borderRadius:'5px',background:'rgba(29,78,216,.12)',color:'#1d4ed8',
                  border:'1px solid rgba(29,78,216,.3)',fontSize:'.76rem',fontWeight:700,cursor:'pointer'}}>
                Usar este valor →
              </button>
            </div>
          )}

          {/* Tabla de tipos de renta */}
          <div style={{overflowX:'auto',marginBottom:'1rem'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.84rem'}}>
              <thead>
                <tr style={{background:'#0f172a'}}>
                  {['TIPO','DESTINO','SUPERFICIE M²','VALOR/m²/mes','RENTA MENS.',''].map((h,i)=>(
                    <th key={i} style={{padding:'.55rem .75rem',textAlign:i>=2?'right':'left',color:'#94a3b8',
                      fontSize:'.71rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',
                      width:i===0?'65px':i===5?'28px':'auto'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tiposCalc.map((t,i)=>(
                  <tr key={t.id||i} style={{borderBottom:'1px solid var(--border)'}}>
                    <td style={{padding:'.4rem .5rem'}}>
                      <input value={t.tipo} onChange={e=>updTipo(i,'tipo',e.target.value)}
                        style={{width:'55px',padding:'.28rem .4rem',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'.82rem',background:'var(--bg-card)',color:'var(--text-primary)'}}/>
                    </td>
                    <td style={{padding:'.4rem .5rem'}}>
                      <input value={t.destino} onChange={e=>updTipo(i,'destino',e.target.value)}
                        placeholder="Casa Habitación Unifamiliar…"
                        style={{width:'100%',padding:'.28rem .5rem',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'.82rem',background:'var(--bg-card)',color:'var(--text-primary)'}}/>
                    </td>
                    <td style={{padding:'.4rem .5rem',textAlign:'right'}}>
                      <input type="number" step="0.01" value={t.supM2} onChange={e=>updTipo(i,'supM2',e.target.value)}
                        placeholder={areaCH||'0.00'}
                        style={{width:'95px',padding:'.28rem .4rem',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'.82rem',textAlign:'right',background:'var(--bg-card)',color:'var(--text-primary)'}}/>
                    </td>
                    <td style={{padding:'.4rem .5rem',textAlign:'right'}}>
                      <input type="number" step="0.01" value={t.valorM2} onChange={e=>updTipo(i,'valorM2',e.target.value)}
                        placeholder="0.00"
                        style={{width:'95px',padding:'.28rem .4rem',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'.82rem',textAlign:'right',background:'var(--bg-card)',color:'var(--text-primary)'}}/>
                    </td>
                    <td style={{padding:'.4rem .75rem',textAlign:'right',fontWeight:600,color:'#1e3a5f',fontSize:'.86rem',fontVariantNumeric:'tabular-nums'}}>
                      {t.rentaCalc>0?`$${t.rentaCalc.toLocaleString('es-MX',{minimumFractionDigits:2})}`:'—'}
                    </td>
                    <td style={{padding:'.4rem .25rem'}}>
                      {tiposCalc.length>1&&<button className={styles.removeRowBtn} onClick={()=>delTipo(i)}><Trash2 size={12}/></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:'var(--bg-input)',borderTop:'2px solid var(--border)'}}>
                  <td colSpan={2} style={{padding:'.5rem .75rem',fontWeight:700,color:'var(--text-secondary)',fontSize:'.8rem',textAlign:'right'}}>TOTAL:</td>
                  <td style={{padding:'.5rem .75rem',textAlign:'right',fontWeight:700,color:'var(--text-primary)',fontSize:'.84rem',fontVariantNumeric:'tabular-nums'}}>
                    {supTotal>0?supTotal.toLocaleString('es-MX',{minimumFractionDigits:2}):'—'}
                  </td>
                  <td></td>
                  <td style={{padding:'.5rem .75rem',textAlign:'right',fontWeight:800,color:'#1e3a5f',fontSize:'.9rem',fontVariantNumeric:'tabular-nums'}}>
                    {rentaBruta>0?`$${rentaBruta.toLocaleString('es-MX',{minimumFractionDigits:2})}`:'—'}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <button className={styles.addRowBtn} onClick={addTipo}><Plus size={14}/> Agregar tipo de renta</button>

          {/* ── CASCADA FIEL AL EXCEL ── */}
          {rentaBruta>0&&(
            <div style={{marginTop:'1.5rem',border:'1px solid var(--border)',borderRadius:'10px',overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <tbody>

                  {/* RENTA BRUTA MENSUAL */}
                  <tr style={{background:'var(--bg-input)',borderBottom:'1px solid var(--border)'}}>
                    <td style={{padding:'.65rem 1.1rem',fontSize:'.84rem',fontWeight:700,color:'var(--text-secondary)'}}>
                      RENTA BRUTA MENSUAL: Red.
                    </td>
                    <td style={{padding:'.65rem 1.1rem',textAlign:'right',fontWeight:800,color:'var(--text-primary)',fontSize:'.92rem',fontVariantNumeric:'tabular-nums'}}>
                      {fmtMXN(rentaBruta)}
                    </td>
                  </tr>

                  {/* TOTAL DEDUCCIONES: % | $ */}
                  <tr style={{borderBottom:'1px solid var(--border)'}}>
                    <td style={{padding:'.65rem 1.1rem',fontSize:'.84rem',color:'var(--text-secondary)'}}>
                      TOTAL DEDUCCIONES:&nbsp;
                      <span style={{fontWeight:700,color:'#dc2626'}}>{totalDeducc.toFixed(2)}%</span>
                      <span style={{fontSize:'.78rem',color:'var(--text-muted)',marginLeft:'.5rem'}}>
                        (incluye Vacíos {pVacios}%)
                      </span>
                    </td>
                    <td style={{padding:'.65rem 1.1rem',textAlign:'right',color:'#dc2626',fontWeight:700,fontVariantNumeric:'tabular-nums'}}>
                      – {fmtMXN(totalDeduccImporte)}
                    </td>
                  </tr>

                  {/* RENTA NETA MENSUAL */}
                  <tr style={{borderBottom:'2px solid var(--border)',background:'rgba(201,151,42,.06)'}}>
                    <td style={{padding:'.7rem 1.1rem',fontSize:'.88rem',fontWeight:700,color:'var(--text-primary)'}}>
                      RENTA NETA MENSUAL:
                    </td>
                    <td style={{padding:'.7rem 1.1rem',textAlign:'right',fontWeight:800,color:'#1e3a5f',fontSize:'.95rem',fontVariantNumeric:'tabular-nums'}}>
                      {fmtMXN(rentaNetaMensual)}
                    </td>
                  </tr>

                  {/* RENTA NETA ANUAL con multiplicador configurable */}
                  <tr style={{borderBottom:'2px solid var(--border)'}}>
                    <td style={{padding:'.65rem 1.1rem',fontSize:'.84rem',color:'var(--text-secondary)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap'}}>
                        RENTA NETA ANUAL:
                        <span style={{color:'var(--text-muted)',fontSize:'.78rem'}}>(RENTA NETA MENSUAL ×</span>
                        <input type="number" step="1" min="1" max="24"
                          value={ing.multiplicadorAnual??'15'} onChange={e=>upd('multiplicadorAnual',e.target.value)}
                          title="Meses para anualizar la renta"
                          style={{width:'44px',padding:'.2rem .35rem',borderRadius:'5px',border:'1px solid var(--border)',
                            background:'var(--bg-card)',color:'var(--text-primary)',textAlign:'center',fontSize:'.84rem'}}/>
                        <span style={{color:'var(--text-muted)',fontSize:'.78rem'}}>meses)</span>
                      </div>
                    </td>
                    <td style={{padding:'.65rem 1.1rem',textAlign:'right',fontWeight:800,color:'var(--text-primary)',fontSize:'.95rem',fontVariantNumeric:'tabular-nums'}}>
                      {fmtMXN(rentaNetaAnual)}
                    </td>
                  </tr>

                  {/* CAPITALIZANDO LA RENTA ANUAL AL: tasa% */}
                  <tr style={{background:'rgba(30,58,95,.04)',borderBottom:'1px solid var(--border)'}}>
                    <td style={{padding:'.65rem 1.1rem',fontSize:'.84rem',color:'var(--text-secondary)'}}>
                      CAPITALIZANDO LA RENTA ANUAL AL:{' '}
                      <strong style={{color:'var(--text-primary)'}}>{tasaEfectiva>0?`${tasaEfectiva.toFixed(2)}%`:'(sin tasa)'}</strong>
                    </td>
                    <td style={{padding:'.65rem 1.1rem',textAlign:'right',color:'var(--text-muted)',fontSize:'.82rem'}}>
                      {tasaEfectiva>0?`÷ ${tasaEfectiva.toFixed(2)}%`:'—'}
                    </td>
                  </tr>

                  {/* Subtítulo separador */}
                  <tr style={{background:'#162030'}}>
                    <td colSpan={2} style={{padding:'.6rem 1.25rem',fontSize:'.76rem',color:'#94a3b8',fontWeight:700,
                      textTransform:'uppercase',letterSpacing:'.07em',textAlign:'center'}}>
                      TASA DE CAPITALIZACIÓN APLICABLE AL CASO, RESULTA UN VALOR DE:
                    </td>
                  </tr>

                  {/* VALOR POR CAPITALIZACIÓN DE RENTAS — resultado final */}
                  <tr style={{background:'#0f172a'}}>
                    <td style={{padding:'1.1rem 1.25rem'}}>
                      <p style={{fontSize:'.82rem',color:'#94a3b8',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em'}}>
                        VALOR POR CAPITALIZACIÓN DE RENTAS:
                      </p>
                      <p style={{fontSize:'.72rem',color:'#475569',marginTop:'.2rem'}}>
                        {fmtMXN(rentaNetaAnual)} ÷ {tasaEfectiva>0?`${tasaEfectiva.toFixed(2)}%`:'—'} = valor
                      </p>
                    </td>
                    <td style={{padding:'1.1rem 1.25rem',textAlign:'right',verticalAlign:'middle'}}>
                      {valorCapitalizacion>0?(
                        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'.4rem'}}>
                          <span style={{fontSize:'1.65rem',fontWeight:800,color:'#c9972a',fontVariantNumeric:'tabular-nums'}}>
                            {fmtMXN(valorCapitalizacion)}
                          </span>
                          <button onClick={()=>update('valorRentas',valorCapitalizacion.toFixed(2))}
                            style={{fontSize:'.76rem',padding:'.25rem .75rem',borderRadius:'6px',
                              background:'rgba(201,151,42,.15)',color:'#c9972a',
                              border:'1px solid rgba(201,151,42,.35)',cursor:'pointer',fontWeight:700}}>
                            ↗ Enviar a Conclusión
                          </button>
                        </div>
                      ):(
                        <span style={{color:'#475569',fontSize:'.84rem'}}>Completa los datos de renta y la tasa</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Barra de Resultado Final ── */}
      {valorCapitalizacion>0&&(
        <div style={{marginTop:'1.5rem',padding:'1rem 1.25rem',
          background: enviadoConcl?'#d1fae5':'#0f172a',
          border: enviadoConcl?'2px solid #16a34a':'2px solid rgba(201,151,42,.4)',
          borderRadius:'12px',transition:'all .3s',
          display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:'200px'}}>
            <p style={{fontSize:'.68rem',fontWeight:700,
              color: enviadoConcl?'#15803d':'#94a3b8',
              textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.3rem'}}>
              {enviadoConcl?'✓ Enviado a Conclusión':'VALOR POR CAPITALIZACIÓN — RESULTADO FINAL'}
            </p>
            <p style={{fontSize:'1.8rem',fontWeight:800,fontVariantNumeric:'tabular-nums',
              color: enviadoConcl?'#16a34a':'#c9972a',lineHeight:1}}>
              {new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(valorCapitalizacion)}
            </p>
            <p style={{fontSize:'.7rem',color:'#64748b',marginTop:'.2rem'}}>
              Redondeado: {new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Math.round(valorCapitalizacion))}
            </p>
          </div>
          <button type="button"
            onClick={()=>{
              update('valorRentas', String(Math.round(valorCapitalizacion)))
              setEnviadoConcl(true)
              setTimeout(()=>setEnviadoConcl(false),3000)
            }}
            style={{padding:'.55rem 1.2rem',borderRadius:'8px',
              background: enviadoConcl?'#16a34a':'#c9972a',
              border:'none',color:'#fff',cursor:'pointer',
              fontSize:'.84rem',fontWeight:800,whiteSpace:'nowrap',
              boxShadow:'0 2px 8px rgba(0,0,0,.3)',transition:'all .2s'}}>
            {enviadoConcl?'✓ Enviado':'↺ Redondear y enviar a Conclusión'}
          </button>
        </div>
      )}
    </div>
  )
}