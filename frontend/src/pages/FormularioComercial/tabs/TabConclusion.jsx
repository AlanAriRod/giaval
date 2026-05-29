// TabConclusion.jsx — v4
// CAMBIO PRINCIPAL: cuando se selecciona "Valor Mayor", la declaración muestra
// el enfoque que REALMENTE ganó ("SE CONCLUYE CON EL VALOR COMPARATIVO DE MERCADO"
// si mercado fue el mayor, no el texto genérico "MAYOR VALOR").
// También agrega useEffect que auto-llena declaraciones al cambiar enfoque.
import { useMemo, useEffect, useState } from 'react'
import styles from '../Formulario.module.css'
import { useAuth } from '../../../context/AuthContext'

// ── Textos de declaración por enfoque ──────────────────────────
const DECLARACIONES_DEFAULT = {
  mercado: 'SE CONCLUYE CON EL VALOR COMPARATIVO DE MERCADO',
  fisico:  'SE CONCLUYE CON EL VALOR FÍSICO DEL INMUEBLE',
  rentas:  'SE CONCLUYE CON EL VALOR POR CAPITALIZACIÓN DE RENTAS',
}
const TODOS_DEFAULTS = Object.values(DECLARACIONES_DEFAULT)

// ── Número a letras en español ─────────────────────────────────
const UNIDADES=['','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ',
  'ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE']
const DECENAS=['','DIEZ','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA']
const CENTENAS=['','CIEN','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS',
  'SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS']

function cientosMenor(n) {
  if(n===0) return ''
  if(n===100) return 'CIEN'
  if(n<20) return UNIDADES[n]
  if(n<100) {
    const d=Math.floor(n/10), u=n%10
    if(u===0) return DECENAS[d]
    if(d===2) return `VEINTI${UNIDADES[u]}`
    return `${DECENAS[d]} Y ${UNIDADES[u]}`
  }
  const c=Math.floor(n/100), r=n%100
  return r===0 ? CENTENAS[c] : `${CENTENAS[c]} ${cientosMenor(r)}`
}

function milesLetras(n) {
  if(n===0) return ''
  if(n===1) return 'MIL'
  return `${cientosMenor(n)} MIL`
}
function millonesLetras(n) {
  if(n===0) return ''
  if(n===1) return 'UN MILLÓN'
  return `${cientosMenor(n)} MILLONES`
}

function numeroALetras(n) {
  if(!n||isNaN(n)||n<=0) return ''
  const entero=Math.floor(n)
  const cents=Math.round((n-entero)*100)
  let res=''
  if(entero>=1000000) {
    const mill=Math.floor(entero/1000000)
    const resto=entero%1000000
    res=millonesLetras(mill)
    const miles=Math.floor(resto/1000)
    const cien=resto%1000
    if(miles>0) res+=` ${milesLetras(miles)}`
    if(cien>0)  res+=` ${cientosMenor(cien)}`
  } else if(entero>=1000) {
    const miles=Math.floor(entero/1000)
    const cien=entero%1000
    res=milesLetras(miles)
    if(cien>0) res+=` ${cientosMenor(cien)}`
  } else {
    res=cientosMenor(entero)
  }
  res=res.trim()
  return cents>0
    ? `${res} PESOS ${String(cents).padStart(2,'0')}/100 M.N.`
    : `${res} PESOS 00/100 M.N.`
}

// ── Cálculos desde comparables ──────────────────────────────────
function calcEnNRCasa(form) {
  const customF=form.factoresCasaCustom||[]
  const todos=[{key:'neg'},{key:'ubic'},{key:'sup'},{key:'calid'},{key:'edoCons'},{key:'zona'},...customF]
  const fre=(c)=>todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
  const vus=(form.comparablesCasa||[])
    .map(c=>c.oferta&&c.supConst?parseFloat(c.oferta)/parseFloat(c.supConst)*fre(c):null)
    .filter(v=>v!==null)
  return vus.length>0?Math.round(vus.reduce((a,b)=>a+b,0)/vus.length):null
}
function calcEnNRTerreno(form) {
  const customF=form.factoresTerrenoCustom||[]
  const todos=[{key:'neg'},{key:'zona'},{key:'ubica'},{key:'frente'},{key:'sup'},{key:'forma'},...customF]
  const fre=(c)=>todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
  const vus=(form.comparablesTerreno||[])
    .map(c=>c.oferta&&c.supM2?parseFloat(c.oferta)/parseFloat(c.supM2)*fre(c):null)
    .filter(v=>v!==null)
  return vus.length>0?Math.round(vus.reduce((a,b)=>a+b,0)/vus.length):null
}
function calcRentasAvgM2(form) {
  const valid=(form.comparablesRentas||[])
    .filter(c=>c.oferta&&c.supM2&&parseFloat(c.supM2)>0)
    .map(c=>parseFloat(c.oferta)/parseFloat(c.supM2))
  return valid.length>0?valid.reduce((a,b)=>a+b,0)/valid.length:null
}

const fmtMXN=(v,dec=2)=>v!=null&&!isNaN(v)&&parseFloat(v)>0
  ?new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:dec}).format(parseFloat(v)):'—'

function ValorCard({titulo,subtitulo,valor,color='#c9972a',onUsar,usado}){
  return (
    <div style={{background:usado?color+'18':'var(--bg-input)',border:`1.5px solid ${usado?color:'var(--border)'}`,
      borderRadius:'10px',padding:'1rem 1.1rem',transition:'all .2s'}}>
      <p style={{fontSize:'.72rem',fontWeight:700,color:usado?color:'var(--text-muted)',
        textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.25rem'}}>{titulo}</p>
      <p style={{fontSize:'1.25rem',fontWeight:800,color:usado?color:'var(--text-primary)',fontVariantNumeric:'tabular-nums'}}>
        {fmtMXN(valor)}
      </p>
      {subtitulo&&<p style={{fontSize:'.72rem',color:'var(--text-muted)',marginTop:'.2rem',lineHeight:1.4}}>{subtitulo}</p>}
      {onUsar&&valor&&parseFloat(valor)>0&&(
        <button onClick={onUsar}
          style={{marginTop:'.6rem',fontSize:'.74rem',padding:'.2rem .65rem',borderRadius:'5px',
            background:usado?color+'22':'var(--bg-card)',color:usado?color:'var(--text-secondary)',
            border:`1px solid ${usado?color+'44':'var(--border)'}`,cursor:'pointer',fontWeight:700,transition:'all .15s'}}>
          {usado?'✓ Usando este valor':'Usar como valor final →'}
        </button>
      )}
    </div>
  )
}

const VIGENCIAS=['Tres Meses','Seis Meses','Doce Meses']
const ENFOQUE_OPS=[
  {key:'mercado',label:'Enfoque de Mercado', color:'#c9972a'},
  {key:'fisico', label:'Enfoque Físico',      color:'#2563eb'},
  {key:'rentas', label:'Enfoque de Rentas',   color:'#16a34a'},
]


// ── Gráfica de barras de enfoques ─────────────────────────────
const COLORES_ENFOQUE = {
  mercado: '#c9972a',
  fisico:  '#2563eb',
  rentas:  '#16a34a',
}
const LABELS_ENFOQUE = {
  mercado: 'Mercado',
  fisico:  'Físico',
  rentas:  'Rentas',
}

function GraficaEnfoques({ enfoques, valores, conclusivo }) {
  const items = enfoques
    .map(k => ({ key:k, valor: valores[k]||0, label: LABELS_ENFOQUE[k]||k }))
    .filter(it => it.valor > 0)

  if (items.length === 0) return null

  const maxVal = Math.max(...items.map(it=>it.valor))
  const fmtM   = v => v >= 1000000
    ? `$${(v/1000000).toFixed(2)}M`
    : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`

  return (
    <div style={{background:'#0f172a',borderRadius:'12px',padding:'1.25rem 1.5rem',marginBottom:'1.5rem'}}>
      <p style={{fontSize:'.72rem',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',
        letterSpacing:'.07em',marginBottom:'1.1rem'}}>
        COMPARATIVO DE ENFOQUES
      </p>
      <div style={{display:'flex',flexDirection:'column',gap:'.85rem'}}>
        {items.map(it=>{
          const pct = maxVal>0 ? (it.valor/maxVal)*100 : 0
          const color = COLORES_ENFOQUE[it.key]||'#64748b'
          const esConclusivo = it.key===conclusivo ||
            (conclusivo==='mayor' && it.valor===maxVal)
          return (
            <div key={it.key}>
              <div style={{display:'flex',justifyContent:'space-between',
                alignItems:'center',marginBottom:'.35rem'}}>
                <span style={{fontSize:'.78rem',fontWeight:700,color:esConclusivo?color:'#94a3b8',
                  display:'flex',alignItems:'center',gap:'.4rem'}}>
                  {esConclusivo&&<span style={{fontSize:'.7rem'}}>★</span>}
                  {it.label}
                  {esConclusivo&&(
                    <span style={{fontSize:'.65rem',padding:'.1rem .4rem',borderRadius:'3px',
                      background:color+'22',color,fontWeight:700,letterSpacing:'.04em'}}>
                      CONCLUSIVO
                    </span>
                  )}
                </span>
                <span style={{fontSize:'.82rem',fontWeight:800,color:esConclusivo?color:'#64748b',
                  fontVariantNumeric:'tabular-nums'}}>
                  {new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',
                    minimumFractionDigits:2}).format(it.valor)}
                </span>
              </div>
              <div style={{background:'#1e293b',borderRadius:'9999px',height:'10px',overflow:'hidden'}}>
                <div style={{width:`${pct}%`,height:'100%',borderRadius:'9999px',
                  background:esConclusivo
                    ?`linear-gradient(90deg,${color}aa,${color})`
                    :`linear-gradient(90deg,${color}44,${color}66)`,
                  transition:'width .6s ease'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'.2rem'}}>
                <span style={{fontSize:'.66rem',color:'#334155'}}>{fmtM(0)}</span>
                <span style={{fontSize:'.66rem',color:'#334155'}}>{fmtM(maxVal)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TabConclusion({ form, update, avaluoId, estadoAvaluo }) {
  const enNRCasa    = useMemo(()=>calcEnNRCasa(form),    [form.comparablesCasa,    form.factoresCasaCustom])
  const enNRTerreno = useMemo(()=>calcEnNRTerreno(form), [form.comparablesTerreno, form.factoresTerrenoCustom])
  const rentasAvgM2 = useMemo(()=>calcRentasAvgM2(form), [form.comparablesRentas])

  const areaCH = parseFloat(form.areaConstruccionHabitable||form.areaConstruccion)||null
  const areaT  = parseFloat(form.areaTerreno)||null

  // Calcular excedente de terreno (igual que en TabComparableCasa)
  const incluyeExcedente = !!form.incluyeExcedenteTerreno
  const excedenteAuto = (areaT&&areaCH&&areaT>areaCH) ? parseFloat((areaT-areaCH).toFixed(2)) : 0
  const excedente     = parseFloat(form.terrenoExcedente)||excedenteAuto
  const enNRTerrenoFinal = parseFloat(form.enNRTerrenoManualCasa)||enNRTerreno||0
  const valorExcedente = incluyeExcedente&&excedente&&enNRTerrenoFinal ? excedente*enNRTerrenoFinal : 0
  const t1Base          = enNRCasa&&areaCH ? enNRCasa*areaCH : null
  const t1Mercado       = t1Base!=null ? t1Base + valorExcedente : null
  const valorTerreno    = enNRTerreno&&areaT?enNRTerreno*areaT:null
  const valorRentasCalc = parseFloat(form.valorRentas)||null

  const enfoqueConclusivo = form.enfoqueConclusivo||'mercado'

  const valoresDeclarados = {
    mercado: parseFloat(form.valorMercado)||null,
    fisico:  parseFloat(form.valorFisico) ||null,
    rentas:  parseFloat(form.valorRentas) ||null,
  }

  // ── FIX: Para "mayor", identificar cuál enfoque tiene el valor más alto ──
  // Así la declaración dice "MERCADO" o "FÍSICO" o "RENTAS", no el texto genérico.
  const enfoqueMaximo = useMemo(() => {
    const entries = Object.entries(valoresDeclarados).filter(([,v]) => v && v > 0)
    if (!entries.length) return 'mercado'
    return entries.reduce((max, cur) => cur[1] > max[1] ? cur : max)[0]
  }, [valoresDeclarados.mercado, valoresDeclarados.fisico, valoresDeclarados.rentas])

  // Enfoque "real" a usar para texto y declaración
  const enfoqueReal = enfoqueConclusivo === 'mayor' ? enfoqueMaximo : enfoqueConclusivo

  // Valor conclusivo
  const valorConclusivoCalc =
    enfoqueConclusivo === 'mayor'
      ? (()=>{ const vals=Object.values(valoresDeclarados).filter(v=>v&&v>0); return vals.length>0?Math.max(...vals):null })()
      : valoresDeclarados[enfoqueConclusivo]||null

  // ── useEffect: auto-llenar declaraciones según enfoque real ──
  // Solo sobreescribe si el valor actual es vacío o coincide con uno de los defaults
  useEffect(() => {
    const esDefault = !form.declaraciones || TODOS_DEFAULTS.includes(form.declaraciones)
    if (esDefault) {
      update('declaraciones', DECLARACIONES_DEFAULT[enfoqueReal] || DECLARACIONES_DEFAULT.mercado)
    }
  }, [enfoqueReal]) // eslint-disable-line

  const letrasAuto = valorConclusivoCalc ? numeroALetras(valorConclusivoCalc) : ''

  return (
    <div>

      {/* Encabezado */}
      <div style={{background:'#0f172a',borderRadius:'8px',padding:'1rem 1.25rem',marginBottom:'1.5rem',
        display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:'.75rem'}}>
        <div>
          <p style={{fontSize:'.72rem',color:'#94a3b8',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em'}}>AVALÚO COMERCIAL</p>
          <p style={{fontSize:'1.1rem',fontWeight:800,color:'#e6edf3',marginTop:'.15rem'}}>
            {form.titulo||form.folioInterno||'Sin título'}
          </p>
        </div>
        <div style={{display:'flex',gap:'2rem',flexWrap:'wrap'}}>
          <div><p style={{fontSize:'.68rem',color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em'}}>Folio</p>
            <p style={{fontSize:'.9rem',fontWeight:700,color:'#c9972a'}}>{form.folioInterno||'—'}</p></div>
          <div><p style={{fontSize:'.68rem',color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em'}}>Fecha</p>
            <p style={{fontSize:'.9rem',fontWeight:700,color:'#e6edf3'}}>{form.fechaAvaluo||'—'}</p></div>
          <div><p style={{fontSize:'.68rem',color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em'}}>Propietario</p>
            <p style={{fontSize:'.9rem',fontWeight:700,color:'#e6edf3'}}>{form.nombrePropietario||'—'}</p></div>
        </div>
      </div>

      {/* ── Gráfica de barras de enfoques ── */}
      {form.enfoques?.length>0&&(
        <GraficaEnfoques
          enfoques={form.enfoques}
          valores={{
            mercado: parseFloat(form.valorMercado)||null,
            fisico:  parseFloat(form.valorFisico) ||null,
            rentas:  parseFloat(form.valorRentas) ||null,
          }}
          conclusivo={form.enfoqueConclusivo||'mercado'}
        />
      )}

      {/* Resumen de enfoques calculados */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Resumen de Enfoques — Valores Calculados</span>
        </div>
        <div className={styles.sectBody}>
          <p style={{fontSize:'.84rem',color:'var(--text-secondary)',marginBottom:'1.25rem',lineHeight:1.55}}>
            Haz clic en <strong>"Usar como valor final"</strong> para trasladar el valor calculado al campo de declaración.
          </p>

          {form.enfoques.includes('mercado')&&(
            <div style={{marginBottom:'1.5rem'}}>
              <h3 style={{fontSize:'.8rem',fontWeight:700,color:'#1e3a5f',textTransform:'uppercase',
                letterSpacing:'.05em',marginBottom:'.75rem',paddingBottom:'.4rem',borderBottom:'2px solid #c9972a'}}>
                Enfoque Comercial (Comp. Casa)
              </h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'.85rem'}}>
                <ValorCard titulo="EN N.R. $/m² (Promedio)" valor={enNRCasa} color="#1d4ed8"
                  subtitulo={areaCH?`Área habitable: ${areaCH} m²`:'Ingresa Área Habitable'}/>
                <ValorCard
                  titulo={`T-1 — SUP. CONST. ${areaCH?`${areaCH} m²`:''}${incluyeExcedente&&valorExcedente>0?' + EXCEDENTE':''}`}
                  subtitulo={enNRCasa&&areaCH
                    ? `${fmtMXN(enNRCasa)} × ${areaCH} m²${incluyeExcedente&&valorExcedente>0?` + ${fmtMXN(valorExcedente)} excedente`:''}`
                    : 'Faltan datos'}
                  valor={t1Mercado} color="#c9972a"
                  usado={t1Mercado!=null&&Math.abs((parseFloat(form.valorMercado)||0)-t1Mercado)<1}
                  onUsar={()=>t1Mercado&&update('valorMercado',t1Mercado.toFixed(2))}/>
              </div>
            </div>
          )}

          {form.enfoques.includes('fisico')&&(
            <div style={{marginBottom:'1.5rem'}}>
              <h3 style={{fontSize:'.8rem',fontWeight:700,color:'#1e3a5f',textTransform:'uppercase',
                letterSpacing:'.05em',marginBottom:'.75rem',paddingBottom:'.4rem',borderBottom:'2px solid #2563eb'}}>
                Enfoque Físico (Comp. Terreno)
              </h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'.85rem'}}>
                <ValorCard titulo="EN N.R. $/m² Terreno" valor={enNRTerreno} color="#2563eb"
                  subtitulo={areaT?`Área terreno: ${areaT} m²`:'Ingresa Área Terreno'}/>
                <ValorCard titulo={`VALOR TERRENO ${areaT?`(${areaT} m²)`:''}`}
                  subtitulo={enNRTerreno&&areaT?`${fmtMXN(enNRTerreno)} × ${areaT} m²`:'Faltan datos'}
                  valor={valorTerreno} color="#2563eb"
                  usado={valorTerreno!=null&&Math.abs((parseFloat(form.valorFisico)||0)-valorTerreno)<1}
                  onUsar={()=>valorTerreno&&update('valorFisico',valorTerreno.toFixed(2))}/>
                {parseFloat(form.valorFisico)>0&&(
                  <div style={{padding:'1rem',background:'rgba(37,99,235,.06)',border:'1px solid rgba(37,99,235,.25)',
                    borderRadius:'10px'}}>
                    <p style={{fontSize:'.72rem',fontWeight:700,color:'#2563eb',textTransform:'uppercase',
                      letterSpacing:'.05em',marginBottom:'.3rem'}}>VALOR FÍSICO (desde Costos)</p>
                    <p style={{fontSize:'1.3rem',fontWeight:800,color:'#2563eb',
                      fontVariantNumeric:'tabular-nums'}}>{fmtMXN(parseFloat(form.valorFisico))}</p>
                    <p style={{fontSize:'.72rem',color:'var(--text-muted)',marginTop:'.2rem'}}>
                      Enviado desde la pestaña Costos ✓
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {form.enfoques.includes('rentas')&&(
            <div style={{marginBottom:'1.5rem'}}>
              <h3 style={{fontSize:'.8rem',fontWeight:700,color:'#1e3a5f',textTransform:'uppercase',
                letterSpacing:'.05em',marginBottom:'.75rem',paddingBottom:'.4rem',borderBottom:'2px solid #16a34a'}}>
                Enfoque de Rentas (Capitalización)
              </h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'.85rem'}}>
                {rentasAvgM2!==null&&(
                  <ValorCard titulo="Mercado Rentas $/m²/mes" valor={rentasAvgM2} color="#0891b2"
                    subtitulo="Promedio de comparables de renta"/>
                )}
                <ValorCard titulo="VALOR POR CAPITALIZACIÓN DE RENTAS" valor={valorRentasCalc} color="#16a34a"
                  subtitulo="Enviado desde la pestaña Ingresos" onUsar={()=>{}}
                  usado={valorRentasCalc!=null&&Math.abs((parseFloat(form.valorRentas)||0)-valorRentasCalc)<1}/>
              </div>
              {!valorRentasCalc&&(
                <p style={{fontSize:'.8rem',color:'var(--text-muted)',marginTop:'.75rem'}}>
                  Ve a la pestaña <strong>Ingresos</strong> y presiona "↗ Enviar a Conclusión".
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Valores declarados */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Valores Declarados (Inputs de Confirmación)</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid3}>
            {form.enfoques.includes('mercado')&&(
              <div className={styles.field}>
                <label className={`${styles.label} ${styles.req}`}>Valor de Mercado ($)</label>
                <input className={styles.input} type="number" step="0.01"
                  value={form.valorMercado} onChange={e=>update('valorMercado',e.target.value)} placeholder="0.00"/>
                {parseFloat(form.valorMercado)>0&&(
                  <button type="button"
                    onClick={()=>update('valorMercado',(Math.round(parseFloat(form.valorMercado)/1000)*1000).toFixed(2))}
                    style={{padding:'.2rem .6rem',marginTop:'.3rem',borderRadius:'5px',fontSize:'.72rem',fontWeight:700,
                      cursor:'pointer',border:'1px solid #c9972a',background:'rgba(201,151,42,.1)',color:'#c9972a',
                      display:'block',width:'100%'}}>
                    ↺ Redondear → {new Intl.NumberFormat('es-MX').format(Math.round(parseFloat(form.valorMercado)/1000)*1000)}
                  </button>
                )}
                {t1Mercado&&Math.abs(parseFloat(form.valorMercado||0)-t1Mercado)>1&&(
                  <span className={styles.calcNote}>Calculado: {fmtMXN(t1Mercado)}</span>
                )}
              </div>
            )}
            {form.enfoques.includes('fisico')&&(
              <div className={styles.field}>
                <label className={styles.label}>Valor Físico ($)</label>
                <input className={styles.input} type="number" step="0.01"
                  value={form.valorFisico} onChange={e=>update('valorFisico',e.target.value)} placeholder="0.00"/>
                {parseFloat(form.valorFisico)>0&&(
                  <button type="button"
                    onClick={()=>update('valorFisico',(Math.round(parseFloat(form.valorFisico)/1000)*1000).toFixed(2))}
                    style={{padding:'.2rem .6rem',marginTop:'.3rem',borderRadius:'5px',fontSize:'.72rem',fontWeight:700,
                      cursor:'pointer',border:'1px solid #c9972a',background:'rgba(201,151,42,.1)',color:'#c9972a',
                      display:'block',width:'100%'}}>
                    ↺ Redondear → {new Intl.NumberFormat('es-MX').format(Math.round(parseFloat(form.valorFisico)/1000)*1000)}
                  </button>
                )}
                {valorTerreno&&Math.abs(parseFloat(form.valorFisico||0)-valorTerreno)>1&&(
                  <span className={styles.calcNote}>Terreno calculado: {fmtMXN(valorTerreno)}</span>
                )}
              </div>
            )}
            {form.enfoques.includes('rentas')&&(
              <div className={styles.field}>
                <label className={styles.label}>Valor por Rentas ($)</label>
                <input className={styles.input} type="number" step="0.01"
                  value={form.valorRentas} onChange={e=>update('valorRentas',e.target.value)} placeholder="0.00"/>
                {parseFloat(form.valorRentas)>0&&(
                  <button type="button"
                    onClick={()=>update('valorRentas',(Math.round(parseFloat(form.valorRentas)/1000)*1000).toFixed(2))}
                    style={{padding:'.2rem .6rem',marginTop:'.3rem',borderRadius:'5px',fontSize:'.72rem',fontWeight:700,
                      cursor:'pointer',border:'1px solid #c9972a',background:'rgba(201,151,42,.1)',color:'#c9972a',
                      display:'block',width:'100%'}}>
                    ↺ Redondear → {new Intl.NumberFormat('es-MX').format(Math.round(parseFloat(form.valorRentas)/1000)*1000)}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selector de enfoque conclusivo */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Seleccionar Enfoque para Conclusión</span>
        </div>
        <div className={styles.sectBody}>
          <p style={{fontSize:'.84rem',color:'var(--text-secondary)',marginBottom:'1.25rem',lineHeight:1.55}}>
            El enfoque seleccionado define la <strong>declaración automática</strong>.
            Al elegir <em>Valor Mayor</em>, se usa el texto del enfoque con el valor más alto.
          </p>

          <div style={{display:'flex',flexWrap:'wrap',gap:'1rem',marginBottom:'1.5rem'}}>
            {[
              ...ENFOQUE_OPS.filter(e=>form.enfoques.includes(e.key)),
              {key:'mayor',label:'Valor Mayor (automático)',color:'#7c3aed'},
            ].map(op=>{
              const activo=enfoqueConclusivo===op.key
              // Para "mayor", mostrar cuál ganó entre paréntesis
              const subtexto=op.key==='mayor'&&valoresDeclarados[enfoqueMaximo]
                ?`→ ${ENFOQUE_OPS.find(e=>e.key===enfoqueMaximo)?.label||enfoqueMaximo}`
                :''
              return (
                <button key={op.key} type="button"
                  onClick={()=>update('enfoqueConclusivo',op.key)}
                  style={{
                    display:'flex',flexDirection:'column',alignItems:'flex-start',
                    padding:'.65rem 1rem',borderRadius:'8px',cursor:'pointer',
                    border:`2px solid ${activo?op.color:'var(--border)'}`,
                    background:activo?op.color+'14':'var(--bg-card)',
                    color:activo?op.color:'var(--text-secondary)',
                    fontWeight:activo?700:500,fontSize:'.84rem',transition:'all .15s',
                  }}>
                  <span style={{display:'flex',alignItems:'center',gap:'.55rem'}}>
                    <span style={{width:'16px',height:'16px',borderRadius:'50%',flexShrink:0,
                      border:`2px solid ${activo?op.color:'var(--border)'}`,
                      background:activo?op.color:'transparent',transition:'all .15s'}}/>
                    {op.label}
                    {valoresDeclarados[op.key]&&op.key!=='mayor'&&(
                      <span style={{fontSize:'.78rem',opacity:.8}}>({fmtMXN(valoresDeclarados[op.key])})</span>
                    )}
                  </span>
                  {subtexto&&(
                    <span style={{fontSize:'.72rem',color:op.color,fontStyle:'italic',
                      marginLeft:'1.65rem',marginTop:'.2rem',opacity:.85}}>
                      {subtexto}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Caja del valor conclusivo */}
          {valorConclusivoCalc&&(
            <div style={{background:'#0f172a',borderRadius:'12px',padding:'1.25rem 1.5rem',
              display:'flex',alignItems:'center',justifyContent:'space-between',
              flexWrap:'wrap',gap:'1rem',marginBottom:'1.25rem'}}>
              <div>
                <p style={{fontSize:'.72rem',color:'#94a3b8',fontWeight:700,
                  textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.3rem'}}>
                  VALOR CONCLUSIVO DEL AVALÚO
                </p>
                <p style={{fontSize:'2.2rem',fontWeight:800,color:'#c9972a',lineHeight:1,fontVariantNumeric:'tabular-nums'}}>
                  {fmtMXN(valorConclusivoCalc)}
                </p>
                <p style={{fontSize:'.76rem',color:'#475569',marginTop:'.35rem'}}>
                  Según: <strong style={{color:'#94a3b8'}}>
                    {enfoqueConclusivo==='mayor'
                      ? `Valor Mayor → ${ENFOQUE_OPS.find(e=>e.key===enfoqueMaximo)?.label||'—'}`
                      : ENFOQUE_OPS.find(e=>e.key===enfoqueConclusivo)?.label||'—'
                    }
                  </strong>
                </p>
              </div>
            </div>
          )}

          {/* Valor en letras */}
          <div className={styles.field}>
            <label className={`${styles.label} ${styles.req}`}>Valor Conclusivo en Letras</label>
            <textarea
              className={styles.textarea}
              style={{minHeight:'72px',fontWeight:600,textTransform:'uppercase',
                fontSize:'.88rem',letterSpacing:'.02em'}}
              value={form.valorConclusivoLetras!==undefined?form.valorConclusivoLetras:letrasAuto}
              onChange={e=>update('valorConclusivoLetras',e.target.value)}
              placeholder="Se genera automáticamente al ingresar los valores declarados…"/>
            {letrasAuto&&(
              <button onClick={()=>update('valorConclusivoLetras',letrasAuto)}
                style={{marginTop:'.35rem',fontSize:'.74rem',padding:'.2rem .65rem',borderRadius:'5px',
                  background:'var(--bg-input)',color:'var(--text-secondary)',border:'1px solid var(--border)',
                  cursor:'pointer',fontWeight:600}}>
                ↺ Regenerar desde valor calculado
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Declaración y Vigencia */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Declaración y Vigencia</span>
        </div>
        <div className={styles.sectBody}>

          {/* Indicador del auto-fill */}
          <div style={{padding:'.5rem .85rem',background:'#f0f9ff',border:'1px solid #bae6fd',
            borderRadius:'6px',fontSize:'.78rem',color:'#0369a1',marginBottom:'.85rem',
            display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'.5rem'}}>
            <span>
              La declaración se actualiza automáticamente al cambiar el enfoque.
              Puedes editarla manualmente en cualquier momento.
            </span>
            <button
              onClick={()=>update('declaraciones',DECLARACIONES_DEFAULT[enfoqueReal]||DECLARACIONES_DEFAULT.mercado)}
              style={{fontSize:'.74rem',padding:'.2rem .65rem',borderRadius:'5px',
                background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',
                cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}}>
              ↺ Restaurar predeterminado
            </button>
          </div>

          <div className={styles.grid3}>
            <div className={`${styles.field} ${styles.span2}`}>
              <label className={`${styles.label} ${styles.req}`}>Declaración del Valuador</label>
              <textarea className={styles.textarea} style={{minHeight:'80px'}}
                value={form.declaraciones} onChange={e=>update('declaraciones',e.target.value)}/>
              <span className={styles.calcNote}>
                Enfoque activo: {DECLARACIONES_DEFAULT[enfoqueReal]||'—'}
              </span>
            </div>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Vigencia del Avalúo</label>
              <select className={styles.select} value={form.vigenciaAvaluo}
                onChange={e=>update('vigenciaAvaluo',e.target.value)}>
                {VIGENCIAS.map(v=><option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>


      {/* ── Estado del avalúo — solo admin ── */}
      <EstadoAvaluo avaluoId={avaluoId} estadoInicial={estadoAvaluo}/>
    </div>
  )
}

// ── Componente EstadoAvaluo ──────────────────────────────────────
function EstadoAvaluo({ avaluoId, estadoInicial }) {
  const auth = useAuth()
  const usuario = auth.usuario || auth.user  // compatible con AuthContext que use 'user' o 'usuario'
  const { authFetch } = auth
  const [estado,       setEstado]       = useState(estadoInicial || 'borrador')
  const [guardando,    setGuardando]    = useState(false)
  const [guardado,     setGuardado]     = useState(false)


  const OPCIONES = [
    { v:'borrador',    label:'📝 Borrador',    color:'#64748b' },
    { v:'en_proceso',  label:'🔄 En proceso',  color:'#2563eb' },
    { v:'preliminar',  label:'📋 Preliminar',  color:'#c9972a' },
    { v:'final',       label:'✅ Final',        color:'#16a34a' },
  ]
  const opActual = OPCIONES.find(o=>o.v===estado)||OPCIONES[0]

  const guardar = async () => {
    if (!avaluoId) { alert('Guarda el avalúo primero antes de cambiar el estado.'); return }
    setGuardando(true)
    try {
      const r = await authFetch(`/api/avaluos/${avaluoId}/estado`,{
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({estado}),
      })
      if (r.ok) { setGuardado(true); setTimeout(()=>setGuardado(false),3000) }
      else { const d=await r.json(); alert(d.error||'Error') }
    } catch(e){ console.error(e) }
    finally { setGuardando(false) }
  }

  return (
    <div style={{marginTop:'2rem',padding:'1.25rem 1.5rem',
      background:'var(--bg-input)',border:'1px solid var(--border)',borderRadius:'12px'}}>
      <p style={{fontSize:'.75rem',fontWeight:700,color:'var(--text-muted)',
        textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'1rem'}}>
        🔒 Estado del Avalúo <span style={{fontWeight:400,opacity:.7}}>(solo administradores)</span>
      </p>

      {/* Botones de estado */}
      <div style={{display:'flex',gap:'.6rem',flexWrap:'wrap',marginBottom:'1rem'}}>
        {OPCIONES.map(op=>(
          <button key={op.v} onClick={()=>setEstado(op.v)}
            style={{padding:'.45rem 1rem',borderRadius:'8px',cursor:'pointer',fontSize:'.84rem',
              fontWeight:estado===op.v?700:500,transition:'all .15s',
              border:`1.5px solid ${estado===op.v?op.color:'var(--border)'}`,
              background:estado===op.v?op.color+'18':'var(--bg-card)',
              color:estado===op.v?op.color:'var(--text-secondary)'}}>
            {op.label}
          </button>
        ))}
      </div>

      <div style={{display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
        <div style={{padding:'.45rem .9rem',borderRadius:'7px',fontSize:'.82rem',fontWeight:700,
          background:opActual.color+'18',border:`1px solid ${opActual.color}44`,
          color:opActual.color}}>
          Estado actual: {opActual.label}
        </div>
        <button onClick={guardar} disabled={guardando}
          style={{padding:'.45rem 1rem',borderRadius:'8px',cursor:guardando?'not-allowed':'pointer',
            border:'none',background:guardado?'#16a34a':'#1e3a5f',color:'#fff',
            fontSize:'.84rem',fontWeight:700,opacity:guardando?.7:1,transition:'all .15s'}}>
          {guardado?'✓ Estado actualizado':guardando?'Guardando…':'Actualizar estado'}
        </button>
        {!avaluoId&&(
          <span style={{fontSize:'.76rem',color:'#c9972a'}}>
            ⚠ Guarda el avalúo primero
          </span>
        )}
      </div>
    </div>
  )
}