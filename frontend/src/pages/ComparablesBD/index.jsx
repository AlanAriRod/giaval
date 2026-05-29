// frontend/src/pages/ComparablesBD/index.jsx
// Mini-módulo: banco de comparables reutilizables
// Accesible desde el menú del dashboard
// Permite ver, filtrar y usar comparables en nuevos avalúos

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, ExternalLink, Trash2, RefreshCw } from 'lucide-react'
import Navbar   from '../../components/Navbar'
import { useAuth } from '../../context/AuthContext'

const fmtMXN = v => v ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',
  minimumFractionDigits:0}).format(v) : '—'
const fmtFecha = f => f ? new Date(f).toLocaleDateString('es-MX',{
  day:'2-digit',month:'short',year:'numeric'}) : '—'

const TIPO_LABEL  = { casa:'🏠 Casa', terreno:'🏗️ Terreno', rentas:'🔑 Renta' }
const TIPO_COLOR  = { casa:'#2563eb', terreno:'#c9972a', rentas:'#16a34a' }

export default function ComparablesBD() {
  const navigate      = useNavigate()
  const { authFetch, usuario } = useAuth()
  const [comparables, setComparables] = useState([])
  const [cargando,    setCargando]    = useState(true)
  const [filtroTipo,  setFiltroTipo]  = useState('todos')
  const [busqueda,    setBusqueda]    = useState('')
  const [detalle,     setDetalle]     = useState(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const r = await authFetch('/api/comparables?limit=100')
      const d = await r.json()
      setComparables(d.comparables||[])
    } catch(e){ console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(()=>{ cargar() },[])

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este comparable del banco?')) return
    await authFetch(`/api/comparables/${id}`,{method:'DELETE'})
    setComparables(prev=>prev.filter(c=>c.id!==id))
    if(detalle?.id===id) setDetalle(null)
  }

  const filtrados = comparables.filter(c=>{
    const matchTipo = filtroTipo==='todos' || c.tipo===filtroTipo
    const q = busqueda.toLowerCase()
    const matchBusq = !q ||
      (c.ciudad||'').toLowerCase().includes(q) ||
      (c.colonia||'').toLowerCase().includes(q) ||
      (c.descripcion||'').toLowerCase().includes(q)
    return matchTipo && matchBusq
  })

  return (
    <div style={{minHeight:'100vh',background:'var(--bg-page)'}}>
      <Navbar/>
      <main style={{maxWidth:'1100px',margin:'0 auto',padding:'1.5rem 1rem'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1.5rem',flexWrap:'wrap'}}>
          <button onClick={()=>navigate('/dashboard')}
            style={{display:'inline-flex',alignItems:'center',gap:'.4rem',padding:'.4rem .8rem',
              borderRadius:'7px',border:'1px solid var(--border)',background:'var(--bg-card)',
              color:'var(--text-secondary)',fontSize:'.84rem',fontWeight:600,cursor:'pointer'}}>
            <ArrowLeft size={14}/> Dashboard
          </button>
          <div style={{flex:1}}>
            <h1 style={{fontWeight:800,fontSize:'1.2rem',color:'var(--text-primary)',marginBottom:'.1rem'}}>
              📦 Banco de Comparables
            </h1>
            <p style={{fontSize:'.8rem',color:'var(--text-muted)'}}>
              {comparables.length} comparable{comparables.length!==1?'s':''} guardados
            </p>
          </div>
          <button onClick={cargar}
            style={{display:'inline-flex',alignItems:'center',gap:'.35rem',padding:'.4rem .8rem',
              borderRadius:'7px',border:'1px solid var(--border)',background:'var(--bg-card)',
              color:'var(--text-secondary)',fontSize:'.82rem',cursor:'pointer'}}>
            <RefreshCw size={13}/> Actualizar
          </button>
        </div>

        {/* Filtros */}
        <div style={{display:'flex',gap:'.65rem',marginBottom:'1.25rem',flexWrap:'wrap',alignItems:'center'}}>
          <div style={{position:'relative',flex:'1',minWidth:'200px'}}>
            <Search size={14} style={{position:'absolute',left:'.65rem',top:'50%',
              transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none'}}/>
            <input value={busqueda} onChange={e=>setBusqueda(e.target.value)}
              placeholder="Buscar por ciudad, colonia…"
              style={{width:'100%',paddingLeft:'2rem',paddingRight:'.75rem',paddingBlock:'.5rem',
                borderRadius:'8px',border:'1px solid var(--border)',background:'var(--bg-card)',
                color:'var(--text-primary)',fontSize:'.88rem',boxSizing:'border-box'}}/>
          </div>
          {['todos','casa','terreno','rentas'].map(t=>(
            <button key={t} onClick={()=>setFiltroTipo(t)}
              style={{padding:'.4rem .85rem',borderRadius:'7px',fontSize:'.82rem',fontWeight:600,
                cursor:'pointer',
                border:`1.5px solid ${filtroTipo===t?(TIPO_COLOR[t]||'#1e3a5f'):'var(--border)'}`,
                background:filtroTipo===t?((TIPO_COLOR[t]||'#1e3a5f')+'14'):'var(--bg-card)',
                color:filtroTipo===t?(TIPO_COLOR[t]||'#1e3a5f'):'var(--text-secondary)'}}>
              {t==='todos'?'Todos':TIPO_LABEL[t]||t}
            </button>
          ))}
        </div>

        {cargando&&(
          <div style={{textAlign:'center',padding:'3rem',color:'var(--text-muted)',fontSize:'.9rem'}}>
            Cargando comparables…
          </div>
        )}

        {!cargando&&filtrados.length===0&&(
          <div style={{textAlign:'center',padding:'3rem',background:'var(--bg-card)',
            borderRadius:'12px',border:'2px dashed var(--border)'}}>
            <p style={{fontSize:'2rem',marginBottom:'.5rem'}}>📦</p>
            <p style={{fontWeight:700,color:'var(--text-secondary)',marginBottom:'.3rem'}}>
              Sin comparables guardados
            </p>
            <p style={{fontSize:'.82rem',color:'var(--text-muted)'}}>
              Los comparables se guardan automáticamente cuando los agregas en un avalúo.
            </p>
          </div>
        )}

        {/* Grid de comparables */}
        {!cargando&&filtrados.length>0&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'1rem'}}>
            {filtrados.map(comp=>{
              const color = TIPO_COLOR[comp.tipo]||'#64748b'
              const vuM2 = comp.oferta&&comp.superficie
                ? comp.oferta/comp.superficie : null
              return (
                <div key={comp.id}
                  onClick={()=>setDetalle(detalle?.id===comp.id?null:comp)}
                  style={{background:'var(--bg-card)',border:`1px solid ${detalle?.id===comp.id?color:'var(--border)'}`,
                    borderRadius:'10px',padding:'1rem',cursor:'pointer',
                    boxShadow:detalle?.id===comp.id?`0 0 0 2px ${color}33`:'none',
                    transition:'all .15s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'.6rem'}}>
                    <span style={{fontSize:'.72rem',fontWeight:700,padding:'.15rem .5rem',
                      borderRadius:'4px',background:color+'14',color}}>
                      {TIPO_LABEL[comp.tipo]||comp.tipo}
                    </span>
                    <button onClick={e=>{e.stopPropagation();eliminar(comp.id)}}
                      style={{padding:'.2rem .3rem',borderRadius:'4px',background:'none',
                        border:'none',cursor:'pointer',color:'#ef4444',opacity:.6}}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                  <p style={{fontWeight:700,fontSize:'.88rem',color:'var(--text-primary)',marginBottom:'.2rem'}}>
                    {[comp.ciudad,comp.colonia].filter(Boolean).join(' — ')||'Sin ubicación'}
                  </p>
                  <p style={{fontSize:'.82rem',fontWeight:800,color,marginBottom:'.15rem',
                    fontVariantNumeric:'tabular-nums'}}>
                    {fmtMXN(comp.oferta)}
                    {comp.tipo==='rentas'?' /mes':''}
                  </p>
                  {comp.superficie&&(
                    <p style={{fontSize:'.75rem',color:'var(--text-muted)'}}>
                      {comp.superficie} m²
                      {vuM2?` · ${fmtMXN(Math.round(vuM2))}/m²`:''}
                    </p>
                  )}
                  <p style={{fontSize:'.7rem',color:'var(--text-muted)',marginTop:'.4rem'}}>
                    Consultado: {fmtFecha(comp.fecha_consulta)}
                  </p>

                  {/* Detalle expandible */}
                  {detalle?.id===comp.id&&(
                    <div style={{marginTop:'.85rem',paddingTop:'.85rem',
                      borderTop:'1px solid var(--border)'}}
                      onClick={e=>e.stopPropagation()}>
                      {comp.descripcion&&(
                        <p style={{fontSize:'.78rem',color:'var(--text-secondary)',marginBottom:'.5rem',lineHeight:1.5}}>
                          {comp.descripcion}
                        </p>
                      )}
                      {comp.informante&&(
                        <p style={{fontSize:'.74rem',color:'var(--text-muted)',marginBottom:'.2rem'}}>
                          👤 {comp.informante}
                        </p>
                      )}
                      {comp.telefono&&(
                        <p style={{fontSize:'.74rem',color:'var(--text-muted)',marginBottom:'.2rem'}}>
                          📞 {comp.telefono}
                        </p>
                      )}
                      {comp.fuente&&(
                        <p style={{fontSize:'.74rem',color:'var(--text-muted)',marginBottom:'.4rem'}}>
                          📋 {comp.fuente}
                        </p>
                      )}
                      {comp.url&&(
                        <a href={comp.url} target="_blank" rel="noopener noreferrer"
                          style={{display:'inline-flex',alignItems:'center',gap:'.3rem',
                            fontSize:'.76rem',color:'#2563eb',fontWeight:600,textDecoration:'none'}}>
                          <ExternalLink size={12}/> Ver anuncio original
                        </a>
                      )}
                      {usuario?.rol==='admin'&&comp.perito_nombre&&(
                        <p style={{fontSize:'.72rem',color:'var(--text-muted)',marginTop:'.4rem'}}>
                          Perito: {comp.perito_nombre}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}