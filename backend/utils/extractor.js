// backend/utils/extractor.js — v4
// CAMBIOS v4:
//  1. extraerCalle: no corta en coma/punto si el nombre la incluye (AV. PONIENTE 12 → completo)
//  2. extraerColindancias: nueva función para escrituras
//  3. Caso escritura: agrega medidas/colindancias al resultado
//  4. Coordenadas: nuevo campo extraído si Gemini las devuelve en el JSON (pasado directamente desde ocr.js)

function limpiarTexto(texto) {
  return texto.replace(/\r\n/g,'\n').replace(/\r/g,'\n')
    .replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n')
    .replace(/-{10,}/g,' ').trim()
}

function normalizar(str) {
  return (str||'').toUpperCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9\s]/g,' ')
    .replace(/\s+/g,' ').trim()
}

// ── Convierte palabras a números ─────────────────────────────────
const NUM_PALABRAS = {
  'cero':0,'uno':1,'una':1,'dos':2,'tres':3,'cuatro':4,'cinco':5,
  'seis':6,'siete':7,'ocho':8,'nueve':9,'diez':10,'once':11,'doce':12,
  'trece':13,'catorce':14,'quince':15,'dieciseis':16,'diecisiete':17,
  'dieciocho':18,'diecinueve':19,'veinte':20,'veintiuno':21,
  'veintidos':22,'veintitres':23,'veinticuatro':24,'veinticinco':25,
  'veintiseis':26,'veintisiete':27,'veintiocho':28,'veintinueve':29,
  'treinta':30,'cuarenta':40,'cincuenta':50,'sesenta':60,
  'setenta':70,'ochenta':80,'noventa':90,'cien':100,'ciento':100,
  'doscientos':200,'trescientos':300,'cuatrocientos':400,'quinientos':500,
  'seiscientos':600,'setecientos':700,'ochocientos':800,'novecientos':900,
  'mil':1000,
}
function palabraANumero(texto) {
  const norm=(texto||'').toLowerCase().trim()
  if(NUM_PALABRAS[norm]!==undefined) return NUM_PALABRAS[norm]
  let total=0,parcial=0
  for(const p of norm.split(/\s+y?\s*/)){
    const v=NUM_PALABRAS[p]; if(v===undefined) return null
    if(v>=100){parcial=parcial===0?v:parcial*v;total+=parcial;parcial=0}
    else parcial+=v
  }
  const r=total+parcial; return r>0?r:null
}

// ── Detecta PDF de GIAVAL ────────────────────────────────────────
function esAvaluoGIAVAL(texto) {
  return /GIAVAL|GRUPO INMOBILIARIO DE AVALU/i.test(texto)
    && /AVALU[ÚU]O COMERCIAL|CLAVE-AG\//i.test(texto)
}

// ── Extractor específico para PDFs de GIAVAL ────────────────────
function extraerCamposGIAVAL(texto) {
  const campos = {}
  const folio = texto.match(/CLAVE-AG\/[\w\-\/]+/i)
  if(folio) campos.folioInterno = folio[0]
  const fecha = texto.match(/Fecha:\s*(20\d{2}-\d{2}-\d{2})/i)
  if(fecha) campos.fechaAvaluo = fecha[1]
  const tipo = texto.match(/Tipo de Avalúo:\s*(.+?)(?:\n|$)/i)
  if(tipo) campos.tipoAvaluo = tipo[1].trim()
  const proposito = texto.match(/Propósito:\s*(.+?)(?:\n|$)/i)
  if(proposito) campos.proposito = proposito[1].trim()
  const solicitante = texto.match(/Solicitante:\s*(.+?)(?:\n|$)/i)
  if(solicitante) campos.nombreSolicitante = solicitante[1].trim()
  const propietario = texto.match(/Propietario:\s*(.+?)(?:\n|$)/i)
  if(propietario) campos.nombrePropietario = propietario[1].trim()
  const bien = texto.match(/Bien Valuado:\s*(.+?)(?:\n|$)/i)
  if(bien) campos.bienQueSeValua = bien[1].trim()
  const regimen = texto.match(/Régimen:\s*(.+?)(?:\n|$)/i)
  if(regimen){
    const r=regimen[1].trim()
    if(/privad/i.test(r)) campos.regimenPropiedad='PRIVADA INDIVIDUAL'
    else if(/condom/i.test(r)) campos.regimenPropiedad='CONDOMINIAL'
    else if(/ejid/i.test(r)) campos.regimenPropiedad='EJIDAL'
    else campos.regimenPropiedad=r
  }
  const inmueble = texto.match(/INMUEBLE VALUADO:\s*(.+?)(?:\n|Coordenadas)/i)
  if(inmueble){
    const partes=inmueble[1].split(',').map(p=>p.trim()).filter(Boolean)
    if(partes.length>=1) campos.calle=partes[0]
    if(partes.length>=2) campos.numeroExterior=partes[1].replace(/[^\w\s]/g,'').trim()
    if(partes.length>=3) campos.colonia=partes[2]
    const munPart=partes.find(p=>/\d+ - /.test(p)&&!/Veracruz de/.test(p))
    if(munPart) campos.municipio=munPart.replace(/^\d+\s*-\s*/,'').trim()
    const estPart=partes.find(p=>/veracruz/i.test(p)||/\d+ - /.test(p)&&/ignacio|llave/i.test(p))
    if(estPart) campos.entidadFederativa=estPart.replace(/^\d+\s*-\s*/,'').trim()
  }
  const coords=texto.match(/Coordenadas:\s*([\d\.\-]+)\s*,\s*([\d\.\-]+)/i)
  if(coords){campos.latitud=coords[1];campos.longitud=coords[2]}
  const alt=texto.match(/Altitud:\s*([\d\.]+)\s*msnm/i)
  if(alt) campos.altitud=alt[1]+' msnm'
  const areaT=texto.match(/[AÁ]rea(?:\s+de)?\s+Terreno:\s*([\d,\.]+)\s*m/i)
  if(areaT) campos.areaTerreno=areaT[1].replace(',','.')
  const areaC=texto.match(/[AÁ]rea\s+Constr\.\s+Habitable:\s*([\d,\.]+)\s*m/i)
  if(areaC) campos.areaConstruccionHabitable=areaC[1].replace(',','.')
  const indiviso=texto.match(/Indiviso:\s*([\d,\.]+)\s*%/i)
  if(indiviso) campos.indiviso=indiviso[1]
  const notario=texto.match(/Notario P[uú]blico:\s*(.+?)(?:\s+Número|$)/i)
  if(notario) campos.notarioNombre=notario[1].trim()
  const numNot=texto.match(/N[uú]mero de Notar[ií]a:\s*(\d+)/i)
  if(numNot) campos.numeroNotario=numNot[1]
  const ciudadNot=texto.match(/Ciudad:\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\n|Núm)/i)
  if(ciudadNot) campos.notarioCiudad=ciudadNot[1].trim()
  const numEsc=texto.match(/N[uú]m\.\s+Escritura:\s*(\d+)/i)
  if(numEsc) campos.numeroEscritura=numEsc[1]
  const fechaEsc=texto.match(/Fecha Escritura:\s*(20\d{2}-\d{2}-\d{2})/i)
  if(fechaEsc) campos.fechaEscritura=fechaEsc[1]
  const topo=texto.match(/Topograf[ií]a:\s*(.+?)(?:\s+N[uú]m\.|$)/i)
  if(topo) campos.topografia=topo[1].trim()
  return campos
}

// ── Municipios de Veracruz ───────────────────────────────────────
const MUNICIPIOS_VER = [
  'Acajete','Acatlán','Acayucan','Actopan','Acultzingo','Álamo Temapache',
  'Alpatláhuac','Altotonga','Alvarado','Amatlán de los Reyes',
  'Ángel R. Cabada','Atzalan','Banderilla','Boca del Río','Calcahualco',
  'Camerino Z. Mendoza','Carlos A. Carrillo','Catemaco','Cazones de Herrera',
  'Cerro Azul','Coatepec','Coatzacoalcos','Córdoba','Cosamaloapan',
  'Coscomatepec','Cuitláhuac','Emiliano Zapata','Espinal','Fortín',
  'Gutiérrez Zamora','Hidalgotitlán','Huatusco','Huayacocotla',
  'Hueyapan de Ocampo','Huiloapan','Isla','Jalacingo','Jáltipan','Jamapa',
  'Jesús Carranza','Jilotepec','Juan Rodríguez Clara','Martínez de la Torre',
  'Misantla','Naolinco','Nautla','Nogales','Oluta','Omealca',
  'Orizaba','Papantla','Paso de Ovejas','Paso del Macho','Perote',
  'Platón Sánchez','Playa Vicente','Poza Rica','Pueblo Viejo',
  'Rafael Delgado','Río Blanco','Saltabarranca','San Andrés Tuxtla',
  'Santiago Tuxtla','Sayula de Alemán','Soconusco','Soledad de Doblado',
  'Soteapan','Tamiahua','Tampico Alto','Tantoyuca','Tecolutla','Tehuipango',
  'Tempoal','Teocelo','Tezonapa','Tierra Blanca','Tihuatlán','Tlacotalpan',
  'Tlapacoyan','Totutla','Túxpam','Tuxtilla','Ursulo Galván','Uxpanapa',
  'Vega de Alatorre','Veracruz','Villa Aldama','Xalapa','Xico','Yanga',
  'Yecuatla','Zacualpan','Zongolica','Zozocolco de Hidalgo',
]

function extraerMunicipio(texto) {
  const conteo={}
  const regex=/(?:municipio\s+de\s+|del\s+municipio\s+de\s+)([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,30}?)(?:\s*[,.\n]|$)/gi
  let match
  while((match=regex.exec(texto))!==null){
    const nombre=match[1].trim()
    for(const mun of MUNICIPIOS_VER){
      if(normalizar(nombre).includes(normalizar(mun))||normalizar(mun).includes(normalizar(nombre))){
        conteo[mun]=(conteo[mun]||0)+1; break
      }
    }
  }
  if(!Object.keys(conteo).length) return null
  return Object.entries(conteo).sort((a,b)=>b[1]-a[1])[0][0]
}

function extraerEstado(texto) {
  if(/veracruz\s+de\s+ignacio/i.test(texto)) return 'Veracruz de Ignacio de la Llave'
  if(/estado\s+de\s+veracruz/i.test(texto)) return 'Veracruz de Ignacio de la Llave'
  // Detectar otros estados
  const estados = [
    'Aguascalientes','Baja California','Baja California Sur','Campeche',
    'Chiapas','Chihuahua','Ciudad de México','Coahuila','Colima','Durango',
    'Estado de México','Guanajuato','Guerrero','Hidalgo','Jalisco',
    'Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla',
    'Querétaro','Quintana Roo','San Luis Potosí','Sinaloa','Sonora',
    'Tabasco','Tamaulipas','Tlaxcala','Yucatán','Zacatecas',
  ]
  for(const est of estados){
    if(new RegExp(normalizar(est).replace(/\s+/g,'\\s*'),'i').test(normalizar(texto))){
      return est
    }
  }
  const m=texto.match(/estado\s+de\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s]{4,25}?)(?:\s*[,.\n])/i)
  return m?m[1].trim():null
}

// ── CALLE: ahora captura nombre completo incluyendo abreviaturas ─
// FIX: AV. PONIENTE 12 no se corta en el punto de AV.
function extraerCalle(texto) {
  const textoFiltrado = texto
    .replace(/v[ií]as?\s+de\s+acceso[^\n]*/gi,'')
    .replace(/inmueble\s+valuado[^\n]*/gi,'')

  const patrones = [
    // "de la calle AV. PONIENTE 12 y lote"  — captura nombre completo hasta " y lote" o número exterior explícito
    /de\s+la\s+calle\s+((?:av\.?|avenida|blvd\.?|boulevard|priv\.?|privada|calle|callejón)?\s*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s\.\-0-9]{2,50}?)(?:\s+y\s+lote|\s+número\s+\d|\s+lote\s+\d|\s*\n)/i,
    // "calle AV. PONIENTE," — admite puntos en el nombre
    /\bcalle\s+((?:av\.?|avenida|blvd\.?|priv\.?|callejón)?\s*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\.\-\s0-9]{2,50}?)(?:\s+número\s+\d|\s+\d{1,4}\s*[,\n]|\s*\n)/i,
    /en\s+la\s+calle\s+(?:de\s+)?([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\.\-\s]{2,50}?)(?:\s*[,\n]|\s+número)/i,
  ]
  for(const p of patrones){
    const m=textoFiltrado.match(p)
    if(m){
      let val=m[1].trim()
      // Limpiar número al final que sea el número exterior, no parte del nombre
      val=val.replace(/\s+\d+\s*$/, '').trim()
      const excluir=['LA','EL','LOS','LAS','DEL','DE','EN','CON','POR','PARA','QUE','CA','SUR','NORTE']
      if(!excluir.includes(normalizar(val))&&val.length>2) return val
    }
  }
  return null
}

function extraerNumeroExterior(texto) {
  const patrones = [
    /casa\s+(?:habitaci[oó]n\s+)?(?:marcada\s+con\s+el\s+)?n[uú]mero\s+(?:oficial\s+)?(\d+)\s*(?:\([^)]+\))?\s*,?\s*de\s+la\s+calle/i,
    /n[uú]mero\s+oficial\s+(\d+)(?!\s*[.,]\s*\d)/i,
    /n[uú]mero\s+(\d+)\s*\([^)]+\)\s*,\s*de\s+la\s+calle/i,
    /con\s+el\s+n[uú]mero\s+(\d+)(?!\s*[.,]\s*\d)\s*,?\s*de\s+la\s+calle/i,
  ]
  for(const p of patrones){
    const m=texto.match(p)
    if(m&&!m[1].includes('.')) return m[1]
  }
  return null
}

function extraerLote(texto) {
  for(const p of [/lote\s+de\s+terreno\s+n[uú]mero\s+(\d+)/i,/lote\s+n[uú]mero\s+(\d+)/i,/\blote\s+(\d+)\s*\([^)]+\)\s*(?:de\s+la\s+)?manzana/i]){
    const m=texto.match(p); if(m) return m[1]
  }
  return null
}

function extraerManzana(texto) {
  for(const p of [/de\s+la\s+manzana\s+(\d+)/i,/manzana\s+(\d+)/i,/mza\.?\s*(\d+)/i]){
    const m=texto.match(p); if(m) return m[1]
  }
  return null
}

function extraerColonia(texto) {
  const textoFiltrado=texto.replace(/GRUPO\s+INMOBILIARIO[^\n]*/gi,'').replace(/GIAVAL[^\n]*/gi,'')
  const patrones=[
    /denominado\s+["""]([^"""]+)["""]\s+actualmente\s+["""]([^"""]+)["""]/i,
    /denominado\s+["""]([^"""]{3,50})["""]/i,
    /fraccionamiento\s+(?:habitacional\s+)?(?:de\s+inter[eé]s\s+social\s+)?(?:denominado\s+)?["""]?([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]{3,50}?)["""]?(?:\s*,|\s*del\s+predio|\s*en\s+el|\s*\n)/i,
    /\b(?:col\.?|colonia)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s]{3,40}?)(?:\s*[,\n]|\s+municipio|\s+en\s+el)/i,
  ]
  for(const p of patrones){
    const m=textoFiltrado.match(p)
    if(m){const val=(m[2]||m[1]).trim(); if(val.length>3&&val.length<60) return val}
  }
  return null
}

function extraerCP(texto) {
  const m=texto.match(/(?:c\.?p\.?|c[oó]digo\s+postal)\s*:?\s*([0-9]{5})/i); return m?m[1]:null
}

function extraerCuentaPredial(texto) {
  const m=texto.match(/(?:cuenta\s+predial|n[uú]mero\s+predial|clave\s+catastral)\s*[:.]?\s*([A-Z0-9\-\/\.]{4,25})/i); return m?m[1].trim():null
}

function extraerNumEscritura(texto) {
  for(const p of [/INSTRUMENTO[.\-]+\s*\((\d+)\)/i,/instrumento\s+(?:n[uú]mero\s+)?(\d{3,6})/i,/escritura\s+(?:p[uú]blica\s+)?(?:n[uú]mero\s+)?(\d{3,6})/i]){
    const m=texto.match(p); if(m) return m[1]
  }
  return null
}

const MESES_NUM={'enero':'01','febrero':'02','marzo':'03','abril':'04','mayo':'05','junio':'06','julio':'07','agosto':'08','septiembre':'09','octubre':'10','noviembre':'11','diciembre':'12'}
function extraerFecha(texto) {
  const enLetras=texto.match(/(\w+)\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(?:(\d{4})|(\w+\s+\w+(?:\s+\w+)?))/i)
  if(enLetras){
    const dia=parseInt(enLetras[1])||palabraANumero(enLetras[1])
    const mes=MESES_NUM[enLetras[2].toLowerCase()]
    let anio=parseInt(enLetras[3])
    if(!anio&&enLetras[4]){
      const partes=enLetras[4].toLowerCase().trim().split(/\s+/)
      if(partes[0]==='dos'&&partes[1]==='mil'){const extra=partes.slice(2).join(' ');anio=2000+(extra?(palabraANumero(extra)||0):0)}
    }
    if(dia&&mes&&anio) return `${anio}-${mes}-${String(dia).padStart(2,'0')}`
  }
  const num=texto.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})/)
  if(num) return `${num[3]}-${num[2].padStart(2,'0')}-${num[1].padStart(2,'0')}`
  return null
}

function extraerNotario(texto) {
  const resultado={}
  for(const p of [/([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑA-Za-záéíóúñ\s]{5,50}?),?\s+titular\s+de\s+la\s+notar[ií]a/i,/ante\s+(?:el\s+)?(?:licenciado|lic\.|ingeniero|ing\.)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s\.]{5,50}?),?\s+titular/i]){
    const m=texto.match(p); if(m){resultado.notarioNombre=m[1].trim();break}
  }
  for(const p of [/notar[ií]a\s+(?:p[uú]blica\s+)?(?:n[uú]mero\s+)?(\d+)/i,/notar[ií]a\s+(?:p[uú]blica\s+)?n[uú]mero\s+([a-záéíóúñ\s]+)/i]){
    const m=texto.match(p)
    if(m){const val=m[1].trim();const num=parseInt(val)||palabraANumero(val);if(num){resultado.numeroNotario=String(num);break}}
  }
  if(!resultado.notarioCiudad){const mun=extraerMunicipio(texto);if(mun)resultado.notarioCiudad=mun}
  return resultado
}

function extraerPropietario(texto) {
  const patrones=[
    /vende\s+a\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,60}?),?\s+quien\s+compra/i,
    /de\s+una\s+parte,?\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,60}?),?\s+en\s+lo\s+sucesivo\s+la?\s+["""]?PARTE\s+COMPRADORA/i,
    /vendedora.*?vende\s+a\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,60}?),/is,
  ]
  for(const p of patrones){
    const m=texto.match(p)
    if(m){const nombre=m[1].trim().replace(/\s+/g,' ');const partes=nombre.split(/\s+/);const frasesComunes=['LA PARTE','EL TRABAJADOR','DE UNA','DE OTRA'];if(partes.length>=2&&!frasesComunes.some(f=>nombre.startsWith(f))) return nombre}
  }
  return null
}

function extraerAreaTerreno(texto) {
  const patrones=[
    /superficie\s+de\s+(\d+(?:\.\d+)?)\s*(?:\([^)]+\))?\s*metros?\s+cuadrados?/i,
    /(\d+(?:\.\d+)?)\s*\([^)]+\)\s*metros?\s+cuadrados?/i,
    /superficie(?:\s+total)?\s+de\s+(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mts\.?²?)/i,
    /con\s+superficie\s+de\s+(\d+(?:\.\d+)?)/i,
  ]
  for(const p of patrones){
    const m=texto.match(p)
    if(m){const val=parseFloat(m[1].replace(',','.'));if(!isNaN(val)&&val>0&&val<100000) return val.toFixed(2)}
  }
  return null
}

function extraerRegimen(texto) {
  const n=normalizar(texto)
  if(/REGIMEN\s+DE\s+CONDOMINIO|PROPIEDAD\s+EN\s+CONDOMINIO/.test(n)) return 'CONDOMINIAL'
  if(/REGIMEN\s+EJIDAL|BIENES\s+EJIDALES/.test(n)) return 'EJIDAL'
  if(/CONTRATO\s+DE\s+COMPRAVENTA|VENDE\s+A|PARTE\s+COMPRADORA/.test(n)) return 'PRIVADA INDIVIDUAL'
  return null
}

function extraerIndiviso(texto) {
  const m=texto.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:[A-ZÁÉÍÓÚÑ\s]+%)?\s*(?:de\s+)?(?:los\s+derechos\s+de\s+)?copropiedad/i)
  if(m){const val=parseFloat(m[1].replace(',','.')); if(!isNaN(val)&&val>0&&val<=100) return String(val)}
  return null
}

// ── COLINDANCIAS: nueva función ──────────────────────────────────
// Extrae las medidas y colindancias de una escritura
// Busca patrones como "AL NORTE.- EN QUINCE METROS CON TAPACAMINO"
function extraerColindancias(texto) {
  const medidas = []
  const orientacionesMap = {
    'NORTE':'Norte', 'SUR':'Sur', 'ORIENTE':'Oriente', 'PONIENTE':'Poniente',
    'ESTE':'Oriente', 'OESTE':'Poniente', 'NORESTE':'Noreste', 'NOROESTE':'Noroeste',
    'SURESTE':'Sureste', 'SUROESTE':'Suroeste',
  }

  // Patrón: "AL NORTE.- EN X METROS CON [colindante]" o "AL NORTE: X.XX m con [colindante]"
  const patron = /AL\s+(NORTE|SUR|ORIENTE|PONIENTE|ESTE|OESTE|NORESTE|NOROESTE|SURESTE|SUROESTE)\s*[.\-:]+\s*EN\s+([\w\s,\.]+?)\s+(?:METROS?|MTS?)\s*(?:CON\s+(.{3,60}?))?(?=\s*AL\s+(?:NORTE|SUR|ORIENTE|PONIENTE|ESTE|OESTE)|;|$)/gi

  let match
  while((match=patron.exec(texto))!==null){
    const orientacion = orientacionesMap[match[1].toUpperCase()]||match[1]
    // Convertir distancia en palabras a número si es necesario
    let distanciaTexto = match[2].trim()
    // Buscar número arábigo primero
    const numArab = distanciaTexto.match(/(\d+(?:[.,]\d+)?)/)
    let distancia = numArab ? numArab[1].replace(',','.') : ''
    if(!distancia){
      // Convertir palabras a número
      const n = palabraANumero(distanciaTexto.toLowerCase().replace(/\s+y\s+/g,' '))
      if(n) distancia = String(n)
    }
    const colindante = match[3]?match[3].trim().replace(/[.\-]+$/, '').trim():''

    if(orientacion && distancia){
      medidas.push({ orientacion, distancia, colindante })
    }
  }

  // Patrón alternativo más simple: "Norte: 15.00 m Con calle X"
  if(medidas.length===0){
    const patron2 = /(Norte|Sur|Oriente|Poniente|Este|Oeste|Noroeste|Noreste|Suroeste|Sureste)\s*[:\-\.]+\s*(\d+(?:[.,]\d+)?)\s*(?:m(?:etros?)?|mts?)?\s*(?:con\s+)?([^;\n]{3,60})?/gi
    while((match=patron2.exec(texto))!==null){
      const orientacion = match[1]
      const distancia   = match[2].replace(',','.')
      const colindante  = match[3]?match[3].trim().replace(/[.\-]+$/,'').trim():''
      if(orientacion&&distancia) medidas.push({orientacion,distancia,colindante})
    }
  }

  return medidas.length>0 ? medidas : null
}

// ── FUNCIÓN PRINCIPAL ────────────────────────────────────────────
function extraerCampos(textoRaw, tipoDocumento) {
  const texto = limpiarTexto(textoRaw)

  // PDF de GIAVAL: extractor específico
  if(esAvaluoGIAVAL(texto)) {
    console.log('[OCR] Detectado PDF de GIAVAL')
    return extraerCamposGIAVAL(texto)
  }

  const campos = {}

  // Campos comunes
  const municipio = extraerMunicipio(texto)
  if(municipio) campos.municipio = municipio
  const estado = extraerEstado(texto)
  if(estado) campos.entidadFederativa = estado
  const cp = extraerCP(texto)
  if(cp) campos.codigoPostal = cp
  const cuentaPredial = extraerCuentaPredial(texto)
  if(cuentaPredial) campos.cuentaPredial = cuentaPredial

  switch(tipoDocumento){
    case 'escritura':
    case 'titulo': {
      const propietario=extraerPropietario(texto)
      if(propietario){campos.nombrePropietario=propietario;campos.nombreSolicitante=propietario}
      const calle=extraerCalle(texto); if(calle) campos.calle=calle
      const numExt=extraerNumeroExterior(texto); if(numExt) campos.numeroExterior=numExt
      const lote=extraerLote(texto); if(lote) campos.lote=lote
      const manzana=extraerManzana(texto); if(manzana) campos.manzana=String(manzana)
      const colonia=extraerColonia(texto); if(colonia) campos.colonia=colonia
      const areaTerreno=extraerAreaTerreno(texto); if(areaTerreno) campos.areaTerreno=areaTerreno
      const numEsc=extraerNumEscritura(texto); if(numEsc) campos.numeroEscritura=numEsc
      const fechaEsc=extraerFecha(texto); if(fechaEsc) campos.fechaEscritura=fechaEsc
      const notario=extraerNotario(texto)
      if(notario.notarioNombre) campos.notarioNombre=notario.notarioNombre
      if(notario.numeroNotario) campos.numeroNotario=notario.numeroNotario
      if(notario.notarioCiudad) campos.notarioCiudad=notario.notarioCiudad
      const regimen=extraerRegimen(texto); if(regimen) campos.regimenPropiedad=regimen
      const indiviso=extraerIndiviso(texto); if(indiviso) campos.indiviso=indiviso
      // Colindancias
      const colindancias=extraerColindancias(texto)
      if(colindancias?.length) campos.medidas=colindancias
      break
    }
    case 'predial': {
      const pM=texto.match(/(?:contribuyente|propietario|a\s+nombre\s+de)\s*:?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,60}?)(?:\s*[,\n])/i)
      if(pM) campos.nombrePropietario=pM[1].trim()
      const aT=extraerAreaTerreno(texto); if(aT) campos.areaTerreno=aT
      const ca=extraerCalle(texto); if(ca) campos.calle=ca
      const co=extraerColonia(texto); if(co) campos.colonia=co
      break
    }
    case 'identificacion': {
      const nM=texto.match(/(?:nombre\s*[:.]?\s*|apellido\s+paterno[^:]*:\s*)([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,50}?)(?:\s*\n|\s+curp)/i)
      if(nM){campos.nombrePropietario=nM[1].trim();campos.nombreSolicitante=nM[1].trim()}
      break
    }
    case 'plano': {
      const aT=extraerAreaTerreno(texto); if(aT) campos.areaTerreno=aT
      const nM=texto.match(/(\d)\s*(?:nivel(?:es)?|piso(?:s)?)/i)
      if(nM){const n=parseInt(nM[1]);if(n>=0&&n<=5) campos.numNiveles=n}
      // Descripción desde plano
      const desc=texto.match(/(?:descripci[oó]n|uso|destino)\s*[:.]?\s*(.{10,120}?)(?:\n|$)/i)
      if(desc) campos.descripcionPlano=desc[1].trim()
      break
    }
    default: {
      const p2=extraerPropietario(texto); if(p2) campos.nombrePropietario=p2
      const c2=extraerCalle(texto); if(c2) campos.calle=c2
      const a2=extraerAreaTerreno(texto); if(a2) campos.areaTerreno=a2
      const co2=extraerColonia(texto); if(co2) campos.colonia=co2
      break
    }
  }

  return campos
}

module.exports = { extraerCampos, limpiarTexto }