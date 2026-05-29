const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const pool   = require('../config/db')
require('dotenv').config()

async function generarUsername(nombres, apellidos) {
  const inicial  = nombres.trim()[0].toUpperCase()
  const apellido = apellidos.trim().split(' ')[0]
  const base     = `${inicial}.${apellido.charAt(0).toUpperCase()}${apellido.slice(1).toLowerCase()}`
  const { rows } = await pool.query(
    `SELECT username FROM giaval.usuario WHERE username LIKE $1 ORDER BY username`,
    [`${base}%`]
  )
  const numero = String(rows.length + 1).padStart(2, '0')
  return `${base}${numero}`
}

// POST /api/auth/register
async function register(req, res) {
  const { nombres, apellidos, correo, contrasena } = req.body

  if (!nombres || !apellidos || !correo || !contrasena)
    return res.status(400).json({ message: 'Todos los campos son requeridos.' })
  if (contrasena.length < 8)
    return res.status(400).json({ message: 'La contraseña debe tener mínimo 8 caracteres.' })
  if (!correo.includes('@'))
    return res.status(400).json({ message: 'Correo electrónico inválido.' })

  try {
    const { rows: existe } = await pool.query(
      'SELECT id FROM giaval.usuario WHERE correo = $1',
      [correo.toLowerCase().trim()]
    )
    if (existe.length > 0)
      return res.status(409).json({ message: 'Ya existe una cuenta con ese correo.' })

    const username        = await generarUsername(nombres, apellidos)
    const password_hash   = await bcrypt.hash(contrasena, 12)
    const nombre_completo = `${nombres.trim()} ${apellidos.trim()}`

    // Estado inactivo hasta que el admin lo active
    await pool.query(
      `INSERT INTO giaval.usuario
         (username, nombre_completo, correo, password_hash, rol, estado)
       VALUES ($1, $2, $3, $4, 'valuador', 'inactivo')`,
      [username, nombre_completo, correo.toLowerCase().trim(), password_hash]
    )

    return res.status(201).json({
      message: 'pending_activation',
      username,
    })
  } catch (err) {
    console.error('[register]', err.message)
    return res.status(500).json({ message: 'Error interno del servidor.' })
  }
}

// POST /api/auth/login
async function login(req, res) {
  const { username, contrasena } = req.body

  if (!username || !contrasena)
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' })

  try {
    const { rows } = await pool.query(
      `SELECT id, username, nombre_completo, correo, password_hash, rol, estado
       FROM giaval.usuario
       WHERE username = $1 OR correo = $1`,
      [username.trim()]
    )

    if (rows.length === 0)
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' })

    const usuario = rows[0]
    const ok = await bcrypt.compare(contrasena, usuario.password_hash)
    if (!ok)
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' })

    if (usuario.estado !== 'activo')
      return res.status(403).json({
        message: 'Tu cuenta aún no está activa. Contacta al administrador para que la habilite.'
      })

    await pool.query(
      'UPDATE giaval.usuario SET ultimo_acceso = NOW() WHERE id = $1',
      [usuario.id]
    )

    const token = jwt.sign(
      { id: usuario.id, username: usuario.username, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    return res.status(200).json({
      message: 'Login exitoso.',
      token,
      usuario: {
        id:             usuario.id,
        username:       usuario.username,
        nombreCompleto: usuario.nombre_completo,
        correo:         usuario.correo,
        rol:            usuario.rol,
      }
    })
  } catch (err) {
    console.error('[login]', err.message)
    return res.status(500).json({ message: 'Error interno del servidor.' })
  }
}

// GET /api/auth/me
async function me(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, nombre_completo, correo, rol, estado, ultimo_acceso, created_at
       FROM giaval.usuario WHERE id = $1`,
      [req.usuarioId]
    )
    if (rows.length === 0)
      return res.status(404).json({ message: 'Usuario no encontrado.' })

    const u = rows[0]
    return res.status(200).json({
      id:             u.id,
      username:       u.username,
      nombreCompleto: u.nombre_completo,
      correo:         u.correo,
      rol:            u.rol,
      estado:         u.estado,
    })
  } catch (err) {
    console.error('[me]', err.message)
    return res.status(500).json({ message: 'Error interno del servidor.' })
  }
}

// PUT /api/auth/perfil
async function editarPerfil(req, res) {
  const { nombreCompleto, correo, contrasenaActual, contrasenaNueva } = req.body

  try {
    const { rows } = await pool.query(
      'SELECT id, password_hash, correo FROM giaval.usuario WHERE id = $1',
      [req.usuarioId]
    )
    if (rows.length === 0)
      return res.status(404).json({ message: 'Usuario no encontrado.' })

    const usuario = rows[0]
    const updates = []
    const valores = []
    let idx = 1

    if (nombreCompleto?.trim()) {
      updates.push(`nombre_completo = $${idx++}`)
      valores.push(nombreCompleto.trim())
    }

    if (correo?.trim() && correo !== usuario.correo) {
      if (!correo.includes('@'))
        return res.status(400).json({ message: 'Correo electrónico inválido.' })
      const { rows: existe } = await pool.query(
        'SELECT id FROM giaval.usuario WHERE correo = $1 AND id != $2',
        [correo.toLowerCase().trim(), req.usuarioId]
      )
      if (existe.length > 0)
        return res.status(409).json({ message: 'Ese correo ya está en uso por otra cuenta.' })
      updates.push(`correo = $${idx++}`)
      valores.push(correo.toLowerCase().trim())
    }

    if (contrasenaNueva) {
      if (!contrasenaActual)
        return res.status(400).json({ message: 'Debes ingresar tu contraseña actual para cambiarla.' })
      const ok = await bcrypt.compare(contrasenaActual, usuario.password_hash)
      if (!ok)
        return res.status(401).json({ message: 'La contraseña actual es incorrecta.' })
      if (contrasenaNueva.length < 8)
        return res.status(400).json({ message: 'La nueva contraseña debe tener mínimo 8 caracteres.' })
      const hash = await bcrypt.hash(contrasenaNueva, 12)
      updates.push(`password_hash = $${idx++}`)
      valores.push(hash)
    }

    if (updates.length === 0)
      return res.status(400).json({ message: 'No hay cambios que guardar.' })

    valores.push(req.usuarioId)
    const { rows: updated } = await pool.query(
      `UPDATE giaval.usuario SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING id, username, nombre_completo, correo, rol`,
      valores
    )

    return res.status(200).json({
      message: 'Perfil actualizado correctamente.',
      usuario: {
        id:             updated[0].id,
        username:       updated[0].username,
        nombreCompleto: updated[0].nombre_completo,
        correo:         updated[0].correo,
        rol:            updated[0].rol,
      }
    })
  } catch (err) {
    console.error('[editarPerfil]', err.message)
    return res.status(500).json({ message: 'Error interno del servidor.' })
  }
}

module.exports = { register, login, me, editarPerfil }