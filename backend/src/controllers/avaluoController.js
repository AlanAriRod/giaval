const pool = require('../config/db')

// ── Generador de folio ─────────────────────────────────────────
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

// ── POST /api/avaluos ──────────────────────────────────────────
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
        folio_interno, titulo, tipo_avaluo, estado_avaluo,
        id_usuario,
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
        $1,$2,$3,'borrador',
        $4,$5,$6,
        $7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,
        $17,$18,$19,$20,
        $21,$22,$23,
        $24,$25,$26,
        $27,$28,$29,$30,
        $31,$32,$33,$34
      ) RETURNING id, folio_interno, titulo, estado_avaluo, created_at`,
      [
        folio, titulo || folio, tipo_avaluo || 'comercial',
        req.usuarioId,
        nombre_solicitante || '', nombre_propietario || '',
        calle || '', numero || '', colonia || '', municipio || '',
        codigo_postal || '', entidad_federativa || '',
        longitud || null, latitud || null, altitud || null,
        cuenta_predial || '',
        bien_que_se_valua || '', tipo_inmueble || '',
        regimen_propiedad || '', uso_suelo || '',
        area_terreno || null, area_construccion || null, indiviso || 1,
        num_niveles || null, edad_aproximada || null, vida_total || null,
        num_recamaras || null, num_banos || null,
        estacionamientos || null, estado_conservacion || '',
        fecha_avaluo || null, vigencia_meses || 6,
        visibilidad || 'equipo',
        datos_formulario ? JSON.stringify(datos_formulario) : null,
      ]
    )
    return res.status(201).json({ message: 'Avalúo creado exitosamente.', avaluo: rows[0] })
  } catch (err) {
    console.error('[crear avalúo]', err.message)
    return res.status(500).json({ message: 'Error al crear el avalúo.', detalle: err.message })
  }
}

// ── GET /api/avaluos ───────────────────────────────────────────
// Extrae todos los campos relevantes del JSONB datos_formulario
// usando COALESCE para manejar tanto campos directos como del JSON
async function listar(req, res) {
  try {
    const { id, rol } = req.usuario

    const selectCampos = `
      id,
      tipo_avaluo,
      estado_avaluo,
      folio_interno,
      titulo,
      fecha_avaluo,
      updated_at,
      created_at,
      visibilidad,
      id_usuario,

      -- Nombre propietario: columna directa primero, luego fallback al JSON
      COALESCE(
        NULLIF(nombre_propietario, ''),
        NULLIF(datos_formulario->>'nombrePropietario', ''),
        NULLIF(datos_formulario->>'nombre_propietario', '')
      ) AS nombre_propietario,

      -- Nombre solicitante: igual
      COALESCE(
        NULLIF(nombre_solicitante, ''),
        NULLIF(datos_formulario->>'nombreSolicitante', ''),
        NULLIF(datos_formulario->>'nombre_solicitante', '')
      ) AS nombre_solicitante,

      -- Municipio
      COALESCE(
        NULLIF(municipio, ''),
        NULLIF(datos_formulario->>'municipio', '')
      ) AS municipio,

      -- Valores economicos del JSON
      NULLIF(datos_formulario->>'valorMercado',      '')::NUMERIC AS valor_mercado,
      NULLIF(datos_formulario->>'valorFisico',        '')::NUMERIC AS valor_fisico,
      NULLIF(datos_formulario->>'valorRentas',        '')::NUMERIC AS valor_rentas,

      -- Valor conclusivo: prioridad al campo directo, luego al JSON segun enfoque
      COALESCE(
        valor_conclusivo,
        CASE
          -- Avaluo Referido: usar valorReferidoFinal
          WHEN NULLIF(datos_formulario->>'valorReferidoFinal', '') IS NOT NULL
            THEN NULLIF(datos_formulario->>'valorReferidoFinal', '')::NUMERIC
          -- Segun enfoque conclusivo
          WHEN datos_formulario->>'enfoqueConclusivo' = 'fisico'
            THEN NULLIF(datos_formulario->>'valorFisico', '')::NUMERIC
          WHEN datos_formulario->>'enfoqueConclusivo' = 'rentas'
            THEN NULLIF(datos_formulario->>'valorRentas', '')::NUMERIC
          WHEN datos_formulario->>'enfoqueConclusivo' = 'mayor'
            THEN GREATEST(
              COALESCE(NULLIF(datos_formulario->>'valorMercado', '')::NUMERIC, 0),
              COALESCE(NULLIF(datos_formulario->>'valorFisico',  '')::NUMERIC, 0),
              COALESCE(NULLIF(datos_formulario->>'valorRentas',  '')::NUMERIC, 0)
            )
          ELSE COALESCE(
            NULLIF(datos_formulario->>'valorMercadoConclusion', '')::NUMERIC,
            NULLIF(datos_formulario->>'valorMercado',           '')::NUMERIC
          )
        END
      ) AS valor_conclusivo,

      datos_formulario->>'enfoqueConclusivo' AS enfoque_conclusivo
    `

    const whereValuador = `WHERE id_usuario = $1`
    const query = rol === 'administrador'
      ? `SELECT ${selectCampos} FROM giaval.avaluo ORDER BY updated_at DESC NULLS LAST`
      : `SELECT ${selectCampos} FROM giaval.avaluo ${whereValuador} ORDER BY updated_at DESC NULLS LAST`

    const params = rol === 'administrador' ? [] : [id]
    const result = await pool.query(query, params)
    res.json({ avaluos: result.rows })
  } catch (err) {
    console.error('[listar] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

// ── GET /api/avaluos/:id ───────────────────────────────────────
async function obtener(req, res) {
  const { id } = req.params
  try {
    const { rows } = await pool.query(
      `SELECT a.*, u.username AS valuador_username, u.nombre_completo AS valuador_nombre
       FROM giaval.avaluo a
       JOIN giaval.usuario u ON u.id = a.id_usuario
       WHERE a.id = $1`, [id]
    )
    if (rows.length === 0)
      return res.status(404).json({ message: 'Avalúo no encontrado.' })

    const avaluo  = rows[0]
    const esAdmin = req.rol === 'administrador'

    if (!esAdmin && avaluo.visibilidad === 'privado' && avaluo.id_usuario !== req.usuarioId)
      return res.status(403).json({ message: 'No tienes permiso para ver este avalúo.' })

    let historial = []
    try {
      const { rows: h } = await pool.query(
        `SELECT h.*, u.username FROM giaval.avaluo_historial h
         JOIN giaval.usuario u ON u.id = h.id_usuario
         WHERE h.id_avaluo = $1 ORDER BY h.created_at DESC`, [id]
      )
      historial = h
    } catch (_) { /* tabla opcional */ }

    return res.status(200).json({ ...avaluo, historial })
  } catch (err) {
    console.error('[obtener avalúo]', err.message)
    return res.status(500).json({ message: 'Error al obtener el avalúo.' })
  }
}

// ── PUT /api/avaluos/:id ───────────────────────────────────────
async function actualizar(req, res) {
  try {
    const { id } = req.params
    const {
      titulo, nombre_solicitante, nombre_propietario,
      calle, colonia, municipio, latitud, longitud,
      fecha_avaluo, valor_mercado, valor_fisico,
      valor_rentas, valor_conclusivo, notas,
      datos_formulario,
    } = req.body

    const result = await pool.query(
      `UPDATE giaval.avaluo SET
         titulo              = COALESCE($1, titulo),
         nombre_solicitante  = COALESCE($2, nombre_solicitante),
         nombre_propietario  = COALESCE($3, nombre_propietario),
         calle               = COALESCE($4, calle),
         colonia             = COALESCE($5, colonia),
         municipio           = COALESCE($6, municipio),
         latitud             = COALESCE($7, latitud),
         longitud            = COALESCE($8, longitud),
         fecha_avaluo        = COALESCE($9, fecha_avaluo),
         valor_mercado       = COALESCE($10, valor_mercado),
         valor_fisico        = COALESCE($11, valor_fisico),
         valor_rentas        = COALESCE($12, valor_rentas),
         valor_conclusivo    = COALESCE($13, valor_conclusivo),
         notas               = COALESCE($14, notas),
         datos_formulario    = COALESCE($15::jsonb, datos_formulario),
         updated_at          = NOW()
       WHERE id = $16
       RETURNING id`,
      [
        titulo || null,
        nombre_solicitante || null,
        nombre_propietario || null,
        calle    || null,
        colonia  || null,
        municipio || null,
        latitud  ? parseFloat(latitud)  : null,
        longitud ? parseFloat(longitud) : null,
        fecha_avaluo || null,
        valor_mercado    ? parseFloat(valor_mercado)    : null,
        valor_fisico     ? parseFloat(valor_fisico)     : null,
        valor_rentas     ? parseFloat(valor_rentas)     : null,
        valor_conclusivo ? parseFloat(valor_conclusivo) : null,
        notas !== undefined ? notas : null,
        datos_formulario ? JSON.stringify(datos_formulario) : null,
        id,
      ]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'No encontrado' })
    res.json({ ok: true, id: result.rows[0].id })
  } catch (err) {
    console.error('[actualizar] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

// ── DELETE /api/avaluos/:id ────────────────────────────────────
async function eliminar(req, res) {
  const { id } = req.params
  try {
    const { rows: actual } = await pool.query(
      'SELECT id, id_usuario, estado_avaluo FROM giaval.avaluo WHERE id = $1', [id]
    )
    if (actual.length === 0)
      return res.status(404).json({ message: 'Avalúo no encontrado.' })

    const esAdmin = req.rol === 'administrador'
    if (!esAdmin && actual[0].id_usuario !== req.usuarioId)
      return res.status(403).json({ message: 'No tienes permiso para eliminar este avalúo.' })
    if (actual[0].estado_avaluo === 'final' && !esAdmin)
      return res.status(409).json({ message: 'No se puede eliminar un avalúo Final. Contacta al administrador.' })

    await pool.query('DELETE FROM giaval.avaluo WHERE id = $1', [id])
    return res.status(200).json({ message: 'Avalúo eliminado correctamente.' })
  } catch (err) {
    console.error('[eliminar avalúo]', err.message)
    return res.status(500).json({ message: 'Error al eliminar el avalúo.' })
  }
}

// ── GET /api/avaluos/estadisticas ──────────────────────────────
async function estadisticas(req, res) {
  try {
    const { id, rol } = req.usuario
    const whereClause = rol === 'administrador' ? '' : 'WHERE id_usuario = $1'
    const params      = rol === 'administrador' ? [] : [id]

    const result = await pool.query(`
      SELECT
        COUNT(*)                                              AS total,
        COUNT(*) FILTER (WHERE estado_avaluo='borrador')     AS borrador,
        COUNT(*) FILTER (WHERE estado_avaluo='en_proceso')   AS en_proceso,
        COUNT(*) FILTER (WHERE estado_avaluo='preliminar')   AS preliminar,
        COUNT(*) FILTER (WHERE estado_avaluo='final')        AS finales,
        COUNT(*) FILTER (WHERE tipo_avaluo='comercial')      AS comerciales,
        COUNT(*) FILTER (WHERE tipo_avaluo='referido')       AS referidos,
        COUNT(*) FILTER (WHERE notas IS NOT NULL AND notas <> '') AS con_notas
      FROM giaval.avaluo
      ${whereClause}
    `, params)

    res.json(result.rows[0])
  } catch (err) {
    console.error('[estadisticas] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

// ── EXPORTS ────────────────────────────────────────────────────
module.exports = { crear, listar, obtener, actualizar, eliminar, estadisticas }