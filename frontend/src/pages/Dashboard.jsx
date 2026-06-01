import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Eye, StickyNote, X, Save,
  CheckCircle2, AlertCircle, RefreshCw, Users, Trash2
} from 'lucide-react'
import Navbar    from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import styles    from './Dashboard.module.css'

const ESTADO = {
  borrador:   { label: 'Borrador',   color: '#6b7280', bg: '#f3f4f6' },
  en_proceso: { label: 'En proceso', color: '#d97706', bg: '#fef3c7' },
  preliminar: { label: 'Preliminar', color: '#2563eb', bg: '#dbeafe' },
  final:      { label: 'Final',      color: '#16a34a', bg: '#dcfce7' },
}
const TIPO = {
  comercial: { label: 'Comercial', color: '#92400e', bg: '#fef3c7' },
  referido:  { label: 'Referido',  color: '#9d174d', bg: '#fce7f3' },
  catastral: { label: 'Catastral', color: '#3730a3', bg: '#e0e7ff' },
  judicial:  { label: 'Judicial',  color: '#065f46', bg: '#d1fae5' },
}

const fmtMXN = (v) =>
  v != null && !isNaN(v) && parseFloat(v) > 0
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN',
        minimumFractionDigits: 0 }).format(v)
    : '—'

const fmtFecha = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX',
    { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function Dashboard() {
  const navigate            = useNavigate()
  const { user, authFetch } = useAuth()

  const [avaluos,      setAvaluos]      = useState([])
  const [stats,        setStats]        = useState(null)
  const [cargando,     setCargando]     = useState(true)
  const [errorMsg,     setErrorMsg]     = useState('')

  const [busqueda,     setBusqueda]     = useState('')
  const [filterTipo,   setFilterTipo]   = useState('todos')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [sortField,    setSortField]    = useState('created_at')
  const [sortDir,      setSortDir]      = useState('desc')

  // Modal notas
  const [notaModal,  setNotaModal]  = useState(null)
  const [notaTexto,  setNotaTexto]  = useState('')
  const [notaSaving, setNotaSaving] = useState(false)
  const [notaSaved,  setNotaSaved]  = useState(false)

  // Modal eliminar
  const [deleteModal, setDeleteModal] = useState(null)
  const [deleting,    setDeleting]    = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    setErrorMsg('')
    try {
      const [rA, rS] = await Promise.all([
        authFetch('/api/avaluos'),
        authFetch('/api/avaluos/estadisticas'),
      ])
      if (!rA.ok) throw new Error('No se pudieron cargar los avalúos')
      if (!rS.ok) throw new Error('No se pudieron cargar las estadísticas')
      const dA = await rA.json()
      const dS = await rS.json()
      setAvaluos(dA.avaluos || [])
      setStats(dS)
    } catch (e) {
      setErrorMsg(e.message)
    } finally {
      setCargando(false)
    }
  }, [authFetch])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const filtrados = useMemo(() => {
    let lista = avaluos.filter(a => {
      const q = busqueda.toLowerCase()
      const ok = !q ||
        (a.folio_interno       || '').toLowerCase().includes(q) ||
        (a.titulo              || '').toLowerCase().includes(q) ||
        (a.nombre_propietario  || '').toLowerCase().includes(q) ||
        (a.nombre_solicitante  || '').toLowerCase().includes(q) ||
        [a.calle, a.colonia, a.municipio].filter(Boolean).join(' ').toLowerCase().includes(q)
      return ok &&
        (filterTipo   === 'todos' || a.tipo_avaluo   === filterTipo) &&
        (filterEstado === 'todos' || a.estado_avaluo === filterEstado)
    })
    return [...lista].sort((a, b) => {
      let va = a[sortField] ?? '', vb = b[sortField] ?? ''
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0)
                               : (va > vb ? -1 : va < vb ? 1 : 0)
    })
  }, [avaluos, busqueda, filterTipo, filterEstado, sortField, sortDir])

  const toggleSort = (f) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(f); setSortDir('asc') }
  }

  // ── Notas ──────────────────────────────────────────────────────
  const abrirNota = (av) => {
    setNotaModal({ id: av.id, folio: av.folio_interno, titulo: av.titulo })
    setNotaTexto(av.notas || '')
    setNotaSaved(false)
  }

  const guardarNota = async () => {
    setNotaSaving(true)
    try {
      const r = await authFetch(`/api/avaluos/${notaModal.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ notas: notaTexto }),
      })
      if (!r.ok) throw new Error()
      setAvaluos(prev =>
        prev.map(a => a.id === notaModal.id ? { ...a, notas: notaTexto } : a)
      )
      setNotaSaved(true)
      setTimeout(() => setNotaSaved(false), 2200)
    } catch {
      alert('No se pudo guardar la nota.')
    } finally {
      setNotaSaving(false)
    }
  }

  // ── Eliminar ───────────────────────────────────────────────────
  const abrirDeleteModal = (av) => {
    setDeleteModal({ id: av.id, folio: av.folio_interno, titulo: av.titulo })
    setDeleteError('')
  }

  const confirmarEliminar = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      const r    = await authFetch(`/api/avaluos/${deleteModal.id}`, { method: 'DELETE' })
      const data = await r.json()
      if (!r.ok) { setDeleteError(data.message || 'No se pudo eliminar.'); return }
      setAvaluos(prev => prev.filter(a => a.id !== deleteModal.id))
      setDeleteModal(null)
      cargarDatos()
    } catch {
      setDeleteError('Error de conexión. Intenta de nuevo.')
    } finally {
      setDeleting(false)
    }
  }

  const ubicacion = (a) =>
    [a.calle, a.numero, a.colonia, a.municipio].filter(Boolean).join(', ') || '—'

  // Usa valor_conclusivo (ya resuelto en el backend para comercial y referido)
  // Con fallback a valor_mercado / valor_fisico por compatibilidad
  const valorPrincipal = (a) =>
    a.valor_conclusivo || a.valor_mercado || a.valor_fisico || a.valor_referido || null

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        {/* Encabezado */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Panel de Avalúos</h1>
            <p className={styles.pageSub}>
              Bienvenido,&nbsp;<strong>{user?.nombreCompleto || user?.username}</strong>
              {user?.rol === 'administrador' &&
                <span className={styles.adminBadge}>Administrador</span>}
            </p>
          </div>
          <div className={styles.headerActions}>
            {user?.rol === 'administrador' && (
              <button className={styles.adminBtn}
                onClick={() => navigate('/admin/usuarios')}>
                <Users size={15}/> Usuarios
              </button>
            )}
            <button className={styles.newBtn}
              onClick={() => navigate('/valuacion/nueva')}>
              <Plus size={16}/> Nuevo Avalúo
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className={styles.statsGrid}>
            {[
              { v: stats.total      || 0, l: 'Total',      cls: ''                },
              { v: stats.en_proceso || 0, l: 'En Proceso', cls: styles.statAmbar  },
              { v: stats.preliminar || 0, l: 'Preliminar', cls: styles.statBlue   },
              { v: stats.finales    || 0, l: 'Finales',    cls: styles.statGreen  },
              { v: stats.con_notas  || 0, l: 'Con Notas',  cls: styles.statPurple },
            ].map(({ v, l, cls }) => (
              <div key={l} className={`${styles.statCard} ${cls}`}>
                <span className={styles.statNum}>{v}</span>
                <span className={styles.statLabel}>{l}</span>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon}/>
            <input className={styles.searchInput}
              placeholder="Buscar por folio, propietario, dirección…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <select className={styles.filterSelect} value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}>
            <option value="todos">Todos los tipos</option>
            <option value="comercial">Comercial</option>
            <option value="referido">Referido</option>
          </select>
          <select className={styles.filterSelect} value={filterEstado}
            onChange={e => setFilterEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="en_proceso">En proceso</option>
            <option value="preliminar">Preliminar</option>
            <option value="final">Final</option>
          </select>
          <button className={styles.refreshBtn} onClick={cargarDatos} title="Recargar">
            <RefreshCw size={15}/>
          </button>
        </div>

        {/* Carga / error */}
        {cargando && (
          <div className={styles.loadingState}>
            <RefreshCw size={20} className={styles.spin}/>
            <span>Cargando avalúos…</span>
          </div>
        )}
        {!cargando && errorMsg && (
          <div className={styles.errorBanner}>
            <AlertCircle size={16}/>
            <span>{errorMsg}</span>
            <button onClick={cargarDatos}>Reintentar</button>
          </div>
        )}

        {/* Tabla */}
        {!cargando && !errorMsg && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.sortable} onClick={() => toggleSort('folio_interno')}>Folio</th>
                  <th className={styles.sortable} onClick={() => toggleSort('titulo')}>Título</th>
                  <th className={styles.sortable} onClick={() => toggleSort('tipo_avaluo')}>Tipo</th>
                  <th>Ubicación</th>
                  <th className={styles.sortable} onClick={() => toggleSort('nombre_propietario')}>Propietario</th>
                  <th className={styles.sortable} onClick={() => toggleSort('valor_conclusivo')}>Valor</th>
                  <th className={styles.sortable} onClick={() => toggleSort('estado_avaluo')}>Estado</th>
                  <th className={styles.sortable} onClick={() => toggleSort('fecha_avaluo')}>Fecha</th>
                  <th>Notas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={10} className={styles.emptyRow}>
                      No hay avalúos que coincidan con tu búsqueda.
                    </td>
                  </tr>
                ) : filtrados.map(av => {
                  const est = ESTADO[av.estado_avaluo] || ESTADO.borrador
                  const tip = TIPO[av.tipo_avaluo]     || TIPO.comercial
                  return (
                    <tr key={av.id}>
                      <td className={styles.folioCell}>{av.folio_interno}</td>
                      <td className={styles.tituloCell}>{av.titulo || av.folio_interno}</td>
                      <td>
                        <span className={styles.badge}
                          style={{ color: tip.color, background: tip.bg }}>
                          {tip.label}
                        </span>
                      </td>
                      <td className={styles.ubicCell}>{ubicacion(av)}</td>
                      <td>{av.nombre_propietario || '—'}</td>
                      <td className={styles.valorCell}>{fmtMXN(valorPrincipal(av))}</td>
                      <td>
                        <span className={styles.badge}
                          style={{ color: est.color, background: est.bg }}>
                          {est.label}
                        </span>
                      </td>
                      <td>{fmtFecha(av.fecha_avaluo)}</td>
                      <td>
                        <button
                          className={`${styles.notaBtn} ${av.notas ? styles.notaBtnActive : ''}`}
                          onClick={() => abrirNota(av)}
                          title={av.notas ? 'Ver / editar nota' : 'Agregar nota'}>
                          <StickyNote size={15}/>
                        </button>
                      </td>
                      <td>
                        <div className={styles.actionGroup}>
                          <button className={styles.viewBtn}
                            onClick={() => navigate(`/valuacion/${av.id}`)}>
                            <Eye size={14}/> Ver
                          </button>
                          <button className={styles.deleteBtn}
                            onClick={() => abrirDeleteModal(av)}
                            title="Eliminar avalúo">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal notas */}
        {notaModal && (
          <div className={styles.modalOverlay} onClick={() => setNotaModal(null)}>
            <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <p className={styles.modalFolio}>{notaModal.folio}</p>
                  <h3 className={styles.modalTitle}>{notaModal.titulo || notaModal.folio}</h3>
                </div>
                <button className={styles.modalClose} onClick={() => setNotaModal(null)}>
                  <X size={18}/>
                </button>
              </div>
              <textarea className={styles.notaTextarea}
                value={notaTexto}
                onChange={e => setNotaTexto(e.target.value)}
                placeholder="Observaciones internas de este avalúo…"
                maxLength={600}/>
              <div className={styles.notaFooter}>
                <span className={styles.notaCount}>{notaTexto.length}/600</span>
                <div className={styles.notaBtns}>
                  {notaTexto && (
                    <button className={styles.notaClearBtn}
                      onClick={() => { setNotaTexto(''); setNotaSaved(false) }}>
                      Borrar
                    </button>
                  )}
                  <button className={styles.notaSaveBtn}
                    onClick={guardarNota} disabled={notaSaving}>
                    {notaSaving ? 'Guardando…'
                      : notaSaved ? <><CheckCircle2 size={14}/> ¡Guardado!</>
                      : <><Save size={14}/> Guardar</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal eliminar */}
        {deleteModal && (
          <div className={styles.modalOverlay} onClick={() => !deleting && setDeleteModal(null)}>
            <div className={styles.modalCard} onClick={e => e.stopPropagation()}
              style={{ maxWidth: '420px' }}>
              <div className={styles.modalHeader}>
                <div style={{ display:'flex', alignItems:'center', gap:'.75rem' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'50%',
                    background:'#fee2e2', display:'flex', alignItems:'center',
                    justifyContent:'center', flexShrink:0 }}>
                    <Trash2 size={18} color="#dc2626"/>
                  </div>
                  <div>
                    <h3 className={styles.modalTitle}>Eliminar Avalúo</h3>
                    <p className={styles.modalFolio}>{deleteModal.folio}</p>
                  </div>
                </div>
                <button className={styles.modalClose}
                  onClick={() => !deleting && setDeleteModal(null)}>
                  <X size={18}/>
                </button>
              </div>
              <p style={{ fontSize:'.9rem', color:'#475569', lineHeight:1.6, margin:'1rem 0' }}>
                ¿Estás seguro de eliminar{' '}
                <strong style={{ color:'#0f172a' }}>
                  {deleteModal.titulo || deleteModal.folio}
                </strong>?{' '}
                Esta acción <strong style={{ color:'#dc2626' }}>no se puede deshacer</strong>.
              </p>
              {deleteError && (
                <div style={{ padding:'.75rem 1rem', background:'#fef2f2',
                  border:'1px solid #fecaca', borderRadius:'8px',
                  color:'#dc2626', fontSize:'.85rem', marginBottom:'1rem' }}>
                  {deleteError}
                </div>
              )}
              <div style={{ display:'flex', gap:'.75rem', justifyContent:'flex-end' }}>
                <button
                  style={{ padding:'.6rem 1.2rem', borderRadius:'8px',
                    border:'1.5px solid #e2e8f0', background:'#fff',
                    color:'#475569', fontWeight:600, fontSize:'.9rem',
                    cursor: deleting ? 'not-allowed' : 'pointer' }}
                  onClick={() => !deleting && setDeleteModal(null)} disabled={deleting}>
                  Cancelar
                </button>
                <button
                  style={{ padding:'.6rem 1.2rem', borderRadius:'8px',
                    background: deleting ? '#fca5a5' : '#dc2626',
                    color:'#fff', fontWeight:700, fontSize:'.9rem',
                    display:'flex', alignItems:'center', gap:'.4rem',
                    cursor: deleting ? 'not-allowed' : 'pointer' }}
                  onClick={confirmarEliminar} disabled={deleting}>
                  <Trash2 size={14}/>
                  {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}