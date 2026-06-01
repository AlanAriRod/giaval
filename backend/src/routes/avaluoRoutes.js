const router = require('express').Router()
const { verificarToken } = require('../middleware/authMiddleware')
const ctrl = require('../controllers/avaluoController')
const pool = require('../config/db')   // usa el pool central del .env

router.use(verificarToken)

// IMPORTANTE: /estadisticas debe ir ANTES de /:id para no ser capturado como ID
router.get('/estadisticas', ctrl.estadisticas)
router.get('/',             ctrl.listar)
router.get('/:id',          ctrl.obtener)
router.post('/',            ctrl.crear)
router.put('/:id',          ctrl.actualizar)
router.delete('/:id',       ctrl.eliminar)

// PATCH estado — usa pool central, sin cast ENUM para compatibilidad VARCHAR
router.patch('/:id/estado', async (req, res) => {
  try {
    const { id }     = req.params
    const { estado } = req.body
    const validos    = ['borrador', 'en_proceso', 'preliminar', 'final']

    if (!validos.includes(estado))
      return res.status(400).json({ error: `Estado inválido. Usa: ${validos.join(', ')}` })

    const result = await pool.query(
      `UPDATE giaval.avaluo
         SET estado_avaluo = $1,
             updated_at    = NOW()
       WHERE id = $2
       RETURNING id, estado_avaluo`,
      [estado, id]
    )

    if (!result.rows.length)
      return res.status(404).json({ error: 'Avalúo no encontrado' })

    console.log(`[Estado] id=${id} → ${estado}`)
    res.json({ ok: true, estado: result.rows[0].estado_avaluo })
  } catch (err) {
    console.error('[PATCH estado] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router