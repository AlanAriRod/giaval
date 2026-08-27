// frontend/src/pages/FormularioComercial/tabs/TabDeclaraciones.jsx
// Tab compartido entre FormularioComercial y FormularioReferido
// Permite agregar/editar/eliminar cuadros de declaraciones y advertencias

import { useCallback } from 'react'
import { PlusCircle, Trash2 } from 'lucide-react'
import styles from '../Formulario.module.css'

// Texto fijo que siempre aparece arriba (no editable)
const DECLARACION_FIJA = `LAS DECLARACIONES DE HECHOS CONTENIDAS EN EL PRESENTE ESTUDIO SON VERDADERAS Y CORRECTAS. NO TENEMOS INTERÉS PRESENTE O FUTURO EN LA PROPIEDAD QUE ES OBJETO DE ESTE AVALÚO, NO TENEMOS INTERÉS PERSONAL O PARCIAL CON RESPECTO A LAS PARTES INVOLUCRADAS; ADEMÁS DECLARAMOS QUE NO PARTICIPAMOS EN EL CAPITAL O EN LOS ÓRGANOS ADMINISTRATIVOS DEL PROMOVENTE Y MANIFESTAMOS COMPLETA INDEPENDENCIA CON LA PROPIEDAD DE LOS BIENES. LOS EMOLUMENTOS RELATIVOS AL DESARROLLO DEL TRABAJO VALUATORIO, NO ESTÁN CONDICIONADOS AL REPORTE DE UN VALOR PREDETERMINADO O DIRIGIDO HACIA UN VALOR QUE FAVOREZCA LA CAUSA DE UN CLIENTE.`

export default function TabDeclaraciones({ form, update }) {
  // Declaraciones: array de strings
  // Si no existe aún, se inicializa con un cuadro vacío
  const declaraciones = Array.isArray(form.declaracionesExtra)
    ? form.declaracionesExtra
    : ['']

  const setDeclaraciones = useCallback((newArr) => {
    update('declaracionesExtra', newArr)
  }, [update])

  const agregar = () => {
    setDeclaraciones([...declaraciones, ''])
  }

  const eliminar = (idx) => {
    if (declaraciones.length === 1) {
      // Si es el último, lo deja vacío en lugar de borrarlo
      setDeclaraciones([''])
      return
    }
    setDeclaraciones(declaraciones.filter((_, i) => i !== idx))
  }

  const cambiar = (idx, valor) => {
    const copia = [...declaraciones]
    copia[idx] = valor
    setDeclaraciones(copia)
  }

  return (
    <div className={styles.tabContent}>

      {/* Título de la sección */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Declaraciones y Advertencias</span>
        </div>
        <div className={styles.sectBody}>

          {/* Declaración fija — siempre visible, no editable */}
          <div style={{
            background: 'var(--bg-input)',
            border: '1.5px solid var(--border)',
            borderRadius: '8px',
            padding: '1rem 1.2rem',
            marginBottom: '1.5rem',
          }}>
            <p style={{
              fontSize: '.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: '.5rem',
              textTransform: 'uppercase',
              letterSpacing: '.04em',
            }}>
              Declaración General (fija — siempre incluida)
            </p>
            <textarea
  value={form.declaracionFija !== undefined ? form.declaracionFija : DECLARACION_FIJA}
  onChange={e => update('declaracionFija', e.target.value)}
  rows={6}
  style={{
    width: '100%',
    minHeight: '120px',
    padding: '.75rem',
    fontSize: '.82rem',
    lineHeight: 1.65,
    color: 'var(--text-primary)',
    background: 'var(--bg-card)',
    border: 'none',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    borderRadius: '6px',
  }}
/>
          </div>

          {/* Cuadros editables */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {declaraciones.map((texto, idx) => (
              <div key={idx} style={{
                border: '1.5px solid var(--border)',
                borderRadius: '10px',
                overflow: 'hidden',
                background: 'var(--bg-card)',
                boxShadow: '0 1px 4px rgba(0,0,0,.05)',
              }}>
                {/* Encabezado del cuadro */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '.55rem 1rem',
                  background: 'var(--bg-input)',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{
                    fontSize: '.78rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '.04em',
                  }}>
                    Declaración {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => eliminar(idx)}
                    title="Eliminar este cuadro"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '.3rem',
                      padding: '.3rem .6rem',
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      background: '#fff5f5',
                      color: '#dc2626',
                      fontSize: '.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>

                {/* Área de texto — crece automáticamente */}
                <textarea
                  value={texto}
                  onChange={e => cambiar(idx, e.target.value)}
                  placeholder={`Escribe la declaración ${idx + 1}…`}
                  rows={3}
                  style={{
                    width: '100%',
                    minHeight: '90px',
                    padding: '.85rem 1rem',
                    fontSize: '.88rem',
                    lineHeight: 1.7,
                    color: 'var(--text-primary)',
                    background: 'var(--bg-card)',
                    border: 'none',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Botón agregar */}
          <button
            type="button"
            onClick={agregar}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.5rem',
              marginTop: '1.2rem',
              padding: '.6rem 1.2rem',
              borderRadius: '8px',
              border: '1.5px dashed var(--color-accent, #1e3a5f)',
              background: 'rgba(30,58,95,.04)',
              color: 'var(--color-accent, #1e3a5f)',
              fontSize: '.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <PlusCircle size={16} />
            Agregar cuadro de declaración
          </button>

        </div>
      </div>
    </div>
  )
}
