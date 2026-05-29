import { useNavigate } from 'react-router-dom'
import { LogOut, Building2, Moon, Sun, UserCog } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDarkMode } from '../hooks/useDarkMode'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const [dark, setDark]  = useDarkMode()

  const handleLogout = () => { logout(); navigate('/') }
  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'AU'

  return (
    <nav className={styles.navbar}>
      <div className={styles.brand}>
        <div className={styles.logoBox}>
          <Building2 size={20} strokeWidth={1.5}/>
        </div>
        <span className={styles.brandName}>GIAVAL</span>
      </div>

      <div className={styles.userSection}>
        <div className={styles.sessionInfo}>
          <span className={styles.sessionLabel}>Sesión activa</span>
          <span className={styles.sessionUser}>{user?.username || 'Arq. Usuario'}</span>
        </div>

        {/* Toggle modo oscuro */}
        <button
          className={styles.iconBtn}
          onClick={() => setDark(d => !d)}
          title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
          {dark ? <Sun size={16}/> : <Moon size={16}/>}
        </button>

        {/* Avatar + enlace a perfil */}
        <button
          className={styles.avatar}
          onClick={() => navigate('/perfil')}
          title="Editar mi perfil">
          {initials}
        </button>

        <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar sesión">
          <LogOut size={16}/>
          <span>Salir</span>
        </button>
      </div>
    </nav>
  )
}