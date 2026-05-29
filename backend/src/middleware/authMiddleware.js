const jwt = require('jsonwebtoken')
require('dotenv').config()

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado.' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded    = jwt.verify(token, process.env.JWT_SECRET)
    req.usuarioId    = decoded.id
    req.username     = decoded.username
    req.rol          = decoded.rol
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado. Inicia sesión de nuevo.' })
  }
}

function soloAdmin(req, res, next) {
  if (req.rol !== 'administrador') {
    return res.status(403).json({ message: 'Acceso restringido a administradores.' })
  }
  next()
}

module.exports = { verificarToken, soloAdmin }
