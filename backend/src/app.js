const express    = require('express')
const cors       = require('cors')
require('dotenv').config()

const authRoutes   = require('./routes/authRoutes')
const avaluoRoutes = require('./routes/avaluoRoutes')
const adminRoutes  = require('./routes/adminRoutes')
const aiRoutes  = require('./routes/ai')
const comparablesRoutes = require('./routes/comparables')

const ocrRoutes = require('./routes/ocr')

const app  = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}))
// Aumentamos el límite a 10mb para aceptar datos_formulario que puede incluir imágenes
app.use(express.json({ limit: '10mb' }))

// ── Rutas ──────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes)
app.use('/api/avaluos', avaluoRoutes)
app.use('/api/admin',   adminRoutes)
app.use('/api/ocr', ocrRoutes)
app.use('/api/ai',  aiRoutes)
app.use('/api/comparables', comparablesRoutes)

// ── Health check ───────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── 404 ────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Ruta ${req.path} no encontrada.` })
})

app.listen(PORT, () => {
  console.log(`🚀 Backend GIAVAL corriendo en http://localhost:${PORT}`)
})

module.exports = app
