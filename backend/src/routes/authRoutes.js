const express  = require('express')
const router   = express.Router()
const { register, login, me, editarPerfil } = require('../controllers/authController')
const { verificarToken } = require('../middleware/authMiddleware')

router.post('/register', register)
router.post('/login',    login)
router.get('/me',        verificarToken, me)
router.put('/perfil',    verificarToken, editarPerfil)

module.exports = router