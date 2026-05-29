const router = require('express').Router()
const { verificarToken, soloAdmin } = require('../middleware/authMiddleware')
const { listarUsuarios, cambiarEstado, cambiarRol } = require('../controllers/adminController')

// Todas las rutas admin requieren token + ser administrador
router.use(verificarToken, soloAdmin)

router.get('/usuarios',                  listarUsuarios)  // GET  /api/admin/usuarios
router.patch('/usuarios/:id/estado',     cambiarEstado)   // PATCH /api/admin/usuarios/:id/estado
router.patch('/usuarios/:id/rol',        cambiarRol)      // PATCH /api/admin/usuarios/:id/rol

module.exports = router
