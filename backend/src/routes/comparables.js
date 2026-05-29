// backend/src/routes/comparables.js
// NUEVAS rutas:
//   GET    /api/comparables              — lista todos los comparables guardados
//   POST   /api/comparables              — guarda un comparable utilizado
//   DELETE /api/comparables/:id          — eliminar un comparable
//   PATCH  /api/avaluos/:id/estado       — cambiar estado (solo admin)

const express = require('express')
const router  = express.Router()
const { Pool } = require('pg')
const { verificarToken, soloAdmin } = require('../middleware/authMiddleware')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// ── GET /api/comparables ─────────────────────────────────────────
// Lista comparables guardados del perito (o todos si es admin)
router.get('/', verificarToken, async (req, res) => {
  try {
    const { tipo, limit = 50 } = req.query
    const esAdmin = req.usuario?.rol === 'admin'

    let query, params
    if (esAdmin) {
      query = `
        SELECT c.*, u.nombre as perito_nombre
        FROM comparables_bd c
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        ${tipo ? 'WHERE c.tipo = $1' : ''}
        ORDER BY c.fecha_consulta DESC
        LIMIT $${tipo ? 2 : 1}
      `
      params = tipo ? [tipo, limit] : [limit]
    } else {
      query = `
        SELECT * FROM comparables_bd
        WHERE usuario_id = $1
        ${tipo ? 'AND tipo = $2' : ''}
        ORDER BY fecha_consulta DESC
        LIMIT $${tipo ? 3 : 2}
      `
      params = tipo ? [req.usuario.id, tipo, limit] : [req.usuario.id, limit]
    }

    const result = await pool.query(query, params)
    res.json({ comparables: result.rows })
  } catch (err) {
    console.error('[Comparables] GET Error:', err.message)
    res.status(500).json({ error: 'Error al obtener comparables' })
  }
})

// ── POST /api/comparables ────────────────────────────────────────
// Guarda un comparable utilizado en un avalúo
router.post('/', verificarToken, async (req, res) => {
  try {
    const {
      tipo,           // 'casa' | 'terreno' | 'rentas'
      ciudad, colonia,
      oferta, superficie,
      descripcion, fuente, url,
      telefono, informante,
      avaluo_id,
    } = req.body

    if (!tipo || !oferta) {
      return res.status(400).json({ error: 'tipo y oferta son requeridos' })
    }

    const result = await pool.query(`
      INSERT INTO comparables_bd
        (usuario_id, tipo, ciudad, colonia, oferta, superficie,
         descripcion, fuente, url, telefono, informante, avaluo_id, fecha_consulta)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW())
      RETURNING *
    `, [
      req.usuario.id, tipo, ciudad||null, colonia||null,
      parseFloat(oferta)||null, parseFloat(superficie)||null,
      descripcion||null, fuente||null, url||null,
      telefono||null, informante||null, avaluo_id||null,
    ])

    res.status(201).json({ comparable: result.rows[0] })
  } catch (err) {
    console.error('[Comparables] POST Error:', err.message)
    res.status(500).json({ error: 'Error al guardar comparable' })
  }
})

// ── DELETE /api/comparables/:id ──────────────────────────────────
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params
    const esAdmin = req.usuario?.rol === 'admin'
    const whereExtra = esAdmin ? '' : 'AND usuario_id = $2'
    const params = esAdmin ? [id] : [id, req.usuario.id]

    await pool.query(
      `DELETE FROM comparables_bd WHERE id = $1 ${whereExtra}`,
      params
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router