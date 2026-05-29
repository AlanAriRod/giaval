const pool = require('../config/db')

async function generarFolio() {
  const ahora   = new Date()
  const yy      = String(ahora.getFullYear()).slice(2)
  const mm      = String(ahora.getMonth() + 1).padStart(2, '0')
  const prefijo = `CLAVE-AG/${yy}${mm}-`
  const { rows } = await pool.query(
    `SELECT folio_interno FROM giaval.avaluo
     WHERE folio_interno LIKE $1 ORDER BY folio_interno DESC LIMIT 1`,
    [`${prefijo}%`]
  )
  let numero = 1
  if (rows.length > 0) numero = parseInt(rows[0].folio_interno.split('-').pop()) + 1
  return `${prefijo}${String(numero).padStart(2, '0')}`
}

// POST /api/avaluos
async function crear(req, res) {
  const {
    titulo, tipo_avaluo, nombre_solicitante, nombre_propietario,
    calle, numero, colonia, municipio, codigo_postal, entidad_federativa,
    longitud, latitud, altitud, cuenta_predial,
    bien_que_se_valua, tipo_inmueble, regimen_propiedad, uso_suelo,
    area_terreno, area_construccion, indiviso,
    num_niveles, edad_aproximada, vida_total,
    num_recamaras, num_banos, estacionamientos, estado_conservacion,
    fecha_avaluo, vigencia_meses,
    visibilidad,
    datos_formulario,
  } = req.body

  try {
    const folio = await generarFolio()
    const { rows } = await pool.query(
      `INSERT INTO giaval.avaluo (
        folio_interno, titulo, tipo_avaluo, estado,
        id_valuador,
        nombre_solicitante, nombre_propietario,
        calle, numero, colonia, municipio, codigo_postal, entidad_federativa,
        longitud, latitud, altitud, cuenta_predial,
        bien_que_se_valua, tipo_inmueble, regimen_propiedad, uso_suelo,
        area_terreno, area_construccion, indiviso,
        num_niveles, edad_aproximada, vida_total,
        num_recamaras, num_banos, estacionamientos, estado_conservacion,
        fecha_avaluo, vigencia_meses,
        visibilidad, datos_formulario
      ) VALUES (
        $1, $2, $3, 'borrador',
        $4,
        $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19, $20,
        $21, $22, $23,
        $24, $25, $26,
        $27, $28, $29, $30,
        $31, $32,
        $33, $34
      ) RETURNING id, folio_interno, titulo, estado, created_at`,
      [
        folio,                        /* $1  */
        titulo || folio,              /* $2  */
        tipo_avaluo || 'comercial',   /* $3  */
        req.usuarioId,                /* $4  */
        nombre_solicitante || '',     /* $5  */
        nombre_propietario || '',     /* $6  */
        calle              || '',     /* $7  */
        numero             || '',     /* $8  */
        colonia            || '',     /* $9  */
        municipio          || '',     /* $10 */
        codigo_postal      || '',     /* $11 */
        entidad_federativa || '',     /* $12 */
        longitud           || null,   /* $13 */
        latitud            || null,   /* $14 */
        altitud            || null,   /* $15 */
        cuenta_predial     || '',     /* $16 */
        bien_que_se_valua  || '',     /* $17 */
        tipo_inmueble      || '',     /* $18 */
        regimen_propiedad  || '',     /* $19 */
        uso_suelo          || '',     /* $20 */
        area_terreno       || null,   /* $21 */
        area_construccion  || null,   /* $22 */
        indiviso           || 1,      /* $23 */
        num_niveles        || null,   /* $24 */
        edad_aproximada    || null,   /* $25 */
        vida_total         || null,   /* $26 */
        num_recamaras      || null,   /* $27 */
        num_banos          || null,   /* $28 */
        estacionamientos   || null,   /* $29 */
        estado_conservacion|| '',     /* $30 */
        fecha_avaluo       || null,   /* $31 */
        vigencia_meses     || 6,      /* $32 */
        visibilidad        || 'equipo', /* $33 */
        datos_formulario ? JSON.stringify(datos_formulario) : null, /* $34 */
      ]
    )
    return res.status(201).json({ message: 'Avalúo creado exitosamente.', avaluo: rows[0] })
  } catch (err) {
    console.error('[crear avalúo]', err.message)
    return res.status(500).json({ message: 'Error al crear el avalúo.', detalle: err.message })
  }
}

// GET /api/avaluos
async function listar(req, res) {
  const { busqueda, tipo, estado, pagina = 1, limite = 20 } = req.query
  const offset = (parseInt(pagina) - 1) * parseInt(limite)

  try {
    const { rows: userData } = await pool.query(
      'SELECT rol FROM giaval.usuario WHERE id = $1', [req.usuarioId]
    )
    const esAdmin = userData[0]?.rol === 'administrador'

    let condiciones = []
    let valores     = []
    let idx         = 1

    if (!esAdmin) {
      // Muestra los propios + los que son de equipo o públicos
      condiciones.push(`(a.id_valuador = $${idx} OR a.visibilidad IN ('equipo','publico'))`)
      valores.push(req.usuarioId)
      idx++
    }

    if (busqueda) {
      condiciones.push(`(
        a.folio_interno      ILIKE $${idx} OR
        a.titulo             ILIKE $${idx} OR
        a.nombre_propietario ILIKE $${idx} OR
        a.nombre_solicitante ILIKE $${idx} OR
        a.calle || ' ' || a.colonia || ' ' || a.municipio ILIKE $${idx}
      )`)
      valores.push(`%${busqueda}%`)
      idx++
    }
    if (tipo)   { condiciones.push(`a.tipo_avaluo = $${idx++}`); valores.push(tipo)   }
    if (estado) { condiciones.push(`a.estado = $${idx++}`);      valores.push(estado) }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''

    const { rows: conteo } = await pool.query(
      `SELECT COUNT(*) FROM giaval.avaluo a ${where}`, valores
    )
    const total = parseInt(conteo[0].count)

    const { rows } = await pool.query(
      `SELECT
        a.id, a.folio_interno, a.titulo, a.tipo_avaluo, a.estado,
        a.nombre_propietario, a.nombre_solicitante,
        a.calle, a.colonia, a.municipio, a.entidad_federativa,
        a.bien_que_se_valua, a.tipo_inmueble,
        a.area_terreno, a.area_construccion,
        a.valor_mercado, a.valor_fisico, a.valor_rentas, a.valor_referido,
        a.fecha_avaluo, a.fecha_vencimiento, a.notas, a.visibilidad,
        a.created_at, a.updated_at,
        u.username        AS valuador_username,
        u.nombre_completo AS valuador_nombre
       FROM giaval.avaluo a
       JOIN giaval.usuario u ON u.id = a.id_valuador
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...valores, parseInt(limite), offset]
    )

    return res.status(200).json({
      total, pagina: parseInt(pagina), limite: parseInt(limite),
      paginas: Math.ceil(total / parseInt(limite)),
      avaluos: rows,
    })
  } catch (err) {
    console.error('[listar avalúos]', err.message)
    return res.status(500).json({ message: 'Error al obtener los avalúos.' })
  }
}

// GET /api/avaluos/:id
async function obtener(req, res) {
  const { id } = req.params
  try {
    const { rows } = await pool.query(
      `SELECT a.*, u.username AS valuador_username, u.nombre_completo AS valuador_nombre
       FROM giaval.avaluo a
       JOIN giaval.usuario u ON u.id = a.id_valuador
       WHERE a.id = $1`, [id]
    )
    if (rows.length === 0)
      return res.status(404).json({ message: 'Avalúo no encontrado.' })

    const avaluo = rows[0]
    const { rows: userData } = await pool.query(
      'SELECT rol FROM giaval.usuario WHERE id = $1', [req.usuarioId]
    )
    const esAdmin = userData[0]?.rol === 'administrador'

    // Verificar acceso según visibilidad
    if (!esAdmin && avaluo.visibilidad === 'privado' && avaluo.id_valuador !== req.usuarioId)
      return res.status(403).json({ message: 'No tienes permiso para ver este avalúo.' })

    let historial = []
    try {
      const { rows: h } = await pool.query(
        `SELECT h.*, u.username FROM giaval.avaluo_historial h
         JOIN giaval.usuario u ON u.id = h.id_usuario
         WHERE h.id_avaluo = $1 ORDER BY h.created_at DESC`, [id]
      )
      historial = h
    } catch (_) { /* tabla aún no existe — se ignora */ }

    return res.status(200).json({ ...avaluo, historial })
  } catch (err) {
    console.error('[obtener avalúo]', err.message)
    return res.status(500).json({ message: 'Error al obtener el avalúo.' })
  }
}

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params
    const {
      titulo, tipo_avaluo, nombre_solicitante, nombre_propietario,
      calle, numero, colonia, municipio, codigo_postal,
      entidad_federativa, longitud, latitud, altitud, cuenta_predial,
      bien_que_se_valua, tipo_inmueble, regimen_propiedad, uso_suelo,
      fecha_avaluo, vigencia_meses,
      valor_mercado, valor_fisico, valor_rentas,
      valor_conclusivo,   // ← ESTE ES EL NUEVO CAMPO
      datos_formulario,
    } = req.body
 
    const result = await pool.query(
      `UPDATE giaval.avaluo SET
         titulo              = COALESCE($1, titulo),
         nombre_solicitante  = $2,
         nombre_propietario  = $3,
         calle               = $4,
         colonia             = $5,
         municipio           = $6,
         latitud             = $7,
         longitud            = $8,
         fecha_avaluo        = $9,
         valor_mercado       = $10,
         valor_fisico        = $11,
         valor_rentas        = $12,
         valor_conclusivo    = $13,
         datos_formulario    = $14,
         updated_at          = NOW()
       WHERE id_avaluo = $15
       RETURNING id_avaluo`,
      [
        titulo, nombre_solicitante, nombre_propietario,
        calle, colonia, municipio,
        latitud ? parseFloat(latitud) : null,
        longitud ? parseFloat(longitud) : null,
        fecha_avaluo || null,
        valor_mercado  ? parseFloat(valor_mercado)  : null,
        valor_fisico   ? parseFloat(valor_fisico)   : null,
        valor_rentas   ? parseFloat(valor_rentas)   : null,
        valor_conclusivo ? parseFloat(valor_conclusivo) : null,   // ← NUEVO
        JSON.stringify(datos_formulario),
        id
      ]
    )
 
    if (!result.rows.length) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ok: true, id_avaluo: result.rows[0].id_avaluo })
  } catch (err) {
    console.error('[actualizar] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

// DELETE /api/avaluos/:id
async function eliminar(req, res) {
  const { id } = req.params
  try {
    const { rows: actual } = await pool.query(
      'SELECT id, id_valuador, estado FROM giaval.avaluo WHERE id = $1', [id]
    )
    if (actual.length === 0)
      return res.status(404).json({ message: 'Avalúo no encontrado.' })

    const { rows: userData } = await pool.query(
      'SELECT rol FROM giaval.usuario WHERE id = $1', [req.usuarioId]
    )
    const esAdmin = userData[0]?.rol === 'administrador'

    if (!esAdmin && actual[0].id_valuador !== req.usuarioId)
      return res.status(403).json({ message: 'No tienes permiso para eliminar este avalúo.' })

    if (actual[0].estado === 'final' && !esAdmin)
      return res.status(409).json({
        message: 'No se puede eliminar un avalúo en estado Final. Contacta al administrador.'
      })

    await pool.query('DELETE FROM giaval.avaluo WHERE id = $1', [id])
    return res.status(200).json({ message: 'Avalúo eliminado correctamente.' })
  } catch (err) {
    console.error('[eliminar avalúo]', err.message)
    return res.status(500).json({ message: 'Error al eliminar el avalúo.' })
  }
}

// GET /api/avaluos/estadisticas
async function estadisticas(req, res) {
  try {
    const { rows: userData } = await pool.query(
      'SELECT rol FROM giaval.usuario WHERE id = $1', [req.usuarioId]
    )
    const esAdmin = userData[0]?.rol === 'administrador'
    const filtro  = esAdmin
      ? ''
      : `WHERE (id_valuador = ${req.usuarioId} OR visibilidad IN ('equipo','publico'))`

    const { rows } = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE true)                  AS total,
        COUNT(*) FILTER (WHERE estado = 'borrador')   AS borradores,
        COUNT(*) FILTER (WHERE estado = 'en_proceso') AS en_proceso,
        COUNT(*) FILTER (WHERE estado = 'preliminar') AS preliminar,
        COUNT(*) FILTER (WHERE estado = 'final')      AS finales,
        COUNT(*) FILTER (WHERE notas <> '')            AS con_notas
       FROM giaval.avaluo ${filtro}`
    )
    return res.status(200).json(rows[0])
  } catch (err) {
    console.error('[estadisticas]', err.message)
    return res.status(500).json({ message: 'Error al obtener estadísticas.' })
  }
}

exports.cambiarEstado = async (req, res) => {
  try {
    const { id }     = req.params
    const { estado } = req.body

    const validos = ['borrador', 'en_proceso', 'preliminar', 'final']
    if (!validos.includes(estado)) {
      return res.status(400).json({ error: `Estado inválido. Valores: ${validos.join(', ')}` })
    }

    // Usa el mismo pool que ya tiene el controlador
    const result = await pool.query(
      `UPDATE giaval.avaluo
         SET estado_avaluo = $1::giaval.estado_avaluo,
             updated_at    = NOW()
       WHERE id_avaluo = $2
       RETURNING id_avaluo, estado_avaluo`,
      [estado, id]
    )

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Avalúo no encontrado' })
    }

    console.log(`[Estado] avaluo ${id} → ${estado}`)
    res.json({ ok: true, estado: result.rows[0].estado_avaluo })
  } catch (err) {
    console.error('[cambiarEstado] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
}


// ── exports.listar ─────────────────────────────────────────────
exports.listar = async (req, res) => {
  try {
    const { id, rol } = req.usuario

    // Consulta directa a giaval.avaluo (sin vista)
    // Usa NULLIF para evitar el error "sintaxis no válida para numeric: ''"
    const query = rol === 'administrador'
      ? `SELECT
           id_avaluo,
           tipo_avaluo,
           estado_avaluo,
           folio_interno,
           titulo,
           fecha_avaluo,
           updated_at,
           created_at,
           NULLIF(datos_formulario->>'valorMercado','')::NUMERIC     AS valor_mercado,
           NULLIF(datos_formulario->>'valorFisico','')::NUMERIC      AS valor_fisico,
           NULLIF(datos_formulario->>'valorRentas','')::NUMERIC      AS valor_rentas,
           NULLIF(datos_formulario->>'valorMercadoConclusion','')::NUMERIC AS valor_conclusion,
           CASE
             -- Avalúo Referido: usar valorReferidoFinal
             WHEN NULLIF(datos_formulario->>'valorReferidoFinal','') IS NOT NULL
               THEN NULLIF(datos_formulario->>'valorReferidoFinal','')::NUMERIC
             WHEN datos_formulario->>'enfoqueConclusivo' = 'fisico'
               THEN NULLIF(datos_formulario->>'valorFisico','')::NUMERIC
             WHEN datos_formulario->>'enfoqueConclusivo' = 'rentas'
               THEN NULLIF(datos_formulario->>'valorRentas','')::NUMERIC
             WHEN datos_formulario->>'enfoqueConclusivo' = 'mayor'
               THEN GREATEST(
                 COALESCE(NULLIF(datos_formulario->>'valorMercado','')::NUMERIC, 0),
                 COALESCE(NULLIF(datos_formulario->>'valorFisico','')::NUMERIC, 0),
                 COALESCE(NULLIF(datos_formulario->>'valorRentas','')::NUMERIC, 0)
               )
             ELSE COALESCE(
               NULLIF(datos_formulario->>'valorMercadoConclusion','')::NUMERIC,
               NULLIF(datos_formulario->>'valorMercado','')::NUMERIC
             )
           END                                                        AS valor_conclusivo,
           datos_formulario->>'enfoqueConclusivo'                    AS enfoque_conclusivo,
           datos_formulario->>'nombreSolicitante'                    AS nombre_solicitante,
           datos_formulario->>'municipio'                            AS municipio,
           id_usuario
         FROM giaval.avaluo
         ORDER BY updated_at DESC NULLS LAST`
      : `SELECT
           id_avaluo,
           tipo_avaluo,
           estado_avaluo,
           folio_interno,
           titulo,
           fecha_avaluo,
           updated_at,
           created_at,
           NULLIF(datos_formulario->>'valorMercado','')::NUMERIC     AS valor_mercado,
           NULLIF(datos_formulario->>'valorFisico','')::NUMERIC      AS valor_fisico,
           NULLIF(datos_formulario->>'valorRentas','')::NUMERIC      AS valor_rentas,
           NULLIF(datos_formulario->>'valorMercadoConclusion','')::NUMERIC AS valor_conclusion,
           CASE
             -- Avalúo Referido: usar valorReferidoFinal
             WHEN NULLIF(datos_formulario->>'valorReferidoFinal','') IS NOT NULL
               THEN NULLIF(datos_formulario->>'valorReferidoFinal','')::NUMERIC
             WHEN datos_formulario->>'enfoqueConclusivo' = 'fisico'
               THEN NULLIF(datos_formulario->>'valorFisico','')::NUMERIC
             WHEN datos_formulario->>'enfoqueConclusivo' = 'rentas'
               THEN NULLIF(datos_formulario->>'valorRentas','')::NUMERIC
             WHEN datos_formulario->>'enfoqueConclusivo' = 'mayor'
               THEN GREATEST(
                 COALESCE(NULLIF(datos_formulario->>'valorMercado','')::NUMERIC, 0),
                 COALESCE(NULLIF(datos_formulario->>'valorFisico','')::NUMERIC, 0),
                 COALESCE(NULLIF(datos_formulario->>'valorRentas','')::NUMERIC, 0)
               )
             ELSE COALESCE(
               NULLIF(datos_formulario->>'valorMercadoConclusion','')::NUMERIC,
               NULLIF(datos_formulario->>'valorMercado','')::NUMERIC
             )
           END                                                        AS valor_conclusivo,
           datos_formulario->>'enfoqueConclusivo'                    AS enfoque_conclusivo,
           datos_formulario->>'nombreSolicitante'                    AS nombre_solicitante,
           datos_formulario->>'municipio'                            AS municipio,
           id_usuario
         FROM giaval.avaluo
         WHERE id_usuario = $1
         ORDER BY updated_at DESC NULLS LAST`

    const params = rol === 'administrador' ? [] : [id]
    const result = await pool.query(query, params)
    res.json({ avaluos: result.rows })
  } catch (err) {
    console.error('[listar] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

// ── exports.estadisticas ────────────────────────────────────────
exports.estadisticas = async (req, res) => {
  try {
    const { id, rol } = req.usuario
    const whereClause = rol === 'administrador' ? '' : 'WHERE id_usuario = $1'
    const params      = rol === 'administrador' ? [] : [id]

    const result = await pool.query(`
      SELECT
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE estado_avaluo='borrador') AS borrador,
        COUNT(*) FILTER (WHERE estado_avaluo='en_proceso') AS en_proceso,
        COUNT(*) FILTER (WHERE estado_avaluo='preliminar') AS preliminar,
        COUNT(*) FILTER (WHERE estado_avaluo='final')    AS final,
        COUNT(*) FILTER (WHERE tipo_avaluo='comercial')  AS comerciales,
        COUNT(*) FILTER (WHERE tipo_avaluo='referido')   AS referidos
      FROM giaval.avaluo
      ${whereClause}
    `, params)

    res.json(result.rows[0])
  } catch (err) {
    console.error('[estadisticas] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

module.exports = { crear, listar, obtener, actualizar, eliminar, estadisticas }