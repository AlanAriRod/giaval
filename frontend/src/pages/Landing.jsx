import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Eye, Target, Award, ChevronDown } from 'lucide-react'
import styles from './Landing.module.css'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>

      {/* ── Navbar ─────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoBox}>
            <Building2 size={20} strokeWidth={1.5} />
          </div>
          <div>
            <span className={styles.logoName}>GIAVAL</span>
            <span className={styles.logoSub}>SISTEMA DE AVALÚOS</span>
          </div>
        </div>
        <div className={styles.onlineIndicator}>
          <span className={styles.onlineDot} />
          EN LÍNEA
        </div>
      </header>

      {/* ── Hero ───────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroNoise} />

        <div className={styles.heroBadge}>
          <span className={styles.heroBadgeDot} />
          PLATAFORMA PROFESIONAL DE AVALÚOS
        </div>

        <h1 className={styles.heroTitle}>
          Gestoría de Valuación
          <br />de <span className={styles.heroAccent}>Bienes</span>
        </h1>

        <p className={styles.heroSubtitle}>
          Sistema integral para la gestión, registro y seguimiento de avalúos
          <br />inmobiliarios con trazabilidad completa.
        </p>

        <div className={styles.heroCtas}>
          <button
            className={styles.btnPrimary}
            onClick={() => navigate('/login')}
          >
            Iniciar Sesión
            <ArrowRight size={18} />
          </button>
          <button
            className={styles.btnSecondary}
            onClick={() => navigate('/registro')}
          >
            Registrar Usuario
          </button>
        </div>

        <button
          className={styles.scrollHint}
          onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <ChevronDown size={20} />
        </button>
      </section>

      {/* ── Visión · Misión · Valores ───────────── */}
      <section id="features" className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <Eye size={22} />
          </div>
          <div>
            <h3 className={styles.featureTitle}>Visión</h3>
            <p className={styles.featureText}>
              Ser la plataforma de referencia en gestoría de valuación inmobiliaria
              en la región, reconocida por la precisión, transparencia y confianza
              en cada avalúo emitido.
            </p>
          </div>
        </div>

        <div className={styles.featureDivider} />

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <Target size={22} />
          </div>
          <div>
            <h3 className={styles.featureTitle}>Misión</h3>
            <p className={styles.featureText}>
              Brindar servicios profesionales de valuación de bienes inmuebles con
              respaldo tecnológico e inteligencia artificial, garantizando resultados
              precisos, documentados y entregados en tiempo.
            </p>
          </div>
        </div>

        <div className={styles.featureDivider} />

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <Award size={22} />
          </div>
          <div>
            <h3 className={styles.featureTitle}>Valores</h3>
            <p className={styles.featureText}>
              Actuamos con <strong>honestidad</strong>, <strong>responsabilidad</strong> e
              {' '}<strong>integridad</strong> profesional. Cada avalúo refleja nuestro
              compromiso con la calidad y el respeto al cliente.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────── */}
      <footer className={styles.footer}>
        <span>© 2026 GIAVAL – Avalúos · Orizaba, Veracruz</span>
        <span>Residencia Profesional ISC</span>
      </footer>
    </div>
  )
}
