// backend/src/routes/ai.js — v3
// FIX: eliminado Pool de pg que causaba SASL error al arrancar
// El cache en BD es funcionalidad futura — por ahora devuelve comparables directamente
const express = require('express')
const router  = express.Router()
const { GoogleGenAI } = require('@google/genai')
const { verificarToken } = require('../middleware/authMiddleware')

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// ── Espera inteligente entre reintentos ──────────────────────────
const esperar = (ms) => new Promise(r => setTimeout(r, ms))

// ── Llamar a Gemini con reintentos y modelos de respaldo ─────────
// Tiempos de espera más largos para respetar el límite de 15 req/min
async function llamarGemini(prompt) {
  const modelos = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']
  // Esperas entre reintentos: 5s, 10s, 20s (respeta rate limit de plan gratuito)
  const esperas = [5000, 10000, 20000]

  for (const modelo of modelos) {
    for (let intento = 1; intento <= 3; intento++) {
      try {
        console.log(`[AI] Modelo ${modelo} — intento ${intento}`)
        const response = await ai.models.generateContent({
          model: modelo,
          contents: [{ role:'user', parts:[{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          }
        })
        console.log(`[AI] ✓ Respuesta con ${modelo}`)
        return { texto: response.text, modelo }
      } catch (err) {
        const msg = err.message || ''
        // fetch failed = red caída o timeout, también reintentable
        const recuperable = msg.includes('503')
          || msg.includes('UNAVAILABLE')
          || msg.includes('429')
          || msg.includes('high demand')
          || msg.includes('fetch failed')
          || msg.includes('RESOURCE_EXHAUSTED')
          || msg.includes('quota')
        if (!recuperable) throw err  // error no recuperable (ej: 404)
        const pausa = esperas[intento - 1] || 20000
        console.log(`[AI] ${modelo} ocupado (intento ${intento}/3). Esperando ${pausa/1000}s...`)
        if (intento < 3) await esperar(pausa)
        else console.log(`[AI] ${modelo} falló 3 veces, probando siguiente modelo...`)
      }
    }
  }
  throw new Error('Todos los modelos de Gemini están ocupados. Espera 1 minuto e intenta de nuevo.')
}

// ── Prompts por tipo ─────────────────────────────────────────────
function construirPrompt(tipo, datos) {
  const { municipio, colonia, areaTerreno, areaConstruccion, bienQueSeValua } = datos
  // Limpiar el prefijo "30 - " que viene del select de estados del formulario
  const entidadFederativa = (datos.entidadFederativa || '').replace(/^\d+\s*-\s*/, '').trim()
  // Limpiar el prefijo "094 - " que puede venir del select de municipios de Veracruz
  const municipioLimpio = (municipio || '').replace(/^\d+\s*-\s*/, '').trim()
  const zona = [colonia, municipioLimpio, entidadFederativa].filter(Boolean).join(', ')
  // Estado real del inmueble (puede ser cualquier estado de México)
  const estado = entidadFederativa || 'México'
  const municipioRef = municipioLimpio || colonia || estado

  const instrBase = `
Eres un perito valuador inmobiliario con amplio conocimiento del mercado inmobiliario
en México. Conoces precios actuales de propiedades en todos los estados y municipios
del país, incluyendo ${estado}.

Zona del inmueble sujeto: ${zona || estado}
${areaTerreno      ? `Área de terreno de referencia: ${areaTerreno} m²` : ''}
${areaConstruccion ? `Área construida de referencia: ${areaConstruccion} m²` : ''}
${bienQueSeValua   ? `Tipo de inmueble: ${bienQueSeValua}` : ''}

Devuelve ÚNICAMENTE un array JSON válido. Sin texto adicional, sin markdown, sin backticks.
Los precios deben ser realistas para el mercado actual de ${municipioRef}, ${estado} (pesos mexicanos 2024-2025).
IMPORTANTE: Los comparables deben ser de ${municipioRef} y zonas cercanas dentro de ${estado}.
NO uses precios ni ubicaciones de otros estados.
Si no tienes datos exactos de esa colonia, usa colonias o municipios cercanos DENTRO de ${estado}.
Incluye entre 4 y 6 comparables variados en precio y características.
`

  if (tipo === 'casa') {
    return `${instrBase}
Genera comparables de CASAS EN VENTA en ${municipioRef}, ${estado} o zonas muy cercanas.
Cada objeto del array debe tener exactamente estas claves:
[
  {
    "ciudad": "nombre del municipio o ciudad dentro de ${estado}",
    "colonia": "nombre de la colonia o fraccionamiento",
    "oferta": 1500000,
    "supConst": 120.5,
    "descripcion": "Casa 3 rec, 2 baños, 2 niveles, buena conservación",
    "fuente": "Inmuebles24 / Vivanuncios / metros cúbicos",
    "url": "",
    "telefono": "",
    "informante": "Portal inmobiliario"
  }
]
- oferta: precio de venta en pesos MXN (número entero, sin símbolo $)
- supConst: superficie construida en m² (número con decimales)
- Varía las superficies entre 80 m² y 250 m² aproximadamente
- Los precios deben ser coherentes con el mercado de ${municipioRef}, ${estado}
- Todas las ciudades deben ser de ${estado} o muy cercanas a ${municipioRef}
- PROHIBIDO usar ciudades de Veracruz si el estado es otro
- NO inventes ni generes URLs falsas. El campo url debe ser "" (cadena vacía) siempre
- El campo fuente indica de qué portal proviene la estimación (ej: "Estimado Inmuebles24")
`
  }

  if (tipo === 'terreno') {
    return `${instrBase}
Genera comparables de TERRENOS URBANOS EN VENTA en ${municipioRef}, ${estado} o zonas muy cercanas.
Cada objeto del array debe tener exactamente estas claves:
[
  {
    "ciudad": "nombre del municipio o ciudad dentro de ${estado}",
    "colonia": "nombre de la colonia o fraccionamiento",
    "oferta": 800000,
    "supM2": 200.0,
    "descripcion": "Terreno plano, servicios completos, zona habitacional",
    "fuente": "Inmuebles24 / Vivanuncios / metros cúbicos",
    "url": "",
    "telefono": "",
    "informante": "Portal inmobiliario"
  }
]
- oferta: precio de venta en pesos MXN (número entero)
- supM2: superficie del terreno en m² (número con decimales)
- Los precios por m² deben ser realistas para ${municipioRef}, ${estado} (zona urbana)
- Todas las ciudades deben ser de ${estado} o muy cercanas a ${municipioRef}
`
  }

  if (tipo === 'rentas') {
    return `${instrBase}
Genera comparables de CASAS O DEPARTAMENTOS EN RENTA MENSUAL en ${municipioRef}, ${estado}.
Cada objeto del array debe tener exactamente estas claves:
[
  {
    "ciudad": "nombre del municipio o ciudad dentro de ${estado}",
    "colonia": "nombre de la colonia o fraccionamiento",
    "oferta": 8000,
    "supM2": 120.0,
    "descripcion": "Casa 3 rec, 2 baños, cocina integral, estacionamiento",
    "fuente": "Inmuebles24 / Vivanuncios / metros cúbicos",
    "url": "",
    "telefono": "",
    "informante": "Portal inmobiliario"
  }
]
- oferta: renta MENSUAL en pesos MXN (número entero)
- supM2: superficie en m² (número con decimales)
- Todas las ciudades deben ser de ${estado} o muy cercanas a ${municipioRef}
`
  }

  return instrBase
}



// ── POST /api/ai/buscar-comparables ─────────────────────────────
router.post('/buscar-comparables', verificarToken, async (req, res) => {
  try {
    const { tipo, municipio, colonia, entidadFederativa,
            areaTerreno, areaConstruccion, bienQueSeValua } = req.body

    if (!tipo || !['casa','terreno','rentas'].includes(tipo)) {
      return res.status(400).json({ error: 'tipo debe ser: casa, terreno o rentas' })
    }
    if (!municipio && !colonia) {
      return res.status(400).json({
        error: 'Se requiere al menos Municipio o Colonia. Llena esos campos en Datos Generales primero.'
      })
    }

    const prompt = construirPrompt(tipo, {
      municipio, colonia, entidadFederativa,
      areaTerreno, areaConstruccion, bienQueSeValua
    })

    // Limpiar prefijos numéricos del select antes de usar
    const municipioClean = (municipio||'').replace(/^\d+\s*-\s*/,'').trim()
    const estadoClean    = (entidadFederativa||'').replace(/^\d+\s*-\s*/,'').trim()
    console.log(`[AI] Buscando comparables de ${tipo} en ${[colonia,municipioClean,estadoClean].filter(Boolean).join(', ')}`)

    const { texto, modelo } = await llamarGemini(prompt)

    // Parsear respuesta JSON
    let comparables
    try {
      const limpio = texto
        .replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'').trim()
      const parsed = JSON.parse(limpio)
      comparables = Array.isArray(parsed) ? parsed : parsed.comparables || parsed.resultados || []
    } catch {
      const match = texto.match(/\[[\s\S]*\]/)
      if (!match) {
        return res.status(422).json({
          error: 'Gemini no devolvió datos en formato válido. Intenta de nuevo.'
        })
      }
      comparables = JSON.parse(match[0])
    }

    if (!comparables?.length) {
      return res.status(422).json({ error: 'No se generaron comparables. Intenta de nuevo.' })
    }

    // Limpiar y validar
    const supKey = tipo === 'casa' ? 'supConst' : 'supM2'
    const limpios = comparables
      .filter(c => c.oferta && c[supKey])
      .map(c => ({
        ciudad:      String(c.ciudad      || municipio || ''),
        colonia:     String(c.colonia     || colonia   || ''),
        oferta:      parseFloat(String(c.oferta).replace(/[,$\s]/g,'')),
        [supKey]:    parseFloat(String(c[supKey]).replace(/[,$\s]/g,'')),
        descripcion: String(c.descripcion || ''),
        fuente:      String(c.fuente      || 'Gemini IA'),
        url:         c.url         || '',
        telefono:    c.telefono    || '',
        informante:  c.informante  || c.fuente || 'Gemini IA',
        factores:    {},
      }))
      .filter(c => c.oferta > 0 && c[supKey] > 0)

    if (!limpios.length) {
      return res.status(422).json({
        error: 'Los comparables no tienen datos válidos de precio y superficie.'
      })
    }

    const zona = [colonia, municipio, entidadFederativa].filter(Boolean).join(', ')
    console.log(`[AI] ✓ ${limpios.length} comparables de ${tipo} con ${modelo}`)

    return res.json({
      ok:          true,
      comparables: limpios,
      total:       limpios.length,
      modelo,
      zona,
      mensaje:     `${limpios.length} comparables de ${tipo} para ${zona}`,
    })

  } catch (err) {
    console.error('[AI Error]', err.message)
    if (err.message?.includes('ocupados') || err.message?.includes('503') || err.message?.includes('UNAVAILABLE')) {
      return res.status(503).json({ error: 'Gemini está saturado. Espera 30 segundos e intenta de nuevo.' })
    }
    if (err.message?.includes('API_KEY') || err.message?.includes('API key')) {
      return res.status(401).json({ error: 'Clave GEMINI_API_KEY inválida o no configurada.' })
    }
    return res.status(500).json({ error: 'Error al generar comparables', detalle: err.message })
  }
})

// ── GET /api/ai/comparables-cache (placeholder) ─────────────────
router.get('/comparables-cache', verificarToken, (req, res) => {
  res.json({ comparables: [], mensaje: 'Cache en BD disponible en versión futura' })
})

// ── DELETE /api/ai/comparables-cache/:id (placeholder) ──────────
router.delete('/comparables-cache/:id', verificarToken, (req, res) => {
  res.json({ ok: true })
})

module.exports = router