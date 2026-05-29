// backend/src/routes/ocr.js — v2
// CAMBIOS v2:
//  1. Nuevo endpoint POST /api/ocr/coordenadas — usa Gemini para geocodificar dirección
//  2. Prompt de plano mejorado: extrae descripción y características del inmueble
//  3. Prompt de escritura: pide colindancias y calle completa sin truncar
//  4. Reintentos automáticos con 3 modelos de respaldo

const express    = require('express')
const router     = express.Router()
const multer     = require('multer')
const { GoogleGenAI } = require('@google/genai')
const { verificarToken } = require('../middleware/authMiddleware')

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf','image/jpeg','image/jpg','image/png','image/gif','image/webp']
    ok.includes(file.mimetype) ? cb(null,true) : cb(new Error('Formato no permitido.'))
  },
})

// ── Tipos de documento ───────────────────────────────────────────
const TIPOS_DOCUMENTO = [
  { key:'escritura',      label:'Escritura Pública',        descripcion:'Escritura notarial de compraventa, donación o herencia' },
  { key:'predial',        label:'Recibo / Boleta Predial',  descripcion:'Recibo de pago del impuesto predial municipal' },
  { key:'identificacion', label:'Identificación Oficial',   descripcion:'INE, pasaporte u otra identificación oficial' },
  { key:'plano',          label:'Plano Arquitectónico',     descripcion:'Plano con dimensiones y distribución del inmueble' },
  { key:'catastral',      label:'Cédula Catastral',         descripcion:'Documento catastral del municipio o estado' },
  { key:'levantamiento',  label:'Levantamiento Físico',     descripcion:'Memoria descriptiva o reporte de levantamiento' },
  { key:'titulo',         label:'Título de Propiedad',      descripcion:'Título o certificado de derechos del inmueble' },
  { key:'avaluo_giaval',  label:'Avalúo GIAVAL (propio)',   descripcion:'PDF de un avalúo generado por este sistema' },
  { key:'otro',           label:'Otro documento',           descripcion:'Cualquier otro documento relacionado con el inmueble' },
]

router.get('/tipos-documento', verificarToken, (req, res) => {
  res.json({ tipos: TIPOS_DOCUMENTO })
})

// ── Espera inteligente entre reintentos ──────────────────────────
const esperar = (ms) => new Promise(r => setTimeout(r, ms))

// ── Llamar Gemini con reintentos ─────────────────────────────────
// Tiempos de espera más largos para respetar el límite de 15 req/min
async function llamarGemini({ partes, soloTexto = false }) {
  const modelos = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']
  // Esperas: 5s, 10s, 20s — respeta el rate limit de cuentas gratuitas (15 req/min)
  const esperas = [5000, 10000, 20000]

  for (const modelo of modelos) {
    for (let intento = 1; intento <= 3; intento++) {
      try {
        console.log(`[Gemini] Intentando modelo ${modelo} — intento ${intento}/3`)
        const config = soloTexto
          ? { temperature: 0.1 }
          : { responseMimeType: 'application/json', temperature: 0.1 }

        const response = await ai.models.generateContent({
          model: modelo,
          contents: [{ role:'user', parts: partes }],
          config,
        })
        console.log(`[Gemini] ✓ Respuesta recibida con ${modelo}`)
        return { texto: response.text, modelo }
      } catch (err) {
        const msg = err.message || ''
        // Detectar todos los errores recuperables incluyendo fetch failed
        const recuperable = msg.includes('503')
          || msg.includes('UNAVAILABLE')
          || msg.includes('429')
          || msg.includes('high demand')
          || msg.includes('fetch failed')
          || msg.includes('RESOURCE_EXHAUSTED')
          || msg.includes('quota')
        if (!recuperable) throw err  // 404 u otros: no reintentar
        const pausa = esperas[intento - 1] || 20000
        console.log(`[Gemini] Modelo ${modelo} ocupado. Esperando ${pausa/1000}s...`)
        if (intento < 3) await esperar(pausa)
        else console.log(`[Gemini] Modelo ${modelo} falló 3 veces. Probando siguiente modelo...`)
      }
    }
  }
  throw new Error('Todos los modelos de Gemini están ocupados. Espera 1 minuto e intenta de nuevo.')
}

// ── Prompts por tipo de documento ────────────────────────────────
function construirPrompt(tipoDocumento) {
  const baseInstruccion = `
Eres un experto en valuación inmobiliaria y documentos legales mexicanos.
Analiza el documento adjunto y extrae los datos solicitados.
Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin backticks, sin texto adicional.
Si un dato no está claramente en el documento, omite esa clave (no pongas null ni "").
Números sin unidades (áreas: "90.00" no "90 m²"). Porcentajes sin símbolo ("100" no "100%").
Fechas en formato YYYY-MM-DD. Municipio sin clave numérica ("Orizaba" no "094 - Orizaba").
`

  const camposComunes = `
Campos comunes a extraer si los encuentras:
- municipio: nombre del municipio donde se ubica el INMUEBLE (no domicilio de notario ni comparecientes)
- entidadFederativa: nombre del estado (ej: "Puebla", "Veracruz de Ignacio de la Llave", "Oaxaca")
- codigoPostal: código postal de 5 dígitos
- cuentaPredial: número de cuenta predial o clave catastral
`

  const prompts = {
    escritura: `${baseInstruccion}
El documento es una ESCRITURA PÚBLICA MEXICANA.
${camposComunes}
Extrae además:
- nombrePropietario: nombre completo del COMPRADOR/ADQUIRENTE (quien compra, no quien vende).
  Busca "vende a [NOMBRE], quien compra", "PARTE COMPRADORA", "adquirente".
- nombreSolicitante: igual al nombrePropietario
- calle: nombre COMPLETO de la calle incluyendo abreviaturas y números que formen parte del nombre
  (ej: "AV. PONIENTE 12", "BOULEVARD ADOLFO RUIZ CORTINES", "CALLE TAPACAMINO").
  NO truncar en puntos ni comas que formen parte del nombre de la vía.
  Busca "de la calle NOMBRE y lote", "calle NOMBRE número".
- numeroExterior: número de la CASA/EDIFICIO (no del lote). Busca "número oficial 14", "marcada con el número 14".
- colonia: fraccionamiento o colonia del inmueble. Busca "denominado X actualmente Y" (usar Y).
- manzana: número de manzana
- lote: número de lote del terreno (diferente al número de casa)
- areaTerreno: superficie del TERRENO en m² (número)
- areaConstruccion: superficie construida en m² si la menciona
- regimenPropiedad: "PRIVADA INDIVIDUAL", "CONDOMINIAL", "EJIDAL", o "COMUNAL"
- indiviso: porcentaje de copropiedad si aplica (número)
- numeroEscritura: número del instrumento notarial
- fechaEscritura: fecha de firma en formato YYYY-MM-DD
- notarioNombre: nombre completo del notario que autoriza
- numeroNotario: número de la notaría (convertir texto a número: "catorce" → 14)
- notarioCiudad: ciudad donde está la notaría
- medidas: array de colindancias del inmueble. Busca "AL NORTE.- EN X METROS CON Y", "AL SUR: X m con Y".
  Formato: [{"orientacion":"Norte","distancia":"15.00","colindante":"CALLE TAPACAMINO"}, ...]
  Orientaciones posibles: Norte, Sur, Oriente, Poniente, Noroeste, Noreste, Suroeste, Sureste
`,

    predial: `${baseInstruccion}
El documento es un RECIBO O BOLETA PREDIAL municipal.
${camposComunes}
Extrae además:
- nombrePropietario: nombre del contribuyente
- calle: calle completa del inmueble
- numeroExterior: número exterior
- colonia: colonia del inmueble
- areaTerreno: superficie del terreno en m²
- areaConstruccion: superficie construida en m²
`,

    identificacion: `${baseInstruccion}
El documento es una IDENTIFICACIÓN OFICIAL (INE, pasaporte, cédula profesional).
Extrae:
- nombrePropietario: nombre completo de la persona
- nombreSolicitante: mismo nombre completo
`,

    plano: `${baseInstruccion}
El documento es un PLANO ARQUITECTÓNICO, CROQUIS o memoria descriptiva del inmueble.
${camposComunes}
Extrae además:
- areaTerreno: superficie total del TERRENO en m²
- areaConstruccion: superficie total construida en m²
- areaConstruccionHabitable: superficie habitable o neta en m²
- numNiveles: número de niveles/pisos (número entero 0-5)
- numRecamaras: número de recámaras (número)
- numBanosCompletos: número de baños completos (número)
- estacionamientos: número de cajones de estacionamiento (número)
- tiposConstruccion: tipo de construcción (ej: "Casa Habitación", "Departamento", "Local Comercial")
- topografia: descripción de la topografía (plano, inclinado, irregular, regular, etc.)
- calle: calle donde se ubica el inmueble si aparece
- colonia: colonia si aparece
- medidas: colindancias si aparecen en el plano
  Formato: [{"orientacion":"Norte","distancia":"15.00","colindante":"calle"}]
- descripcionInmueble: DESCRIPCIÓN TÉCNICA COMPLETA del inmueble en mayúsculas, al estilo de un
  avalúo profesional mexicano. Debe incluir:
  1. Uso y topografía del terreno (ej: "TERRENO DE USO HABITACIONAL. TERRENO CON TOPOGRAFÍA PLANA...")
  2. Dimensiones: frente, fondo, superficie total del terreno y superficie de construcción habitable
  3. Descripción del inmueble: tipo, número de niveles
  4. Por cada nivel: nombre y lista de espacios que contiene (sala, comedor, cocina, recámaras, baños, etc.)
  5. Instalaciones especiales: cisterna, tinaco, calentador, etc.
  Ejemplo de formato: "TERRENO DE USO HABITACIONAL. TERRENO CON TOPOGRAFÍA PLANA DE FORMA IRREGULAR,
  CON UN FRENTE DE X.XX METROS Y UN FONDO DE XX.XX METROS CON UNA SUPERFICIE TOTAL DE XXX.XX M2 Y UNA
  SUPERFICIE DE CONSTRUCCIÓN HABITABLE DE XXX.XX M2. DESCRIPCIÓN DEL INMUEBLE: CASA HABITACIÓN RESUELTA
  EN DOS NIVELES. PLANTA BAJA: SALA, COMEDOR, COCINA, BAÑO. PLANTA ALTA: RECÁMARAS, BAÑOS."
  Si no tienes suficiente información del plano, genera la descripción con los datos que sí tienes.
`,

    catastral: `${baseInstruccion}
El documento es una CÉDULA O CERTIFICADO CATASTRAL.
${camposComunes}
Extrae además:
- nombrePropietario: propietario registrado
- calle: calle completa
- numeroExterior: número exterior
- colonia: colonia
- manzana: número de manzana
- lote: número de lote
- areaTerreno: superficie del terreno en m²
- areaConstruccion: superficie construida en m²
- regimenPropiedad: régimen de propiedad
- medidas: colindancias si aparecen
`,

    levantamiento: `${baseInstruccion}
El documento es un LEVANTAMIENTO FÍSICO o memoria descriptiva.
${camposComunes}
Extrae además:
- areaTerreno: superficie del terreno en m²
- areaConstruccion: superficie construida en m²
- areaConstruccionHabitable: área habitable en m²
- numNiveles: número de niveles (entero 0-5)
- topografia: descripción de la topografía
- servidumbre: servidumbres existentes si las menciona
- descripcionInmueble: descripción del inmueble (distribución, materiales, características)
`,

    titulo: `${baseInstruccion}
El documento es un TÍTULO DE PROPIEDAD o certificado de derechos.
${camposComunes}
Extrae además:
- nombrePropietario: nombre del titular
- calle: calle completa
- numeroExterior: número exterior
- colonia: colonia
- areaTerreno: superficie del terreno
- regimenPropiedad: régimen de propiedad
`,

    avaluo_giaval: `${baseInstruccion}
El documento es un AVALÚO GENERADO POR EL SISTEMA GIAVAL.
Extrae todos los datos que encuentres:
- folioInterno: folio formato CLAVE-AG/XXXX-XX
- fechaAvaluo: fecha del avalúo YYYY-MM-DD
- tipoAvaluo: tipo de avalúo
- proposito: propósito del avalúo
- nombreSolicitante: nombre del solicitante
- nombrePropietario: nombre del propietario
- bienQueSeValua: tipo de bien valuado
- regimenPropiedad: régimen
- calle: calle (de la sección "INMUEBLE VALUADO:")
- numeroExterior: número exterior
- colonia: colonia
- municipio: municipio sin clave numérica
- entidadFederativa: estado
- codigoPostal: CP
- latitud: coordenada de latitud (número)
- longitud: coordenada de longitud (número)
- altitud: altitud en msnm
- areaTerreno: área terreno m²
- areaConstruccionHabitable: área construida m²
- indiviso: indiviso %
- notarioNombre: nombre del notario
- numeroNotario: número de notaría
- notarioCiudad: ciudad del notario
- numeroEscritura: número de escritura
- fechaEscritura: fecha escritura YYYY-MM-DD
- topografia: topografía
`,

    otro: `Analiza esta imagen. Puede ser un anuncio inmobiliario o un documento.
Extrae TODOS los datos que puedas ver y responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional.
Devuelve SIEMPRE estas claves (pon 0 si no encuentras el dato numérico, cadena vacía si no encuentras texto):
{
  "oferta": 0,
  "areaConstruccion": 0,
  "areaTerreno": 0,
  "colonia": "",
  "municipio": "",
  "entidadFederativa": "",
  "calle": "",
  "descripcion": "",
  "fuente": "",
  "url": "",
  "informante": "",
  "nombrePropietario": ""
}
Instrucciones CRÍTICAS para cada campo:
- oferta: SI ves un precio (ej: "Venta MN 4,600,000", "$ 4,600,000", "Precio $1,500,000"), escribe ese número entero SIN comas NI símbolos. Ejemplo: si ves "4,600,000" escribe 4600000. SI NO hay precio visible escribe 0.
- areaConstruccion: SI ves metros cuadrados de construcción (ej: "188 m² constr", "188m2 construidos"), escribe solo el número 188. SI NO escribe 0.
- areaTerreno: SI ves metros cuadrados de terreno/lote (ej: "185 m² lote", "185m2 terreno"), escribe solo el número 185. SI NO escribe 0.
- descripcion: SI ves características de la propiedad (recámaras, baños, estacionamientos, antigüedad), resúmelas separadas por coma. Ej: "3 rec, 2 baños, 1 medio baño, 2 estac, 2 años". SI NO escribe cadena vacía.
- fuente: nombre del portal o sitio web donde aparece el anuncio (Inmuebles24, Vivanuncios, etc.)
- Los demás campos se llenan si la imagen es un documento legal (escritura, predial, etc.)
IMPORTANTE: oferta, areaConstruccion, areaTerreno son siempre NÚMEROS, nunca texto con unidades.
`,

    comparable_casa: `Eres un asistente de valuación inmobiliaria.
Analiza esta captura de pantalla de un portal inmobiliario (Inmuebles24, Vivanuncios, metros cúbicos, etc).
Extrae los datos de la CASA EN VENTA y responde ÚNICAMENTE con JSON válido, sin markdown, sin texto adicional.
El JSON debe tener EXACTAMENTE estas claves:
{
  "oferta": 0,
  "areaConstruccion": 0,
  "areaTerreno": 0,
  "colonia": "",
  "municipio": "",
  "descripcion": "",
  "fuente": "",
  "informante": "",
  "url": ""
}
Instrucciones específicas:
- oferta: precio de VENTA como número entero en pesos MXN. Busca texto como "Venta MN 4,600,000", "$ 4,600,000", "Precio: 4600000". Devuelve solo el número, ej: 4600000
- areaConstruccion: metros cuadrados CONSTRUIDOS como número. Busca "m² constr", "m2 constr", "188 m² constr". Devuelve solo el número, ej: 188
- areaTerreno: metros cuadrados de TERRENO/LOTE como número. Busca "m² lote", "m2 lote", "185 m² lote". Devuelve solo el número, ej: 185
- colonia: nombre completo del fraccionamiento y colonia, ej: "Residencial Turquesa, Zibatá"
- municipio: ciudad o municipio, ej: "El Marqués"
- descripcion: lista de características separadas por coma. Incluye: número de recámaras, baños, medio baño, estacionamientos, antigüedad. Ej: "3 rec, 2 baños, 1 medio baño, 2 estac, 2 años"
- fuente: nombre del portal web donde aparece el anuncio
- informante: nombre del agente o inmobiliaria si aparece
- url: URL del anuncio si es visible, de lo contrario cadena vacía
IMPORTANTE: oferta y áreas son números puros sin unidades, símbolos ni texto.`,

    comparable_terreno: `Eres un asistente de valuación inmobiliaria.
Analiza esta captura de pantalla de un portal inmobiliario.
Extrae los datos del TERRENO EN VENTA y responde ÚNICAMENTE con JSON válido, sin markdown, sin texto adicional.
El JSON debe tener EXACTAMENTE estas claves:
{
  "oferta": 0,
  "areaTerreno": 0,
  "colonia": "",
  "municipio": "",
  "descripcion": "",
  "fuente": "",
  "informante": "",
  "url": ""
}
Instrucciones:
- oferta: precio de VENTA como número entero en pesos MXN
- areaTerreno: superficie del terreno en m² como número
- colonia: colonia y fraccionamiento
- municipio: ciudad o municipio
- descripcion: características del terreno (uso de suelo, servicios, topografía, etc.)
- fuente: nombre del portal
- url: URL si visible, sino cadena vacía
IMPORTANTE: números sin unidades ni símbolos.`,

    comparable_rentas: `Eres un asistente de valuación inmobiliaria.
Analiza esta captura de pantalla de un portal inmobiliario.
Extrae los datos de la CASA/DEPTO EN RENTA y responde ÚNICAMENTE con JSON válido, sin markdown, sin texto adicional.
El JSON debe tener EXACTAMENTE estas claves:
{
  "oferta": 0,
  "areaConstruccion": 0,
  "colonia": "",
  "municipio": "",
  "descripcion": "",
  "fuente": "",
  "informante": "",
  "url": ""
}
Instrucciones:
- oferta: renta MENSUAL como número entero en pesos MXN (NO precio de venta)
- areaConstruccion: superficie en m² como número
- colonia: colonia y fraccionamiento
- municipio: ciudad o municipio
- descripcion: características (recámaras, baños, amueblado, etc.)
- fuente: nombre del portal
- url: URL si visible, sino cadena vacía
IMPORTANTE: números sin unidades ni símbolos.`,
  }

  return prompts[tipoDocumento] || prompts.otro
}

// ── POST /api/ocr/leer-documento ────────────────────────────────
router.post('/leer-documento', verificarToken, upload.single('archivo'), async (req, res) => {
  try {
    const { tipoDocumento, promptExtra } = req.body
    const archivo           = req.file

    if (!archivo)       return res.status(400).json({ error: 'No se recibió ningún archivo' })
    if (!tipoDocumento) return res.status(400).json({ error: 'Selecciona el tipo de documento' })
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada' })

    const base64Data = archivo.buffer.toString('base64')
    const mimeType   = archivo.mimetype
    // promptExtra sobreescribe el prompt (usado por Auto Llenar en comparables)
    const prompt = promptExtra ? promptExtra.trim() : construirPrompt(tipoDocumento)

    console.log(`[Gemini OCR] ${tipoDocumento} — ${archivo.originalname} (${(archivo.size/1024).toFixed(0)} KB)`)

    const { texto: textoRespuesta, modelo } = await llamarGemini({
      partes: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Data } }
      ]
    })

    if (!textoRespuesta) {
      return res.status(422).json({ error: 'La IA no devolvió respuesta. El documento puede estar corrupto.' })
    }

    let campos
    try {
      const limpio = textoRespuesta.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'').trim()
      campos = JSON.parse(limpio)
    } catch {
      return res.status(422).json({
        error: 'La respuesta de la IA no es JSON válido. Intenta con otra imagen o verifica que el documento sea legible.',
      })
    }

    // Filtrar claves vacías
    const camposFiltrados = {}
    for (const [k, v] of Object.entries(campos)) {
      // Keep numeric 0 values (oferta could be 0 if not found, but still pass it through)
      // Only filter null, undefined, empty string, 'N/A', 'null', empty arrays
      if (v !== null && v !== undefined && v !== '' && v !== 'N/A' && v !== 'null'
          && !(Array.isArray(v) && v.length === 0)) {
        camposFiltrados[k] = v
      } else if (typeof v === 'number') {
        // Always include numeric values, even 0
        camposFiltrados[k] = v
      }
    }
    // Nota: los campos tipo array (ej: medidas) se aplican correctamente al form
    // pero se muestran como "[objeto]" en resúmenes de texto — eso es normal

    const totalCampos = Object.keys(camposFiltrados).length
    console.log(`[Gemini OCR] ✓ ${totalCampos} campos extraídos con ${modelo}`)

    return res.json({
      ok: true,
      campos: camposFiltrados,
      totalCampos,
      metodo: 'gemini_ia',
      advertencias: totalCampos === 0
        ? ['No se encontraron campos. Verifica que el tipo de documento sea correcto.'] : [],
    })

  } catch (err) {
    console.error('[Gemini OCR Error]', err.message)
    if (err.message?.includes('API_KEY') || err.message?.includes('API key'))
      return res.status(401).json({ error: 'Clave GEMINI_API_KEY inválida.' })
    if (err.message?.includes('503') || err.message?.includes('UNAVAILABLE') || err.message?.includes('ocupados'))
      return res.status(503).json({ error: 'Gemini está saturado. Espera 30 segundos e intenta de nuevo.' })
    if (err.message?.includes('SAFETY'))
      return res.status(422).json({ error: 'El documento fue bloqueado por filtros de seguridad de Gemini.' })
    return res.status(500).json({ error: 'Error al procesar el documento', detalle: err.message })
  }
})

// ── POST /api/ocr/coordenadas ────────────────────────────────────
// Obtiene latitud, longitud y altitud a partir de una dirección usando Gemini
router.post('/coordenadas', verificarToken, async (req, res) => {
  try {
    const { calle, numeroExterior, colonia, municipio, entidadFederativa, codigoPostal } = req.body

    const partesDireccion = [
      calle, numeroExterior, colonia, municipio, entidadFederativa, codigoPostal, 'México'
    ].filter(Boolean)

    if (partesDireccion.length < 2) {
      return res.status(400).json({ error: 'Se necesita al menos calle y municipio para geocodificar.' })
    }

    const direccionCompleta = partesDireccion.join(', ')

    const prompt = `Eres un sistema de geocodificación para México.
Dada la siguiente dirección: "${direccionCompleta}"
Devuelve ÚNICAMENTE un objeto JSON válido con las coordenadas geográficas más precisas posibles.
Usa tu conocimiento geográfico de México para estimar las coordenadas.
Si la dirección es de una ciudad conocida, devuelve coordenadas del área correspondiente.

Formato exacto de respuesta (solo JSON, sin markdown):
{
  "latitud": 18.853500,
  "longitud": -97.094600,
  "altitud": "1220 msnm",
  "precision": "municipio",
  "nota": "descripción breve de la ubicación"
}

- latitud: número decimal (negativo si es sur del ecuador, todos en México son positivos ~14-32)
- longitud: número decimal NEGATIVO (México está al oeste del meridiano cero, rango -86 a -118)
- altitud: texto con valor aproximado y unidad "msnm" (ej: "1640 msnm")
- precision: "exacta", "colonia", "municipio" o "ciudad" según qué tan precisa es
- nota: dónde se ubica aproximadamente

IMPORTANTE: La longitud en México siempre es NEGATIVA (entre -86 y -118).
`

    console.log(`[Gemini Coords] Geocodificando: ${direccionCompleta}`)

    const { texto, modelo } = await llamarGemini({ partes: [{ text: prompt }] })

    if (!texto) return res.status(422).json({ error: 'Gemini no devolvió coordenadas.' })

    let coords
    try {
      const limpio = texto.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'').trim()
      coords = JSON.parse(limpio)
    } catch {
      return res.status(422).json({
        error: 'No se pudieron obtener coordenadas para esta dirección. Ingrésalas manualmente desde Google Maps.'
      })
    }

    // Validar rangos de México
    const lat  = parseFloat(coords.latitud)
    const lon  = parseFloat(coords.longitud)
    if (isNaN(lat) || isNaN(lon) || lat < 14 || lat > 33 || lon > -86 || lon < -119) {
      return res.status(422).json({
        error: 'Las coordenadas devueltas están fuera del rango de México. Verifica la dirección.'
      })
    }

    console.log(`[Gemini Coords] ✓ ${lat}, ${lon} con ${modelo}`)

    return res.json({
      ok:        true,
      latitud:   lat.toFixed(6),
      longitud:  lon.toFixed(6),
      altitud:   coords.altitud || null,
      precision: coords.precision || 'municipio',
      nota:      coords.nota || '',
      modelo,
    })

  } catch (err) {
    console.error('[Gemini Coords Error]', err.message)
    if (err.message?.includes('503') || err.message?.includes('UNAVAILABLE') || err.message?.includes('ocupados'))
      return res.status(503).json({ error: 'Gemini está saturado. Intenta en unos segundos.' })
    return res.status(500).json({ error: 'Error al obtener coordenadas', detalle: err.message })
  }
})

module.exports = router