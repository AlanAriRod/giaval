// frontend/src/pages/FormularioComercial/tabs/TabPortada.jsx
// FIX: "Fotografía Representativa De Portada" ahora usa form.fotoPrincipal
// que se muestra en la portada del PDF (no form.fotos[0])

import { useRef } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import styles from '../Formulario.module.css'

const TIPOS_AVALUO = [
  'Avalúo Comercial','Avalúo Referido','Avalúo Catastral',
  'Avalúo Hipotecario','Dictamen Valuatorio','Otro',
]
const VIGENCIAS = ['Tres Meses','Seis Meses','Doce Meses']

export default function TabPortada({ form, update, hideVigencia=false, showFechaReferida=false }) {
  const fotoRef  = useRef(null)

  const onFoto = (e) => {
    const f = e.target.files?.[0]; if(!f) return
    const r = new FileReader()
    r.onload = ev => update('fotoPrincipal', ev.target.result)
    r.readAsDataURL(f)
    e.target.value = ''
  }

  return (
    <div>
      {/* ── Datos de portada ── */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Identificación del Avalúo</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid3}>
            <div className={`${styles.field} ${styles.span2}`}>
              <label className={`${styles.label} ${styles.req}`}>Folio Interno</label>
              <input className={styles.input} value={form.folioInterno||''}
                onChange={e=>update('folioInterno',e.target.value)}
                placeholder="CLAVE-AG/2604-001"/>
              <span className={styles.calcNote}>Formato: CLAVE-AG/AAMM-NNN</span>
            </div>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Fecha del Avalúo</label>
              <input type="date" className={styles.input} value={form.fechaAvaluo||''}
                onChange={e=>update('fechaAvaluo',e.target.value)}/>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Tipo de Avalúo</label>
              <select className={styles.select} value={form.tipoAvaluo||'Avalúo Comercial'}
                onChange={e=>update('tipoAvaluo',e.target.value)}>
                {TIPOS_AVALUO.map(t=><option key={t}>{t}</option>)}
              </select>
              {form.tipoAvaluo==='Otro'&&(
                <input className={styles.input} style={{marginTop:'.4rem'}}
                  value={form.tipoAvaluoOtro||''} onChange={e=>update('tipoAvaluoOtro',e.target.value)}
                  placeholder="Especifica…"/>
              )}
            </div>
            {!hideVigencia&&(
              <div className={styles.field}>
                <label className={styles.label}>Vigencia</label>
                <select className={styles.select} value={form.vigenciaAvaluo||'Seis Meses'}
                  onChange={e=>update('vigenciaAvaluo',e.target.value)}>
                  {VIGENCIAS.map(v=><option key={v}>{v}</option>)}
                </select>
              </div>
            )}
            {showFechaReferida&&(
              <div className={styles.field}>
                <label className={styles.label}>Fecha Referida</label>
                <div style={{display:'flex',gap:'.4rem'}}>
                  <select className={styles.select}
                    value={form.mesReferido||''}
                    onChange={e=>update('mesReferido',e.target.value)}
                    style={{flex:1}}>
                    <option value="">Mes</option>
                    {['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
                    ].map((m,i)=><option key={i+1} value={String(i+1).padStart(2,'0')}>{m}</option>)}
                  </select>
                  <select className={styles.select}
                    value={form.anioReferido||''}
                    onChange={e=>update('anioReferido',e.target.value)}
                    style={{flex:1}}>
                    <option value="">Año</option>
                    {Array.from({length:60},(_,i)=>String(2026-i)).map(a=>(
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <span className={styles.calcNote}>
                  Sincronizado con tab Valor Referido
                </span>
              </div>
            )}
            <div className={styles.field}>
              <label className={styles.label}>Propósito</label>
              <input className={styles.input} value={form.proposito||''}
                onChange={e=>update('proposito',e.target.value)}/>
            </div>

            <div className={`${styles.field} ${styles.span3}`}>
              <label className={styles.label}>Bien que se Valúa</label>
              <input className={styles.input} value={form.bienQueSeValua||''}
                onChange={e=>update('bienQueSeValua',e.target.value)} placeholder="Casa Habitación"/>
            </div>
          </div>
        </div>
      </div>

      {/* ── Fotografía Representativa De Portada ── */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Fotografía Representativa De Portada</span>
        </div>
        <div className={styles.sectBody}>
          <p style={{fontSize:'.8rem',color:'var(--text-muted)',marginBottom:'1rem'}}>
            Esta imagen aparece en la primera página del PDF como fotografía principal del inmueble.
            Normalmente es la <strong>vista de la fachada</strong>.
          </p>

          <input type="file" accept="image/*" hidden ref={fotoRef} onChange={onFoto}/>

          {form.fotoPrincipal?(
            <div style={{display:'inline-block',position:'relative'}}>
              <img src={form.fotoPrincipal} alt="Portada"
                style={{width:'320px',maxHeight:'220px',objectFit:'cover',
                  borderRadius:'10px',border:'2px solid #c9972a',display:'block'}}/>
              <div style={{display:'flex',gap:'.5rem',marginTop:'.6rem'}}>
                <button onClick={()=>fotoRef.current?.click()}
                  style={{flex:1,padding:'.4rem',borderRadius:'7px',cursor:'pointer',
                    border:'1px solid #c9972a',background:'rgba(201,151,42,.1)',
                    color:'#c9972a',fontSize:'.8rem',fontWeight:700,
                    display:'flex',alignItems:'center',justifyContent:'center',gap:'.3rem'}}>
                  <Camera size={13}/> Cambiar
                </button>
                <button onClick={()=>update('fotoPrincipal',null)}
                  style={{flex:1,padding:'.4rem',borderRadius:'7px',cursor:'pointer',
                    border:'1px solid #fecaca',background:'#fef2f2',
                    color:'#dc2626',fontSize:'.8rem',fontWeight:700,
                    display:'flex',alignItems:'center',justifyContent:'center',gap:'.3rem'}}>
                  <Trash2 size={13}/> Quitar
                </button>
              </div>
            </div>
          ):(
            <div onClick={()=>fotoRef.current?.click()}
              style={{width:'320px',height:'200px',borderRadius:'10px',cursor:'pointer',
                border:'2px dashed var(--border)',background:'var(--bg-input)',
                display:'flex',flexDirection:'column',alignItems:'center',
                justifyContent:'center',gap:'.5rem',color:'var(--text-muted)'}}>
              <Camera size={28} strokeWidth={1.4}/>
              <p style={{fontWeight:600,fontSize:'.88rem'}}>Agregar Fotografía de Portada</p>
              <p style={{fontSize:'.74rem',opacity:.7}}>JPG, PNG — aparecerá en página 1 del PDF</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Datos del perito ── */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Datos del Perito Valuador</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid3}>
            <div className={`${styles.field} ${styles.span2}`}>
              <label className={styles.label}>Perito Valuador</label>
              <input className={styles.input} value={form.peritoValuador||''} readOnly
                style={{background:'var(--bg-input)',color:'var(--text-muted)',cursor:'not-allowed'}}/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Reg. Estatal de Peritos</label>
              <input className={styles.input} value={form.regEstatalPeritos||''}
                onChange={e=>update('regEstatalPeritos',e.target.value)} placeholder="SREP-0122-PJEV2026"/>
            </div>
            <div className={`${styles.field} ${styles.span3}`}>
              <label className={styles.label}>Maestría / Especialidad</label>
              <input className={styles.input} value={form.maestria||''} readOnly
                style={{background:'var(--bg-input)',color:'var(--text-muted)',cursor:'not-allowed'}}/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Cédula Profesional</label>
              <input className={styles.input} value={form.cedulaProfesional||''} readOnly
                style={{background:'var(--bg-input)',color:'var(--text-muted)',cursor:'not-allowed'}}/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Registro SHF</label>
              <input className={styles.input} value={form.noRegSHF||''} readOnly
                style={{background:'var(--bg-input)',color:'var(--text-muted)',cursor:'not-allowed'}}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}