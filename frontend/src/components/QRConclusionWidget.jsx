// frontend/src/components/QRConclusionWidget.jsx
// Widget del QR del despacho para mostrar en los tabs de conclusión
// Uso: <QRConclusionWidget /> en TabConclusion.jsx y TabConclusionReferido.jsx

export default function QRConclusionWidget() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem 1.2rem',
      background: 'var(--bg-input)',
      border: '1.5px solid var(--border)',
      borderRadius: '10px',
      marginTop: '1rem',
    }}>
      {/* QR */}
      <div style={{
        flexShrink: 0,
        padding: '6px',
        background: '#fff',
        border: '1.5px solid var(--border)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,.08)',
      }}>
        <img
          src="/qr_giaval.png"
          alt="QR para validar información del despacho"
          style={{ width: '90px', height: '90px', display: 'block' }}
          onError={e => { e.target.style.display = 'none' }}
        />
      </div>

      {/* Texto */}
      <div>
        <p style={{
          fontSize: '.78rem',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '.04em',
          marginBottom: '.3rem',
        }}>
          QR para validar la información
        </p>
        <p style={{
          fontSize: '.8rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}>
          Escanea el código QR para consultar los datos del perito valuador y verificar la autenticidad del dictamen.
        </p>
        <p style={{
          fontSize: '.75rem',
          color: 'var(--text-muted)',
          marginTop: '.3rem',
          fontStyle: 'italic',
        }}>
          Mtro. Arq. José Luis Espinosa Quitl — GIAVAL-Avalúos, Orizaba, Veracruz
        </p>
      </div>
    </div>
  )
}
