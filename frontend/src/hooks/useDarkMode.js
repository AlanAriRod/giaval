import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    // Leer preferencia guardada; si no hay, respetar la del sistema operativo
    const saved = localStorage.getItem('giaval_dark')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.setAttribute('data-theme', 'dark')
    } else {
      root.removeAttribute('data-theme')
    }
    localStorage.setItem('giaval_dark', String(dark))
  }, [dark])

  return [dark, setDark]
}