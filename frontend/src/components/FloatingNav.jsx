// FloatingNav.jsx — Botón flotante de navegación
// Muestra ↑ (ir arriba) cuando ya se bajó, ↓ (ir abajo) cuando estás arriba.
// Acepta prop extraButton para botones de acción adicionales (ej: "Abrir Formulario").
import { useState, useEffect } from 'react'

export default function FloatingNav({ extraButton }) {
  const [scrollY,    setScrollY]    = useState(0)
  const [docHeight,  setDocHeight]  = useState(0)
  const [winHeight,  setWinHeight]  = useState(0)
  const [visible,    setVisible]    = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY)
      setDocHeight(document.documentElement.scrollHeight)
      setWinHeight(window.innerHeight)
      setVisible(document.documentElement.scrollHeight > window.innerHeight + 100)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const maxScroll = docHeight - winHeight
  const pct       = maxScroll > 0 ? scrollY / maxScroll : 0
  const enArriba  = pct < 0.3
  const enAbajo   = pct >= 0.7

  const scrollToTop    = () => window.scrollTo({ top: 0,         behavior: 'smooth' })
  const scrollToBottom = () => window.scrollTo({ top: maxScroll,  behavior: 'smooth' })

  const btnBase = {
    width: '42px', height: '42px', borderRadius: '50%', cursor: 'pointer',
    border: '1.5px solid var(--border,#e2e8f0)', background: 'var(--bg-card,#fff)',
    color: 'var(--text-secondary,#64748b)', fontSize: '1.1rem', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,.12)', transition: 'all .15s', outline: 'none',
  }

  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem',
      display: 'flex', flexDirection: 'column', gap: '.5rem', zIndex: 900,
    }}>
      {extraButton}

      {visible && !enArriba && (
        <button style={btnBase} onClick={scrollToTop} title="Ir al principio"
          onMouseEnter={e=>Object.assign(e.currentTarget.style,{borderColor:'#c9972a',color:'#c9972a'})}
          onMouseLeave={e=>Object.assign(e.currentTarget.style,{borderColor:'var(--border,#e2e8f0)',color:'var(--text-secondary,#64748b)'})}>
          ↑
        </button>
      )}
      {visible && !enAbajo && (
        <button style={btnBase} onClick={scrollToBottom} title="Ir al final"
          onMouseEnter={e=>Object.assign(e.currentTarget.style,{borderColor:'#c9972a',color:'#c9972a'})}
          onMouseLeave={e=>Object.assign(e.currentTarget.style,{borderColor:'var(--border,#e2e8f0)',color:'var(--text-secondary,#64748b)'})}>
          ↓
        </button>
      )}
    </div>
  )
}
