const pool = require('../config/db')

// ─────────────────────────────────────────────────────────────────
//  GET /api/admin/usuarios
//  Lista todos los usuarios (solo admin)
// ─────────────────────────────────────────────────────────────────
async function listarUsuarios(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, nombre_completo, correo, rol, estado,
              created_at, ultimo_acceso
       FROM giaval.usuario
       ORDER BY created_at DESC`
    )
    return res.status(200).json(rows)
  } catch (err) {
    console.error('[listarUsuarios]', err.message)
    return res.status(500).json({ message: 'Error al obtener usuarios.' })
  }
}

// ─────────────────────────────────────────────────────────────────
//  PATCH /api/admin/usuarios/:id/estado
//  Cambia el estado de un usuario: activo | inactivo | suspendido
//  Un valuador inactivo no puede hacer login.
// ─────────────────────────────────────────────────────────────────
async function cambiarEstado(req, res) {
  const { id }     = req.params
  const { estado } = req.body

  const estadosValidos = ['activo', 'inactivo', 'suspendido']
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({
      message: `Estado inválido. Valores posibles: ${estadosValidos.join(', ')}`
    })
  }

  // No se puede desactivar a uno mismo
  if (parseInt(id) === req.usuarioId) {
    return res.status(400).json({ message: 'No puedes cambiar tu propio estado.' })
  }

  try {
    const { rows } = await pool.query(
      `UPDATE giaval.usuario
       SET estado = $1
       WHERE id = $2
       RETURNING id, username, nombre_completo, estado`,
      [estado, id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' })
    }
    return res.status(200).json({
      message: `Usuario ${rows[0].username} ahora está ${estado}.`,
      usuario: rows[0],
    })
  } catch (err) {
    console.error('[cambiarEstado]', err.message)
    return res.status(500).json({ message: 'Error al cambiar estado del usuario.' })
  }
}

// ─────────────────────────────────────────────────────────────────
//  PATCH /api/admin/usuarios/:id/rol
//  Cambia el rol de un usuario: administrador | valuador
// ─────────────────────────────────────────────────────────────────
async function cambiarRol(req, res) {
  const { id }  = req.params
  const { rol } = req.body

  if (!['administrador', 'valuador'].includes(rol)) {
    return res.status(400).json({ message: 'Rol inválido.' })
  }

  if (parseInt(id) === req.usuarioId) {
    return res.status(400).json({ message: 'No puedes cambiar tu propio rol.' })
  }

  try {
    const { rows } = await pool.query(
      `UPDATE giaval.usuario SET rol = $1 WHERE id = $2
       RETURNING id, username, nombre_completo, rol`,
      [rol, id]
    )
    if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado.' })
    return res.status(200).json({
      message: `Rol de ${rows[0].username} cambiado a ${rol}.`,
      usuario: rows[0],
    })
  } catch (err) {
    console.error('[cambiarRol]', err.message)
    return res.status(500).json({ message: 'Error al cambiar rol.' })
  }
}

module.exports = { listarUsuarios, cambiarEstado, cambiarRol }
