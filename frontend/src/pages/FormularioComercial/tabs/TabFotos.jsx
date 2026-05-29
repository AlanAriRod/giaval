// frontend/src/pages/FormularioComercial/tabs/TabFotos.jsx
// RENOMBRADO: "Fotografías y Documentos"
// - Sección de fotos del inmueble (sin cambios)
// - Nueva sección: documentos anexados (escrituras, INE, predial, planos, etc.)
// - Los documentos se guardan en form.documentosAnexos[]
// - En el PDF aparecen como anexo final con su nombre y tipo

import { useState, useRef } from 'react'
import { Camera, FileText, Trash2, Plus, Download } from 'lucide-react'
import styles from '../Formulario.module.css'

const CATEGORIAS_FOTO = [
  'Fachada Principal','Vista del Entorno','Sala','Comedor','Cocina',
  'Recámara 1','Recámara 2','Recámara 3','Baño Completo','½ Baño',
  'Escalera / Vestíbulo','Patio / Jardín','Área de Servicio',
  'Azotea / Terraza','Cisterna','Tinaco','Medidor CFE','Herrería',
  'Instalación Eléctrica','Estacionamiento','Otro',
]

const TIPOS_DOCUMENTO = [
  'Escritura Pública','Boleta Predial','Identificación Oficial (INE/Pasaporte)',
  'Comprobante de Domicilio','Plano Arquitectónico','Cédula Catastral',
  'Acta de Nacimiento','CURP','RFC','Resolución / Sentencia',
  'Carta de Autorización','Recibo de Agua','Recibo de Luz',
  'Otro Documento',
]

export default function TabFotos({ form, update }) {
  const fotos    = form.fotos    || []
  const docs     = form.documentosAnexos || []
  const [visorDoc, setVisorDoc] = useState(null)  // {data, nombre, mimeType}
  const fotoRef  = useRef(null)
  const docRef   = useRef(null)

  // ── Fotos ─────────────────────────────────────────────────────
  const onFoto = (e) => {
    Promise.all(Array.from(e.target.files).map(f => new Promise(res => {
      const r = new FileReader()
      r.onload = ev => res({ src: ev.target.result, categoria: 'Fachada Principal', label: '' })
      r.readAsDataURL(f)
    }))).then(nuevas => update('fotos', [...fotos, ...nuevas]))
    e.target.value = ''
  }

  const updFoto = (i, campo, val) =>
    update('fotos', fotos.map((f, j) => j === i ? { ...f, [campo]: val } : f))

  const quitarFoto = (i) => update('fotos', fotos.filter((_, j) => j !== i))

  // ── Documentos ────────────────────────────────────────────────
  const onDoc = (e) => {
    Promise.all(Array.from(e.target.files).map(f => new Promise(res => {
      const r = new FileReader()
      r.onload = ev => res({
        nombre:   f.name,
        tipo:     'Otro Documento',
        tamaño:   f.size,
        mimeType: f.type,
        data:     ev.target.result,  // base64
        fecha:    new Date().toLocaleDateString('es-MX'),
      })
      r.readAsDataURL(f)
    }))).then(nuevos => update('documentosAnexos', [...docs, ...nuevos]))
    e.target.value = ''
  }

  const updDoc = (i, campo, val) =>
    update('documentosAnexos', docs.map((d, j) => j === i ? { ...d, [campo]: val } : d))

  const quitarDoc = (i) => update('documentosAnexos', docs.filter((_, j) => j !== i))

  const fmtSize = (b) =>
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`

  return (
    <div>
      {/* ── I. FOTOGRAFÍAS ── */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>I. Fotografías del Inmueble</span>
        </div>
        <div className={styles.sectBody}>
          <p style={{fontSize:'.8rem',color:'var(--text-muted)',marginBottom:'1rem'}}>
            Agrega fotos del inmueble. La fotografía de portada se configura en la pestaña Portada.
          </p>

          {/* Botón agregar */}
          <input type="file" accept="image/*" multiple hidden ref={fotoRef} onChange={onFoto}/>
          <button onClick={()=>fotoRef.current?.click()}
            style={{display:'inline-flex',alignItems:'center',gap:'.4rem',
              padding:'.45rem .9rem',borderRadius:'8px',cursor:'pointer',
              border:'1.5px solid #c9972a',background:'rgba(201,151,42,.08)',
              color:'#c9972a',fontSize:'.84rem',fontWeight:700,marginBottom:'1rem'}}>
            <Camera size={14}/> Agregar Fotografías
          </button>

          {fotos.length===0&&(
            <div style={{textAlign:'center',padding:'2rem',background:'var(--bg-input)',
              borderRadius:'10px',border:'2px dashed var(--border)'}}>
              <p style={{fontSize:'1.4rem',marginBottom:'.4rem'}}>📷</p>
              <p style={{fontWeight:700,color:'var(--text-secondary)'}}>Sin fotografías</p>
              <p style={{fontSize:'.8rem',color:'var(--text-muted)',marginTop:'.3rem'}}>
                La primera foto que agregues será la fotografía de portada del avalúo.
              </p>
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'1rem'}}>
            {fotos.map((foto,i)=>{
              const src = typeof foto==='string' ? foto : foto?.src
              return (
                <div key={i} style={{background:'var(--bg-input)',border:'1px solid var(--border)',
                  borderRadius:'10px',overflow:'hidden'}}>
                  {src&&(
                    <div style={{position:'relative'}}>
                      <img src={src} alt="" style={{width:'100%',height:'140px',objectFit:'cover',display:'block'}}/>

                    </div>
                  )}
                  <div style={{padding:'.65rem'}}>
                    <select style={{width:'100%',padding:'.3rem .5rem',borderRadius:'5px',
                      border:'1px solid var(--border)',background:'var(--bg-card)',
                      color:'var(--text-primary)',fontSize:'.78rem',marginBottom:'.4rem'}}
                      value={typeof foto==='object'?foto.categoria||'Fachada Principal':'Fachada Principal'}
                      onChange={e=>updFoto(i,'categoria',e.target.value)}>
                      {CATEGORIAS_FOTO.map(c=><option key={c}>{c}</option>)}
                    </select>
                    <input placeholder="Descripción / leyenda…"
                      style={{width:'100%',padding:'.3rem .5rem',borderRadius:'5px',boxSizing:'border-box',
                        border:'1px solid var(--border)',background:'var(--bg-card)',
                        color:'var(--text-primary)',fontSize:'.75rem',marginBottom:'.4rem'}}
                      value={typeof foto==='object'?foto.label||'':''}
                      onChange={e=>updFoto(i,'label',e.target.value)}/>
                    <button onClick={()=>quitarFoto(i)}
                      style={{width:'100%',padding:'.28rem',borderRadius:'5px',
                        background:'#fef2f2',border:'1px solid #fecaca',
                        color:'#dc2626',cursor:'pointer',fontSize:'.75rem',
                        display:'flex',alignItems:'center',justifyContent:'center',gap:'.3rem'}}>
                      <Trash2 size={11}/> Quitar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── II. DOCUMENTOS ANEXOS ── */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>II. Documentos Anexos</span>
        </div>
        <div className={styles.sectBody}>
          <p style={{fontSize:'.8rem',color:'var(--text-muted)',marginBottom:'1rem'}}>
            Adjunta documentos que se necesitan para validar el avalúo (escrituras, INE, predial, etc.).
            Los que se leyeron con IA también se guardan aquí automáticamente.
            En el PDF aparecerán como anexo documental al final del expediente.
          </p>

          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple hidden
            ref={docRef} onChange={onDoc}/>
          <button onClick={()=>docRef.current?.click()}
            style={{display:'inline-flex',alignItems:'center',gap:'.4rem',
              padding:'.45rem .9rem',borderRadius:'8px',cursor:'pointer',
              border:'1.5px solid #2563eb',background:'rgba(37,99,235,.06)',
              color:'#2563eb',fontSize:'.84rem',fontWeight:700,marginBottom:'1rem'}}>
            <Plus size={14}/> Agregar Documento
          </button>

          {docs.length===0&&(
            <div style={{textAlign:'center',padding:'1.5rem',background:'var(--bg-input)',
              borderRadius:'10px',border:'2px dashed var(--border)'}}>
              <p style={{fontSize:'1.2rem',marginBottom:'.3rem'}}>📄</p>
              <p style={{fontWeight:700,color:'var(--text-secondary)',fontSize:'.88rem'}}>Sin documentos anexos</p>
            </div>
          )}

          <div style={{display:'flex',flexDirection:'column',gap:'.6rem'}}>
            {docs.map((doc,i)=>(
              <div key={i} style={{display:'flex',gap:'.75rem',alignItems:'center',
                padding:'.65rem .85rem',background:'var(--bg-input)',
                border:'1px solid var(--border)',borderRadius:'8px'}}>
                <FileText size={20} style={{color:'#2563eb',flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:700,fontSize:'.84rem',color:'var(--text-primary)',
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {doc.nombre}
                  </p>
                  <p style={{fontSize:'.72rem',color:'var(--text-muted)',marginTop:'.1rem'}}>
                    {fmtSize(doc.tamaño||0)} · {doc.fecha||''}
                  </p>
                </div>
                <select style={{padding:'.3rem .5rem',borderRadius:'5px',flexShrink:0,
                  border:'1px solid var(--border)',background:'var(--bg-card)',
                  color:'var(--text-primary)',fontSize:'.76rem',maxWidth:'180px'}}
                  value={doc.tipo||'Otro Documento'}
                  onChange={e=>updDoc(i,'tipo',e.target.value)}>
                  {TIPOS_DOCUMENTO.map(t=><option key={t}>{t}</option>)}
                </select>
                <button onClick={()=>quitarDoc(i)}
                  style={{padding:'.3rem .4rem',borderRadius:'5px',flexShrink:0,
                    background:'#fef2f2',border:'1px solid #fecaca',
                    color:'#dc2626',cursor:'pointer'}}>
                  <Trash2 size={13}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Visor de documento (doble clic) ── */}
      {visorDoc&&(
        <div style={{position:'fixed',inset:0,zIndex:1200,background:'rgba(0,0,0,.65)',
          display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(3px)'}}
          onClick={()=>setVisorDoc(null)}>
          <div style={{background:'var(--bg-card)',borderRadius:'12px',padding:'1.25rem',
            maxWidth:'90vw',maxHeight:'90vh',overflow:'hidden',display:'flex',
            flexDirection:'column',gap:'.75rem'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.5rem'}}>
              <div>
                <p style={{fontWeight:700,fontSize:'.92rem',color:'var(--text-primary)'}}>{visorDoc.nombre}</p>
                <p style={{fontSize:'.74rem',color:'var(--text-muted)'}}>{visorDoc.tipo||'Documento'}</p>
              </div>
              <button onClick={()=>setVisorDoc(null)}
                style={{padding:'.3rem .5rem',borderRadius:'6px',background:'none',
                  border:'none',fontSize:'1.2rem',cursor:'pointer',color:'var(--text-muted)'}}>✕</button>
            </div>
            <div style={{overflow:'auto',maxHeight:'72vh',borderRadius:'8px'}}>
              {visorDoc.mimeType?.startsWith('image/')?(
                <img src={visorDoc.data} alt={visorDoc.nombre}
                  style={{maxWidth:'80vw',maxHeight:'70vh',objectFit:'contain',borderRadius:'6px'}}/>
              ):visorDoc.mimeType==='application/pdf'?(
                <object data={visorDoc.data} type="application/pdf"
                  style={{width:'74vw',height:'70vh',borderRadius:'6px',border:'none'}}>
                  <p style={{padding:'1rem',textAlign:'center'}}>
                    <a href={visorDoc.data} download={visorDoc.nombre}
                      style={{color:'#2563eb',fontWeight:700}}>⬇ Descargar {visorDoc.nombre}</a>
                  </p>
                </object>
              ):(
                <div style={{padding:'2rem',textAlign:'center',color:'var(--text-muted)'}}>
                  <p style={{fontSize:'2rem',marginBottom:'.5rem'}}>📄</p>
                  <p style={{fontWeight:700}}>{visorDoc.nombre}</p>
                  <a href={visorDoc.data} download={visorDoc.nombre}
                    style={{display:'inline-block',marginTop:'1rem',padding:'.45rem .9rem',
                      borderRadius:'7px',background:'#2563eb',color:'#fff',textDecoration:'none',
                      fontSize:'.84rem',fontWeight:700}}>
                    ⬇ Descargar
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}