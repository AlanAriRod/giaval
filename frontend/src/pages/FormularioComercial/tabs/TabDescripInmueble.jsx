// frontend/src/pages/FormularioComercial/tabs/TabDescripInmueble.jsx
// RF-11: Los campos de habitaciones son DINÁMICOS:
//   - Cada campo tiene nombre editable y su valor
//   - Se pueden eliminar con el botón de basura
//   - Se pueden agregar con "Agregar Espacio" (pide nombre)
//   - Por defecto se cargan los campos estándar si form.espaciosHabitacion está vacío
// Los demás campos (edad, niveles, acabados, etc.) sin cambios

import { useState } from 'react'
import { Plus, Trash2, Pencil, Check } from 'lucide-react'
import styles from '../Formulario.module.css'

const CALIDADES = ['EXCELENTE','MUY BUENO','BUENO','REGULAR','MALO','MUY MALO']
const ESTADOS_CONS = ['EXCELENTE','MUY BUENO','BUENO','REGULAR','DETERIORADO','MUY DETERIORADO','EN RUINAS']
const CALIDAD_PROY = [
  'EXCELENTE PARA EL TIPO PROYECTO',
  'MUY BUENO PARA EL TIPO PROYECTO',
  'BUENO PARA EL TIPO PROYECTO',
  'REGULAR PARA EL TIPO PROYECTO',
  'MALO PARA EL TIPO PROYECTO',
]

// Campos por defecto cuando no hay ninguno guardado
const ESPACIOS_DEFAULT = [
  { id: 'rec',   label: 'Recámaras',          valor: '' },
  { id: 'coc',   label: 'Cocinas',             valor: '' },
  { id: 'ban',   label: 'Baños Completos',     valor: '' },
  { id: 'med',   label: '½ Baños',             valor: '' },
  { id: 'est',   label: 'Estacionamientos',    valor: '' },
  { id: 'ele',   label: 'Elevador',            valor: 'NO TIENE' },
]

function Seccion({ titulo, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={styles.section}>
      <div className={`${styles.sectHeader} ${open ? styles.sectHeaderOpen : ''}`}
        onClick={() => setOpen(o => !o)} style={{ cursor:'pointer' }}>
        <span className={styles.sectTitle}>{titulo}</span>
        <span style={{ fontSize:'.8rem', color:'var(--text-muted)', userSelect:'none' }}>{open?'▲':'▼'}</span>
      </div>
      {open && <div className={styles.sectBody}>{children}</div>}
    </div>
  )
}

// Componente de campo dinámico individual
function EspacioItem({ espacio, onUpdate, onDelete, onRename }) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [tempLabel, setTempLabel] = useState(espacio.label)

  return (
    <div style={{ display:'flex', alignItems:'center', gap:'.5rem',
      padding:'.5rem .75rem', background:'var(--bg-input)',
      border:'1px solid var(--border)', borderRadius:'8px' }}>
      {/* Label editable */}
      <div style={{ minWidth:'130px', flex:'0 0 130px' }}>
        {editingLabel ? (
          <div style={{ display:'flex', gap:'.3rem', alignItems:'center' }}>
            <input value={tempLabel}
              onChange={e=>setTempLabel(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'){onRename(tempLabel);setEditingLabel(false)} }}
              style={{ padding:'.2rem .4rem', borderRadius:'4px', border:'1px solid #c9972a',
                fontSize:'.78rem', width:'100px', background:'var(--bg-card)', color:'var(--text-primary)' }}
              autoFocus/>
            <button onClick={()=>{ onRename(tempLabel); setEditingLabel(false) }}
              style={{ padding:'.15rem .3rem', borderRadius:'4px', background:'#c9972a',
                border:'none', cursor:'pointer', color:'#fff' }}>
              <Check size={11}/>
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap:'.3rem' }}>
            <span style={{ fontSize:'.78rem', fontWeight:700, color:'var(--text-secondary)',
              textTransform:'uppercase', letterSpacing:'.03em' }}>{espacio.label}</span>
            <button onClick={()=>{ setTempLabel(espacio.label); setEditingLabel(true) }}
              style={{ padding:'.1rem .2rem', background:'none', border:'none',
                cursor:'pointer', color:'var(--text-muted)', opacity:.6 }}>
              <Pencil size={10}/>
            </button>
          </div>
        )}
      </div>

      {/* Valor */}
      <div style={{ display:'flex', alignItems:'center', gap:'.35rem', flex:1 }}>
        <button type="button"
          onClick={()=>{ const v=parseInt(espacio.valor)||0; if(v>0) onUpdate(String(v-1)) }}
          style={{ width:'28px',height:'28px',borderRadius:'5px',border:'1px solid var(--border)',
            background:'var(--bg-card)',color:'var(--text-secondary)',fontSize:'1rem',
            cursor:'pointer',fontWeight:700,lineHeight:1,flexShrink:0 }}>−</button>
        <input type="text"
          value={espacio.valor}
          onChange={e=>onUpdate(e.target.value)}
          style={{ textAlign:'center',width:'56px',padding:'.3rem .4rem',borderRadius:'6px',
            border:'1px solid var(--border)',background:'var(--bg-card)',
            color:'var(--text-primary)',fontSize:'.88rem',fontWeight:600 }}/>
        <button type="button"
          onClick={()=>{ const v=parseInt(espacio.valor)||0; onUpdate(String(v+1)) }}
          style={{ width:'28px',height:'28px',borderRadius:'5px',border:'1px solid var(--border)',
            background:'var(--bg-card)',color:'var(--text-secondary)',fontSize:'1rem',
            cursor:'pointer',fontWeight:700,lineHeight:1,flexShrink:0 }}>+</button>
      </div>

      {/* Eliminar */}
      <button onClick={onDelete}
        style={{ padding:'.3rem .35rem', borderRadius:'5px', background:'#fef2f2',
          border:'1px solid #fecaca', color:'#dc2626', cursor:'pointer', flexShrink:0 }}>
        <Trash2 size={12}/>
      </button>
    </div>
  )
}

export default function TabDescripInmueble({ form, update }) {
  const [nuevoEspacio, setNuevoEspacio] = useState('')
  const [mostrarAgregar, setMostrarAgregar] = useState(false)

  // Leer o inicializar espacios dinámicos
  const espacios = form.espaciosHabitacion?.length > 0
    ? form.espaciosHabitacion
    : ESPACIOS_DEFAULT

  const setEspacios = (nuevos) => update('espaciosHabitacion', nuevos)

  const updateEspacio = (idx, valor) =>
    setEspacios(espacios.map((e,i) => i===idx ? {...e, valor} : e))

  const deleteEspacio = (idx) =>
    setEspacios(espacios.filter((_,i) => i!==idx))

  const renameEspacio = (idx, label) =>
    setEspacios(espacios.map((e,i) => i===idx ? {...e, label} : e))

  const agregarEspacio = () => {
    if (!nuevoEspacio.trim()) return
    setEspacios([...espacios, {
      id: `custom_${Date.now()}`,
      label: nuevoEspacio.trim(),
      valor: '',
    }])
    setNuevoEspacio('')
    setMostrarAgregar(false)
  }

  // Compatibilidad: si el form usa los campos individuales viejos, migrarlos
  const acabados = form.acabados || []
  const addAcabado = () =>
    update('acabados', [...acabados, { espacio:'', piso:'', muro:'', plafon:'' }])
  const removeAcabado = (i) =>
    update('acabados', acabados.filter((_,j)=>j!==i))
  const updAcabado = (i, campo, valor) =>
    update('acabados', acabados.map((a,j)=>j===i?{...a,[campo]:valor}:a))

  return (
    <div>
      {/* ── Información General ── */}
      <Seccion titulo="Información General del Inmueble">
        <div className={styles.field}>
          <label className={styles.label}>Descripción del Inmueble</label>
          <textarea className={styles.textarea}
            style={{ minHeight:'120px', textTransform:'uppercase', fontWeight:500 }}
            value={form.descripcionInmueble || ''}
            onChange={e => update('descripcionInmueble', e.target.value)}
            placeholder="TERRENO DE USO HABITACIONAL… (se llena automáticamente al leer el plano con IA)"/>
        </div>

        <div className={styles.grid3}>
          <div className={styles.field}>
            <label className={styles.label}>Uso Actual</label>
            <input className={styles.input} value={form.usoActual||''}
              onChange={e=>update('usoActual',e.target.value)} placeholder="Habitacional"/>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Tipo de Construcción</label>
            <input className={styles.input} value={form.tiposConstruccion||form.bienQueValua||'Casa Habitación'}
              onChange={e=>update('tiposConstruccion',e.target.value)}
              placeholder="Casa Habitación"/>
            <span className={styles.calcNote}>
              Editable. Valor por defecto según el bien valuado.
            </span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Calidad / Clasificación</label>
            <select className={styles.select} value={form.calidadClasificacion||'BUENO'}
              onChange={e=>update('calidadClasificacion',e.target.value)}>
              {CALIDADES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Número de Niveles</label>
            <div style={{ display:'flex', alignItems:'center', gap:'.35rem' }}>
              <button type="button"
                onClick={()=>update('numNiveles',Math.max(1,(parseInt(form.numNiveles)||1)-1))}
                style={{ width:'28px',height:'32px',borderRadius:'6px',border:'1px solid var(--border)',
                  background:'var(--bg-card)',color:'var(--text-secondary)',fontSize:'1rem',
                  cursor:'pointer',fontWeight:700,flexShrink:0 }}>−</button>
              <input className={styles.input} type="number" min={1}
                style={{ textAlign:'center', width:'60px', flexShrink:0 }}
                value={form.numNiveles||''} onChange={e=>update('numNiveles',e.target.value)}/>
              <button type="button"
                onClick={()=>update('numNiveles',(parseInt(form.numNiveles)||1)+1)}
                style={{ width:'28px',height:'32px',borderRadius:'6px',border:'1px solid var(--border)',
                  background:'var(--bg-card)',color:'var(--text-secondary)',fontSize:'1rem',
                  cursor:'pointer',fontWeight:700,flexShrink:0 }}>+</button>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Edad Aproximada (años)</label>
            <input className={styles.input} type="number" min={0}
              value={form.edadAproximada||''} onChange={e=>update('edadAproximada',e.target.value)}/>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Vida Total (años)</label>
            <input className={styles.input} type="number" min={1}
              value={form.vidaTotal||60} onChange={e=>update('vidaTotal',e.target.value)}/>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Vida Útil Remanente (años)</label>
            {(()=>{
              const total = parseInt(form.vidaTotal)||60
              const edad  = parseInt(form.edadAproximada)||0
              const rem   = Math.max(0, total - edad)
              return (
                <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                  <div className={styles.input} style={{background:'var(--bg-input)',
                    color: rem<=10?'#dc2626': rem<=20?'#c9972a':'#16a34a',
                    fontWeight:800,fontSize:'.95rem',cursor:'default',
                    display:'flex',alignItems:'center',gap:'.5rem'}}>
                    <span style={{fontVariantNumeric:'tabular-nums'}}>{rem}</span>
                    <span style={{fontSize:'.7rem',fontWeight:500,color:'var(--text-muted)'}}>
                      = {total} − {edad}
                    </span>
                  </div>
                </div>
              )
            })()}
            <span className={styles.calcNote}>Calculado automáticamente: Vida Total − Edad</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Estado de Conservación</label>
            <select className={styles.select} value={form.estadoConservacion||'BUENO'}
              onChange={e=>update('estadoConservacion',e.target.value)}>
              {ESTADOS_CONS.map(e=><option key={e}>{e}</option>)}
            </select>
          </div>
          <div className={`${styles.field} ${styles.span2}`}>
            <label className={styles.label}>Calidad del Proyecto</label>
            <select className={styles.select} value={form.calidadProyecto||''}
              onChange={e=>update('calidadProyecto',e.target.value)}>
              {CALIDAD_PROY.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* ── Espacios / Habitaciones — DINÁMICOS ── */}
        <div style={{ marginTop:'1.25rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            marginBottom:'.75rem', flexWrap:'wrap', gap:'.5rem' }}>
            <p style={{ fontWeight:700, fontSize:'.82rem', color:'var(--text-secondary)',
              textTransform:'uppercase', letterSpacing:'.04em' }}>
              Espacios / Habitaciones
            </p>
            <div style={{ display:'flex', gap:'.5rem', alignItems:'center', flexWrap:'wrap' }}>
              {!mostrarAgregar && (
                <button type="button" onClick={()=>setMostrarAgregar(true)}
                  className={styles.addRowBtn}>
                  <Plus size={13}/> Agregar espacio
                </button>
              )}
              {espacios !== ESPACIOS_DEFAULT && espacios.length > 0 && (
                <button type="button"
                  onClick={()=>setEspacios(ESPACIOS_DEFAULT)}
                  style={{ padding:'.3rem .7rem', borderRadius:'6px', fontSize:'.74rem',
                    border:'1px solid var(--border)', background:'var(--bg-card)',
                    color:'var(--text-muted)', cursor:'pointer' }}>
                  ↺ Restablecer defaults
                </button>
              )}
            </div>
          </div>

          {/* Input para nuevo espacio */}
          {mostrarAgregar && (
            <div style={{ display:'flex', gap:'.5rem', marginBottom:'.65rem',
              padding:'.65rem', background:'var(--bg-input)', borderRadius:'8px',
              border:'1px solid #c9972a', alignItems:'center', flexWrap:'wrap' }}>
              <input value={nuevoEspacio} onChange={e=>setNuevoEspacio(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&agregarEspacio()}
                placeholder="Ej: Estudio, Bodega, Terraza…"
                style={{ flex:1, minWidth:'150px', padding:'.35rem .6rem', borderRadius:'6px',
                  border:'1px solid var(--border)', background:'var(--bg-card)',
                  color:'var(--text-primary)', fontSize:'.86rem' }}
                autoFocus/>
              <button type="button" onClick={agregarEspacio}
                style={{ padding:'.35rem .8rem', borderRadius:'6px', border:'none',
                  background:'#c9972a', color:'#fff', cursor:'pointer',
                  fontWeight:700, fontSize:'.82rem' }}>
                ✓ Agregar
              </button>
              <button type="button" onClick={()=>setMostrarAgregar(false)}
                style={{ padding:'.35rem .8rem', borderRadius:'6px',
                  border:'1px solid var(--border)', background:'var(--bg-card)',
                  color:'var(--text-muted)', cursor:'pointer', fontSize:'.82rem' }}>
                Cancelar
              </button>
            </div>
          )}

          {/* Lista de espacios */}
          <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
            {espacios.map((esp, idx) => (
              <EspacioItem key={esp.id||idx} espacio={esp}
                onUpdate={(v) => updateEspacio(idx, v)}
                onDelete={() => deleteEspacio(idx)}
                onRename={(l) => renameEspacio(idx, l)}/>
            ))}
          </div>
          {espacios.length === 0 && (
            <p style={{ fontSize:'.8rem', color:'var(--text-muted)', textAlign:'center',
              padding:'1rem', background:'var(--bg-input)', borderRadius:'8px' }}>
              Sin espacios. Usa "Agregar espacio" para añadir.
            </p>
          )}
        </div>
      </Seccion>

      {/* ── Estructura ── */}
      <Seccion titulo="Estructura">
        <div className={styles.field}>
          <label className={styles.label}>Descripción de la Estructura</label>
          <textarea className={styles.textarea}
            value={form.estructura||''}
            onChange={e=>update('estructura',e.target.value)}
            placeholder="SE PRESUME CIMENTACION DE PIEDRA BRAZA Y/O ZAPATAS DE CONCRETO…"/>
        </div>
      </Seccion>

      {/* ── Acabados ── */}
      <Seccion titulo="Tabla de Acabados">
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'600px' }}>
            <thead>
              <tr style={{ background:'#0f172a' }}>
                {['Espacio','Piso','Muro','Plafón',''].map((h,i)=>(
                  <th key={i} style={{ padding:'.5rem .7rem', textAlign:'left',
                    fontSize:'.72rem', fontWeight:700, color:'#94a3b8',
                    textTransform:'uppercase', letterSpacing:'.04em',
                    borderBottom:'1px solid #1e293b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {acabados.map((a,i)=>(
                <tr key={i} style={{ background:i%2===0?'var(--bg-card)':'var(--bg-input)' }}>
                  {['espacio','piso','muro','plafon'].map(campo=>(
                    <td key={campo} style={{ padding:'.3rem .4rem', verticalAlign:'middle' }}>
                      <input className={styles.input} value={a[campo]||''}
                        onChange={e=>updAcabado(i,campo,e.target.value)}
                        style={{ padding:'.28rem .4rem', fontSize:'.82rem', textTransform:'uppercase' }}/>
                    </td>
                  ))}
                  <td style={{ padding:'.3rem .4rem', verticalAlign:'middle', textAlign:'center' }}>
                    <button onClick={()=>removeAcabado(i)}
                      style={{ padding:'.25rem .35rem', borderRadius:'5px', border:'1px solid #fecaca',
                        background:'#fef2f2', color:'#dc2626', cursor:'pointer' }}>
                      <Trash2 size={12}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addAcabado}
          style={{ marginTop:'.75rem', display:'inline-flex', alignItems:'center', gap:'.35rem',
            padding:'.4rem .85rem', borderRadius:'7px', border:'1px solid var(--border)',
            background:'var(--bg-card)', color:'var(--text-secondary)', fontSize:'.82rem',
            fontWeight:600, cursor:'pointer' }}>
          <Plus size={13}/> Agregar espacio
        </button>
      </Seccion>

      {/* ── Instalaciones Especiales ── */}
      <Seccion titulo="Instalaciones Especiales">
        <div className={styles.grid3}>
          {[
            ['hidraulico','Hidráulico'],
            ['electrico','Eléctrico'],
            ['carpinteria','Carpintería'],
            ['herreria','Herrería'],
            ['instalacionGas','Gas'],
            ['instalacionOtra','Otra instalación'],
          ].map(([campo,label])=>(
            <div key={campo} className={styles.field}>
              <label className={styles.label}>{label}</label>
              <textarea className={styles.textarea}
                style={{minHeight:'72px',resize:'vertical'}}
                value={form[campo]||''}
                onChange={e=>update(campo,e.target.value)}
                placeholder="Descripción de la instalación…"/>
            </div>
          ))}
        </div>
      </Seccion>
    </div>
  )
}