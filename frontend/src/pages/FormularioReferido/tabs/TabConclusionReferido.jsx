// frontend/src/pages/FormularioReferido/tabs/TabConclusionReferido.jsx
// MÓDULO 1 — Hoja "Conclusión"
// Estructura exacta según especificación:
//   - Folio Interno (encabezado)
//   - IX.- Resumen del Valor Obtenido (RESPECTO AL MERCADO)
//   - X.-  Conclusión del Avalúo Actual (número + letras, read-only)
//   - Pie de página del valuador
// Este tab es la "fuente de verdad" que alimenta TabValorReferido

import { useMemo } from 'react'
import styles from '../../FormularioComercial/Formulario.module.css'

const fmtMXN = (v) => v!=null&&!isNaN(v)&&parseFloat(v)>0
  ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(parseFloat(v))
  : '—'

// ── Número a letras (pesos mexicanos) ───────────────────────────
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
    if (n < 100) {
      const d = Math.floor(n/10), u = n%10
      return u === 0 ? decenas[d] : decenas[d] + (d===2?' Y ':' Y ') + unidades[u]
    }
    if (n < 1000) {
      const c = Math.floor(n/100), r = n%100
      return centenas[c] + (r>0?' '+toText(r):'')
    }
    if (n < 1000000) {
      const m = Math.floor(n/1000), r = n%1000
      const mStr = m===1 ? 'MIL' : toText(m)+' MIL'
      return mStr + (r>0?' '+toText(r):'')
    }
    const m = Math.floor(n/1000000), r = n%1000000
    const mStr = m===1 ? 'UN MILLÓN' : toText(m)+' MILLONES'
    return mStr + (r>0?' '+toText(r):'')
  }

  const texto = toText(entero) || 'CERO'
  const ctvStr = centavos > 0 ? `${centavos}/100` : '00/100'
  return `${texto} PESOS ${ctvStr} M.N.`
}

const DECLARATORIA = {
  fisico:  'SE CONCLUYE CON EL VALOR FÍSICO DEL INMUEBLE',
  mercado: 'SE CONCLUYE CON EL VALOR COMPARATIVO DE MERCADO',
  mayor:   'SE CONCLUYE CON EL MAYOR VALOR DE LOS ENFOQUES APLICADOS',
}

export default function TabConclusionReferido({ form, update }) {
  const enfoqueConclusivo = form.enfoqueConclusivo || 'fisico'

  const valoresDeclarados = {
    fisico:  parseFloat(form.valorFisico)  || null,
    mercado: parseFloat(form.valorMercado) || null,
  }

  const valorConclusivoCalc = useMemo(() => {
    if (enfoqueConclusivo === 'mayor') {
      const vals = Object.values(valoresDeclarados).filter(Boolean)
      return vals.length ? Math.max(...vals) : null
    }
    return valoresDeclarados[enfoqueConclusivo] || null
  }, [enfoqueConclusivo, form.valorFisico, form.valorMercado])

  // Usar valorMercadoConclusion SOLO si fue llenado manualmente (no vacío)
  // Al cambiar el enfoque se limpia y se recalcula automáticamente
  const _manual = form.valorMercadoConclusion && form.valorMercadoConclusion !== ''
    ? parseFloat(form.valorMercadoConclusion)
    : null
  const valorConclusivoFinal = (_manual && _manual > 0)
    ? _manual
    : (valorConclusivoCalc || 0)
  const letrasActual = valorConclusivoFinal ? numeroALetras(valorConclusivoFinal) : ''

  const declaratoria = DECLARATORIA[enfoqueConclusivo] || DECLARATORIA.fisico

  return (
    <div>

      {/* ── ENCABEZADO: Folio ── */}
      <div style={{display:'flex',alignItems:'center',gap:'1.5rem',flexWrap:'wrap',
        padding:'1rem 1.25rem',background:'#0f172a',borderRadius:'10px',marginBottom:'1.25rem'}}>
        <div style={{flex:1,minWidth:'220px'}}>
          <p style={{fontSize:'.68rem',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',
            letterSpacing:'.07em',marginBottom:'.25rem'}}>FOLIO INTERNO</p>
          <input style={{background:'transparent',border:'none',borderBottom:'2px solid #c9972a',
            color:'#f8fafc',fontWeight:800,fontSize:'1.1rem',width:'100%',outline:'none',
            padding:'.2rem 0',fontVariantNumeric:'tabular-nums'}}
            value={form.folioInterno||''}
            onChange={e=>update('folioInterno',e.target.value)}
            placeholder="CLAVE-ARG/2604-056"/>
        </div>
        <div>
          <p style={{fontSize:'.68rem',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.2rem'}}>
            TIPO DE AVALÚO
          </p>
          <p style={{color:'#c9972a',fontWeight:700,fontSize:'.9rem'}}>{form.tipoAvaluo||'Avalúo Referido'}</p>
        </div>
      </div>

      {/* ── DISPERSIÓN / nota ── */}
      <div style={{padding:'.6rem 1rem',background:'rgba(148,163,184,.08)',borderRadius:'7px',
        marginBottom:'1.25rem',fontSize:'.76rem',color:'var(--text-muted)',fontStyle:'italic',
        borderLeft:'3px solid #475569'}}>
        <strong style={{color:'var(--text-secondary)',fontStyle:'normal'}}>DISPERSIÓN</strong>
        {'  '}— NO SE PONEN DECLARATORIAS EN ESTE APARTADO
      </div>

      {/* ── IX. RESUMEN DEL VALOR OBTENIDO ── */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>IX.— Resumen del Valor Obtenido</span>
        </div>
        <div className={styles.sectBody}>
          <p style={{fontSize:'.78rem',fontWeight:700,color:'var(--text-secondary)',
            textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'1rem'}}>
            RESPECTO AL MERCADO
          </p>

          {/* Selector de enfoque */}
          <div className={styles.grid3} style={{marginBottom:'1rem'}}>
            {(form.enfoques||['fisico']).includes('fisico')&&(
              <div className={styles.field}>
                <label className={styles.label}>Valor Físico ($)</label>
                <input className={styles.input} type="number" step="0.01"
                  value={form.valorFisico||''} onChange={e=>update('valorFisico',e.target.value)}
                  placeholder="0.00"/>
              </div>
            )}
            {(form.enfoques||[]).includes('mercado')&&(
              <div className={styles.field}>
                <label className={styles.label}>Valor de Mercado ($)</label>
                <input className={styles.input} type="number" step="0.01"
                  value={form.valorMercado||''} onChange={e=>update('valorMercado',e.target.value)}
                  placeholder="0.00"/>
              </div>
            )}
            <div className={styles.field}>
              <label className={styles.label}>Enfoque Conclusivo</label>
              <select className={styles.select} value={enfoqueConclusivo}
                onChange={e=>{
                  update('enfoqueConclusivo',e.target.value)
                  // Limpiar el valor manual para que se recalcule automáticamente
                  update('valorMercadoConclusion','')
                }}>
                {(form.enfoques||['fisico']).includes('fisico')&&<option value="fisico">Valor Físico</option>}
                {(form.enfoques||[]).includes('mercado')&&<option value="mercado">Valor de Mercado</option>}
                <option value="mayor">Mayor Valor</option>
              </select>
            </div>
          </div>

          {/* Valor conclusivo editable */}
          <div style={{padding:'1.1rem 1.25rem',background:'rgba(201,151,42,.08)',
            border:'1.5px solid rgba(201,151,42,.4)',borderRadius:'10px',marginBottom:'1rem'}}>
            <p style={{fontSize:'.72rem',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',
              letterSpacing:'.07em',marginBottom:'.4rem'}}>
              VALOR COMPARATIVO DE MERCADO
            </p>
            <div style={{display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
              <span style={{fontSize:'.88rem',color:'var(--text-muted)',fontWeight:600}}>$</span>
              <input type="number" step="0.01"
                style={{background:'transparent',border:'none',borderBottom:'2px solid #c9972a',
                  color:'#c9972a',fontWeight:800,fontSize:'1.5rem',width:'220px',outline:'none',
                  padding:'.2rem 0',fontVariantNumeric:'tabular-nums'}}
                value={form.valorMercadoConclusion||''}
                onChange={e=>update('valorMercadoConclusion',e.target.value)}
                placeholder="0.00"/>
              {valorConclusivoCalc&&!form.valorMercadoConclusion&&(
                <button onClick={()=>update('valorMercadoConclusion',valorConclusivoCalc.toFixed(2))}
                  style={{padding:'.25rem .7rem',borderRadius:'6px',border:'1px solid rgba(201,151,42,.4)',
                    background:'rgba(201,151,42,.1)',color:'#c9972a',cursor:'pointer',
                    fontSize:'.74rem',fontWeight:700}}>
                  ← Usar {fmtMXN(valorConclusivoCalc)}
                </button>
              )}
            </div>
            <p style={{fontSize:'.72rem',color:'var(--text-muted)',marginTop:'.4rem'}}>
              Este valor pasa al módulo Valor Referido como base de cálculo
            </p>
          </div>

          <p style={{fontSize:'.78rem',fontWeight:700,color:'var(--text-secondary)',
            textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.5rem'}}>
            {declaratoria}
          </p>
        </div>
      </div>

      {/* ── X. CONCLUSIÓN DEL AVALÚO ACTUAL ── */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>X.— Conclusión del Avalúo Actual</span>
        </div>
        <div className={styles.sectBody}>

          {/* Bloque de valor en número (read-only) */}
          <div style={{padding:'1.25rem',background:'#0f172a',borderRadius:'10px',
            marginBottom:'1rem',textAlign:'center'}}>
            <p style={{fontSize:'.68rem',color:'#94a3b8',fontWeight:700,textTransform:'uppercase',
              letterSpacing:'.07em',marginBottom:'.4rem'}}>VALOR EN NÚMERO</p>
            <p style={{fontSize:'2.8rem',fontWeight:800,color:'#c9972a',
              fontVariantNumeric:'tabular-nums',lineHeight:1}}>
              {valorConclusivoFinal>0 ? fmtMXN(valorConclusivoFinal) : '—'}
            </p>
          </div>

          {/* Valor en letras (read-only, auto-generado) */}
          <div className={styles.field}>
            <label className={styles.label}>VALOR EN LETRA</label>
            <div style={{padding:'.75rem 1rem',background:'var(--bg-input)',
              border:'1px solid var(--border)',borderRadius:'8px',
              fontSize:'.9rem',fontWeight:700,textTransform:'uppercase',
              color:'var(--text-primary)',letterSpacing:'.02em',lineHeight:1.5,
              minHeight:'56px'}}>
              {letrasActual || '(Se genera automáticamente al ingresar el valor arriba)'}
            </div>
            {letrasActual&&(
              <span className={styles.calcNote}>Generado automáticamente — solo lectura</span>
            )}
          </div>

          {/* Declaratoria editable */}
          <div className={styles.field} style={{marginTop:'1rem'}}>
            <label className={styles.label}>Declaratoria del Avalúo</label>
            <textarea className={styles.textarea}
              style={{minHeight:'72px',fontWeight:600,textTransform:'uppercase',letterSpacing:'.02em'}}
              value={form.declaraciones||declaratoria}
              onChange={e=>update('declaraciones',e.target.value)}/>
          </div>
        </div>
      </div>

      {/* ── PIE DE PÁGINA — Datos del Valuador ── */}
      <div style={{marginTop:'1.25rem',padding:'1rem 1.25rem',background:'var(--bg-input)',
        border:'1px solid var(--border)',borderRadius:'10px'}}>
        <p style={{fontSize:'.68rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',
          letterSpacing:'.07em',marginBottom:'.75rem'}}>DATOS DEL PERITO VALUADOR</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'.75rem',flexWrap:'wrap'}}>
          {[
            ['peritoValuador','Perito Valuador'],
            ['cedulaProfesional','Cédula Profesional'],
            ['noRegSHF','Reg. SHF'],
            ['maestria','Maestría / Especialidad'],
            ['regEstatalPeritos','Reg. Estatal Peritos'],
          ].map(([campo,lbl])=>(
            <div key={campo}>
              <p style={{fontSize:'.68rem',fontWeight:700,color:'var(--text-muted)',
                textTransform:'uppercase',letterSpacing:'.04em',marginBottom:'.15rem'}}>{lbl}</p>
              <input className={styles.input} value={form[campo]||''}
                onChange={e=>update(campo,e.target.value)}
                style={{padding:'.28rem .5rem',fontSize:'.82rem'}}/>
            </div>
          ))}
        </div>
        <div style={{marginTop:'.75rem'}}>
          <p style={{fontSize:'.68rem',fontWeight:700,color:'var(--text-muted)',
            textTransform:'uppercase',letterSpacing:'.04em',marginBottom:'.15rem'}}>Domicilio Profesional</p>
          <input className={styles.input} value={form.domicilioProfesional||''}
            onChange={e=>update('domicilioProfesional',e.target.value)}
            style={{fontSize:'.82rem'}}
            placeholder="Norte 3 No. 54 Altos 1, Col. Centro, Orizaba, Ver.  Tel: 2722174550"/>
        </div>
      </div>

      {/* Botón → Valor Referido */}
      {valorConclusivoFinal>0&&(
        <div style={{marginTop:'1.25rem',padding:'1rem',background:'#eff6ff',
          border:'1px solid #bfdbfe',borderRadius:'10px',
          display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem'}}>
          <div>
            <p style={{fontSize:'.78rem',fontWeight:700,color:'#1d4ed8'}}>
              ✓ Valor conclusivo listo: {fmtMXN(valorConclusivoFinal)}
            </p>
            <p style={{fontSize:'.72rem',color:'#3b82f6',marginTop:'.15rem'}}>
              Vaya al tab "Valor Referido" para calcular el ajuste INPC
            </p>
          </div>
          <div style={{fontSize:'.75rem',color:'#1d4ed8',fontWeight:600}}>
            → Siguiente: Valor Referido
          </div>
        </div>
      )}
    </div>
  )
}