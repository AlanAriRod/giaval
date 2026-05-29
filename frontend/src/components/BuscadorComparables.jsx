// frontend/src/components/BuscadorComparables.jsx
// Modal de búsqueda de comparables con Gemini IA
// Ruta relativa desde tabs/: ../../components/BuscadorComparables
import { useState } from 'react'
import { Search, Loader, X, Plus, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

export default function BuscadorComparables({ tipo, form, onAgregar, onCerrar }) {
  const [cargando,  setCargando] = useState(false)
  const [error,     setError]    = useState('')
  const [resultado, setResultado]= useState(null)
  const [agregados, setAgregados]= useState(new Set())

  const CONFIG = {
    casa:    { titulo:'Comparables de Casa',    icon:'🏠', supLabel:'Sup. Const. (m²)', supKey:'supConst' },
    terreno: { titulo:'Comparables de Terreno', icon:'🏗️', supLabel:'Sup. Terreno (m²)', supKey:'supM2' },
    rentas:  { titulo:'Comparables de Renta',   icon:'🔑', supLabel:'Sup. (m²)',          supKey:'supM2' },
  }
  const cfg = CONFIG[tipo] || CONFIG.casa

  const buscar = async () => {
    setError('')
    setResultado(null)
    setAgregados(new Set())
    setCargando(true)
    try {
      const token = localStorage.getItem('giaval_token')
      const r = await fetch('/api/ai/buscar-comparables', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tipo,
          municipio:         form.municipio         || '',
          colonia:           form.colonia           || '',
          entidadFederativa: form.entidadFederativa || '',
          areaTerreno:       form.areaTerreno       || '',
          areaConstruccion:  form.areaConstruccionHabitable || form.areaConstruccion || '',
          bienQueSeValua:    form.bienQueSeValua    || '',
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Error al buscar comparables')
      setResultado(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  const agregarComparable = (comp, idx) => {
    onAgregar(comp)
    setAgregados(prev => new Set([...prev, idx]))
  }

  const fmtMXN = (v) => v
    ? new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN', minimumFractionDigits:0 }).format(v)
    : '—'

  const zona = [form.colonia, form.municipio, form.entidadFederativa].filter(Boolean).join(', ')

  return (
    <div
      onClick={e => e.target === e.currentTarget && onCerrar()}
      style={{
        position:'fixed', inset:0, background:'rgba(15,23,42,.65)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:1100, padding:'1rem',
      }}>
      <div style={{
        background:'var(--bg-card)', borderRadius:'14px', border:'1px solid var(--border)',
        width:'100%', maxWidth:'680px', maxHeight:'90vh', overflowY:'auto',
        boxShadow:'0 24px 60px rgba(0,0,0,.35)',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding:'1rem 1.25rem', borderBottom:'1px solid var(--border)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          position:'sticky', top:0, background:'var(--bg-card)', zIndex:1,
        }}>
          <div>
            <p style={{ fontWeight:800, fontSize:'1rem', color:'var(--text-primary)' }}>
              {cfg.icon} Buscar {cfg.titulo} con IA
            </p>
            <p style={{ fontSize:'.76rem', color:'var(--text-muted)', marginTop:'.1rem' }}>
              Gemini buscará propiedades reales en portales inmobiliarios
            </p>
          </div>
          <button onClick={onCerrar} style={{
            padding:'.3rem', borderRadius:'6px', background:'none',
            border:'none', cursor:'pointer', color:'var(--text-muted)',
          }}>
            <X size={17}/>
          </button>
        </div>

        <div style={{ padding:'1.25rem' }}>

          {/* ── Zona de búsqueda ── */}
          <div style={{
            padding:'.65rem .9rem', background:'var(--bg-input)',
            border:'1px solid var(--border)', borderRadius:'8px', marginBottom:'1.1rem',
            fontSize:'.82rem', color:'var(--text-secondary)',
          }}>
            <strong>Zona de búsqueda:</strong>{' '}
            {zona || (
              <span style={{ color:'#dc2626' }}>
                ⚠ Sin zona configurada. Llena Colonia y Municipio en Datos Generales primero.
              </span>
            )}
          </div>

          {/* ── Botón buscar ── */}
          {!resultado && (
            <div style={{ textAlign:'center', padding:'1rem 0' }}>
              <button onClick={buscar} disabled={cargando} style={{
                display:'inline-flex', alignItems:'center', gap:'.5rem',
                padding:'.65rem 1.4rem', borderRadius:'9px', cursor:'pointer',
                fontWeight:700, fontSize:'.92rem', border:'none',
                background: cargando ? 'var(--border)' : '#1e3a5f',
                color: cargando ? 'var(--text-muted)' : '#fff',
                transition:'all .15s',
              }}>
                {cargando
                  ? <><Loader size={16} style={{ animation:'spin 1s linear infinite' }}/> Buscando en portales inmobiliarios…</>
                  : <><Search size={16}/> Buscar {cfg.titulo}</>}
              </button>
              {cargando && (
                <p style={{ fontSize:'.78rem', color:'var(--text-muted)', marginTop:'.75rem' }}>
                  Gemini está consultando Inmuebles24, Metros Cúbicos, Lamudi…<br/>
                  Esto puede tardar 10–20 segundos.
                </p>
              )}
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div style={{
              display:'flex', gap:'.5rem', padding:'.65rem .9rem',
              background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px',
              fontSize:'.82rem', color:'#dc2626', marginBottom:'1rem',
            }}>
              <AlertCircle size={15} style={{ flexShrink:0, marginTop:'.1rem' }}/>
              <div>
                {error}
                <br/>
                <button onClick={buscar} style={{
                  marginTop:'.4rem', fontSize:'.76rem', padding:'.2rem .5rem',
                  borderRadius:'4px', background:'#fee2e2', border:'1px solid #fecaca',
                  cursor:'pointer', color:'#dc2626', fontWeight:600,
                }}>
                  🔄 Reintentar
                </button>
              </div>
            </div>
          )}

          {/* ── Resultados ── */}
          {resultado && (
            <div>
              <div style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                marginBottom:'1rem', flexWrap:'wrap', gap:'.5rem',
              }}>
                <p style={{ fontWeight:700, fontSize:'.9rem', color:'var(--text-primary)' }}>
                  ✓ {resultado.total} comparables encontrados
                </p>
                <div style={{ display:'flex', gap:'.5rem' }}>
                  <span style={{
                    fontSize:'.74rem', color:'var(--text-muted)', padding:'.2rem .55rem',
                    background:'var(--bg-input)', borderRadius:'5px', border:'1px solid var(--border)',
                  }}>
                    {resultado.zona}
                  </span>
                  <button onClick={buscar} style={{
                    fontSize:'.74rem', padding:'.2rem .55rem', borderRadius:'5px',
                    background:'var(--bg-input)', border:'1px solid var(--border)',
                    cursor:'pointer', color:'var(--text-secondary)', fontWeight:600,
                  }}>
                    🔄 Nueva búsqueda
                  </button>
                </div>
              </div>

              {/* Aviso */}
              <div style={{
                padding:'.5rem .85rem', background:'#fef9c3', border:'1px solid #fde047',
                borderRadius:'6px', fontSize:'.76rem', color:'#713f12',
                marginBottom:'1rem', lineHeight:1.45,
              }}>
                ⚠ Verifica los datos antes de agregar. Los factores de homologación
                los ajustarás manualmente en la tabla de comparables.
              </div>

              {/* Lista */}
              <div style={{ display:'flex', flexDirection:'column', gap:'.65rem' }}>
                {resultado.comparables.map((comp, i) => {
                  const yaAgregado = agregados.has(i)
                  const pvU = comp.oferta && comp[cfg.supKey]
                    ? comp.oferta / comp[cfg.supKey] : null

                  return (
                    <div key={i} style={{
                      padding:'.8rem 1rem', borderRadius:'9px',
                      border:`1.5px solid ${yaAgregado ? '#16a34a' : 'var(--border)'}`,
                      background: yaAgregado ? 'rgba(22,163,74,.06)' : 'var(--bg-input)',
                      transition:'all .15s',
                    }}>
                      <div style={{
                        display:'flex', justifyContent:'space-between',
                        alignItems:'flex-start', flexWrap:'wrap', gap:'.5rem',
                      }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontWeight:700, fontSize:'.88rem', color:'var(--text-primary)', marginBottom:'.25rem' }}>
                            {comp.ciudad}{comp.colonia ? ` — ${comp.colonia}` : ''}
                          </p>
                          {comp.descripcion && (
                            <p style={{ fontSize:'.78rem', color:'var(--text-secondary)', marginBottom:'.4rem', lineHeight:1.4 }}>
                              {comp.descripcion}
                            </p>
                          )}
                          <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', alignItems:'center' }}>
                            <span style={{ fontSize:'.82rem', color:'#1e3a5f', fontWeight:700 }}>
                              💰 {fmtMXN(comp.oferta)}{tipo === 'rentas' ? '/mes' : ''}
                            </span>
                            <span style={{ fontSize:'.8rem', color:'var(--text-secondary)' }}>
                              📐 {comp[cfg.supKey]} m²
                            </span>
                            {pvU && (
                              <span style={{ fontSize:'.78rem', color:'#92400e', fontWeight:600 }}>
                                ≈ {fmtMXN(Math.round(pvU))}/m²
                              </span>
                            )}
                            {comp.fuente && (
                              <span style={{ fontSize:'.73rem', color:'var(--text-muted)' }}>
                                📋 {comp.fuente}
                              </span>
                            )}
                          </div>
                          {comp.url && (
                            <a href={comp.url} target="_blank" rel="noopener noreferrer"
                              style={{
                                fontSize:'.72rem', color:'#2563eb',
                                display:'inline-flex', alignItems:'center', gap:'.25rem',
                                marginTop:'.35rem', textDecoration:'none',
                              }}>
                              Ver anuncio <ExternalLink size={10}/>
                            </a>
                          )}
                        </div>

                        <button
                          onClick={() => !yaAgregado && agregarComparable(comp, i)}
                          disabled={yaAgregado}
                          style={{
                            display:'flex', alignItems:'center', gap:'.35rem',
                            padding:'.4rem .8rem', borderRadius:'7px',
                            cursor: yaAgregado ? 'default' : 'pointer',
                            border:`1.5px solid ${yaAgregado ? '#16a34a' : '#1e3a5f'}`,
                            background: yaAgregado ? 'rgba(22,163,74,.1)' : '#1e3a5f',
                            color: yaAgregado ? '#16a34a' : '#fff',
                            fontWeight:700, fontSize:'.78rem', whiteSpace:'nowrap',
                            transition:'all .15s',
                          }}>
                          {yaAgregado
                            ? <><CheckCircle size={13}/> Agregado</>
                            : <><Plus size={13}/> Agregar</>}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {agregados.size > 0 && (
                <div style={{ marginTop:'1rem', textAlign:'center' }}>
                  <button onClick={onCerrar} style={{
                    padding:'.5rem 1.1rem', borderRadius:'8px', cursor:'pointer',
                    fontWeight:700, fontSize:'.88rem', border:'none',
                    background:'#16a34a', color:'#fff',
                  }}>
                    ✓ Listo — cerrar ({agregados.size} agregado{agregados.size !== 1 ? 's' : ''})
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}