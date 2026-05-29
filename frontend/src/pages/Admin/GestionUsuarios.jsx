// GestionUsuarios.jsx — con búsqueda, filtros y ordenamiento
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, UserCheck, UserX,
  Shield, User, AlertCircle, Info, Search,
  ChevronUp, ChevronDown
} from 'lucide-react'
import Navbar      from '../../components/Navbar'
import { useAuth } from '../../context/AuthContext'
import styles      from './Admin.module.css'

const ESTADO_INFO = {
  activo:     { label: 'Activo',     color: '#16a34a', bg: '#dcfce7' },
  inactivo:   { label: 'Inactivo',   color: '#d97706', bg: '#fef3c7' },
  suspendido: { label: 'Suspendido', color: '#dc2626', bg: '#fee2e2' },
}

const fmtFecha = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX',
    { day:'2-digit', month:'short', year:'numeric' }) : '—'

export default function GestionUsuarios() {
  const navigate            = useNavigate()
  const { user, authFetch } = useAuth()

  const [usuarios,  setUsuarios]  = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [errorMsg,  setErrorMsg]  = useState('')

  // Filtros
  const [busqueda,    setBusqueda]    = useState('')
  const [filtroRol,   setFiltroRol]   = useState('todos')
  const [filtroEstado,setFiltroEstado]= useState('todos')

  // Ordenamiento
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    if (user && user.rol !== 'administrador') navigate('/dashboard')
  }, [user, navigate])

  const cargar = useCallback(async () => {
    setCargando(true)
    setErrorMsg('')
    try {
      const r = await authFetch('/api/admin/usuarios')
      if (!r.ok) throw new Error('Sin permisos o error de servidor')
      setUsuarios(await r.json())
    } catch (e) {
      setErrorMsg(e.message)
    } finally {
      setCargando(false)
    }
  }, [authFetch])

  useEffect(() => { cargar() }, [cargar])

  const cambiarEstado = async (id, nuevoEstado) => {
    const r    = await authFetch(`/api/admin/usuarios/${id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    const data = await r.json()
    if (!r.ok) { alert(data.message); return }
    setUsuarios(prev =>
      prev.map(u => u.id === id ? { ...u, estado: data.usuario.estado } : u)
    )
  }

  const cambiarRol = async (id, nuevoRol) => {
    if (!window.confirm(
      nuevoRol === 'administrador'
        ? '¿Dar permisos de Administrador?'
        : '¿Quitar permisos de Administrador y dejar como Valuador?'
    )) return
    const r    = await authFetch(`/api/admin/usuarios/${id}/rol`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol: nuevoRol }),
    })
    const data = await r.json()
    if (!r.ok) { alert(data.message); return }
    setUsuarios(prev =>
      prev.map(u => u.id === id ? { ...u, rol: data.usuario.rol } : u)
    )
  }

  // Filtrado local
  const filtrados = usuarios
    .filter(u => {
      const q = busqueda.toLowerCase()
      const coincide = !q ||
        u.username.toLowerCase().includes(q) ||
        (u.nombre_completo || '').toLowerCase().includes(q) ||
        (u.correo || '').toLowerCase().includes(q)
      const rolOk    = filtroRol    === 'todos' || u.rol    === filtroRol
      const estadoOk = filtroEstado === 'todos' || u.estado === filtroEstado
      return coincide && rolOk && estadoOk
    })
    .sort((a, b) => {
      let va = a[sortCol] ?? ''
      let vb = b[sortCol] ?? ''
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      return sortDir === 'asc'
        ? (va < vb ? -1 : va > vb ? 1 : 0)
        : (va > vb ? -1 : va < vb ? 1 : 0)
    })

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronUp size={12} style={{ opacity:.3 }}/>
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color:'#c9972a' }}/>
      : <ChevronDown size={12} style={{ color:'#c9972a' }}/>
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={15}/> Regresar al Dashboard
        </button>

        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Gestión de Usuarios</h1>
            <p className={styles.pageSub}>
              Un usuario <strong>Inactivo</strong> no puede iniciar sesión ni realizar
              ninguna acción en el sistema.
            </p>
          </div>
          <button className={styles.refreshBtn} onClick={cargar} title="Recargar">
            <RefreshCw size={15}/>
          </button>
        </div>

        <div className={styles.infoBox}>
          <Info size={14}/>
          <span>
            <strong>Activo:</strong> acceso completo. &ensp;
            <strong>Inactivo:</strong> no puede entrar. &ensp;
            <strong>Suspendido:</strong> bloqueado por incidencia.
          </span>
        </div>

        {/* ── Barra de filtros ── */}
        <div style={{ display:'flex', gap:'.75rem', flexWrap:'wrap',
                      marginBottom:'1.25rem', alignItems:'center' }}>
          {/* Buscador */}
          <div style={{ flex:1, minWidth:'200px', position:'relative' }}>
            <Search size={14} style={{ position:'absolute', left:'.75rem',
              top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
            <input
              style={{ width:'100%', padding:'.55rem .9rem .55rem 2.2rem',
                       borderRadius:'8px', border:'1.5px solid #e2e8f0',
                       background:'#fff', fontSize:'.88rem', color:'#1e293b' }}
              placeholder="Buscar por nombre, usuario o correo…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>

          {/* Filtro rol */}
          <select
            style={{ padding:'.55rem .85rem', borderRadius:'8px',
                     border:'1.5px solid #e2e8f0', background:'#fff',
                     fontSize:'.88rem', color:'#475569' }}
            value={filtroRol}
            onChange={e => setFiltroRol(e.target.value)}>
            <option value="todos">Todos los roles</option>
            <option value="valuador">Valuadores</option>
            <option value="administrador">Administradores</option>
          </select>

          {/* Filtro estado */}
          <select
            style={{ padding:'.55rem .85rem', borderRadius:'8px',
                     border:'1.5px solid #e2e8f0', background:'#fff',
                     fontSize:'.88rem', color:'#475569' }}
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="suspendido">Suspendidos</option>
          </select>

          <span style={{ fontSize:'.8rem', color:'#94a3b8' }}>
            {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
          </span>
        </div>

        {cargando && (
          <div className={styles.loading}>
            <RefreshCw size={20} className={styles.spin}/> Cargando…
          </div>
        )}

        {!cargando && errorMsg && (
          <div className={styles.errorBanner}>
            <AlertCircle size={15}/> {errorMsg}
          </div>
        )}

        {!cargando && !errorMsg && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th onClick={() => toggleSort('username')}
                    style={{ cursor:'pointer' }}>
                    Usuario <SortIcon col="username"/>
                  </th>
                  <th onClick={() => toggleSort('nombre_completo')}
                    style={{ cursor:'pointer' }}>
                    Nombre <SortIcon col="nombre_completo"/>
                  </th>
                  <th>Correo</th>
                  <th onClick={() => toggleSort('rol')}
                    style={{ cursor:'pointer' }}>
                    Rol <SortIcon col="rol"/>
                  </th>
                  <th onClick={() => toggleSort('estado')}
                    style={{ cursor:'pointer' }}>
                    Estado <SortIcon col="estado"/>
                  </th>
                  <th onClick={() => toggleSort('ultimo_acceso')}
                    style={{ cursor:'pointer' }}>
                    Último acceso <SortIcon col="ultimo_acceso"/>
                  </th>
                  <th onClick={() => toggleSort('created_at')}
                    style={{ cursor:'pointer' }}>
                    Registro <SortIcon col="created_at"/>
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign:'center', padding:'2.5rem',
                      color:'#94a3b8', fontSize:'.88rem' }}>
                      No hay usuarios que coincidan con los filtros.
                    </td>
                  </tr>
                ) : filtrados.map(u => {
                  const esYo    = u.id === user?.id
                  const estInfo = ESTADO_INFO[u.estado] || ESTADO_INFO.activo
                  return (
                    <tr key={u.id}
                      className={u.estado !== 'activo' ? styles.rowInactivo : ''}>
                      <td>
                        <div className={styles.userCell}>
                          <span className={styles.usernameTag}>{u.username}</span>
                          {esYo && <span className={styles.youTag}>Tú</span>}
                        </div>
                      </td>
                      <td>{u.nombre_completo}</td>
                      <td className={styles.emailCell}>{u.correo}</td>
                      <td>
                        <span className={styles.rolBadge}
                          style={u.rol === 'administrador'
                            ? { color:'#92400e', background:'#fef3c7' }
                            : { color:'#1e3a5f', background:'#e0e7ff' }}>
                          {u.rol === 'administrador'
                            ? <><Shield size={11}/> Admin</>
                            : <><User size={11}/> Valuador</>}
                        </span>
                      </td>
                      <td>
                        <span className={styles.estadoBadge}
                          style={{ color: estInfo.color, background: estInfo.bg }}>
                          {estInfo.label}
                        </span>
                      </td>
                      <td className={styles.dateCell}>{fmtFecha(u.ultimo_acceso)}</td>
                      <td className={styles.dateCell}>{fmtFecha(u.created_at)}</td>
                      <td>
                        {esYo
                          ? <span className={styles.esYoNote}>Tu cuenta</span>
                          : (
                            <div className={styles.actionBtns}>
                              {u.estado === 'activo'
                                ? (
                                  <button
                                    className={`${styles.aBtn} ${styles.aBtnDanger}`}
                                    onClick={() => cambiarEstado(u.id, 'inactivo')}>
                                    <UserX size={12}/> Desactivar
                                  </button>
                                ) : (
                                  <button
                                    className={`${styles.aBtn} ${styles.aBtnSuccess}`}
                                    onClick={() => cambiarEstado(u.id, 'activo')}>
                                    <UserCheck size={12}/> Activar
                                  </button>
                                )
                              }
                              {u.rol === 'valuador'
                                ? (
                                  <button
                                    className={`${styles.aBtn} ${styles.aBtnAdmin}`}
                                    onClick={() => cambiarRol(u.id, 'administrador')}>
                                    <Shield size={12}/> → Admin
                                  </button>
                                ) : (
                                  <button
                                    className={`${styles.aBtn} ${styles.aBtnNeutral}`}
                                    onClick={() => cambiarRol(u.id, 'valuador')}>
                                    <User size={12}/> → Valuador
                                  </button>
                                )
                              }
                            </div>
                          )
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}