// frontend/src/components/VisorDocumento.jsx
// Componente para previsualizar PDFs e imágenes en un modal.
// Uso:
//   <VisorDocumento src={urlOBase64} tipo="application/pdf" nombre="escritura.pdf"
//                   onClose={() => setVisor(null)} />
//
// Props:
//   src    — URL blob, URL normal, o base64 del archivo
//   tipo   — mimeType: "application/pdf" | "image/jpeg" | "image/png" ...
//   nombre — nombre del archivo para mostrar en el header
//   onClose — función para cerrar el modal

import { useEffect } from 'react'

export default function VisorDocumento({ src, tipo, nombre, onClose }) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if(e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const esPDF    = tipo === 'application/pdf'
  const esImagen = tipo?.startsWith('image/')

  // Preparar URL: si es base64 sin prefijo, agregar el prefijo data:
  const url = src?.startsWith('data:') || src?.startsWith('blob:') || src?.startsWith('http')
    ? src
    : `data:${tipo};base64,${src}`

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '12px',
          width: '100%', maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '.75rem 1rem',
          background: '#1F3864', color: '#fff',
          borderRadius: '12px 12px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <span style={{ fontSize: '1.2rem' }}>{esPDF ? '📄' : '🖼️'}</span>
            <span style={{ fontWeight: 700, fontSize: '.9rem', maxWidth: '500px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nombre || 'Documento'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            {/* Botón descargar */}
            <a
              href={url} download={nombre || 'documento'}
              onClick={e => e.stopPropagation()}
              style={{
                padding: '.4rem .85rem', borderRadius: '6px',
                background: 'rgba(255,255,255,.15)', color: '#fff',
                textDecoration: 'none', fontSize: '.8rem', fontWeight: 600,
                border: '1px solid rgba(255,255,255,.3)',
              }}
            >
              ⬇ Descargar
            </a>
            {/* Botón cerrar */}
            <button
              onClick={onClose}
              style={{
                padding: '.4rem .85rem', borderRadius: '6px',
                background: 'rgba(255,255,255,.15)', color: '#fff',
                border: '1px solid rgba(255,255,255,.3)',
                cursor: 'pointer', fontSize: '.9rem', fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {esPDF && (
            <iframe
              src={url}
              title={nombre || 'PDF'}
              style={{ width: '100%', height: '75vh', border: 'none', display: 'block' }}
            />
          )}
          {esImagen && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1rem', background: '#f8f9fa', minHeight: '300px' }}>
              <img
                src={url} alt={nombre}
                style={{ maxWidth: '100%', maxHeight: '70vh',
                  borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,.2)' }}
              />
            </div>
          )}
          {!esPDF && !esImagen && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
              <p>Vista previa no disponible para este tipo de archivo.</p>
              <p style={{ fontSize: '.85rem' }}>Usa el botón Descargar para abrirlo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}