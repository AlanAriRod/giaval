
// backend/src/routes/mapRoutes.js
// Genera un mapa estático ensamblando tiles de OpenStreetMap.
// No depende de ningún proveedor externo de mapa estático.
// Requiere: npm install --prefix backend sharp
 
const router = require('express').Router()
const https  = require('https')
const http   = require('http')
const { verificarToken } = require('../middleware/authMiddleware')
 
// ── Helpers de conversión coordenadas → tile ──────────────────
function lon2tile(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom))
}
function lat2tile(lat, zoom) {
  return Math.floor(
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI)
    / 2 * Math.pow(2, zoom)
  )
}
function tile2lon(x, zoom) {
  return x / Math.pow(2, zoom) * 360 - 180
}
function tile2lat(y, zoom) {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom)
  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}
 
// ── Descarga un tile como Buffer ──────────────────────────────
function descargarTile(x, y, z) {
  return new Promise((resolve, reject) => {
    // Usa subdominio aleatorio a/b/c para distribuir carga
    const sub = ['a','b','c'][Math.floor(Math.random() * 3)]
    const url = `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`
    https.get(url, {
      headers: {
        'User-Agent': 'GIAVAL-Valuacion/1.0 (sistema de avaluos inmobiliarios)',
        'Accept': 'image/png',
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Tile HTTP ${res.statusCode}`))
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}
 
// ── Dibuja un marcador rojo sobre el buffer de la imagen ──────
async function dibujarMarcador(sharp, imgBuf, px, py, imgW, imgH) {
  // Marcador SVG: círculo rojo con borde blanco
  const markerSize = 24
  const mx = Math.round(px - markerSize / 2)
  const my = Math.round(py - markerSize)
  const marker = Buffer.from(`
    <svg width="${markerSize}" height="${markerSize}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${markerSize/2}" cy="${markerSize/2}" r="${markerSize/2 - 2}"
        fill="#e53e3e" stroke="white" stroke-width="2.5"/>
      <circle cx="${markerSize/2}" cy="${markerSize/2}" r="4"
        fill="white"/>
    </svg>
  `)
  return sharp(imgBuf)
    .composite([{
      input: marker,
      top:  Math.max(0, Math.min(my, imgH - markerSize)),
      left: Math.max(0, Math.min(mx, imgW - markerSize)),
    }])
    .png()
    .toBuffer()
}
 
// ── GET /api/mapa/estatico ────────────────────────────────────
router.get('/estatico', verificarToken, async (req, res) => {
  const { lat, lon, zoom = 15, tilesX = 3, tilesY = 3 } = req.query
 
  if (!lat || !lon || isNaN(+lat) || isNaN(+lon)) {
    return res.status(400).json({ error: 'Se requieren lat y lon válidos.' })
  }
 
  const z  = Math.min(18, Math.max(1, parseInt(zoom)))
  const nx = parseInt(tilesX) || 3   // tiles horizontales (impar para centrar)
  const ny = parseInt(tilesY) || 3   // tiles verticales
 
  // Tile central
  const cx = lon2tile(+lon, z)
  const cy = lat2tile(+lat, z)
 
  // Rango de tiles a descargar
  const x0 = cx - Math.floor(nx / 2)
  const y0 = cy - Math.floor(ny / 2)
 
  try {
    let sharp
    try {
      sharp = require('sharp')
    } catch {
      // Si sharp no está instalado, intenta con el proveedor alternativo
      throw new Error('sharp_not_installed')
    }
 
    const TILE_SIZE = 256
    const imgW = nx * TILE_SIZE
    const imgH = ny * TILE_SIZE
 
    // Descargar todos los tiles en paralelo
    const downloads = []
    for (let dy = 0; dy < ny; dy++) {
      for (let dx = 0; dx < nx; dx++) {
        downloads.push(
          descargarTile(x0 + dx, y0 + dy, z)
            .then(buf => ({ buf, dx, dy }))
            .catch(() => ({ buf: null, dx, dy }))
        )
      }
    }
    const tiles = await Promise.all(downloads)
 
    // Ensamblar imagen base transparente
    const composites = tiles
      .filter(t => t.buf)
      .map(({ buf, dx, dy }) => ({
        input: buf,
        top:  dy * TILE_SIZE,
        left: dx * TILE_SIZE,
      }))
 
    // Calcular posición del marcador en píxeles
    const lonTile0 = tile2lon(x0, z)
    const latTile0 = tile2lat(y0, z)
    const lonTile1 = tile2lon(x0 + nx, z)
    const latTile1 = tile2lat(y0 + ny, z)
 
    const px = (( +lon - lonTile0) / (lonTile1 - lonTile0)) * imgW
    const py = (( +lat - latTile0) / (latTile1 - latTile0)) * imgH
 
    // Crear imagen base blanca y componer tiles
    let imgBuf = await sharp({
      create: { width: imgW, height: imgH, channels: 4,
                 background: { r: 240, g: 240, b: 240, alpha: 1 } }
    }).composite(composites).png().toBuffer()
 
    // Dibujar marcador
    imgBuf = await dibujarMarcador(sharp, imgBuf, px, py, imgW, imgH)
 
    // Convertir a base64 y devolver
    const base64 = `data:image/png;base64,${imgBuf.toString('base64')}`
    return res.json({ ok: true, imagen: base64 })
 
  } catch (err) {
    if (err.message === 'sharp_not_installed') {
      console.warn('[mapa] sharp no instalado — usar: npm install --prefix backend sharp')
      return res.status(503).json({
        error: 'Módulo sharp no instalado. Ejecuta: npm install --prefix backend sharp',
        code: 'SHARP_MISSING'
      })
    }
    console.error('[mapa] Error ensamblando mapa:', err.message)
    return res.status(502).json({ error: 'No se pudo generar la imagen del mapa.' })
  }
})
 
module.exports = router