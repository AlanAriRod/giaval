// frontend/src/pages/FormularioReferido/tabs/TabValorReferido.jsx
// MÓDULO 2 — Hoja "Valor Referido"
// Estructura exacta según especificación:
//   VALOR ACTUAL
//     - Fecha (sincronizada con Datos Generales y Portada)
//     - Avalúo Actual (read-only, de Conclusión)
//     - INPC [Mes Año] = (etiqueta reactiva + input + link INEGI)
//   VALOR REFERIDO
//     - Fecha referida (selector mes + año)
//     - INPC [Mes Año] = (etiqueta reactiva + input + link INEGI)
//     - Factor visual (fracción INPC_ref / INPC_actual)
//     - Factor resultante (8 decimales, read-only)
//   APLICACIÓN DEL FACTOR
//     - Avalúo Actual × Factor = Resultado (visual)
//     - Resultado del Valor Referido (destacado, read-only)

import { useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import styles from '../../FormularioComercial/Formulario.module.css'

const fmtMXN = (v) => v!=null&&!isNaN(v)&&parseFloat(v)>0
  ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(parseFloat(v))
  : '—'

function numeroALetras(n) {
  if (!n || isNaN(n) || n <= 0) return ''
  const num = Math.round(parseFloat(n) * 100) / 100
  const entero = Math.floor(num)
  const centavos = Math.round((num - entero) * 100)
  const unidades = ['','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE',
    'DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE']
  const decenas = ['','','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA']
  const centenas = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS',
    'SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS']
  function toText(n) {
    if (n === 0) return ''
    if (n === 100) return 'CIEN'
    if (n < 20) return unidades[n]
    if (n < 100) { const d=Math.floor(n/10),u=n%10; return u===0?decenas[d]:decenas[d]+' Y '+unidades[u] }
    if (n < 1000) { const c=Math.floor(n/100),r=n%100; return centenas[c]+(r>0?' '+toText(r):'') }
    if (n < 1000000) { const m=Math.floor(n/1000),r=n%1000; return (m===1?'MIL':toText(m)+' MIL')+(r>0?' '+toText(r):'') }
    const m=Math.floor(n/1000000),r=n%1000000
    return (m===1?'UN MILLÓN':toText(m)+' MILLONES')+(r>0?' '+toText(r):'')
  }
  const ctvStr = centavos > 0 ? `${centavos}/100` : '00/100'
  return `${toText(entero)||'CERO'} PESOS ${ctvStr} M.N.`
}

// Convierte "2026-04" o Date a "Abril 2026"
const MESES=['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const mesAnioLabel = (fechaStr) => {
  if (!fechaStr) return ''
  // Formato: "2026-04-15" o "04/2026" o "2026-04"
  const m1 = fechaStr.match(/^(\d{4})-(\d{2})/)
  if (m1) return `${MESES[parseInt(m1[2])]} ${m1[1]}`
  const m2 = fechaStr.match(/^(\d{2})\/(\d{4})/)
  if (m2) return `${MESES[parseInt(m2[1])]} ${m2[2]}`
  return fechaStr
}

const ANOS = Array.from({length:60},(_,i)=>String(2026-i))

export default function TabValorReferido({ form, update, avaluoId }) {
  const { authFetch } = useAuth()
  const [estadoLocal, setEstadoLocal] = useState(null)
  const [savingEst,   setSavingEst]   = useState(false)
  const [savedEst,    setSavedEst]    = useState(false)

  const cambiarEstado = async (nuevoEstado) => {
    if (!avaluoId) return
    setSavingEst(true)
    try {
      const r = await authFetch(`/api/avaluos/${avaluoId}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (r.ok) {
        update('estadoAvaluo', nuevoEstado)
        setEstadoLocal(nuevoEstado)
        setSavedEst(true)
        setTimeout(() => setSavedEst(false), 3000)
      }
    } catch(e) { console.error('[estado]', e) }
    finally { setSavingEst(false) }
  }

  const ESTADOS = [
    { v:'borrador',   label:'Borrador',   color:'#94a3b8' },
    { v:'en_proceso', label:'En proceso', color:'#f59e0b' },
    { v:'preliminar', label:'Preliminar', color:'#3b82f6' },
    { v:'final',      label:'Final',      color:'#16a34a' },
  ]
  const estadoActual = estadoLocal || form.estadoAvaluo || 'borrador'
  const inpcActual   = parseFloat(form.inpcActual)   || 0
  const inpcReferido = parseFloat(form.inpcReferido) || 0

  // Factor = INPC_referido / INPC_actual  (alta precisión)
  const factorCalc = useMemo(() => {
    if (inpcActual > 0 && inpcReferido > 0) return inpcReferido / inpcActual
    return null
  }, [inpcActual, inpcReferido])

  // Valor actual = de Conclusión (valorMercadoConclusion) o fallback
  const valorActual = parseFloat(
    form.valorMercadoConclusion ||
    form.valorActualConclusion  ||
    form.valorFisico            ||
    form.valorMercado           || 0
  )

  // Resultado calculado
  const valorReferidoCalc   = factorCalc && valorActual ? valorActual * factorCalc : null
  const valorReferidoFinal  = parseFloat(form.valorReferidoFinal) || valorReferidoCalc || 0

  const letrasReferido = valorReferidoFinal ? numeroALetras(valorReferidoFinal) : ''

  // Etiqueta reactiva del INPC actual (basada en fechaAvaluo)
  const labelInpcActual  = mesAnioLabel(form.fechaAvaluo) || 'Periodo Actual'
  const labelInpcRef     = form.mesReferido && form.anioReferido
    ? `${MESES[parseInt(form.mesReferido)||1]||''} ${form.anioReferido}`
    : (form.fechaAvaluoReferido || 'Periodo Referido')

  return (
    <div>

      {/* ── LINK INEGI ── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'.7rem 1rem',background:'#eff6ff',border:'1px solid #bfdbfe',
        borderRadius:'8px',marginBottom:'1.25rem',flexWrap:'wrap',gap:'.5rem'}}>
        <p style={{fontSize:'.78rem',color:'#1d4ed8',fontWeight:600}}>
          📊 Consulta el INPC en el portal oficial del INEGI
        </p>
        <a href="https://www.inegi.org.mx/app/tabulados/default.aspx?nc=ca55_2018a&idrt=137&opc=t"
          target="_blank" rel="noopener noreferrer"
          style={{display:'inline-flex',alignItems:'center',gap:'.35rem',
            padding:'.35rem .85rem',borderRadius:'6px',background:'#2563eb',
            color:'#fff',textDecoration:'none',fontSize:'.76rem',fontWeight:700}}>
          🔗 Consultar fuente INEGI →
        </a>
      </div>

      {/* ── Estado del Avalúo ── */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',
        borderRadius:'12px',padding:'1.1rem 1.25rem',marginBottom:'1.25rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
          flexWrap:'wrap',gap:'.75rem'}}>
          <div>
            <p style={{fontSize:'.68rem',fontWeight:700,color:'var(--text-muted)',
              textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.3rem'}}>
              Estado del Avalúo
            </p>
            <span style={{padding:'.28rem .75rem',borderRadius:'20px',fontSize:'.8rem',
              fontWeight:700,
              color:ESTADOS.find(e=>e.v===estadoActual)?.color||'#94a3b8',
              background:(ESTADOS.find(e=>e.v===estadoActual)?.color||'#94a3b8')+'18',
              border:`1.5px solid ${(ESTADOS.find(e=>e.v===estadoActual)?.color||'#94a3b8')}44`}}>
              {estadoActual.replace('_',' ').replace(/\w/g,l=>l.toUpperCase())}
            </span>
          </div>
          <div style={{display:'flex',gap:'.45rem',flexWrap:'wrap',alignItems:'center'}}>
            {savedEst && <span style={{fontSize:'.74rem',color:'#16a34a',fontWeight:700}}>✓ Actualizado</span>}
            {!avaluoId && <span style={{fontSize:'.72rem',color:'#f59e0b',fontStyle:'italic'}}>
              ⚠ Guarda el avalúo primero para cambiar el estado
            </span>}
            {ESTADOS.map(est=>(
              <button key={est.v}
                onClick={()=>cambiarEstado(est.v)}
                disabled={savingEst || estadoActual===est.v}
                style={{padding:'.26rem .7rem',borderRadius:'6px',cursor:'pointer',
                  border:`1.5px solid ${est.color}44`,
                  background: estadoActual===est.v ? est.color+'22' : 'transparent',
                  color: estadoActual===est.v ? est.color : 'var(--text-muted)',
                  fontSize:'.73rem',fontWeight:700,opacity:savingEst ? 0.6 : 1,
                  transition:'all .15s'}}>
                {est.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN A: VALOR ACTUAL
      ══════════════════════════════════════════════════════ */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}
          style={{background:'rgba(30,58,95,.1)'}}>
          <span className={styles.sectTitle}>VALOR ACTUAL</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid3}>

            {/* Fecha del avalúo actual */}
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Fecha</label>
              <input type="date" className={styles.input}
                value={form.fechaAvaluo||''}
                onChange={e=>update('fechaAvaluo',e.target.value)}/>
              <span className={styles.calcNote}>
                Sincronizado con tabs Portada y Datos Generales
              </span>
            </div>

            {/* Avalúo Actual (read-only) */}
            <div className={styles.field}>
              <label className={styles.label}>Avalúo Actual</label>
              <div style={{padding:'.55rem .85rem',background:'var(--bg-input)',
                border:'1px solid var(--border)',borderRadius:'8px',
                fontSize:'1rem',fontWeight:700,color:'var(--text-primary)',
                fontVariantNumeric:'tabular-nums'}}>
                {valorActual > 0 ? fmtMXN(valorActual) : '— (de Conclusión)'}
              </div>
              <span className={styles.calcNote}>
                Tomado automáticamente de la pestaña Conclusión
              </span>
            </div>

            {/* INPC actual (etiqueta reactiva + input) */}
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>
                INPC: <span style={{color:'var(--text-primary)',fontWeight:700}}>
                  {labelInpcActual}
                </span> =
              </label>
              <input className={styles.input} type="number" step="0.000001"
                value={form.inpcActual||''}
                onChange={e=>update('inpcActual',e.target.value)}
                placeholder="Ej: 145.831"/>
              <span className={styles.calcNote}>
                Índice del mes del avalúo actual
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN B: VALOR REFERIDO
      ══════════════════════════════════════════════════════ */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}
          style={{background:'rgba(30,58,95,.1)'}}>
          <span className={styles.sectTitle}>VALOR REFERIDO</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid3}>

            {/* Fecha referida: selector mes + año */}
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Fecha Referida</label>
              <div style={{display:'flex',gap:'.4rem'}}>
                <select className={styles.select} value={form.mesReferido||''}
                  onChange={e=>update('mesReferido',e.target.value)}
                  style={{flex:1}}>
                  <option value="">Mes</option>
                  {MESES.slice(1).map((m,i)=>(
                    <option key={i+1} value={String(i+1).padStart(2,'0')}>{m}</option>
                  ))}
                </select>
                <select className={styles.select} value={form.anioReferido||''}
                  onChange={e=>update('anioReferido',e.target.value)}
                  style={{flex:1}}>
                  <option value="">Año</option>
                  {ANOS.map(a=><option key={a}>{a}</option>)}
                </select>
              </div>
              {form.mesReferido&&form.anioReferido&&(
                <span className={styles.calcNote}>
                  Periodo: {labelInpcRef}
                </span>
              )}
            </div>

            {/* INPC referido */}
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>
                INPC: <span style={{color:'var(--text-primary)',fontWeight:700}}>
                  {labelInpcRef || '…'}
                </span> =
              </label>
              <input className={styles.input} type="number" step="0.000001"
                value={form.inpcReferido||''}
                onChange={e=>update('inpcReferido',e.target.value)}
                placeholder="Ej: 60.6036258857962"/>
              <span className={styles.calcNote}>
                Índice del mes de la fecha referida
              </span>
            </div>

            {/* Factor de valor referido — visualización de fracción */}
            <div>
              <p className={styles.label}>Factor de Valor Referido</p>
              {/* Representación visual de la división */}
              <div style={{padding:'.85rem',background:'var(--bg-input)',
                border:'1.5px solid var(--border)',borderRadius:'9px',textAlign:'center'}}>
                {inpcReferido > 0 ? (
                  <>
                    <div style={{fontSize:'.92rem',fontWeight:700,color:'var(--text-primary)',
                      borderBottom:'2px solid var(--border)',paddingBottom:'.35rem',marginBottom:'.35rem',
                      fontVariantNumeric:'tabular-nums'}}>
                      {inpcReferido}
                    </div>
                    <div style={{fontSize:'.72rem',color:'var(--text-muted)',marginBottom:'.3rem'}}>
                      {labelInpcRef}
                    </div>
                    <div style={{fontSize:'.72rem',color:'#94a3b8',marginBottom:'.2rem'}}>────────────</div>
                    <div style={{fontSize:'.92rem',fontWeight:700,color:'var(--text-primary)',
                      fontVariantNumeric:'tabular-nums'}}>
                      {inpcActual || '?'}
                    </div>
                    <div style={{fontSize:'.72rem',color:'var(--text-muted)'}}>{labelInpcActual}</div>
                  </>
                ) : (
                  <p style={{color:'var(--text-muted)',fontSize:'.78rem'}}>
                    Ingresa los INPC para ver la fracción
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* Factor resultante (read-only, alta precisión) */}
          <div style={{marginTop:'1rem',padding:'1rem 1.25rem',
            background:factorCalc?'rgba(37,99,235,.06)':'var(--bg-input)',
            border:`1.5px solid ${factorCalc?'rgba(37,99,235,.3)':'var(--border)'}`,
            borderRadius:'10px',display:'flex',alignItems:'center',gap:'1.5rem',flexWrap:'wrap'}}>
            <div>
              <p style={{fontSize:'.68rem',fontWeight:700,color:'var(--text-muted)',
                textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.25rem'}}>
                Factor Resultante de Valor Referido
              </p>
              <p style={{fontSize:'1.6rem',fontWeight:800,
                color:factorCalc?'#2563eb':'var(--text-muted)',
                fontVariantNumeric:'tabular-nums',letterSpacing:'.02em'}}>
                {factorCalc ? factorCalc.toFixed(8) : '—'}
              </p>
            </div>
            {factorCalc&&(
              <div style={{fontSize:'.76rem',color:'#3b82f6',fontFamily:'monospace',
                background:'rgba(37,99,235,.08)',padding:'.45rem .8rem',borderRadius:'6px'}}>
                {inpcReferido} ÷ {inpcActual} = {factorCalc.toFixed(8)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN C: APLICACIÓN DEL FACTOR
      ══════════════════════════════════════════════════════ */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}
          style={{background:'rgba(30,58,95,.1)'}}>
          <span className={styles.sectTitle}>APLICACIÓN DEL FACTOR</span>
        </div>
        <div className={styles.sectBody}>

          {/* Visualización operación */}
          {factorCalc && valorActual > 0 ? (
            <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr auto 1fr',
              gap:'1rem',alignItems:'center',marginBottom:'1.25rem',
              padding:'1.25rem',background:'#0f172a',borderRadius:'10px'}}>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:'.65rem',color:'#94a3b8',textTransform:'uppercase',
                  letterSpacing:'.05em',marginBottom:'.35rem'}}>AVALÚO ACTUAL</p>
                <p style={{fontSize:'1rem',fontWeight:700,color:'#e2e8f0',
                  fontVariantNumeric:'tabular-nums'}}>{fmtMXN(valorActual)}</p>
              </div>
              <div style={{fontSize:'1.8rem',color:'#64748b',fontWeight:800,textAlign:'center'}}>×</div>
              <div style={{textAlign:'center'}}>
                <p style={{fontSize:'.65rem',color:'#94a3b8',textTransform:'uppercase',
                  letterSpacing:'.05em',marginBottom:'.35rem'}}>FACTOR INPC</p>
                <p style={{fontSize:'1rem',fontWeight:700,color:'#60a5fa',
                  fontVariantNumeric:'tabular-nums',letterSpacing:'.02em'}}>
                  {factorCalc.toFixed(8)}
                </p>
              </div>
              <div style={{fontSize:'1.8rem',color:'#64748b',fontWeight:800,textAlign:'center'}}>=</div>
              <div style={{textAlign:'center',padding:'.85rem',borderRadius:'8px',
                background:'rgba(201,151,42,.12)',border:'1.5px solid rgba(201,151,42,.5)'}}>
                <p style={{fontSize:'.65rem',color:'#94a3b8',textTransform:'uppercase',
                  letterSpacing:'.05em',marginBottom:'.35rem'}}>VALOR REFERIDO</p>
                <p style={{fontSize:'1.1rem',fontWeight:800,color:'#c9972a',
                  fontVariantNumeric:'tabular-nums'}}>{fmtMXN(valorReferidoCalc)}</p>
              </div>
            </div>
          ) : (
            <div style={{padding:'1.25rem',background:'var(--bg-input)',borderRadius:'10px',
              textAlign:'center',color:'var(--text-muted)',fontSize:'.82rem',marginBottom:'1rem'}}>
              Completa los INPC y el valor actual para ver el cálculo
            </div>
          )}

          {/* Campo editable del valor referido final */}
          <div className={styles.grid3}>
            <div className={`${styles.field} ${styles.span2}`}>
              <label className={`${styles.label} ${styles.req}`}>
                Resultado del Valor Referido del Inmueble ($)
              </label>
              <input className={styles.input} type="number" step="0.01"
                value={form.valorReferidoFinal||''}
                onChange={e=>update('valorReferidoFinal',e.target.value)}
                placeholder={valorReferidoCalc
                  ? `Calculado: ${valorReferidoCalc.toFixed(2)}`
                  : 'Se calcula automáticamente'}/>
              {valorReferidoCalc && !form.valorReferidoFinal && (
                <div style={{display:'flex',gap:'.5rem',marginTop:'.4rem',flexWrap:'wrap'}}>
                  <span className={styles.calcNote}>
                    Auto: {fmtMXN(valorReferidoCalc)}
                  </span>
                  <button onClick={()=>update('valorReferidoFinal',valorReferidoCalc.toFixed(2))}
                    style={{padding:'.2rem .65rem',borderRadius:'5px',fontSize:'.74rem',fontWeight:700,
                      cursor:'pointer',border:'1px solid rgba(201,151,42,.4)',
                      background:'rgba(201,151,42,.1)',color:'#c9972a'}}>
                    ✓ Usar valor calculado
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Valor en letras (read-only) */}
          {valorReferidoFinal > 0 && (
            <div className={styles.field} style={{marginTop:'1rem'}}>
              <label className={styles.label}>VALOR REFERIDO EN LETRA</label>
              <div style={{padding:'.75rem 1rem',background:'var(--bg-input)',
                border:'1px solid var(--border)',borderRadius:'8px',
                fontSize:'.9rem',fontWeight:700,textTransform:'uppercase',
                color:'var(--text-primary)',letterSpacing:'.02em',lineHeight:1.5}}>
                {letrasReferido}
              </div>
              <span className={styles.calcNote}>Generado automáticamente — solo lectura</span>
            </div>
          )}

          {/* Declaratoria */}
          <div className={styles.field} style={{marginTop:'1rem'}}>
            <label className={styles.label}>Declaratoria del Valor Referido</label>
            <textarea className={styles.textarea}
              style={{minHeight:'88px',fontWeight:600,textTransform:'uppercase'}}
              value={form.declaracionesReferido||''}
              onChange={e=>update('declaracionesReferido',e.target.value)}
              placeholder="SE CONCLUYE QUE EL VALOR DEL INMUEBLE VALUADO EN LA FECHA REFERIDA…"/>
          </div>

        </div>
      </div>

      {/* ── RESULTADO FINAL DESTACADO ── */}
      {valorReferidoFinal > 0 && (
        <div style={{marginTop:'1.25rem',background:'#0f172a',borderRadius:'12px',padding:'1.75rem',
          textAlign:'center'}}>
          <p style={{fontSize:'.68rem',color:'#94a3b8',fontWeight:700,textTransform:'uppercase',
            letterSpacing:'.1em',marginBottom:'.5rem'}}>
            CONCLUSIÓN DEL AVALÚO REFERIDO
          </p>
          <p style={{fontSize:'2.8rem',fontWeight:800,color:'#c9972a',lineHeight:1,
            fontVariantNumeric:'tabular-nums'}}>
            {fmtMXN(valorReferidoFinal)}
          </p>
          {letrasReferido && (
            <p style={{fontSize:'.8rem',color:'#64748b',marginTop:'.6rem',fontWeight:600,
              textTransform:'uppercase',letterSpacing:'.02em',maxWidth:'520px',margin:'.6rem auto 0'}}>
              ({letrasReferido})
            </p>
          )}
          {(form.mesReferido||form.fechaAvaluoReferido) && (
            <p style={{fontSize:'.76rem',color:'#475569',marginTop:'.5rem'}}>
              Retrotraído a:{' '}
              <strong style={{color:'#94a3b8'}}>
                {labelInpcRef || form.fechaAvaluoReferido}
              </strong>
            </p>
          )}
          {factorCalc && (
            <p style={{fontSize:'.72rem',color:'#334155',marginTop:'.3rem',fontFamily:'monospace'}}>
              Factor aplicado: {factorCalc.toFixed(8)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}