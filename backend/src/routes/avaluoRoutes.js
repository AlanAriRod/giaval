// backend/src/routes/avaluoRoutes.js
// REEMPLAZA COMPLETAMENTE tu avaluoRoutes.js con este archivo

const router = require('express').Router()
const { verificarToken } = require('../middleware/authMiddleware')
const ctrl = require('../controllers/avaluoController')

// Pool creado de forma lazy para asegurar que DATABASE_URL ya esté cargado
const pg = require('pg')
let _pool = null
const getPool = () => {
  if (!_pool) _pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  return _pool
}

router.use(verificarToken)

router.get('/estadisticas', ctrl.estadisticas)
router.get('/',             ctrl.listar)
router.get('/:id',          ctrl.obtener)
router.post('/',            ctrl.crear)
router.put('/:id',          ctrl.actualizar)
router.delete('/:id',       ctrl.eliminar)

// PATCH estado — inline, sin depender de ctrl.cambiarEstado
router.patch('/:id/estado', async (req, res) => {
  try {
    const { id }     = req.params
    const { estado } = req.body
    const validos    = ['borrador','en_proceso','preliminar','final']
    if (!validos.includes(estado))
      return res.status(400).json({ error: `Estado inválido. Usa: ${validos.join(', ')}` })

    const result = await getPool().query(
      `UPDATE giaval.avaluo
         SET estado_avaluo = $1::giaval.estado_avaluo, updated_at = NOW()
       WHERE id_avaluo = $2
       RETURNING id_avaluo, estado_avaluo`,
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