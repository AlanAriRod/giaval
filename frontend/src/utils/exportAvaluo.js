// exportAvaluo.js — v5 COMPLETO
// CAMBIOS sobre v4:
//   1. Avalúo referido: valor conclusivo usa valorReferidoFinal (fix)
//   2. Portada: también usa valorReferidoFinal para referidos
//   3. PDFs anexos: se fusionan al final con pdf-lib (en lugar de solo mencionarlos)
//   4. Excel hoja 9: incluye valorReferidoFinal

const fmtM  = (v,dec=2) => v!=null&&!isNaN(v)&&parseFloat(v)>0
  ? new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:dec}).format(parseFloat(v)) : '—'
const fmtN  = (v,dec=2) => v&&!isNaN(v) ? parseFloat(v).toFixed(dec) : '—'
const fmtPc = (v) => v ? `${parseFloat(v).toFixed(2)}%` : '0.00%'
const n     = (v) => parseFloat(v)||0

function calcEnNR(comparables, factoresCustom, tipo) {
  const customF = factoresCustom||[]
  const baseKeys = tipo==='casa'
    ? ['neg','ubic','sup','calid','edoCons','zona']
    : ['neg','zona','ubica','frente','sup','forma']
  const todos = [...baseKeys.map(k=>({key:k})),...customF]
  const supKey = tipo==='casa'?'supConst':'supM2'
  const vus = (comparables||[]).filter(c=>c.oferta&&c[supKey]).map(c=>{
    const fre = todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
    return parseFloat(c.oferta)/parseFloat(c[supKey])*fre
  })
  return vus.length>0 ? Math.round(vus.reduce((a,b)=>a+b,0)/vus.length) : null
}

// ── Debug helper ────────────────────────────────────────────
function debugFotos(label, arr) {
  if (!arr?.length) { console.log(`[PDF] ${label}: vacío`); return }
  console.log(`[PDF] ${label}: ${arr.length} elementos`)
  arr.slice(0,2).forEach((f,i)=>{
    const t = typeof f
    if(t==='string') console.log(`  [${i}] string, len=${f.length}, prefix=${f.substring(0,30)}`)
    else console.log(`  [${i}] object, keys=${Object.keys(f||{}).join(',')}`)
  })
}

// ── Extrae el src de cualquier estructura de foto ───────────────
function extractSrc(f) {
  if (!f) return null
  if (typeof f === 'string' && f.length > 50) return f
  if (typeof f === 'object') {
    return f.src || f.url || f.data || f.base64 || f.image || f.foto || f.content || null
  }
  return null
}

async function toJpeg(src) {
  if (!src || typeof src !== 'string' || src.length < 50) return null
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width  = img.naturalWidth  || 800
        canvas.height = img.naturalHeight || 600
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      } catch(e) { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function convertirImagenes(form) {
  debugFotos('form.fotos', form.fotos)
  const convArr = async (arr, key) => {
    if (!arr?.length) return arr || []
    return Promise.all(arr.map(async item => {
      if (!item?.[key]?.length) return item
      const fotosConv = await Promise.all(item[key].map(src => toJpeg(extractSrc(src))))
      return { ...item, [key]: fotosConv.filter(Boolean) }
    }))
  }
  const fotosNorm = (form.fotos||[]).map(extractSrc).filter(Boolean)
  console.log(`[PDF] fotos normalizadas: ${fotosNorm.length}`)
  const [fotos, imgMacro, imgMicro, cc, ct, cr] = await Promise.all([
    Promise.all(fotosNorm.map(toJpeg)).then(r=>r.filter(Boolean)),
    form.imgMacro  ? toJpeg(form.imgMacro)  : Promise.resolve(null),
    form.imgMicro  ? toJpeg(form.imgMicro)  : Promise.resolve(null),
    convArr(form.comparablesCasa,    'fotos'),
    convArr(form.comparablesTerreno, 'fotos'),
    convArr(form.comparablesRentas,  'fotos'),
  ])
  return { ...form, fotos, imgMacro, imgMicro,
    comparablesCasa: cc, comparablesTerreno: ct, comparablesRentas: cr }
}

// ══════════════════════════════════════════════════════════════
// FUSIÓN DE PDFs con pdf-lib
// Recibe el ArrayBuffer del PDF principal (de jsPDF) y un array
// de { nombre, bytes: ArrayBuffer } de PDFs anexos.
// Devuelve un Blob del PDF fusionado.
// ══════════════════════════════════════════════════════════════
async function fusionarPDFs(mainPdfArrayBuffer, anexosPDF) {
  if (!anexosPDF?.length) {
    return new Blob([mainPdfArrayBuffer], { type: 'application/pdf' })
  }
  try {
    const { PDFDocument } = await import('pdf-lib')
    const finalDoc = await PDFDocument.load(mainPdfArrayBuffer)
    for (const anexo of anexosPDF) {
      try {
        const anexoDoc = await PDFDocument.load(anexo.bytes)
        const paginas  = await finalDoc.copyPages(anexoDoc, anexoDoc.getPageIndices())
        paginas.forEach(p => finalDoc.addPage(p))
        console.log(`[PDF-LIB] Anexado: ${anexo.nombre} (${paginas.length} págs.)`)
      } catch(e) {
        console.warn(`[PDF-LIB] No se pudo anexar "${anexo.nombre}":`, e.message)
      }
    }
    const pdfBytes = await finalDoc.save()
    return new Blob([pdfBytes], { type: 'application/pdf' })
  } catch(e) {
    console.error('[PDF-LIB] Error en fusión, descargando solo PDF principal:', e.message)
    return new Blob([mainPdfArrayBuffer], { type: 'application/pdf' })
  }
}

// ══════════════════════════════════════════════════════════════════
//  PDF PRINCIPAL
// ══════════════════════════════════════════════════════════════════
export async function exportarPDF(formOriginal, avaluoMeta={}) {
  console.log('[PDF] Convirtiendo imágenes a JPEG…')
  const form = await convertirImagenes(formOriginal)
  console.log('[PDF] Imágenes convertidas, generando PDF…')
  const { default: jsPDF }     = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'letter'})
  const PW=215.9, MG=13, CW=PW-MG*2
  let y=0, pageNum=0

  // Detectar tipo UNA VEZ al inicio — funciona con 'referido', 'Referido', 'Avalúo Referido'
  const esReferido = (form.tipoAvaluo||'').toLowerCase().includes('referido')

  const NAVY=[30,58,95],GOLD=[201,151,42],LGRAY=[241,245,249],
        MGRAY=[226,232,240],DGRAY=[100,116,139],WHITE=[255,255,255],
        BLACK=[15,23,42],RED=[220,38,38],GREEN=[22,163,74],BLUE=[37,99,235]

  // ── Helpers ──────────────────────────────────────────────────────
  const addPage = () => {
    doc.addPage(); pageNum++
    doc.setFillColor(...NAVY); doc.rect(0,0,PW,12,'F')
    doc.setTextColor(...GOLD); doc.setFont('helvetica','bold'); doc.setFontSize(7)
    const tipoLabel = esReferido ? 'AVALÚO REFERIDO' : 'AVALÚO COMERCIAL'
    doc.text(`GIAVAL — ${tipoLabel}`, MG, 5)
    doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(200,200,200)
    doc.text(form.folioInterno||'', MG, 10)
    doc.text(form.fechaAvaluo||'', PW-MG, 10, {align:'right'})
    y=17
  }

  const checkY = (n=18) => { if(y+n>272) addPage() }

  const secTit = (text,sub='') => {
    checkY(12)
    doc.setFillColor(...NAVY); doc.rect(MG,y,CW,7.5,'F')
    doc.setTextColor(...WHITE); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text(text.toUpperCase(), MG+2, y+5.2)
    if(sub){ doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(180,200,220)
      doc.text(sub,PW-MG-1,y+5.2,{align:'right'}) }
    doc.setTextColor(...BLACK); y+=9.5
  }

  const subTit = (text) => {
    checkY(8)
    doc.setFillColor(...LGRAY); doc.setDrawColor(...NAVY); doc.setLineWidth(0.15)
    doc.rect(MG,y,CW,5.5,'FD')
    doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...NAVY)
    doc.text(text, MG+2, y+3.8); doc.setTextColor(...BLACK); y+=7
  }

  const campo = (lbl,val,x=MG,fw=CW) => {
    if(!val&&val!==0) return; checkY(5)
    doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(...DGRAY)
    doc.text(lbl+':', x, y)
    doc.setFont('helvetica','normal'); doc.setTextColor(...BLACK)
    const lines = doc.splitTextToSize(String(val), fw-42)
    doc.text(lines[0]||'', x+41, y); y += Math.max(lines.length*3.8,4.5)
  }

  const grid3 = (items) => {
    const cw=CW/3
    for(let i=0;i<items.length;i+=3){
      checkY(5)
      items.slice(i,i+3).forEach(([lbl,val],j)=>{
        if(!val&&val!==0) return
        const x=MG+j*cw
        doc.setFont('helvetica','bold'); doc.setFontSize(5.5); doc.setTextColor(...DGRAY)
        doc.text(lbl+':', x, y)
        doc.setFont('helvetica','normal'); doc.setTextColor(...BLACK)
        doc.text(doc.splitTextToSize(String(val),cw-28)[0]||'', x+28, y)
      })
      y+=4.5
    }
  }

  const drawPie = (title, data, cx, cy, r=22) => {
    const total = data.reduce((a,d)=>a+d.value,0)
    if(total<=0) return
    let angle = -Math.PI/2
    data.forEach(d=>{
      const slice = (d.value/total)*Math.PI*2
      const steps=32
      const pts=[]
      for(let i=0;i<=steps;i++){
        const a=angle+(slice*i/steps)
        pts.push([cx+r*Math.cos(a), cy+r*Math.sin(a)])
      }
      doc.setFillColor(...d.color)
      doc.setDrawColor(255,255,255); doc.setLineWidth(0.3)
      const path=[[cx,cy],...pts]
      doc.lines(
        path.slice(1).map((p,i)=>[p[0]-path[i][0], p[1]-path[i][1]]),
        path[0][0], path[0][1], [1,1], 'FD', true
      )
      const midA = angle+slice/2
      const lx=cx+(r*0.65)*Math.cos(midA)
      const ly=cy+(r*0.65)*Math.sin(midA)
      const pct=Math.round(d.value/total*100)
      if(pct>5){
        doc.setFont('helvetica','bold'); doc.setFontSize(5.5); doc.setTextColor(255,255,255)
        doc.text(`${pct}%`, lx, ly+1.5, {align:'center'})
      }
      angle+=slice
    })
    doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...NAVY)
    doc.text(title, cx, cy-r-4, {align:'center'})
    let ly2=cy+r+6
    data.forEach(d=>{
      doc.setFillColor(...d.color); doc.rect(cx-25,ly2-2.5,5,3,'F')
      doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(...BLACK)
      doc.text(`${d.label}: ${fmtM(d.value)}`, cx-18, ly2); ly2+=5
    })
  }

  const drawBars = (title, data, x=MG, maxW=140) => {
    if(!data.length) return
    const barH=5.5, gap=2
    const totalH=data.length*(barH+gap)+14
    checkY(totalH)
    doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(...NAVY)
    doc.text(title, x, y); y+=5
    const maxVal=Math.max(...data.map(d=>d.val),0.001)
    data.forEach((d,i)=>{
      const bw=(d.val/maxVal)*maxW
      const bx=x+38, by=y+i*(barH+gap)
      doc.setFont('helvetica','normal'); doc.setFontSize(5.5); doc.setTextColor(...BLACK)
      const lbl=doc.splitTextToSize(d.label,36); doc.text(lbl[0],x,by+barH/2+1.5)
      doc.setFillColor(...(d.color||NAVY))
      doc.rect(bx,by,Math.max(bw,1),barH,'F')
      doc.setTextColor(255,255,255); doc.setFontSize(5.2)
      if(bw>18) doc.text(fmtM(d.val),bx+bw-1,by+barH/2+1.5,{align:'right'})
      doc.setTextColor(...BLACK)
      if(bw<=18){ doc.setFontSize(5.2); doc.text(fmtM(d.val),bx+bw+1.5,by+barH/2+1.5) }
    })
    y+=data.length*(barH+gap)+4
  }

  const addImage = (b64, lbl='', maxW=85, maxH=55, x=MG) => {
    if (!b64 || typeof b64 !== 'string' || b64.length < 100) return
    checkY(maxH + 8)
    if (lbl) {
      doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(...NAVY)
      doc.text(lbl, x, y); y += 3.5
    }
    try {
      doc.addImage(b64, 'JPEG', x, y, maxW, maxH, undefined, 'FAST')
    } catch(e) {
      doc.setFillColor(...LGRAY); doc.rect(x, y, maxW, maxH, 'F')
      doc.setFont('helvetica','italic'); doc.setFontSize(6); doc.setTextColor(...DGRAY)
      doc.text('[ Error al cargar imagen ]', x + maxW/2, y + maxH/2, {align:'center'})
    }
    y += maxH + 4
  }

  const agregarAnexoFotografico = (fotos, titulo, leyendas=[]) => {
    if (!fotos?.length) return
    const fotosNorm = fotos.map(f => typeof f === 'string' ? f : (f?.src||f?.url||f?.data||null)).filter(Boolean)
    if (!fotosNorm.length) return
    addPage()
    secTit(titulo)
    const fw = (CW - 3) / 2, fh = 55
    for (let i = 0; i < fotosNorm.length; i += 2) {
      checkY(fh + 18)
      const row = fotosNorm.slice(i, i+2)
      row.forEach((src, j) => {
        const px = MG + j * (fw + 3)
        if (src) {
          try { doc.addImage(src, 'JPEG', px, y, fw, fh, undefined, 'FAST') }
          catch(e) {
            doc.setFillColor(...LGRAY); doc.rect(px, y, fw, fh, 'F')
            doc.setFont('helvetica','italic'); doc.setFontSize(6); doc.setTextColor(...DGRAY)
            doc.text('[ Imagen ]', px + fw/2, y + fh/2, {align:'center'})
          }
        } else {
          doc.setFillColor(...LGRAY); doc.rect(px, y, fw, fh, 'F')
        }
        doc.setDrawColor(...NAVY); doc.setLineWidth(0.15)
        doc.rect(px, y, fw, fh, 'S')
        const ley = leyendas[i+j] || `Fotografía ${i+j+1}`
        doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(...NAVY)
        doc.text(ley, px, y + fh + 3.5)
      })
      y += fh + 8
    }
  }

  const fichaComparable = (comp, idx, tipo) => {
    const supKey = tipo==='casa' ? 'supConst' : 'supM2'
    checkY(22)
    const bx=MG, by=y, bh=20
    doc.setFillColor(...LGRAY); doc.rect(bx,by,CW,bh,'F')
    doc.setDrawColor(...NAVY); doc.setLineWidth(0.2); doc.rect(bx,by,CW,bh,'S')
    doc.setFillColor(...NAVY); doc.rect(bx,by,10,bh,'F')
    doc.setTextColor(...WHITE); doc.setFont('helvetica','bold'); doc.setFontSize(10)
    doc.text(String(idx+1),bx+5,by+bh/2+1.5,{align:'center'})
    const fx=bx+12, fw=CW-12
    doc.setTextColor(...BLACK); doc.setFont('helvetica','bold'); doc.setFontSize(7.5)
    const loc=[comp.ciudad,comp.colonia].filter(Boolean).join(' — ')||'Sin ubicación'
    doc.text(loc,fx,by+4.5)
    doc.setTextColor(...NAVY); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text(comp.oferta?fmtM(comp.oferta):'—',PW-MG-2,by+4.5,{align:'right'})
    doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(...DGRAY)
    if(comp[supKey]) doc.text(`${comp[supKey]} m²`,PW-MG-2,by+8.5,{align:'right'})
    doc.setTextColor(...BLACK); doc.setFontSize(6.2)
    let infoY=by+9
    if(comp.telefono){doc.setFont('helvetica','bold');doc.text('Tel:',fx,infoY);doc.setFont('helvetica','normal');doc.text(comp.telefono,fx+8,infoY);infoY+=3.5}
    if(comp.informante){doc.setFont('helvetica','bold');doc.text('Inf:',fx,infoY);doc.setFont('helvetica','normal');doc.text(comp.informante,fx+8,infoY);infoY+=3.5}
    if(comp.descripcion||comp.caracteristicas){
      const desc=comp.descripcion||comp.caracteristicas||''
      const dlines=doc.splitTextToSize(desc,fw-30)
      doc.setFontSize(6); doc.setTextColor(...DGRAY)
      doc.text(dlines.slice(0,1),fx,infoY)
    }
    if(comp.url){
      doc.setFont('helvetica','italic'); doc.setFontSize(5.8); doc.setTextColor(37,99,235)
      const urlText=comp.url.length>70?comp.url.substring(0,70)+'…':comp.url
      doc.text(urlText,fx,by+bh-1.5)
    }
    y+=bh+2
  }

  // ═══════════════════════════════════════════
  //  PORTADA
  // ═══════════════════════════════════════════
  pageNum=1
  doc.setFillColor(...NAVY); doc.rect(0,0,PW,12,'F')
  doc.setTextColor(...GOLD); doc.setFont('helvetica','bold'); doc.setFontSize(7.5)
  doc.text(`GIAVAL — ${esReferido ? 'AVALÚO REFERIDO' : 'AVALÚO COMERCIAL'}`, MG, 5)
  doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(200,200,200)
  doc.text(form.folioInterno||'',MG,10)
  doc.text(form.fechaAvaluo||'',PW-MG,10,{align:'right'})
  y=18

  doc.setFillColor(...NAVY); doc.rect(MG,y,CW,26,'F')
  doc.setTextColor(...GOLD); doc.setFont('helvetica','bold'); doc.setFontSize(14)
  doc.text('GIAVAL',PW/2,y+8,{align:'center'})
  doc.setFontSize(8); doc.text('GRUPO INMOBILIARIO DE AVALÚOS',PW/2,y+14,{align:'center'})
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(180,200,220)
  doc.text(form.peritoValuador||'',PW/2,y+20,{align:'center'})
  doc.text(form.maestria||'',PW/2,y+25,{align:'center'})
  y+=30

  doc.setFillColor(...GOLD); doc.rect(MG,y,CW,9,'F')
  doc.setTextColor(...NAVY); doc.setFont('helvetica','bold'); doc.setFontSize(10)
  doc.text((form.tipoAvaluo||'AVALÚO COMERCIAL').toUpperCase(), PW/2, y+6.5, {align:'center'})
  y+=13

  doc.setDrawColor(...NAVY); doc.setLineWidth(0.3); doc.rect(MG,y,CW,48,'S')
  const c2=MG+CW/2+2; let yL=y+6, yR=y+6
  const pC=(lbl,val,left=true)=>{
    if(!val) return
    const x=left?MG+3:c2, fw=CW/2-4
    doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(...DGRAY)
    doc.text(lbl+':', x, left?yL:yR)
    doc.setFont('helvetica','normal'); doc.setTextColor(...BLACK)
    doc.text(doc.splitTextToSize(String(val),fw-28)[0]||'', x+28, left?yL:yR)
    if(left) yL+=4.5; else yR+=4.5
  }
  pC('Folio', form.folioInterno,true)
  pC('Fecha', form.fechaAvaluo,true)
  pC('Tipo',  form.tipoAvaluo,true)
  pC('Propósito', form.proposito,true)
  pC('Vigencia', form.vigenciaAvaluo,true)
  pC('Solicitante', form.nombreSolicitante,false)
  pC('Propietario', form.nombrePropietario,false)
  pC('Bien Valuado', form.bienQueSeValua,false)
  pC('Régimen', form.regimenPropiedad,false)
  y+=51

  const fotoFachada = form.fotoPrincipal || form.fotos?.[0] || null
  // Foto más grande: 75mm de alto en lugar de 52mm
  if(fotoFachada){
    try{ doc.addImage(fotoFachada, 'JPEG', MG, y, CW, 75, undefined, 'FAST'); y+=77 }
    catch(e){ y+=4 }
  } else { y+=4 }

  const dir=[form.calle,form.numeroExterior,form.colonia,form.municipio,form.entidadFederativa].filter(Boolean).join(', ')
  if(dir){
    doc.setFillColor(...LGRAY); doc.rect(MG,y,CW,8,'F')
    doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(...NAVY)
    doc.text('INMUEBLE:', MG+2, y+3); doc.text('C.P.:',MG+2,y+6.5)
    doc.setFont('helvetica','normal'); doc.setTextColor(...BLACK)
    doc.text(doc.splitTextToSize(dir,CW-28)[0]||'', MG+18, y+3)
    doc.text(form.codigoPostal||'—', MG+12, y+6.5)
    y+=10
  }
  if(form.latitud&&form.longitud){
    doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(...DGRAY)
    doc.text(`Coords: ${form.latitud}, ${form.longitud}${form.altitud?' | Alt: '+form.altitud:''}`,MG,y); y+=4
  }
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.3); doc.line(MG,y,MG+CW,y); y+=3
  doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(...NAVY)
  doc.text(`Cédula: ${form.cedulaProfesional||'—'}   Reg. SHF: ${form.noRegSHF||'—'}   Reg. Estatal: ${form.regEstatalPeritos||'—'}`,MG,y); y+=3

  // ═══════════════════════════════════════════
  //  AVALÚO REFERIDO — ANÁLISIS INPC
  //  Solo se incluye si el tipo es referido
  // ═══════════════════════════════════════════
  if(esReferido){
    addPage()
    secTit('AVALÚO REFERIDO — ANÁLISIS DEL VALOR REFERENCIADO')

    const valorActualRef = n(
      form.valorMercadoConclusion ||
      form.valorActualConclusion  ||
      form.valorFisico            ||
      form.valorMercado
    )
    const inpcActualRef   = n(form.inpcActual)
    const inpcReferenciad = n(form.inpcReferido)
    const factorRef = inpcActualRef > 0 && inpcReferenciad > 0
      ? inpcReferenciad / inpcActualRef
      : null
    const valorRefCalc  = factorRef && valorActualRef ? valorActualRef * factorRef : null
    const valorRefFinal = n(form.valorReferidoFinal) || valorRefCalc || 0

    // Etiquetas de periodo
    const MESES_PDF = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    const labelActualRef = (() => {
      if (!form.fechaAvaluo) return 'Periodo Actual'
      const m = form.fechaAvaluo.match(/^(\d{4})-(\d{2})/)
      return m ? `${MESES_PDF[parseInt(m[2])]} ${m[1]}` : form.fechaAvaluo
    })()
    const labelRefPeriodo = form.mesReferido && form.anioReferido
      ? `${MESES_PDF[parseInt(form.mesReferido)]||''} ${form.anioReferido}`
      : (form.fechaAvaluoReferido || 'Periodo Referenciado')

    // ── Tabla INPC ───────────────────────────────────────────
    subTit('Datos del Cálculo — Factor INPC')
    autoTable(doc, {
      startY: y, margin: { left: MG, right: MG },
      head: [['Concepto', 'Periodo', 'Valor']],
      body: [
        ['INPC Actual',         labelActualRef,   inpcActualRef   > 0 ? inpcActualRef.toString()   : '—'],
        ['INPC Referenciado',   labelRefPeriodo,  inpcReferenciad > 0 ? inpcReferenciad.toString() : '—'],
        ['Factor INPC',         `${inpcReferenciad} ÷ ${inpcActualRef}`,
          factorRef ? factorRef.toFixed(8) : '—'],
      ],
      headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7 },
      alternateRowStyles: { fillColor: LGRAY },
      columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 60 }, 2: { cellWidth: 'auto' } },
    })
    y = doc.lastAutoTable.finalY + 4

    // ── Operación visual ─────────────────────────────────────
    if(factorRef && valorActualRef > 0){
      checkY(22)
      doc.setFillColor(...LGRAY); doc.rect(MG, y, CW, 18, 'F')
      doc.setDrawColor(...NAVY); doc.setLineWidth(0.2); doc.rect(MG, y, CW, 18, 'S')
      const col = CW / 5
      doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(...DGRAY)
      doc.text('AVALÚO ACTUAL',       MG+col*0.5, y+4,  {align:'center'})
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...NAVY)
      doc.text(fmtM(valorActualRef),  MG+col*0.5, y+10, {align:'center'})
      doc.setFontSize(12); doc.setTextColor(...DGRAY)
      doc.text('×', MG+col*1.5, y+10, {align:'center'})
      doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(...DGRAY)
      doc.text('FACTOR INPC',         MG+col*2.5, y+4,  {align:'center'})
      doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...BLUE)
      doc.text(factorRef.toFixed(8),  MG+col*2.5, y+10, {align:'center'})
      doc.setFontSize(12); doc.setTextColor(...DGRAY)
      doc.text('=', MG+col*3.5, y+10, {align:'center'})
      doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(...DGRAY)
      doc.text('VALOR REFERENCIADO',  MG+col*4.5, y+4,  {align:'center'})
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...GOLD)
      doc.text(fmtM(valorRefCalc),    MG+col*4.5, y+10, {align:'center'})
      y += 22
    }

    // ── Valor final ──────────────────────────────────────────
    checkY(20)
    doc.setFillColor(...NAVY); doc.rect(MG, y, CW, 16, 'F')
    doc.setTextColor(...GOLD); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text('RESULTADO DEL VALOR REFERENCIADO DEL INMUEBLE:', MG+3, y+6)
    doc.setFontSize(13); doc.text(fmtM(valorRefFinal), MG+3, y+14)
    doc.setTextColor(180,200,220); doc.setFont('helvetica','normal'); doc.setFontSize(6.5)
    doc.text(`Referenciado a: ${labelRefPeriodo}`, PW-MG-2, y+6,  {align:'right'})
    if(factorRef)
      doc.text(`Factor: ${factorRef.toFixed(8)}`, PW-MG-2, y+12, {align:'right'})
    y += 19

    if(form.declaracionesReferido){
      y += 3
      campo('Declaratoria', form.declaracionesReferido)
    }
  }

  // ═══════════════════════════════════════════
  //  I. CARACTERÍSTICAS URBANAS
  // ═══════════════════════════════════════════
  addPage()
  secTit('I. Características Urbanas del Predio')
  grid3([
    ['Nivel Infraestructura',form.nivelInfraestructura],
    ['Agua Potable',form.aguaPotable],
    ['Drenaje',form.drenaje],
    ['Electrificación',form.electrificacion],
    ['Alumbrado Público',form.alumbradoPublico],
    ['Telefonía',form.telefono],
    ['Señalización',form.senalizacion],
    ['Transporte Público',form.transportePublico],
    ['Vigilancia',form.vigilancia],
    ['Nivel Equipamiento',form.nivelEquipamiento],
    ['Clasificación Zona',form.clasificacionZona],
    ['Uso de Suelo',form.usoSuelo],
    ['Proximidad Urbana',form.refProximidadUrbana],
  ])
  y+=2
  campo('Vías de Acceso', form.viasAcceso)
  campo('Construcc. Predominantes', form.construccionesPredominantes)

  // ═══════════════════════════════════════════
  //  II. MEDIDAS Y COLINDANCIAS
  // ═══════════════════════════════════════════
  y+=4; secTit('II. Medidas y Colindancias', `Según: ${form.medidasSegun||'Escritura Pública'}`)
  const medidas=form.medidas||[]
  if(medidas.length>0){
    autoTable(doc,{
      startY:y,margin:{left:MG,right:MG},
      head:[['Orientación','Distancia (m)','Colindante']],
      body:medidas.map(m=>[ m.orientacion==='Otro'?(m.orientacionOtro||'Otro'):m.orientacion, m.distancia||'—', m.colindante||'—']),
      headStyles:{fillColor:NAVY,textColor:WHITE,fontSize:7,fontStyle:'bold'},
      bodyStyles:{fontSize:7},alternateRowStyles:{fillColor:LGRAY},
      columnStyles:{0:{cellWidth:30},1:{cellWidth:22},2:{cellWidth:'auto'}},
    })
    y=doc.lastAutoTable.finalY+3
  }
  grid3([
    ['Área Terreno (m²)', form.areaTerreno?`${form.areaTerreno} m²`:''],
    ['Área Constr. Habitable (m²)', form.areaConstruccionHabitable?`${form.areaConstruccionHabitable} m²`:''],
    ['Indiviso', form.indiviso?`${form.indiviso}%`:''],
    ['Topografía', form.topografia],
    ['Núm. de Frentes', form.numeroFrente],
    ['Servidumbres', form.servidumbre||'Ninguna'],
  ])
  y+=3; subTit('Datos de la Escritura / Notaría')
  grid3([
    ['Notario',form.notarioNombre],['Núm. Notaría',form.numeroNotario],['Ciudad',form.notarioCiudad],
    ['Núm. Escritura',form.numeroEscritura],['Fecha Escritura',form.fechaEscritura],['Cuenta Predial',form.cuentaPredial],
  ])

  // ═══════════════════════════════════════════
  //  III. DESCRIPCIÓN DEL INMUEBLE
  // ═══════════════════════════════════════════
  addPage()
  secTit('III. Descripción del Inmueble')
  if(form.descripcionInmueble){
    checkY(20)
    doc.setFillColor(...LGRAY); doc.setDrawColor(...NAVY); doc.setLineWidth(0.15)
    doc.rect(MG,y,CW,6,'FD')
    doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...NAVY)
    doc.text('DESCRIPCIÓN DEL INMUEBLE', MG+2, y+4)
    y+=7.5
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...BLACK)
    const descLines=doc.splitTextToSize(form.descripcionInmueble.toUpperCase(),CW)
    descLines.forEach(line=>{ checkY(4.5); doc.text(line,MG,y); y+=4.5 })
    y+=4
  }
  grid3([
    ['Tipo de Construcción',form.tiposConstruccion],['Calidad/Clasif.',form.calidadClasificacion],
    ['Nº de Niveles',form.numNiveles!=null?String(form.numNiveles):''],
    ['Edad Aprox.',form.edadAproximada?`${form.edadAproximada} años`:''],
    ['Vida Total',form.vidaTotal?`${form.vidaTotal} años`:''],
    ['Vida Remanente',(form.vidaTotal&&form.edadAproximada)?`${n(form.vidaTotal)-n(form.edadAproximada)} años`:''],
    ['Estado Conservación',form.estadoConservacion],['Calidad Proyecto',form.calidadProyecto],
    ['Uso Actual',form.usoActual],
    ['Recámaras',form.numRecamaras?String(form.numRecamaras):''],
    ['Baños Completos',form.numBanosCompletos?String(form.numBanosCompletos):''],
    ['Medios Baños',form.numMediosBanos?String(form.numMediosBanos):''],
    ['Estacionamientos',form.estacionamientos?String(form.estacionamientos):''],
    ['Elevador',form.elevador],['Cocinas',form.numCocina?String(form.numCocina):''],
    ['½ Baños',form.numMediosBanos?String(form.numMediosBanos):''],
  ])
  if(form.densidadHabitacional||form.intensidadConstruccion||form.caracteristicasPanoramicas){
    grid3([['Densidad Habitacional',form.densidadHabitacional||''],['Intensidad Construcción',form.intensidadConstruccion||''],['Caract. Panorámicas',form.caracteristicasPanoramicas||'']])
  }
  if(form.estructura){ y+=2; campo('Estructura',form.estructura) }
  const instFlds=[['Hidráulica',form.hidraulico],['Eléctrica',form.electrico],['Carpintería',form.carpinteria],['Herrería',form.herreria]]
  instFlds.filter(([,v])=>v).forEach(([l,v])=>campo(l,v))
  if(form.acabados?.length){
    y+=3; subTit('Tabla de Acabados por Espacio Arquitectónico')
    autoTable(doc,{
      startY:y,margin:{left:MG,right:MG},
      head:[['Espacio','Piso','Muro','Plafón']],
      body:form.acabados.map(a=>[a.espacio,a.piso,a.muro,a.plafon]),
      headStyles:{fillColor:NAVY,textColor:WHITE,fontSize:6.5,fontStyle:'bold'},
      bodyStyles:{fontSize:6.5},alternateRowStyles:{fillColor:LGRAY},
    })
    y=doc.lastAutoTable.finalY+3
  }

  // ═══════════════════════════════════════════
  //  IV. CROQUIS
  // ═══════════════════════════════════════════
  if(form.imgMacro||form.imgMicro){
    addPage(); secTit('IV. Localización — Macro y Micro Croquis')
    if(form.imgMacro) addImage(form.imgMacro,'Macro Localización — Contexto Urbano General',90,58)
    if(form.imgMicro) addImage(form.imgMicro,'Micro Localización — Polígono del Predio',90,58)
  } else {
    addPage(); secTit('IV. Localización')
    if(form.latitud&&form.longitud){
      campo('Coordenadas',`${form.latitud}, ${form.longitud}`)
      campo('Ver en Google Maps',`https://maps.google.com/?q=${form.latitud},${form.longitud}`)
    }
    doc.setFont('helvetica','italic'); doc.setFontSize(7); doc.setTextColor(...DGRAY)
    doc.text('Los croquis se generan en la pestaña Carac. Terreno.',MG,y); y+=5
  }

  // ═══════════════════════════════════════════
  //  V. FOTOGRAFÍAS
  // ═══════════════════════════════════════════
  const fotosFinales = form.fotos||[]
  console.log(`[PDF] Insertando ${fotosFinales.length} fotos del inmueble`)
  if(fotosFinales.length > 0){
    const leyendasDefault = [
      'Vista de la Fachada','Vista del Entorno Urbano','Vista Interior — Sala',
      'Comedor','Cocina','Recámara','Baño Completo','Escalera / Vestíbulo',
      'Área de Servicio','Azotea','Cisterna / Tinaco','Medidor CFE / Instalaciones',
    ]
    const leyendasFinal = fotosFinales.map((_,i) => leyendasDefault[i]||`Fotografía ${i+1}`)
    agregarAnexoFotografico(fotosFinales, 'V. Registro Fotográfico del Inmueble', leyendasFinal)
  }

  // ═══════════════════════════════════════════
  //  VI. ENFOQUE DE MERCADO
  // ═══════════════════════════════════════════
  if(form.enfoques?.includes('mercado')&&form.comparablesCasa?.length){
    addPage()
    secTit('VI. Enfoque de Mercado — Comparables Casa')
    const customF=form.factoresCasaCustom||[]
    const baseKeys=['neg','ubic','sup','calid','edoCons','zona']
    const todos=[...baseKeys.map(k=>({key:k,label:k.toUpperCase()})),...(customF.map(f=>({key:f.key,label:f.label})))]
    const enNRCasa=calcEnNR(form.comparablesCasa,customF,'casa')
    const areaCH=n(form.areaConstruccionHabitable||form.areaConstruccion)
    const t1=enNRCasa&&areaCH?enNRCasa*areaCH:null

    subTit('Fichas de Comparables de Casa')
    form.comparablesCasa.filter(c=>c.oferta).forEach((comp,i)=>fichaComparable(comp,i,'casa'))
    y+=3

    subTit('Tabla de Homologación — Comparables de Casa')
    autoTable(doc,{
      startY:y,margin:{left:MG,right:MG},
      head:[['#','Ciudad','Colonia','Oferta ($)','Sup.','$/m²',...todos.map(f=>f.label),'FRe','$/m² Hom.']],
      body:form.comparablesCasa.filter(c=>c.oferta).map((c,i)=>{
        const fre=todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
        const base=c.oferta&&c.supConst?parseFloat(c.oferta)/parseFloat(c.supConst):0
        const vu=base*fre
        return [i+1,c.ciudad||'',c.colonia||'',fmtM(c.oferta),c.supConst||'',
          base>0?`$${Math.round(base).toLocaleString('es-MX')}`:'—',
          ...todos.map(f=>fmtN(c.factores?.[f.key]||1,4)),fre.toFixed(4),
          vu>0?`$${Math.round(vu).toLocaleString('es-MX')}`:'—']
      }),
      foot:[[{content:'EN N.R. HOMOLOGADO $/m²',colSpan:5+todos.length,styles:{fontStyle:'bold',fillColor:NAVY,textColor:WHITE}},
        '','',{content:enNRCasa?fmtM(enNRCasa):'—',styles:{fontStyle:'bold',fillColor:NAVY,textColor:[201,151,42]}}]],
      headStyles:{fillColor:NAVY,textColor:WHITE,fontSize:5.8,fontStyle:'bold'},
      bodyStyles:{fontSize:5.8},alternateRowStyles:{fillColor:LGRAY},
    })
    y=doc.lastAutoTable.finalY+3
    grid3([
      ['EN N.R. $/m²', enNRCasa?fmtM(enNRCasa):'—'],
      ['Área Hab. (m²)', areaCH?`${areaCH} m²`:'—'],
      ['T-1 Valor Total', t1?fmtM(t1):'—'],
    ])

    form.comparablesCasa.filter(c=>c.fotos?.length>0).forEach((comp,idx)=>{
      const loc=[comp.ciudad,comp.colonia].filter(Boolean).join(' — ')
      const titulo=`Anexo Fotográfico — Comparable Casa ${idx+1}${loc?' | '+loc:''}`
      const precio=comp.oferta?fmtM(comp.oferta):''
      const leyendas=comp.fotos.map((_,fi)=>{
        const base=`C${idx+1} Foto ${fi+1}`
        if(fi===0) return `${base} — Vista principal | ${precio}`
        return `${base}${comp.informante?' | '+comp.informante:''}`
      })
      agregarAnexoFotografico(comp.fotos, titulo, leyendas)
      if(comp.url){ checkY(6); doc.setFont('helvetica','italic'); doc.setFontSize(6); doc.setTextColor(37,99,235); doc.text(`Fuente: ${comp.url}`,MG,y); y+=5 }
    })

    if(form.comparablesCasa.filter(c=>c.oferta&&c.supConst).length>1){
      y+=3
      const chartData=form.comparablesCasa.filter(c=>c.oferta&&c.supConst).map((c,i)=>{
        const fre=todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
        return {label:`C-${i+1} ${c.ciudad||''}`,val:parseFloat(c.oferta)/parseFloat(c.supConst)*fre,color:NAVY}
      })
      if(enNRCasa) chartData.push({label:'EN N.R. (Prom.)',val:enNRCasa,color:GOLD})
      drawBars('COMPARACIÓN $/m² HOMOLOGADO — COMP. CASA',chartData,MG,110)
    }

    y+=4; subTit('Justificación de Factores de Homologación')
    const justFactores=[
      ['NEGOCIACIÓN','Factor que a juicio del perito refleja la diferencia entre el precio de oferta y el posible precio de cierre de la operación inmobiliaria, considerando las condiciones de mercado y el tiempo de exposición del inmueble.'],
      ['UBICACIÓN','Factor que califica la ubicación relativa del comparable respecto del sujeto, considerando accesibilidad, servicios urbanos, nivel socioeconómico de la zona y plusvalía.'],
      ['SUPERFICIE','Factor que homologa las diferencias en superficie construida o de terreno entre el comparable y el sujeto, considerando economías o deseconomías de escala.'],
      ['CALIDAD','Factor que evalúa las diferencias en calidad de proyecto, materiales y acabados constructivos entre el comparable y el inmueble valuado.'],
      ['ESTADO DE CONSERVACIÓN','Factor que refleja las diferencias en el estado físico de mantenimiento y conservación del inmueble comparable respecto del sujeto.'],
      ['ZONA','Factor que pondera las condiciones generales de la zona donde se ubica el comparable en relación con la zona del inmueble valuado.'],
    ]
    justFactores.forEach(([factor,texto])=>{
      checkY(10)
      doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(...NAVY)
      doc.text(factor+':', MG, y)
      doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...BLACK)
      const jlines=doc.splitTextToSize(texto,CW-28); doc.text(jlines[0],MG+28,y); y+=4.5
    })
    y+=3
  }

  // ═══════════════════════════════════════════
  //  VII. COMPARABLES TERRENO
  // ═══════════════════════════════════════════
  if(form.enfoques?.includes('fisico')&&form.comparablesTerreno?.length){
    addPage()
    secTit('VII. Enfoque Físico — Comparables Terreno')
    const customF=form.factoresTerrenoCustom||[]
    const baseKeys=['neg','zona','ubica','frente','sup','forma']
    const todos=[...baseKeys.map(k=>({key:k,label:k.toUpperCase()})),...(customF.map(f=>({key:f.key,label:f.label})))]
    const enNRTerr=calcEnNR(form.comparablesTerreno,customF,'terreno')
    const areaT=n(form.areaTerreno)
    const valT=enNRTerr&&areaT?enNRTerr*areaT:null

    subTit('Fichas de Comparables de Terreno')
    form.comparablesTerreno.filter(c=>c.oferta).forEach((comp,i)=>fichaComparable(comp,i,'terreno'))
    y+=3

    subTit('Tabla de Homologación — Comparables de Terreno')
    autoTable(doc,{
      startY:y,margin:{left:MG,right:MG},
      head:[['#','Ciudad','Colonia','Oferta ($)','Sup.','$/m²',...todos.map(f=>f.label),'FRe','$/m² Hom.']],
      body:form.comparablesTerreno.filter(c=>c.oferta).map((c,i)=>{
        const fre=todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
        const base=c.oferta&&c.supM2?parseFloat(c.oferta)/parseFloat(c.supM2):0
        const vu=base*fre
        return [i+1,c.ciudad||'',c.colonia||'',fmtM(c.oferta),c.supM2||'',
          base>0?`$${Math.round(base).toLocaleString('es-MX')}`:'—',
          ...todos.map(f=>fmtN(c.factores?.[f.key]||1,4)),fre.toFixed(4),
          vu>0?`$${Math.round(vu).toLocaleString('es-MX')}`:'—']
      }),
      foot:[[{content:'EN N.R. HOMOLOGADO $/m²',colSpan:5+todos.length,styles:{fontStyle:'bold',fillColor:NAVY,textColor:WHITE}},
        '','',{content:enNRTerr?fmtM(enNRTerr):'—',styles:{fontStyle:'bold',fillColor:NAVY,textColor:[201,151,42]}}]],
      headStyles:{fillColor:[30,58,95],textColor:WHITE,fontSize:5.8,fontStyle:'bold'},
      bodyStyles:{fontSize:5.8},alternateRowStyles:{fillColor:LGRAY},
    })
    y=doc.lastAutoTable.finalY+3
    grid3([
      ['EN N.R. $/m² Terreno',enNRTerr?fmtM(enNRTerr):'—'],
      ['Área Terreno (m²)',areaT?`${areaT} m²`:'—'],
      ['Valor Terreno',valT?fmtM(valT):'—'],
    ])

    form.comparablesTerreno.filter(c=>c.fotos?.length>0).forEach((comp,idx)=>{
      const loc=[comp.ciudad,comp.colonia].filter(Boolean).join(' — ')
      const titulo=`Anexo Fotográfico — Comparable Terreno ${idx+1}${loc?' | '+loc:''}`
      const precio=comp.oferta?fmtM(comp.oferta):''
      const leyendas=comp.fotos.map((_,fi)=>`T${idx+1} Foto ${fi+1}${fi===0?' — Vista principal | '+precio:''}`)
      agregarAnexoFotografico(comp.fotos, titulo, leyendas)
      if(comp.url){ checkY(6); doc.setFont('helvetica','italic'); doc.setFontSize(6); doc.setTextColor(37,99,235); doc.text(`Fuente: ${comp.url}`,MG,y); y+=5 }
    })

    if(form.comparablesTerreno.filter(c=>c.oferta&&c.supM2).length>1){
      y+=3
      const cd=form.comparablesTerreno.filter(c=>c.oferta&&c.supM2).map((c,i)=>{
        const fre=todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
        return {label:`T-${i+1} ${c.ciudad||''}`,val:parseFloat(c.oferta)/parseFloat(c.supM2)*fre,color:BLUE}
      })
      if(enNRTerr) cd.push({label:'EN N.R. (Prom.)',val:enNRTerr,color:GOLD})
      drawBars('COMPARACIÓN $/m² HOMOLOGADO — COMP. TERRENO',cd,MG,110)
    }
  }

  // ═══════════════════════════════════════════
  //  VIII. MERCADO DE RENTAS
  // ═══════════════════════════════════════════
  if(form.enfoques?.includes('rentas')&&form.comparablesRentas?.length){
    addPage()
    secTit('VIII. Mercado de Rentas — Comparables')
    const customF=form.factoresRentasCustom||[]
    const baseKeys=['neg','ubic','sup','calid','edoCons']
    const todos=[...baseKeys.map(k=>({key:k,label:k.toUpperCase()})),...(customF.map(f=>({key:f.key,label:f.label})))]
    autoTable(doc,{
      startY:y,margin:{left:MG,right:MG},
      head:[['#','Ciudad','Colonia','Renta/mes ($)','Sup.','$/m²/mes',...todos.map(f=>f.label),'FRe','$/m² Hom.']],
      body:form.comparablesRentas.filter(c=>c.oferta).map((c,i)=>{
        const fre=todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
        const base=c.oferta&&c.supM2?parseFloat(c.oferta)/parseFloat(c.supM2):0
        return [i+1,c.ciudad||'',c.colonia||'',fmtM(c.oferta),c.supM2||'',
          base>0?`$${base.toFixed(2)}`:'—',
          ...todos.map(f=>fmtN(c.factores?.[f.key]||1,4)),fre.toFixed(4),`$${(base*fre).toFixed(2)}`]
      }),
      headStyles:{fillColor:[22,101,52],textColor:WHITE,fontSize:5.8,fontStyle:'bold'},
      bodyStyles:{fontSize:5.8},alternateRowStyles:{fillColor:LGRAY},
    })
    y=doc.lastAutoTable.finalY+3
  }

  // ═══════════════════════════════════════════
  //  IX. COSTOS
  // ═══════════════════════════════════════════
  if(form.enfoques?.includes('fisico')){
    addPage()
    secTit('IX. Enfoque Físico — Costos')

    if(form.fraccionesTerreno?.length){
      subTit('a) Valor del Terreno — Fracciones')
      const enNRTerr=calcEnNR(form.comparablesTerreno,form.factoresTerrenoCustom,'terreno')
      const indiv=n(form.indiviso)/100||1
      let totalTerr=0
      const rowsTerr=form.fraccionesTerreno.map(f=>{
        const sup=n(f.sup)||n(form.areaTerreno)
        const vu=n(f.valorUnit)||enNRTerr||0
        const coef=n(f.coeficiente)||indiv
        const motivo=f.motivo==='OTRO'?(f.motivoOtro||'Otro'):(f.motivo||'NINGUNO')
        const parcial=sup*vu*coef; totalTerr+=parcial
        return [sup.toFixed(2),fmtM(vu),coef.toFixed(4),motivo,fmtM(vu),fmtM(parcial)]
      })
      autoTable(doc,{
        startY:y,margin:{left:MG,right:MG},
        head:[['Sup. (m²)','V.U. ($/m²)','Coeficiente','Motivo','V.U. Result.','Valor Parcial']],
        body:rowsTerr,
        headStyles:{fillColor:NAVY,textColor:WHITE,fontSize:6.5,fontStyle:'bold'},
        bodyStyles:{fontSize:6.5},alternateRowStyles:{fillColor:LGRAY},
      })
      y=doc.lastAutoTable.finalY+2
      doc.setFillColor(...NAVY); doc.rect(MG,y,CW,7,'F')
      doc.setTextColor(...WHITE); doc.setFont('helvetica','bold'); doc.setFontSize(7.5)
      doc.text('TOTAL VALOR DEL TERRENO:',MG+2,y+5)
      doc.setTextColor(...GOLD); doc.text(fmtM(totalTerr),MG+CW-2,y+5,{align:'right'})
      y+=9
    }

    if(form.construcciones?.length){
      y+=2; subTit('b) Valor de Construcción')
      let totalCons=0
      const rowsCons=form.construcciones.map(c=>{
        const area=n(c.area)||n(form.areaConstruccionHabitable)
        const crn=n(c.crn),edad=n(c.factorDemeritoEdad),cal=n(c.factorDemeritoCalidad)
        const fre=edad*cal,cnrU=fre>0?fre*crn:crn,vt=area*cnrU; totalCons+=vt
        return [c.tipo,c.descripcion,area.toFixed(2),fmtM(crn),
          edad.toFixed(2),cal.toFixed(2),fre>0?fre.toFixed(4):'—',
          cnrU>0?fmtM(cnrU):'—',vt>0?fmtM(vt):'—']
      })
      autoTable(doc,{
        startY:y,margin:{left:MG,right:MG},
        head:[['Tipo','Desc.','Área','CRN','Dem.Edad','Dem.Cal','Fre','CNR.Unit.','Valor Total']],
        body:rowsCons,
        headStyles:{fillColor:NAVY,textColor:WHITE,fontSize:6,fontStyle:'bold'},
        bodyStyles:{fontSize:6},alternateRowStyles:{fillColor:LGRAY},
      })
      y=doc.lastAutoTable.finalY+2
      if(form.notasConstruccion){ campo('Notas Construcción',form.notasConstruccion); y+=2 }
      doc.setFillColor(30,50,90); doc.rect(MG,y,CW,7,'F')
      doc.setTextColor(...WHITE); doc.setFont('helvetica','bold'); doc.setFontSize(7.5)
      doc.text('SUBTOTAL VALOR DE CONSTRUCCIÓN:',MG+2,y+5)
      doc.setTextColor(...GOLD); doc.text(fmtM(totalCons),MG+CW-2,y+5,{align:'right'})
      y+=9
    }

    if(form.instalaciones?.length){
      y+=2; subTit('c) Instalaciones Especiales / I-Espec')
      let totalInst=0
      const rowsInst=form.instalaciones.map((x,i)=>{
        const fc=n(x.factorCons)||1,fe=n(x.factorEdad)||1,fo=n(x.factorOtro)||1
        const fre=fc*fe*fo,vnr=n(x.vrn)*fre,parcial=n(x.cantidad)*vnr; totalInst+=parcial
        return [i+1,x.descripcion,x.unidad,x.cantidad,x.edad,fmtM(x.vrn),
          fc.toFixed(2),fe.toFixed(2),fo.toFixed(2),fre.toFixed(4),fmtM(vnr),fmtM(parcial)]
      })
      autoTable(doc,{
        startY:y,margin:{left:MG,right:MG},
        head:[['p/c','Descripción','Unid.','Cant.','Edad','V.R.N.','F.Cons','F.Edad','F.Otro','FRe','V.N.R.','V.Parcial']],
        body:rowsInst,
        headStyles:{fillColor:NAVY,textColor:WHITE,fontSize:5.5,fontStyle:'bold'},
        bodyStyles:{fontSize:5.5},alternateRowStyles:{fillColor:LGRAY},
      })
      y=doc.lastAutoTable.finalY+2
      doc.setFillColor(50,30,90); doc.rect(MG,y,CW,7,'F')
      doc.setTextColor(...WHITE); doc.setFont('helvetica','bold'); doc.setFontSize(7.5)
      doc.text('SUBTOTAL I-ESPEC:',MG+2,y+5)
      doc.setTextColor(...GOLD); doc.text(fmtM(totalInst),MG+CW-2,y+5,{align:'right'})
      y+=9
    }

    const totalTerr2=(form.fraccionesTerreno||[]).reduce((acc,f)=>{
      const sup=n(f.sup)||n(form.areaTerreno)
      const vu=n(f.valorUnit)||calcEnNR(form.comparablesTerreno,form.factoresTerrenoCustom,'terreno')||0
      const coef=n(f.coeficiente)||n(form.indiviso)/100||1
      return acc+sup*vu*coef
    },0)
    const totalCons2=(form.construcciones||[]).reduce((acc,c)=>{
      const area=n(c.area)||n(form.areaConstruccionHabitable)
      const crn=n(c.crn),edad=n(c.factorDemeritoEdad),cal=n(c.factorDemeritoCalidad)
      const fre=edad*cal,cnrU=fre>0?fre*crn:crn
      return acc+area*cnrU
    },0)
    const totalInst2=(form.instalaciones||[]).reduce((acc,x)=>{
      const fc=n(x.factorCons)||1,fe=n(x.factorEdad)||1,fo=n(x.factorOtro)||1
      return acc+n(x.cantidad)*n(x.vrn)*fc*fe*fo
    },0)
    const valorFisico=totalTerr2+totalCons2+totalInst2

    if(valorFisico>0){
      y+=2; checkY(10)
      doc.setFillColor(...GOLD); doc.rect(MG,y,CW,9,'F')
      doc.setTextColor(...NAVY); doc.setFont('helvetica','bold'); doc.setFontSize(8.5)
      doc.text('VALOR FÍSICO TOTAL (TERRENO + CONSTRUCCIÓN + I-ESPEC):',MG+2,y+4)
      doc.text(fmtM(valorFisico),MG+CW-2,y+8,{align:'right'})
      y+=13

      checkY(80)
      const pieData=[]
      if(totalTerr2>0) pieData.push({label:'Terreno',value:totalTerr2,color:GOLD})
      if(totalCons2>0) pieData.push({label:'Construcción',value:totalCons2,color:NAVY})
      if(totalInst2>0) pieData.push({label:'I-Espec',value:totalInst2,color:BLUE})

      if(pieData.length>1){
        const pieX=MG+40, pieY=y+35
        drawPie('COMPOSICIÓN DEL VALOR FÍSICO',pieData,pieX,pieY,30)
        const tx=MG+100
        doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...NAVY)
        doc.text('DESGLOSE',tx,y+10)
        let ty=y+15
        pieData.forEach(d=>{
          doc.setFillColor(...d.color); doc.rect(tx,ty-2.5,4,3,'F')
          doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...BLACK)
          doc.text(d.label,tx+6,ty)
          doc.text(fmtM(d.value),tx+6,ty+4)
          doc.setFontSize(6); doc.setTextColor(...DGRAY)
          doc.text(`${Math.round(d.value/valorFisico*100)}% del total`,tx+6,ty+8)
          ty+=14
        })
        doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...NAVY)
        doc.text('TOTAL:',tx+6,ty+2)
        doc.setTextColor(...GOLD); doc.text(fmtM(valorFisico),tx+6,ty+7)
        y+=80
      } else {
        drawBars('COMPOSICIÓN DEL VALOR FÍSICO',
          [{label:'Terreno',val:totalTerr2,color:GOLD},{label:'Construcción',val:totalCons2,color:NAVY}],MG,100)
      }
    }
  }

  // ═══════════════════════════════════════════
  //  X. INGRESOS
  // ═══════════════════════════════════════════
  if(form.enfoques?.includes('rentas')&&form.ingresos){
    addPage()
    secTit('X. Enfoque de Ingresos — Capitalización de Rentas')
    const ing=form.ingresos
    const deducKeys=['porcVacios','porcPredial','porcAgua','porcConsManto','porcAdmon','porcEnergElec','porcSeguros','porcISR','porcOtros']
    const deducLabels=['Vacíos','Imp. Predial','Serv. Agua','Cons/Manto','Admón.','Energ. Eléc.','Seguros','ISR','Otros']
    const totalDeducc=deducKeys.reduce((a,k)=>a+n(ing[k]),0)
    const rentaBruta=(ing.tiposRenta||[]).reduce((a,t)=>a+n(t.supM2)*n(t.valorM2),0)
    const deduccImp=rentaBruta*totalDeducc/100
    const rentaNetaMens=rentaBruta-deduccImp
    const mult=n(ing.multiplicadorAnual)||15
    const rentaNetaAnual=rentaNetaMens*mult
    const tasa=n(ing.tasaManual)||0
    const valorRentas=tasa>0?rentaNetaAnual/(tasa/100):0

    if(ing.tiposRenta?.length){
      subTit('Tipos de Renta')
      autoTable(doc,{
        startY:y,margin:{left:MG,right:MG},
        head:[['Tipo','Destino','Sup. (m²)','Valor/m²/mes','Renta Mensual']],
        body:[...(ing.tiposRenta.map(t=>[t.tipo,t.destino,t.supM2,fmtM(t.valorM2),fmtM(n(t.supM2)*n(t.valorM2))])),
          [{content:'RENTA BRUTA MENSUAL',colSpan:4,styles:{fontStyle:'bold'}},fmtM(rentaBruta)]],
        headStyles:{fillColor:[22,101,52],textColor:WHITE,fontSize:7,fontStyle:'bold'},
        bodyStyles:{fontSize:7},alternateRowStyles:{fillColor:LGRAY},
      })
      y=doc.lastAutoTable.finalY+4
    }

    y+=2; subTit('Deducciones y Cascada de Renta')
    autoTable(doc,{
      startY:y,margin:{left:MG,right:MG},
      head:[['Deducción','%','','Concepto','Importe ($)']],
      body:[
        ...deducKeys.map((k,i)=>[deducLabels[i],fmtPc(ing[k]),'',i===0?'Renta Bruta Mensual':'',i===0?fmtM(rentaBruta):'']),
        [{content:'TOTAL DEDUCC.',styles:{fontStyle:'bold'}},fmtPc(totalDeducc),'',
          `Deducciones (${totalDeducc.toFixed(2)}%)`,`– ${fmtM(deduccImp)}`],
        ['','','','Renta Neta Mensual',fmtM(rentaNetaMens)],
        ['','','',`Renta Neta Anual (× ${mult} meses)`,fmtM(rentaNetaAnual)],
        ['','','',`Capitalización al ${tasa.toFixed(2)}%`,`÷ ${tasa.toFixed(2)}%`],
      ],
      foot:[[{content:'',colSpan:3},
        {content:'VALOR POR CAPITALIZACIÓN',styles:{fontStyle:'bold',fillColor:NAVY,textColor:WHITE}},
        {content:fmtM(valorRentas||n(form.valorRentas)),styles:{fontStyle:'bold',fillColor:NAVY,textColor:[201,151,42]}}]],
      headStyles:{fillColor:NAVY,textColor:WHITE,fontSize:6.5,fontStyle:'bold'},
      bodyStyles:{fontSize:6.5},
      columnStyles:{0:{cellWidth:28},1:{cellWidth:14},2:{cellWidth:4},3:{cellWidth:50},4:{cellWidth:'auto'}},
    })
    y=doc.lastAutoTable.finalY+3
  }

  // ═══════════════════════════════════════════
  //  DEFINICIONES SHF
  // ═══════════════════════════════════════════
  addPage()
  secTit('Definiciones — Marco Teórico (SHF)')
  const definiciones=[
    ['VALOR COMERCIAL','Es el precio más probable en el que se podría comercializar un bien inmueble en el mercado en la fecha de valuación, asumiendo que el vendedor y el comprador actúan de manera prudente, sin presiones, con pleno conocimiento del mercado y en libre competencia. (Fuente: SHF — Sociedad Hipotecaria Federal)'],
    ['ENFOQUE DE MERCADO (COMPARATIVO)','Método que determina el valor de un inmueble mediante la comparación directa con inmuebles similares que han sido ofertados o vendidos recientemente en el mismo mercado. Se aplican factores de homologación para ajustar las diferencias entre los comparables y el sujeto.'],
    ['ENFOQUE DE COSTOS (FÍSICO)','Método que estima el valor de un inmueble sumando el valor del terreno más el costo de reposición neto de la construcción, considerando la depreciación por edad, uso y calidad. Refleja el costo actual de producir un bien equivalente.'],
    ['ENFOQUE DE INGRESOS (CAPITALIZACIÓN)','Método que determina el valor de un inmueble a través de la capitalización de los ingresos netos que puede generar, considerando deducciones por vacíos, gastos de operación e impuestos, descontados a una tasa de capitalización representativa del mercado.'],
    ['FACTOR DE HOMOLOGACIÓN (FRe)','Es el producto de todos los factores de ajuste aplicados a un comparable para hacerlo equivalente al inmueble sujeto. Se obtiene multiplicando los factores individuales de negociación, ubicación, superficie, calidad, estado de conservación y zona.'],
    ['INDIVISO','Parte alícuota o fracción porcentual de un inmueble que corresponde a un propietario dentro de un régimen de copropiedad o condominio.'],
    ['VIGENCIA DEL AVALÚO','Período durante el cual el valor determinado en el dictamen es considerado representativo de las condiciones del mercado. Posterior a la vigencia, el valor puede diferir significativamente de las condiciones actuales del mercado inmobiliario.'],
  ]
  definiciones.forEach(([term,def])=>{
    checkY(14)
    doc.setFillColor(...LGRAY); doc.rect(MG,y,CW,5.5,'F')
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...NAVY)
    doc.text(term,MG+2,y+4); y+=6.5
    const dlines=doc.splitTextToSize(def,CW)
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...BLACK)
    doc.text(dlines,MG,y); y+=dlines.length*4+5
  })

  // ═══════════════════════════════════════════
  //  SECCIÓN EXCLUSIVA: VALOR REFERIDO
  //  Solo se incluye en avalúos referidos
  // ═══════════════════════════════════════════
  if(esReferido){
    addPage()
    secTit('Análisis del Valor Referido — Cálculo por Factor INPC')

    // ── Reconstruir valores igual que el Tab ────────────────
    const MESES_REF = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

    const inpcActualV   = parseFloat(form.inpcActual)   || 0
    const inpcRefeV     = parseFloat(form.inpcReferido) || 0
    const factorCalcV   = inpcActualV > 0 && inpcRefeV > 0
      ? inpcRefeV / inpcActualV : null
    const valorActualV  = parseFloat(
      form.valorMercadoConclusion || form.valorActualConclusion ||
      form.valorFisico || form.valorMercado || 0
    )
    const valorRefCalcV  = factorCalcV && valorActualV ? valorActualV * factorCalcV : null
    const valorRefFinalV = parseFloat(form.valorReferidoFinal) || valorRefCalcV || 0

    const labelInpcActualV = (() => {
      if (!form.fechaAvaluo) return 'Periodo Actual'
      const m = form.fechaAvaluo.match(/^(\d{4})-(\d{2})/)
      return m ? `${MESES_REF[parseInt(m[2])]} ${m[1]}` : form.fechaAvaluo
    })()
    const labelInpcRefV = form.mesReferido && form.anioReferido
      ? `${MESES_REF[parseInt(form.mesReferido)]||''} ${form.anioReferido}`
      : (form.fechaAvaluoReferido || 'Periodo Referido')

    // ── 1. Valor Actual ──────────────────────────────────────
    subTit('1. Valor Actual del Inmueble')
    autoTable(doc, {
      startY: y, margin: { left: MG, right: MG },
      head: [['Concepto', 'Valor']],
      body: [
        ['Fecha del Avalúo Actual',  form.fechaAvaluo || '—'],
        ['Avalúo Actual ($)',        valorActualV > 0 ? fmtM(valorActualV) : '—'],
        [`INPC — ${labelInpcActualV}`, inpcActualV > 0 ? inpcActualV.toString() : '—'],
      ],
      headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: LGRAY },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 'auto' } },
    })
    y = doc.lastAutoTable.finalY + 6

    // ── 2. Valor Referido ────────────────────────────────────
    subTit('2. Datos del Periodo Referido')
    autoTable(doc, {
      startY: y, margin: { left: MG, right: MG },
      head: [['Concepto', 'Valor']],
      body: [
        ['Periodo Referido',         labelInpcRefV],
        [`INPC — ${labelInpcRefV}`,  inpcRefeV > 0 ? inpcRefeV.toString() : '—'],
      ],
      headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: LGRAY },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 'auto' } },
    })
    y = doc.lastAutoTable.finalY + 6

    // ── 3. Fórmula visual del Factor ─────────────────────────
    subTit('3. Factor de Valor Referido')
    checkY(40)

    // Caja de la fracción (división visual)
    const boxX = MG + 10, boxW = 60, boxH = 28
    doc.setFillColor(...LGRAY); doc.rect(boxX, y, boxW, boxH, 'F')
    doc.setDrawColor(...NAVY); doc.setLineWidth(0.3); doc.rect(boxX, y, boxW, boxH, 'S')

    // Numerador (INPC referido)
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...BLUE)
    doc.text(inpcRefeV > 0 ? inpcRefeV.toString() : '?',
      boxX + boxW/2, y + 9, {align:'center'})
    // Subtítulo numerador
    doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(...DGRAY)
    doc.text(labelInpcRefV, boxX + boxW/2, y + 13, {align:'center'})
    // Línea divisoria
    doc.setDrawColor(...NAVY); doc.setLineWidth(0.5)
    doc.line(boxX + 5, y + 15, boxX + boxW - 5, y + 15)
    // Denominador (INPC actual)
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...NAVY)
    doc.text(inpcActualV > 0 ? inpcActualV.toString() : '?',
      boxX + boxW/2, y + 22, {align:'center'})
    // Subtítulo denominador
    doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(...DGRAY)
    doc.text(labelInpcActualV, boxX + boxW/2, y + 26, {align:'center'})

    // Símbolo igual y resultado
    doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(...DGRAY)
    doc.text('=', boxX + boxW + 8, y + 17)
    // Caja resultado del factor
    const resX = boxX + boxW + 20, resW = 55, resH = 16
    doc.setFillColor(235,245,255); doc.rect(resX, y + 6, resW, resH, 'F')
    doc.setDrawColor(...BLUE); doc.setLineWidth(0.4); doc.rect(resX, y + 6, resW, resH, 'S')
    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...BLUE)
    doc.text(factorCalcV ? factorCalcV.toFixed(8) : '—',
      resX + resW/2, y + 16, {align:'center'})
    doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(...DGRAY)
    doc.text('FACTOR RESULTANTE DE VALOR REFERIDO', resX + resW/2, y + 22, {align:'center'})

    y += boxH + 8

    // ── 4. Aplicación del Factor ─────────────────────────────
    subTit('4. Aplicación del Factor')
    checkY(30)

    // Tres cajas: Avalúo Actual × Factor INPC = Valor Referido
    const colW3 = (CW - 10) / 3, cY = y
    const cajas = [
      { label: 'AVALÚO ACTUAL',    valor: fmtM(valorActualV),             fill: [30,58,95],   textC: WHITE },
      { label: 'FACTOR INPC',      valor: factorCalcV ? factorCalcV.toFixed(8) : '—', fill: [37,99,235], textC: WHITE },
      { label: 'VALOR REFERIDO',   valor: fmtM(valorRefFinalV),           fill: GOLD,         textC: NAVY  },
    ]
    const ops = ['×', '=']
    cajas.forEach((caja, i) => {
      const cx = MG + i * (colW3 + 5)
      doc.setFillColor(...caja.fill); doc.rect(cx, cY, colW3, 22, 'F')
      doc.setFont('helvetica','bold'); doc.setFontSize(6)
      doc.setTextColor(...caja.textC)
      doc.text(caja.label, cx + colW3/2, cY + 6, {align:'center'})
      doc.setFontSize(9)
      doc.text(caja.valor, cx + colW3/2, cY + 15, {align:'center'})
      // Operador entre cajas
      if(i < ops.length){
        doc.setFontSize(14); doc.setTextColor(...DGRAY)
        doc.text(ops[i], cx + colW3 + 2.5, cY + 13, {align:'center'})
      }
    })
    y += 28

    // ── 5. Resultado del Valor Referido ─────────────────────
    checkY(30)
    y += 4
    subTit('5. Resultado del Valor Referido del Inmueble')

    // Caja principal del resultado
    doc.setFillColor(...NAVY); doc.rect(MG, y, CW, 18, 'F')
    doc.setTextColor(...GOLD); doc.setFont('helvetica','bold'); doc.setFontSize(9)
    doc.text('RESULTADO DEL VALOR REFERIDO DEL INMUEBLE ($):', MG+3, y+6)
    doc.setFontSize(14); doc.text(fmtM(valorRefFinalV), MG+3, y+15)
    doc.setTextColor(180,200,220); doc.setFont('helvetica','normal'); doc.setFontSize(6.5)
    doc.text(`Referenciado a: ${labelInpcRefV}`, PW-MG-2, y+6, {align:'right'})
    if(factorCalcV)
      doc.text(`Factor: ${factorCalcV.toFixed(8)}`, PW-MG-2, y+12, {align:'right'})
    y += 22

    // Valor en letras
    if(form.valorConclusivoLetras || form.valorReferidoEnLetras){
      checkY(12)
      doc.setFillColor(...LGRAY); doc.setDrawColor(...GOLD); doc.setLineWidth(0.3)
      doc.rect(MG, y, CW, 10, 'FD')
      doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(...NAVY)
      doc.text('SON:', MG+2, y+4)
      doc.setFont('helvetica','normal'); doc.setTextColor(...BLACK)
      const letras = (form.valorConclusivoLetras || form.valorReferidoEnLetras || '').toUpperCase()
      const letLines = doc.splitTextToSize(letras, CW-16)
      doc.text(letLines.slice(0,2), MG+14, y+4)
      y += 12
    }

    // Declaratoria
    if(form.declaracionesReferido){
      checkY(14); y += 3
      doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...NAVY)
      doc.text('DECLARATORIA:', MG, y); y += 4
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...BLACK)
      const dRef = doc.splitTextToSize(form.declaracionesReferido, CW)
      doc.text(dRef, MG, y); y += dRef.length * 4 + 4
    }

    // ── 6. Banner conclusión al final de la sección ─────────
    checkY(24); y += 4
    doc.setFillColor(...GOLD); doc.rect(MG, y, CW, 22, 'F')
    doc.setTextColor(...NAVY); doc.setFont('helvetica','bold'); doc.setFontSize(9)
    doc.text('CONCLUSIÓN DEL AVALÚO REFERIDO', PW/2, y+6, {align:'center'})
    doc.setFontSize(15); doc.text(fmtM(valorRefFinalV), PW/2, y+15, {align:'center'})
    if(labelInpcRefV){
      doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(50,40,20)
      doc.text(`Referenciado a: ${labelInpcRefV}`, PW/2, y+21, {align:'center'})
    }
    y += 26
  }

  // ═══════════════════════════════════════════
  //  DECLARACIONES Y ADVERTENCIAS
  //  Usa las declaraciones capturadas por el valuador
  //  (form.declaracionesExtra) más la declaración fija
  // ═══════════════════════════════════════════
  addPage()
  secTit('Declaraciones y Advertencias')

  // Declaración fija — siempre incluida
  const DECL_FIJA = 'LAS DECLARACIONES DE HECHOS CONTENIDAS EN EL PRESENTE ESTUDIO SON VERDADERAS Y CORRECTAS. NO TENEMOS INTERÉS PRESENTE O FUTURO EN LA PROPIEDAD QUE ES OBJETO DE ESTE AVALÚO, NO TENEMOS INTERÉS PERSONAL O PARCIAL CON RESPECTO A LAS PARTES INVOLUCRADAS; ADEMÁS DECLARAMOS QUE NO PARTICIPAMOS EN EL CAPITAL O EN LOS ÓRGANOS ADMINISTRATIVOS DEL PROMOVENTE Y MANIFESTAMOS COMPLETA INDEPENDENCIA CON LA PROPIEDAD DE LOS BIENES. LOS EMOLUMENTOS RELATIVOS AL DESARROLLO DEL TRABAJO VALUATORIO, NO ESTÁN CONDICIONADOS AL REPORTE DE UN VALOR PREDETERMINADO O DIRIGIDO HACIA UN VALOR QUE FAVOREZCA LA CAUSA DE UN CLIENTE.'

  // FIX desfase: usar leading consistente para calcular altura de caja
  const LINE_H_DECL = 3.8  // espaciado real por línea a fontSize 7

  // Declaración fija con fondo gris
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...BLACK)
  const dfijaLines = doc.splitTextToSize(DECL_FIJA, CW - 8)
  const dfijaH = dfijaLines.length * LINE_H_DECL + 8
  checkY(dfijaH + 4)
  doc.setFillColor(...LGRAY); doc.setDrawColor(...NAVY); doc.setLineWidth(0.2)
  doc.rect(MG, y, CW, dfijaH, 'FD')
  // Texto centrado verticalmente: margen superior de 4pt
  doc.text(dfijaLines, MG + 4, y + 4, { lineHeightFactor: 1.15 })
  y += dfijaH + 6

  // Declaraciones del valuador (del tab Declaraciones)
  const declsUsuario = Array.isArray(form.declaracionesExtra)
    ? form.declaracionesExtra.filter(d => d && d.trim().length > 0)
    : []

  if(declsUsuario.length > 0){
    declsUsuario.forEach((decl) => {
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...BLACK)
      const dlines = doc.splitTextToSize(decl.trim(), CW - 8)
      const LINE_H2 = 4.2
      const dh = dlines.length * LINE_H2 + 7
      checkY(dh + 4)
      doc.setFillColor(255,255,255); doc.setDrawColor(...MGRAY); doc.setLineWidth(0.2)
      doc.rect(MG, y, CW, dh, 'FD')
      doc.text(dlines, MG + 4, y + 4, { lineHeightFactor: 1.15 })
      y += dh + 4
    })
  } else {
    checkY(10)
    doc.setFont('helvetica','italic'); doc.setFontSize(7); doc.setTextColor(...DGRAY)
    doc.text('(Sin declaraciones adicionales capturadas en el tab Declaraciones)', MG, y)
    y += 8
  }

  // ═══════════════════════════════════════════
  //  ANEXO DOCUMENTAL
  //  FIX v5: PDFs se fusionan con pdf-lib al final
  //          Imágenes se insertan directamente
  // ═══════════════════════════════════════════
  const docsAnexos = form.documentosAnexos || []
  const pdfAnexos  = []  // acumula PDFs para fusión posterior

  if(docsAnexos.length > 0){
    addPage()
    secTit('Anexo Documental')
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...DGRAY)
    doc.text('Los siguientes documentos forman parte integral del expediente valuatorio.',MG,y); y+=6

    for(const [i,d] of docsAnexos.entries()){
      const esPDF   = d.mimeType === 'application/pdf'
      const esImagen = d.mimeType?.startsWith('image/')

      if(esPDF){
        // Registrar para fusión y mostrar referencia en el índice
        checkY(22)
        doc.setFillColor(235,248,255); doc.rect(MG,y,CW,18,'F')
        doc.setDrawColor(37,99,235); doc.setLineWidth(0.3); doc.rect(MG,y,CW,18,'S')
        doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(37,99,235)
        doc.text(`ANEXO ${i+1} — ${(d.tipo||'Documento').toUpperCase()}`, MG+3, y+5)
        doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...BLACK)
        doc.text(d.nombre||'Documento.pdf', MG+3, y+10)
        doc.setFontSize(6.5); doc.setTextColor(...DGRAY)
        doc.text('Páginas incluidas al final del documento fusionado.', MG+3, y+15)
        y+=21
        // Guardar bytes para fusión si están disponibles
        if(d.bytes) pdfAnexos.push({ nombre: d.nombre||`Anexo-${i+1}.pdf`, bytes: d.bytes })
        else if(d.data){
          // Si viene como base64, convertir a ArrayBuffer
          try {
            const b64 = d.data.includes(',') ? d.data.split(',')[1] : d.data
            const binStr = atob(b64)
            const arr = new Uint8Array(binStr.length)
            for(let k=0;k<binStr.length;k++) arr[k]=binStr.charCodeAt(k)
            pdfAnexos.push({ nombre: d.nombre||`Anexo-${i+1}.pdf`, bytes: arr.buffer })
          } catch(e) { console.warn('[PDF] No se pudo convertir base64 a bytes:', e.message) }
        }
      } else if(esImagen && d.data){
        // Dos imágenes por página: si es número par abre página nueva
        if(i % 2 === 0) addPage()
        else checkY(120)
        // Encabezado del anexo con el mismo diseño que las secciones
        doc.setFillColor(...NAVY); doc.rect(MG,y,CW,6,'F')
        doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...WHITE)
        doc.text(`ANEXO ${i+1} — ${(d.tipo||'Documento').toUpperCase()}`, MG+2, y+4.2)
        doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(180,200,220)
        doc.text(d.nombre||'', PW-MG-1, y+4.2, {align:'right'}); y+=8
        // Imagen más pequeña: 100mm de alto en lugar de 200mm
        try{
          const maxH=100
          doc.addImage(d.data, 'JPEG', MG, y, CW, maxH, undefined, 'FAST')
          y+=maxH+6
        }catch(e){
          doc.setFont('helvetica','italic'); doc.setFontSize(7); doc.setTextColor(...DGRAY)
          doc.text('[No se pudo mostrar la imagen]', MG, y); y+=6
        }
      } else {
        checkY(10)
        doc.setFont('helvetica','italic'); doc.setFontSize(7); doc.setTextColor(...DGRAY)
        doc.text(`Documento ${i+1}: ${d.nombre||'sin nombre'} — ver expediente digital`, MG, y); y+=6
      }
    }
  }

  // ═══════════════════════════════════════════
  //  XI. CONCLUSIÓN
  //  FIX v5: valor conclusivo del referido usa valorReferidoFinal
  // ═══════════════════════════════════════════
  addPage()
  secTit('XI. Conclusión del Avalúo')


  const enfoqueData=[]
  if(n(form.valorMercado)>0) enfoqueData.push({label:'Valor de Mercado',    val:n(form.valorMercado), color:GOLD})
  if(n(form.valorFisico)>0)  enfoqueData.push({label:'Valor Físico',         val:n(form.valorFisico),  color:BLUE})
  if(n(form.valorRentas)>0)  enfoqueData.push({label:'Por Cap. de Rentas',   val:n(form.valorRentas),  color:GREEN})
  if(esReferido && n(form.valorReferidoFinal)>0)
    enfoqueData.push({label:'Valor Referido Final', val:n(form.valorReferidoFinal), color:GOLD})

  if(enfoqueData.length>0){
    subTit('Cuadro Comparativo de Enfoques')
    autoTable(doc,{
      startY:y,margin:{left:MG,right:MG},
      head:[['Enfoque','Valor ($)','% Relativo']],
      body:enfoqueData.map(e=>{
        const maxV=Math.max(...enfoqueData.map(d=>d.val))
        return [e.label,fmtM(e.val),`${Math.round(e.val/maxV*100)}% del mayor`]
      }),
      headStyles:{fillColor:NAVY,textColor:WHITE,fontSize:8,fontStyle:'bold'},
      bodyStyles:{fontSize:8},alternateRowStyles:{fillColor:LGRAY},tableWidth:120,
    })
    y=doc.lastAutoTable.finalY+4
    if(enfoqueData.length>1){ checkY(45); drawBars('COMPARACIÓN DE ENFOQUES DE VALUACIÓN',enfoqueData,MG,120); y+=4 }
  }

  // *** FIX v5: valor conclusivo correcto para cada tipo ***
  const _enf = form.enfoqueConclusivo||'mercado'
  const valConc = esReferido
    ? (n(form.valorReferidoFinal) || n(avaluoMeta?.valor_conclusivo) || n(form.valorMercado) || 0)
    : _enf==='fisico'  ? (n(form.valorFisico)  || n(form.valorMercado) || n(form.valorRentas))
    : _enf==='rentas'  ? (n(form.valorRentas)  || n(form.valorMercado) || n(form.valorFisico))
    : _enf==='mayor'   ? Math.max(n(form.valorMercado)||0, n(form.valorFisico)||0, n(form.valorRentas)||0)
    :                    (n(form.valorMercado)  || n(form.valorFisico)  || n(form.valorRentas))

  if(valConc>0){
    checkY(20)
    doc.setFillColor(...NAVY); doc.rect(MG,y,CW,16,'F')
    doc.setTextColor(...GOLD); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text('VALOR CONCLUSIVO DEL AVALÚO:',MG+3,y+6)
    doc.setFontSize(13); doc.text(fmtM(valConc),MG+3,y+14)
    doc.setTextColor(180,200,220); doc.setFont('helvetica','normal'); doc.setFontSize(6.5)
    doc.text(`Vigencia: ${form.vigenciaAvaluo||'—'}`,PW-MG-2,y+6,{align:'right'})
    const enfNombre = esReferido ? 'Valor Referido Final'
      : _enf==='mayor' ? 'Mayor de los enfoques'
      : _enf==='mercado' ? 'Enfoque de Mercado'
      : _enf==='fisico'  ? 'Enfoque Físico'
      : 'Capitalización de Rentas'
    doc.text(`Enfoque: ${enfNombre}`,PW-MG-2,y+12,{align:'right'})
    y+=19
  }

  if(form.valorConclusivoLetras){
    checkY(12)
    doc.setFillColor(...LGRAY); doc.setDrawColor(...NAVY); doc.setLineWidth(0.25)
    doc.rect(MG,y,CW,10,'FD')
    doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(...NAVY)
    doc.text('SON:',MG+2,y+4)
    doc.setFont('helvetica','normal'); doc.setTextColor(...BLACK)
    const letLines=doc.splitTextToSize(form.valorConclusivoLetras.toUpperCase(),CW-16)
    doc.text(letLines.slice(0,2),MG+14,y+4)
    y+=12
  }

  if(form.declaraciones){
    checkY(10); y+=2
    doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...NAVY)
    doc.text('DECLARACIÓN:', MG, y); y+=4
    doc.setFont('helvetica','normal'); doc.setTextColor(...BLACK); doc.setFontSize(8)
    const dLines=doc.splitTextToSize(form.declaraciones,CW)
    doc.text(dLines,MG,y); y+=dLines.length*4+6
  }

  // Firma + QR del despacho
  checkY(52); y+=8

  // QR a la derecha de la firma
  const QR_SIZE = 28
  const qrX = PW - MG - QR_SIZE - 2
  const firmaStartY = y

  // Línea de firma centrada (pero dejando espacio al QR)
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.4)
  doc.line(MG+CW/4, y, MG+CW*3/4 - QR_SIZE/2, y); y+=4
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...NAVY)
  doc.text(form.peritoValuador||'Perito Valuador', PW/2 - QR_SIZE/4, y, {align:'center'}); y+=4
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...DGRAY)
  doc.text(form.maestria||'', PW/2 - QR_SIZE/4, y, {align:'center'}); y+=4
  doc.text(`Cédula: ${form.cedulaProfesional||'—'}   Reg. SHF: ${form.noRegSHF||'—'}`, PW/2 - QR_SIZE/4, y, {align:'center'})
  if(form.regEstatalPeritos){ y+=4; doc.text(`Reg. Estatal: ${form.regEstatalPeritos}`, PW/2 - QR_SIZE/4, y, {align:'center'}) }

  // Insertar QR — se carga como imagen desde /qr_giaval.png
  try {
    await new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || 200
          canvas.height = img.naturalHeight || 200
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const qrData = canvas.toDataURL('image/png')
          doc.addImage(qrData, 'PNG', qrX, firmaStartY - 4, QR_SIZE, QR_SIZE, undefined, 'FAST')
          doc.setFont('helvetica','normal'); doc.setFontSize(5.5); doc.setTextColor(...DGRAY)
          doc.text('QR para validar', qrX + QR_SIZE/2, firmaStartY + QR_SIZE + 1, {align:'center'})
        } catch(e) { console.warn('[QR] No se pudo insertar:', e.message) }
        resolve()
      }
      img.onerror = () => { console.warn('[QR] No se pudo cargar la imagen del QR'); resolve() }
      img.src = '/qr_giaval.png'
    })
  } catch(e) { console.warn('[QR] Error:', e.message) }

  // Portada: valor conclusivo — para referidos usa valorReferidoFinal
  // Para referidos: etiqueta "VALOR REFERENCIADO DEL INMUEBLE"
  // Para comerciales: etiqueta "VALOR CONCLUSIVO DEL INMUEBLE"
  const valConclPortada = esReferido
    ? (n(form.valorReferidoFinal) || n(avaluoMeta?.valor_conclusivo) || n(form.valorMercado) || 0)
    : (n(form.valorMercado) || n(form.valorFisico) || n(form.valorRentas))
  if(valConclPortada>0){
    doc.setPage(1)
    // pyBox ajustado a 258 para no pisarse con la foto más grande
    const pyBox=258
    const lblPortada = esReferido
      ? 'VALOR REFERENCIADO DEL INMUEBLE:'
      : 'VALOR CONCLUSIVO DEL INMUEBLE:'
    doc.setFillColor(...GOLD); doc.rect(MG,pyBox,CW,22,'F')
    doc.setTextColor(...NAVY); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text(lblPortada,PW/2,pyBox+5,{align:'center'})
    doc.setFontSize(16); doc.text(fmtM(valConclPortada),PW/2,pyBox+14,{align:'center'})
    if(form.valorConclusivoLetras){
      doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(50,40,20)
      const letBrief=doc.splitTextToSize(form.valorConclusivoLetras.toUpperCase(),CW-4)
      doc.text(letBrief[0]||'',PW/2,pyBox+20,{align:'center'})
    }
  }

  // Pie de página en todas las hojas — numeración más visible
  const total=doc.getNumberOfPages()
  for(let i=1;i<=total;i++){
    doc.setPage(i)
    // Línea separadora
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.4); doc.line(MG,276,MG+CW,276)
    // Fondo gris claro para el pie
    doc.setFillColor(245,247,250); doc.rect(MG,277,CW,8,'F')
    // Folio a la izquierda
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...DGRAY)
    doc.text(form.folioInterno||'',MG+1,282)
    // Número de página centrado — más grande y visible
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...NAVY)
    doc.text(`— ${i} / ${total} —`,PW/2,282,{align:'center'})
    // Perito a la derecha
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...DGRAY)
    doc.text(form.peritoValuador||'',PW-MG-1,282,{align:'right'})
  }

  // ── DESCARGA: fusionar si hay PDFs anexos, descargar directo si no ──
  const folio=(form.folioInterno||'avaluo').replace(/[^a-zA-Z0-9\-_]/g,'_')

  if(pdfAnexos.length > 0){
    console.log(`[PDF] Fusionando ${pdfAnexos.length} PDF(s) con pdf-lib…`)
    const mainBytes = doc.output('arraybuffer')
    const blob = await fusionarPDFs(mainBytes, pdfAnexos)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${folio}_avaluo_completo.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    console.log('[PDF] PDF fusionado descargado.')
  } else {
    doc.save(`${folio}_avaluo.pdf`)
  }
}


// ══════════════════════════════════════════════════════════════════
//  EXCEL — idéntico al v4 + hoja 9 incluye valorReferidoFinal
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
//  EXCEL — Reescrito con ExcelJS para formato profesional
//  Sigue la estructura de 38 hojas del formato original GIAVAL
// ══════════════════════════════════════════════════════════════════
export async function exportarExcel(form, avaluoMeta = {}) {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'GIAVAL — Sistema de Avaluos'
  wb.created = new Date()

  const n = v => parseFloat(v) || 0
  const esRef = (form.tipoAvaluo || '').toLowerCase().includes('referido')

  // ── Colores corporativos ─────────────────────────────────────
  const NAVY  = '1F3864'
  const GOLD  = 'C9A84C'
  const LGRAY = 'F0F4F8'
  const WHITE = 'FFFFFF'
  const BLACK = '000000'
  const BLUE  = '2E75B6'

  // ── Helpers de estilo ────────────────────────────────────────
  const fmtMXN = v => v > 0
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(v)
    : '—'

  const hdrStyle = (bgColor = NAVY, fgColor = WHITE, sz = 11) => ({
    font: { bold: true, color: { argb: fgColor }, size: sz, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: {
      top:    { style: 'thin', color: { argb: '999999' } },
      bottom: { style: 'thin', color: { argb: '999999' } },
      left:   { style: 'thin', color: { argb: '999999' } },
      right:  { style: 'thin', color: { argb: '999999' } },
    }
  })

  const dataStyle = (bg = WHITE, bold = false, align = 'left') => ({
    font: { bold, color: { argb: BLACK }, size: 10, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } },
    alignment: { vertical: 'middle', horizontal: align, wrapText: true },
    border: {
      top:    { style: 'hair', color: { argb: 'CCCCCC' } },
      bottom: { style: 'hair', color: { argb: 'CCCCCC' } },
      left:   { style: 'hair', color: { argb: 'CCCCCC' } },
      right:  { style: 'hair', color: { argb: 'CCCCCC' } },
    }
  })

  const goldStyle = (sz = 11) => ({
    font: { bold: true, color: { argb: NAVY }, size: sz, name: 'Arial' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: {
      top:    { style: 'medium', color: { argb: GOLD } },
      bottom: { style: 'medium', color: { argb: GOLD } },
      left:   { style: 'medium', color: { argb: GOLD } },
      right:  { style: 'medium', color: { argb: GOLD } },
    }
  })

  // Aplica estilo a un rango de celdas
  const styleRange = (ws, startRow, startCol, endRow, endCol, style) => {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        Object.assign(ws.getCell(r, c), { style })
      }
    }
  }

  // Encabezado estándar de cada hoja (folio, fecha, vigencia)
  const addEncabezado = (ws, titulo) => {
    ws.mergeCells('A1:H1')
    const t = ws.getCell('A1')
    t.value = titulo
    Object.assign(t, { style: hdrStyle(NAVY, WHITE, 13) })
    ws.getRow(1).height = 22

    ws.mergeCells('A2:E2')
    ws.getCell('A2').value = `FOLIO: ${form.folioInterno || '—'}   |   FECHA: ${form.fechaAvaluo || '—'}   |   VIGENCIA: ${form.vigenciaAvaluo || 'Seis Meses'}`
    Object.assign(ws.getCell('A2'), { style: dataStyle(LGRAY, true, 'center') })
    ws.mergeCells('F2:H2')
    ws.getCell('F2').value = form.peritoValuador || '—'
    Object.assign(ws.getCell('F2'), { style: dataStyle(LGRAY, false, 'right') })
    ws.getRow(2).height = 16

    ws.mergeCells('A3:H3')
    ws.getCell('A3').value = 'Norte 3  No.54 Altos 1  Tel: 2722174550  Col. Centro  Orizaba, Veracruz.'
    Object.assign(ws.getCell('A3'), { style: dataStyle(WHITE, false, 'center') })
    ws.getRow(3).height = 14

    // Línea separadora
    ws.mergeCells('A4:H4')
    ws.getCell('A4').value = ''
    ws.getRow(4).height = 6
    for (let c = 1; c <= 8; c++) {
      ws.getCell(4, c).style = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } }
      }
    }

    return 5 // próxima fila disponible
  }

  // ────────────────────────────────────────────────────────────
  // 1. PORTADA
  // ────────────────────────────────────────────────────────────
  const wsPortada = wb.addWorksheet('PORTADA')
  wsPortada.columns = [
    { key: 'a', width: 22 }, { key: 'b', width: 16 },
    { key: 'c', width: 20 }, { key: 'd', width: 16 },
    { key: 'e', width: 18 }, { key: 'f', width: 14 },
    { key: 'g', width: 14 }, { key: 'h', width: 14 },
  ]

  wsPortada.mergeCells('A1:H2')
  wsPortada.getCell('A1').value = 'GIAVAL — GRUPO INMOBILIARIO DE AVALÚOS'
  Object.assign(wsPortada.getCell('A1'), { style: hdrStyle(NAVY, GOLD, 18) })
  wsPortada.getRow(1).height = 30

  wsPortada.mergeCells('A3:H3')
  wsPortada.getCell('A3').value = (form.tipoAvaluo || 'AVALÚO COMERCIAL').toUpperCase()
  Object.assign(wsPortada.getCell('A3'), { style: goldStyle(14) })
  wsPortada.getRow(3).height = 22

  const porFields = [
    ['Folio Interno:', form.folioInterno || '—'],
    ['Fecha del Avalúo:', form.fechaAvaluo || '—'],
    ['Vigencia:', form.vigenciaAvaluo || 'Seis Meses'],
    ['Propósito:', form.proposito || '—'],
    ['Tipo de Inmueble:', form.bienQueSeValua || '—'],
    ['Régimen:', form.regimenPropiedad || '—'],
  ]

  wsPortada.getRow(4).height = 8
  porFields.forEach(([lbl, val], i) => {
    const r = 5 + i
    wsPortada.mergeCells(`A${r}:B${r}`)
    wsPortada.getCell(`A${r}`).value = lbl
    Object.assign(wsPortada.getCell(`A${r}`), { style: dataStyle(LGRAY, true) })
    wsPortada.mergeCells(`C${r}:H${r}`)
    wsPortada.getCell(`C${r}`).value = val
    Object.assign(wsPortada.getCell(`C${r}`), { style: dataStyle(WHITE) })
    wsPortada.getRow(r).height = 16
  })

  const porDir = [
    ['Nombre del Propietario:', form.nombrePropietario || '—'],
    ['Nombre del Solicitante:', form.nombreSolicitante || '—'],
    ['Calle:', `${form.calle || ''} ${form.numeroExterior || ''}`.trim() || '—'],
    ['Colonia:', form.colonia || '—'],
    ['Municipio:', form.municipio || '—'],
    ['Código Postal:', form.codigoPostal || '—'],
    ['Entidad Federativa:', form.entidadFederativa || '—'],
    ['Cuenta Predial:', form.cuentaPredial || '—'],
    ['Coordenadas:', form.latitud && form.longitud ? `${form.latitud}, ${form.longitud}` : '—'],
  ]

  let rp = 12
  wsPortada.getRow(rp).height = 8
  rp++
  wsPortada.mergeCells(`A${rp}:H${rp}`)
  wsPortada.getCell(`A${rp}`).value = 'IDENTIFICACIÓN DEL INMUEBLE'
  Object.assign(wsPortada.getCell(`A${rp}`), { style: hdrStyle(BLUE, WHITE, 11) })
  wsPortada.getRow(rp).height = 18
  rp++

  porDir.forEach(([lbl, val]) => {
    wsPortada.mergeCells(`A${rp}:B${rp}`)
    wsPortada.getCell(`A${rp}`).value = lbl
    Object.assign(wsPortada.getCell(`A${rp}`), { style: dataStyle(LGRAY, true) })
    wsPortada.mergeCells(`C${rp}:H${rp}`)
    wsPortada.getCell(`C${rp}`).value = val
    Object.assign(wsPortada.getCell(`C${rp}`), { style: dataStyle(WHITE) })
    wsPortada.getRow(rp).height = 16
    rp++
  })

  // Valor conclusivo
  rp += 2
  wsPortada.mergeCells(`A${rp}:H${rp}`)
  wsPortada.getCell(`A${rp}`).value = esRef ? 'VALOR REFERENCIADO DEL INMUEBLE' : 'CONCLUSIÓN DEL AVALÚO'
  Object.assign(wsPortada.getCell(`A${rp}`), { style: hdrStyle(NAVY, GOLD, 13) })
  wsPortada.getRow(rp).height = 22
  rp++

  const valFinal = esRef
    ? (n(form.valorReferidoFinal) || n(avaluoMeta?.valor_conclusivo) || 0)
    : (n(form.valorMercado) || n(form.valorFisico) || n(form.valorRentas))

  wsPortada.mergeCells(`A${rp}:H${rp}`)
  wsPortada.getCell(`A${rp}`).value = valFinal > 0 ? valFinal : '—'
  wsPortada.getCell(`A${rp}`).numFmt = '"$"#,##0.00'
  Object.assign(wsPortada.getCell(`A${rp}`), { style: goldStyle(16) })
  wsPortada.getRow(rp).height = 28
  rp++

  if (form.valorConclusivoLetras) {
    wsPortada.mergeCells(`A${rp}:H${rp}`)
    wsPortada.getCell(`A${rp}`).value = `(${form.valorConclusivoLetras.toUpperCase()})`
    Object.assign(wsPortada.getCell(`A${rp}`), { style: dataStyle(LGRAY, false, 'center') })
    wsPortada.getRow(rp).height = 18
  }

  // ────────────────────────────────────────────────────────────
  // 2. DATOS GENERALES
  // ────────────────────────────────────────────────────────────
  const wsDatos = wb.addWorksheet('Datos Generales')
  wsDatos.columns = [
    { key: 'a', width: 32 }, { key: 'b', width: 28 },
    { key: 'c', width: 20 }, { key: 'd', width: 20 },
  ]
  let rd = addEncabezado(wsDatos, 'I. DATOS GENERALES DEL AVALÚO')

  const datosSecs = [
    { titulo: 'DATOS DEL EXPEDIENTE', campos: [
      ['Folio Interno', form.folioInterno || '—'],
      ['Tipo de Avalúo', form.tipoAvaluo || '—'],
      ['Propósito', form.proposito || '—'],
      ['Fecha del Avalúo', form.fechaAvaluo || '—'],
      ['Vigencia', form.vigenciaAvaluo || 'Seis Meses'],
      ['Bien que se Valúa', form.bienQueSeValua || '—'],
      ['Régimen de Propiedad', form.regimenPropiedad || '—'],
      ['Uso de Suelo', form.usoSuelo || '—'],
      ['Uso Actual', form.usoActual || '—'],
    ]},
    { titulo: 'PARTES INVOLUCRADAS', campos: [
      ['Nombre del Propietario', form.nombrePropietario || '—'],
      ['Nombre del Solicitante', form.nombreSolicitante || '—'],
      ['Perito Valuador', form.peritoValuador || '—'],
      ['Maestría / Especialidad', form.maestria || '—'],
      ['Cédula Profesional', form.cedulaProfesional || '—'],
      ['Registro SHF', form.noRegSHF || '—'],
      ['Registro Estatal Peritos', form.regEstatalPeritos || '—'],
    ]},
    { titulo: 'DOMICILIO DEL INMUEBLE', campos: [
      ['Calle', form.calle || '—'],
      ['Número Exterior', form.numeroExterior || '—'],
      ['Número Interior', form.numeroInterior || '—'],
      ['Colonia / Fraccionamiento', form.colonia || '—'],
      ['Municipio', form.municipio || '—'],
      ['Código Postal', form.codigoPostal || '—'],
      ['Entidad Federativa', form.entidadFederativa || '—'],
      ['Cuenta Predial', form.cuentaPredial || '—'],
      ['Latitud', form.latitud || '—'],
      ['Longitud', form.longitud || '—'],
      ['Altitud', form.altitud || '—'],
    ]},
    { titulo: 'DATOS DE LA ESCRITURA / NOTARÍA', campos: [
      ['Notario', form.notarioNombre || '—'],
      ['Número de Notaría', form.numeroNotario || '—'],
      ['Ciudad del Notario', form.notarioCiudad || '—'],
      ['Número de Escritura', form.numeroEscritura || '—'],
      ['Fecha de Escritura', form.fechaEscritura || '—'],
      ['Medidas Según', form.medidasSegun || '—'],
    ]},
  ]

  datosSecs.forEach(sec => {
    wsDatos.mergeCells(`A${rd}:D${rd}`)
    wsDatos.getCell(`A${rd}`).value = sec.titulo
    Object.assign(wsDatos.getCell(`A${rd}`), { style: hdrStyle(BLUE, WHITE, 11) })
    wsDatos.getRow(rd).height = 18
    rd++

    sec.campos.forEach(([lbl, val]) => {
      wsDatos.mergeCells(`A${rd}:B${rd}`)
      wsDatos.getCell(`A${rd}`).value = lbl
      Object.assign(wsDatos.getCell(`A${rd}`), { style: dataStyle(LGRAY, true) })
      wsDatos.mergeCells(`C${rd}:D${rd}`)
      wsDatos.getCell(`C${rd}`).value = val
      Object.assign(wsDatos.getCell(`C${rd}`), { style: dataStyle(WHITE) })
      wsDatos.getRow(rd).height = 16
      rd++
    })
    rd++
  })

  // ────────────────────────────────────────────────────────────
  // 3. CARACTERÍSTICAS URBANAS Y DEL TERRENO
  // ────────────────────────────────────────────────────────────
  const wsCarac = wb.addWorksheet('Carac. Terreno')
  wsCarac.columns = [
    { key: 'a', width: 32 }, { key: 'b', width: 28 },
    { key: 'c', width: 20 }, { key: 'd', width: 20 },
  ]
  let rc = addEncabezado(wsCarac, 'II. CARACTERÍSTICAS URBANAS Y DEL TERRENO')

  const caracSecs = [
    { titulo: 'CARACTERÍSTICAS URBANAS', campos: [
      ['Nivel de Infraestructura', form.nivelInfraestructura || '—'],
      ['Agua Potable', form.aguaPotable || '—'],
      ['Drenaje', form.drenaje || '—'],
      ['Electrificación', form.electrificacion || '—'],
      ['Alumbrado Público', form.alumbradoPublico || '—'],
      ['Telefonía', form.telefono || '—'],
      ['Señalización', form.senalizacion || '—'],
      ['Transporte Público', form.transportePublico || '—'],
      ['Vigilancia', form.vigilancia || '—'],
      ['Nivel de Equipamiento', form.nivelEquipamiento || '—'],
      ['Clasificación de Zona', form.clasificacionZona || '—'],
      ['Uso de Suelo', form.usoSuelo || '—'],
      ['Proximidad Urbana', form.refProximidadUrbana || '—'],
      ['Vías de Acceso', form.viasAcceso || '—'],
      ['Construcciones Predominantes', form.construccionesPredominantes || '—'],
    ]},
    { titulo: 'MEDIDAS Y COLINDANCIAS', campos: [
      ['Superficie del Terreno (m²)', form.areaTerreno || '—'],
      ['Superficie Construcción Habitable (m²)', form.areaConstruccionHabitable || '—'],
      ['Área de Construcción Total (m²)', form.areaConstruccion || '—'],
      ['Indiviso (%)', form.indiviso || '—'],
      ['Topografía', form.topografia || '—'],
      ['Número de Frentes', form.numeroFrente || '—'],
      ['Servidumbres', form.servidumbre || 'Ninguna'],
      ['Observaciones del Predio', form.observacionesPredio || '—'],
    ]},
  ]

  // Medidas individuales
  if (form.medidas?.length) {
    caracSecs.push({
      titulo: 'TABLA DE MEDIDAS Y COLINDANCIAS',
      campos: form.medidas.map(m => [
        m.orientacion === 'Otro' ? (m.orientacionOtro || 'Otro') : m.orientacion,
        `${m.distancia || '—'} m — ${m.colindante || '—'}`
      ])
    })
  }

  caracSecs.forEach(sec => {
    wsCarac.mergeCells(`A${rc}:D${rc}`)
    wsCarac.getCell(`A${rc}`).value = sec.titulo
    Object.assign(wsCarac.getCell(`A${rc}`), { style: hdrStyle(BLUE, WHITE, 11) })
    wsCarac.getRow(rc).height = 18
    rc++

    sec.campos.forEach(([lbl, val]) => {
      wsCarac.mergeCells(`A${rc}:B${rc}`)
      wsCarac.getCell(`A${rc}`).value = lbl
      Object.assign(wsCarac.getCell(`A${rc}`), { style: dataStyle(LGRAY, true) })
      wsCarac.mergeCells(`C${rc}:D${rc}`)
      wsCarac.getCell(`C${rc}`).value = val
      Object.assign(wsCarac.getCell(`C${rc}`), { style: dataStyle(WHITE) })
      wsCarac.getRow(rc).height = 16
      rc++
    })
    rc++
  })

  // ────────────────────────────────────────────────────────────
  // 4. DESCRIPCIÓN DEL INMUEBLE
  // ────────────────────────────────────────────────────────────
  const wsDescrip = wb.addWorksheet('Descrip. Inmueble')
  wsDescrip.columns = [
    { key: 'a', width: 32 }, { key: 'b', width: 28 },
    { key: 'c', width: 20 }, { key: 'd', width: 20 },
  ]
  let rdes = addEncabezado(wsDescrip, 'III. DESCRIPCIÓN DEL INMUEBLE')

  // Descripción narrativa
  wsDescrip.mergeCells(`A${rdes}:D${rdes}`)
  wsDescrip.getCell(`A${rdes}`).value = 'DESCRIPCIÓN GENERAL'
  Object.assign(wsDescrip.getCell(`A${rdes}`), { style: hdrStyle(BLUE, WHITE, 11) })
  wsDescrip.getRow(rdes).height = 18; rdes++

  if (form.descripcionInmueble) {
    wsDescrip.mergeCells(`A${rdes}:D${rdes + 3}`)
    wsDescrip.getCell(`A${rdes}`).value = form.descripcionInmueble
    Object.assign(wsDescrip.getCell(`A${rdes}`), {
      style: { ...dataStyle(WHITE), alignment: { wrapText: true, vertical: 'top' } }
    })
    wsDescrip.getRow(rdes).height = 60; rdes += 4
  }

  const descripFields = [
    ['Tipo de Construcción', form.tiposConstruccion || '—'],
    ['Calidad / Clasificación', form.calidadClasificacion || '—'],
    ['Número de Niveles', form.numNiveles != null ? String(form.numNiveles) : '—'],
    ['Edad Aproximada (años)', form.edadAproximada || '—'],
    ['Vida Útil Total (años)', form.vidaTotal || '—'],
    ['Vida Remanente (años)', (form.vidaTotal && form.edadAproximada) ? String(n(form.vidaTotal) - n(form.edadAproximada)) : '—'],
    ['Estado de Conservación', form.estadoConservacion || '—'],
    ['Calidad del Proyecto', form.calidadProyecto || '—'],
    ['Uso Actual', form.usoActual || '—'],
    ['Número de Recámaras', form.numRecamaras || '—'],
    ['Baños Completos', form.numBanosCompletos || '—'],
    ['Medios Baños', form.numMediosBanos || '—'],
    ['Estacionamientos', form.estacionamientos || '—'],
    ['Elevador', form.elevador || 'No tiene'],
    ['Cocinas', form.numCocina || '—'],
    ['Estructura', form.estructura || '—'],
    ['Inst. Hidráulica', form.hidraulico || '—'],
    ['Inst. Eléctrica', form.electrico || '—'],
    ['Carpintería', form.carpinteria || '—'],
    ['Herrería', form.herreria || '—'],
  ]

  wsDescrip.mergeCells(`A${rdes}:D${rdes}`)
  wsDescrip.getCell(`A${rdes}`).value = 'CARACTERÍSTICAS DEL INMUEBLE'
  Object.assign(wsDescrip.getCell(`A${rdes}`), { style: hdrStyle(BLUE, WHITE, 11) })
  wsDescrip.getRow(rdes).height = 18; rdes++

  descripFields.forEach(([lbl, val]) => {
    wsDescrip.mergeCells(`A${rdes}:B${rdes}`)
    wsDescrip.getCell(`A${rdes}`).value = lbl
    Object.assign(wsDescrip.getCell(`A${rdes}`), { style: dataStyle(LGRAY, true) })
    wsDescrip.mergeCells(`C${rdes}:D${rdes}`)
    wsDescrip.getCell(`C${rdes}`).value = val
    Object.assign(wsDescrip.getCell(`C${rdes}`), { style: dataStyle(WHITE) })
    wsDescrip.getRow(rdes).height = 16; rdes++
  })

  // Tabla de acabados
  if (form.acabados?.length) {
    rdes++
    wsDescrip.mergeCells(`A${rdes}:D${rdes}`)
    wsDescrip.getCell(`A${rdes}`).value = 'TABLA DE ACABADOS'
    Object.assign(wsDescrip.getCell(`A${rdes}`), { style: hdrStyle(BLUE, WHITE, 11) })
    wsDescrip.getRow(rdes).height = 18; rdes++

    const acabHdr = ['Espacio', 'Piso', 'Muro', 'Plafón']
    acabHdr.forEach((h, i) => {
      wsDescrip.getCell(rdes, i + 1).value = h
      Object.assign(wsDescrip.getCell(rdes, i + 1), { style: hdrStyle(NAVY, WHITE, 10) })
    })
    wsDescrip.getRow(rdes).height = 16; rdes++

    form.acabados.forEach((a, idx) => {
      const bg = idx % 2 === 0 ? LGRAY : WHITE
      ;[a.espacio, a.piso, a.muro, a.plafon].forEach((v, i) => {
        wsDescrip.getCell(rdes, i + 1).value = v || '—'
        Object.assign(wsDescrip.getCell(rdes, i + 1), { style: dataStyle(bg) })
      })
      wsDescrip.getRow(rdes).height = 16; rdes++
    })
  }

  // ────────────────────────────────────────────────────────────
  // 5. COMPARABLE CASA (Enfoque de Mercado)
  // ────────────────────────────────────────────────────────────
  const wsCasa = wb.addWorksheet('Comparable Casa')
  const customFCasa = form.factoresCasaCustom || []
  const baseKeysCasa = ['neg', 'ubic', 'sup', 'calid', 'edoCons', 'zona']
  const todosFCasa = [
    ...baseKeysCasa.map(k => ({ key: k, label: k.toUpperCase() })),
    ...customFCasa.map(f => ({ key: f.key, label: f.label }))
  ]
  const calcVU = (comp, factores) => {
    const supKey = 'supConst'
    if (!comp.oferta || !comp[supKey]) return 0
    const fre = factores.reduce((a, f) => a * (parseFloat(comp.factores?.[f.key]) || 1), 1)
    return parseFloat(comp.oferta) / parseFloat(comp[supKey]) * fre
  }
  const enNRCasa = (() => {
    const vus = (form.comparablesCasa || []).filter(c => c.oferta && c.supConst).map(c => calcVU(c, todosFCasa))
    return vus.length > 0 ? Math.round(vus.reduce((a, b) => a + b, 0) / vus.length) : 0
  })()
  const areaCH = n(form.areaConstruccionHabitable || form.areaConstruccion)

  const colsCasa = [
    { width: 5 }, { width: 16 }, { width: 16 }, { width: 12 },
    { width: 10 }, { width: 12 },
    ...todosFCasa.map(() => ({ width: 8 })),
    { width: 10 }, { width: 14 }
  ]
  wsCasa.columns = colsCasa
  let rca = addEncabezado(wsCasa, 'VII. MERCADO DE INMUEBLES SIMILARES — CASAS EN VENTA')

  // Encabezados tabla
  const casaHdrs = ['#', 'Ciudad', 'Colonia', 'Oferta ($)', 'Sup. m²', '$/m² Base', ...todosFCasa.map(f => f.label), 'FRe', '$/m² Hom.']
  casaHdrs.forEach((h, i) => {
    wsCasa.getCell(rca, i + 1).value = h
    Object.assign(wsCasa.getCell(rca, i + 1), { style: hdrStyle(NAVY, WHITE, 9) })
  })
  wsCasa.getRow(rca).height = 20; rca++

  ;(form.comparablesCasa || []).filter(c => c.oferta).forEach((c, idx) => {
    const fre = todosFCasa.reduce((a, f) => a * (parseFloat(c.factores?.[f.key]) || 1), 1)
    const base = c.oferta && c.supConst ? parseFloat(c.oferta) / parseFloat(c.supConst) : 0
    const vu = base * fre
    const bg = idx % 2 === 0 ? LGRAY : WHITE
    const row = [
      idx + 1, c.ciudad || '—', c.colonia || '—',
      n(c.oferta), n(c.supConst),
      parseFloat(base.toFixed(2)),
      ...todosFCasa.map(f => parseFloat((parseFloat(c.factores?.[f.key] || 1)).toFixed(4))),
      parseFloat(fre.toFixed(4)),
      parseFloat(vu.toFixed(2))
    ]
    row.forEach((v, i) => {
      wsCasa.getCell(rca, i + 1).value = v
      const isNum = typeof v === 'number'
      Object.assign(wsCasa.getCell(rca, i + 1), { style: dataStyle(bg, false, isNum ? 'right' : 'left') })
      if (i === 3 || i === row.length - 1) wsCasa.getCell(rca, i + 1).numFmt = '"$"#,##0.00'
    })
    wsCasa.getRow(rca).height = 16; rca++

    // Fila de características y URL
    if (c.descripcion || c.caracteristicas || c.url) {
      wsCasa.mergeCells(`A${rca}:${String.fromCharCode(65 + colsCasa.length - 1)}${rca}`)
      wsCasa.getCell(`A${rca}`).value = [c.descripcion || c.caracteristicas, c.url].filter(Boolean).join(' | ')
      Object.assign(wsCasa.getCell(`A${rca}`), { style: { ...dataStyle('FFF9E6'), alignment: { wrapText: true } } })
      wsCasa.getRow(rca).height = 30; rca++
    }
  })

  // Fila de resultado EN N.R.
  wsCasa.mergeCells(`A${rca}:E${rca}`)
  wsCasa.getCell(`A${rca}`).value = 'EN N.R. PROMEDIO $/m²:'
  Object.assign(wsCasa.getCell(`A${rca}`), { style: hdrStyle(NAVY, WHITE, 10) })
  wsCasa.getCell(rca, 6).value = enNRCasa > 0 ? enNRCasa : '—'
  if (enNRCasa > 0) wsCasa.getCell(rca, 6).numFmt = '"$"#,##0.00'
  Object.assign(wsCasa.getCell(rca, 6), { style: goldStyle(11) })
  wsCasa.getRow(rca).height = 20; rca++

  rca++
  wsCasa.getCell(`A${rca}`).value = 'Área Construida (m²):'
  Object.assign(wsCasa.getCell(`A${rca}`), { style: dataStyle(LGRAY, true) })
  wsCasa.getCell(rca, 2).value = areaCH || '—'
  Object.assign(wsCasa.getCell(rca, 2), { style: dataStyle(WHITE) })
  wsCasa.getRow(rca).height = 16; rca++

  wsCasa.getCell(`A${rca}`).value = 'Valor de Mercado Total:'
  Object.assign(wsCasa.getCell(`A${rca}`), { style: dataStyle(LGRAY, true) })
  const vmTotal = enNRCasa && areaCH ? enNRCasa * areaCH : 0
  wsCasa.getCell(rca, 2).value = vmTotal > 0 ? vmTotal : '—'
  if (vmTotal > 0) wsCasa.getCell(rca, 2).numFmt = '"$"#,##0.00'
  Object.assign(wsCasa.getCell(rca, 2), { style: goldStyle(11) })
  wsCasa.getRow(rca).height = 18

  // ────────────────────────────────────────────────────────────
  // 6. COMPARABLE TERRENO
  // ────────────────────────────────────────────────────────────
  const wsTerreno = wb.addWorksheet('Comparable Terreno')
  const customFTerreno = form.factoresTerrenoCustom || []
  const baseKeysTerreno = ['neg', 'zona', 'ubica', 'frente', 'sup', 'forma']
  const todosFTerreno = [
    ...baseKeysTerreno.map(k => ({ key: k, label: k.toUpperCase() })),
    ...customFTerreno.map(f => ({ key: f.key, label: f.label }))
  ]
  const enNRTerreno = (() => {
    const vus = (form.comparablesTerreno || []).filter(c => c.oferta && c.supM2).map(c => {
      const fre = todosFTerreno.reduce((a, f) => a * (parseFloat(c.factores?.[f.key]) || 1), 1)
      return parseFloat(c.oferta) / parseFloat(c.supM2) * fre
    })
    return vus.length > 0 ? Math.round(vus.reduce((a, b) => a + b, 0) / vus.length) : 0
  })()
  const areaT = n(form.areaTerreno)

  const colsTer = [
    { width: 5 }, { width: 16 }, { width: 16 }, { width: 12 },
    { width: 10 }, { width: 12 },
    ...todosFTerreno.map(() => ({ width: 8 })),
    { width: 10 }, { width: 14 }
  ]
  wsTerreno.columns = colsTer
  let rter = addEncabezado(wsTerreno, 'VIII. MERCADO DE INMUEBLES SIMILARES — TERRENOS')

  const terHdrs = ['#', 'Ciudad', 'Colonia', 'Oferta ($)', 'Sup. m²', '$/m² Base', ...todosFTerreno.map(f => f.label), 'FRe', '$/m² Hom.']
  terHdrs.forEach((h, i) => {
    wsTerreno.getCell(rter, i + 1).value = h
    Object.assign(wsTerreno.getCell(rter, i + 1), { style: hdrStyle(NAVY, WHITE, 9) })
  })
  wsTerreno.getRow(rter).height = 20; rter++

  ;(form.comparablesTerreno || []).filter(c => c.oferta).forEach((c, idx) => {
    const fre = todosFTerreno.reduce((a, f) => a * (parseFloat(c.factores?.[f.key]) || 1), 1)
    const base = c.oferta && c.supM2 ? parseFloat(c.oferta) / parseFloat(c.supM2) : 0
    const vu = base * fre
    const bg = idx % 2 === 0 ? LGRAY : WHITE
    const row = [
      idx + 1, c.ciudad || '—', c.colonia || '—',
      n(c.oferta), n(c.supM2),
      parseFloat(base.toFixed(2)),
      ...todosFTerreno.map(f => parseFloat((parseFloat(c.factores?.[f.key] || 1)).toFixed(4))),
      parseFloat(fre.toFixed(4)),
      parseFloat(vu.toFixed(2))
    ]
    row.forEach((v, i) => {
      wsTerreno.getCell(rter, i + 1).value = v
      const isNum = typeof v === 'number'
      Object.assign(wsTerreno.getCell(rter, i + 1), { style: dataStyle(bg, false, isNum ? 'right' : 'left') })
      if (i === 3 || i === row.length - 1) wsTerreno.getCell(rter, i + 1).numFmt = '"$"#,##0.00'
    })
    wsTerreno.getRow(rter).height = 16; rter++

    if (c.descripcion || c.url) {
      wsTerreno.mergeCells(`A${rter}:${String.fromCharCode(65 + colsTer.length - 1)}${rter}`)
      wsTerreno.getCell(`A${rter}`).value = [c.descripcion, c.url].filter(Boolean).join(' | ')
      Object.assign(wsTerreno.getCell(`A${rter}`), { style: { ...dataStyle('FFF9E6'), alignment: { wrapText: true } } })
      wsTerreno.getRow(rter).height = 30; rter++
    }
  })

  wsTerreno.mergeCells(`A${rter}:E${rter}`)
  wsTerreno.getCell(`A${rter}`).value = 'EN N.R. PROMEDIO $/m² TERRENO:'
  Object.assign(wsTerreno.getCell(`A${rter}`), { style: hdrStyle(NAVY, WHITE, 10) })
  wsTerreno.getCell(rter, 6).value = enNRTerreno > 0 ? enNRTerreno : '—'
  if (enNRTerreno > 0) wsTerreno.getCell(rter, 6).numFmt = '"$"#,##0.00'
  Object.assign(wsTerreno.getCell(rter, 6), { style: goldStyle(11) })
  wsTerreno.getRow(rter).height = 20; rter++

  rter++
  wsTerreno.getCell(`A${rter}`).value = 'Área Terreno (m²):'
  Object.assign(wsTerreno.getCell(`A${rter}`), { style: dataStyle(LGRAY, true) })
  wsTerreno.getCell(rter, 2).value = areaT || '—'
  Object.assign(wsTerreno.getCell(rter, 2), { style: dataStyle(WHITE) })
  wsTerreno.getRow(rter).height = 16; rter++

  wsTerreno.getCell(`A${rter}`).value = 'Valor del Terreno Total:'
  Object.assign(wsTerreno.getCell(`A${rter}`), { style: dataStyle(LGRAY, true) })
  const vtTotal = enNRTerreno && areaT ? enNRTerreno * areaT : 0
  wsTerreno.getCell(rter, 2).value = vtTotal > 0 ? vtTotal : '—'
  if (vtTotal > 0) wsTerreno.getCell(rter, 2).numFmt = '"$"#,##0.00'
  Object.assign(wsTerreno.getCell(rter, 2), { style: goldStyle(11) })
  wsTerreno.getRow(rter).height = 18

  // ────────────────────────────────────────────────────────────
  // 7. MERCADO DE RENTAS
  // ────────────────────────────────────────────────────────────
  if ((form.comparablesRentas || []).length > 0 || form.ingresos) {
    const wsRentas = wb.addWorksheet('Mercado Rentas')
    wsRentas.columns = [
      { width: 5 }, { width: 16 }, { width: 16 }, { width: 14 },
      { width: 12 }, { width: 12 }, { width: 10 }, { width: 14 }
    ]
    let rrn = addEncabezado(wsRentas, 'IX. MERCADO DE RENTAS')

    ;['#', 'Ciudad', 'Colonia', 'Renta/mes ($)', 'Sup. m²', '$/m²/mes', 'FRe', '$/m² Hom.'].forEach((h, i) => {
      wsRentas.getCell(rrn, i + 1).value = h
      Object.assign(wsRentas.getCell(rrn, i + 1), { style: hdrStyle(NAVY, WHITE, 9) })
    })
    wsRentas.getRow(rrn).height = 20; rrn++

    ;(form.comparablesRentas || []).filter(c => c.oferta).forEach((c, idx) => {
      const fre = ['neg','ubic','sup','calid','edoCons'].reduce((a, k) => a * (parseFloat(c.factores?.[k]) || 1), 1)
      const base = c.oferta && c.supM2 ? parseFloat(c.oferta) / parseFloat(c.supM2) : 0
      const bg = idx % 2 === 0 ? LGRAY : WHITE
      ;[idx+1, c.ciudad||'—', c.colonia||'—', n(c.oferta), n(c.supM2), parseFloat(base.toFixed(2)), parseFloat(fre.toFixed(4)), parseFloat((base*fre).toFixed(2))].forEach((v, i) => {
        wsRentas.getCell(rrn, i + 1).value = v
        Object.assign(wsRentas.getCell(rrn, i + 1), { style: dataStyle(bg, false, typeof v === 'number' ? 'right' : 'left') })
        if (i === 3 || i === 7) wsRentas.getCell(rrn, i + 1).numFmt = '"$"#,##0.00'
      })
      wsRentas.getRow(rrn).height = 16; rrn++
    })

    // Sección de capitalización de rentas
    if (form.ingresos) {
      const ing = form.ingresos
      rrn += 2
      wsRentas.mergeCells(`A${rrn}:H${rrn}`)
      wsRentas.getCell(`A${rrn}`).value = 'CAPITALIZACIÓN DE RENTAS'
      Object.assign(wsRentas.getCell(`A${rrn}`), { style: hdrStyle(BLUE, WHITE, 11) })
      wsRentas.getRow(rrn).height = 18; rrn++

      const deducKeys = ['porcVacios','porcPredial','porcAgua','porcConsManto','porcAdmon','porcEnergElec','porcSeguros','porcISR','porcOtros']
      const deducLabels = ['Vacíos','Imp. Predial','Agua','Cons/Manto','Admón.','Energ. Eléc.','Seguros','ISR','Otros']
      const totalDeducc = deducKeys.reduce((a, k) => a + n(ing[k]), 0)
      const rentaBruta = (ing.tiposRenta || []).reduce((a, t) => a + n(t.supM2) * n(t.valorM2), 0)
      const rentaNetaMens = rentaBruta - rentaBruta * totalDeducc / 100
      const mult = n(ing.multiplicadorAnual) || 15
      const tasa = n(ing.tasaManual) || 0
      const valorRentas = tasa > 0 ? (rentaNetaMens * mult) / (tasa / 100) : 0

      const ingFields = [
        ['Renta Bruta Mensual', rentaBruta],
        [`Total Deducciones (${totalDeducc.toFixed(2)}%)`, rentaBruta * totalDeducc / 100],
        ['Renta Neta Mensual', rentaNetaMens],
        [`Renta Neta Anual (× ${mult} meses)`, rentaNetaMens * mult],
        ['Tasa de Capitalización (%)', tasa],
        ['Valor por Capitalización', valorRentas],
      ]
      ingFields.forEach(([lbl, val], i) => {
        wsRentas.getCell(rrn, 1).value = lbl
        Object.assign(wsRentas.getCell(rrn, 1), { style: dataStyle(LGRAY, true) })
        wsRentas.getCell(rrn, 2).value = val
        wsRentas.getCell(rrn, 2).numFmt = i === 4 ? '0.00"%"' : '"$"#,##0.00'
        const isLast = i === ingFields.length - 1
        Object.assign(wsRentas.getCell(rrn, 2), { style: isLast ? goldStyle(11) : dataStyle(WHITE, false, 'right') })
        wsRentas.getRow(rrn).height = 16; rrn++
      })
    }
  }

  // ────────────────────────────────────────────────────────────
  // 8. COSTOS — ENFOQUE FÍSICO
  // ────────────────────────────────────────────────────────────
  const wsCostos = wb.addWorksheet('Costos-Topog.')
  wsCostos.columns = [
    { width: 10 }, { width: 24 }, { width: 12 }, { width: 12 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 14 }
  ]
  let rco = addEncabezado(wsCostos, 'XI. ENFOQUE FÍSICO — COSTOS Y VALORACIÓN')

  let totalTerr = 0, totalCons = 0, totalInst = 0

  // a) Terreno
  if (form.fraccionesTerreno?.length) {
    wsCostos.mergeCells(`A${rco}:I${rco}`)
    wsCostos.getCell(`A${rco}`).value = 'a) VALOR DEL TERRENO — FRACCIONES'
    Object.assign(wsCostos.getCell(`A${rco}`), { style: hdrStyle(BLUE, WHITE, 11) })
    wsCarac.getRow(rco).height = 18; rco++

    ;['Sup. (m²)', 'V.U. ($/m²)', 'Coeficiente', 'Motivo', 'V.U. Resultante', '', '', 'Valor Parcial', ''].forEach((h, i) => {
      wsCostos.getCell(rco, i + 1).value = h
      Object.assign(wsCostos.getCell(rco, i + 1), { style: hdrStyle(NAVY, WHITE, 9) })
    })
    wsCostos.getRow(rco).height = 18; rco++

    form.fraccionesTerreno.forEach((f, idx) => {
      const sup = n(f.sup) || areaT
      const vu = n(f.valorUnit) || enNRTerreno || 0
      const coef = n(f.coeficiente) || 1
      const motivo = f.motivo === 'OTRO' ? (f.motivoOtro || 'Otro') : (f.motivo || 'NINGUNO')
      const parcial = sup * vu * coef
      totalTerr += parcial
      const bg = idx % 2 === 0 ? LGRAY : WHITE
      ;[sup, vu, coef, motivo, vu, '', '', parcial, ''].forEach((v, i) => {
        wsCostos.getCell(rco, i + 1).value = v
        Object.assign(wsCostos.getCell(rco, i + 1), { style: dataStyle(bg, false, typeof v === 'number' ? 'right' : 'left') })
        if (i === 1 || i === 4 || i === 7) wsCostos.getCell(rco, i + 1).numFmt = '"$"#,##0.00'
      })
      wsCostos.getRow(rco).height = 16; rco++
    })

    wsCostos.mergeCells(`A${rco}:G${rco}`)
    wsCostos.getCell(`A${rco}`).value = 'TOTAL VALOR DEL TERRENO:'
    Object.assign(wsCostos.getCell(`A${rco}`), { style: hdrStyle(NAVY, WHITE, 10) })
    wsCostos.getCell(rco, 8).value = totalTerr
    wsCostos.getCell(rco, 8).numFmt = '"$"#,##0.00'
    Object.assign(wsCostos.getCell(rco, 8), { style: goldStyle(11) })
    wsCostos.getRow(rco).height = 20; rco += 2
  }

  // b) Construcción
  if (form.construcciones?.length) {
    wsCostos.mergeCells(`A${rco}:I${rco}`)
    wsCostos.getCell(`A${rco}`).value = 'b) VALOR DE CONSTRUCCIÓN (C.R.N.)'
    Object.assign(wsCostos.getCell(`A${rco}`), { style: hdrStyle(BLUE, WHITE, 11) })
    wsCostos.getRow(rco).height = 18; rco++

    ;['Tipo', 'Descripción', 'Área (m²)', 'CRN', 'F.Edad', 'F.Calidad', 'FRe', 'C.N.R. Unit.', 'Valor Total'].forEach((h, i) => {
      wsCostos.getCell(rco, i + 1).value = h
      Object.assign(wsCostos.getCell(rco, i + 1), { style: hdrStyle(NAVY, WHITE, 9) })
    })
    wsCostos.getRow(rco).height = 18; rco++

    form.construcciones.forEach((c, idx) => {
      const area = n(c.area) || n(form.areaConstruccionHabitable)
      const crn = n(c.crn), edad = n(c.factorDemeritoEdad), cal = n(c.factorDemeritoCalidad)
      const fre = edad * cal, cnrU = fre > 0 ? fre * crn : crn, vt = area * cnrU
      totalCons += vt
      const bg = idx % 2 === 0 ? LGRAY : WHITE
      ;[c.tipo, c.descripcion, area, crn, edad, cal, fre > 0 ? fre : 0, cnrU, vt].forEach((v, i) => {
        wsCostos.getCell(rco, i + 1).value = v
        Object.assign(wsCostos.getCell(rco, i + 1), { style: dataStyle(bg, false, typeof v === 'number' ? 'right' : 'left') })
        if ([3, 7, 8].includes(i)) wsCostos.getCell(rco, i + 1).numFmt = '"$"#,##0.00'
      })
      wsCostos.getRow(rco).height = 16; rco++
    })

    wsCostos.mergeCells(`A${rco}:G${rco}`)
    wsCostos.getCell(`A${rco}`).value = 'SUBTOTAL VALOR DE CONSTRUCCIÓN:'
    Object.assign(wsCostos.getCell(`A${rco}`), { style: hdrStyle(NAVY, WHITE, 10) })
    wsCostos.getCell(rco, 9).value = totalCons
    wsCostos.getCell(rco, 9).numFmt = '"$"#,##0.00'
    Object.assign(wsCostos.getCell(rco, 9), { style: goldStyle(11) })
    wsCostos.getRow(rco).height = 20; rco += 2
  }

  // c) Total Físico
  const totalFisico = totalTerr + totalCons + totalInst
  if (totalFisico > 0) {
    wsCostos.mergeCells(`A${rco}:H${rco}`)
    wsCostos.getCell(`A${rco}`).value = 'VALOR FÍSICO TOTAL (TERRENO + CONSTRUCCIÓN + I-ESPEC):'
    Object.assign(wsCostos.getCell(`A${rco}`), { style: hdrStyle(GOLD, NAVY, 12) })
    wsCostos.getCell(rco, 9).value = totalFisico
    wsCostos.getCell(rco, 9).numFmt = '"$"#,##0.00'
    Object.assign(wsCostos.getCell(rco, 9), { style: goldStyle(13) })
    wsCostos.getRow(rco).height = 24
  }

  // ────────────────────────────────────────────────────────────
  // 9. CONCLUSIÓN
  // ────────────────────────────────────────────────────────────
  const wsConc = wb.addWorksheet('Conclusión-1')
  wsConc.columns = [
    { width: 30 }, { width: 20 }, { width: 16 }, { width: 16 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
  ]
  let rconc = addEncabezado(wsConc, 'X. CONCLUSIÓN DEL AVALÚO')

  // Cuadro comparativo de enfoques
  wsConc.mergeCells(`A${rconc}:H${rconc}`)
  wsConc.getCell(`A${rconc}`).value = 'RESUMEN DE VALORES OBTENIDOS'
  Object.assign(wsConc.getCell(`A${rconc}`), { style: hdrStyle(BLUE, WHITE, 12) })
  wsConc.getRow(rconc).height = 20; rconc++

  ;['Enfoque', 'Valor ($)', '% Relativo', 'Diferencia vs Mayor'].forEach((h, i) => {
    wsConc.getCell(rconc, i + 1).value = h
    Object.assign(wsConc.getCell(rconc, i + 1), { style: hdrStyle(NAVY, WHITE, 10) })
  })
  wsConc.getRow(rconc).height = 18; rconc++

  const valMercado = n(form.valorMercado), valFisico2 = n(form.valorFisico), valRentas = n(form.valorRentas)
  const maxVal = Math.max(valMercado, valFisico2, valRentas)
  const enfoques = [
    ['Valor Comparativo de Mercado', valMercado],
    ['Valor Físico / V.N.R.', valFisico2],
    ['Valor por Capitalización de Rentas', valRentas],
  ].filter(([, v]) => v > 0)

  enfoques.forEach(([lbl, val], idx) => {
    const bg = idx % 2 === 0 ? LGRAY : WHITE
    const pct = maxVal > 0 ? (val / maxVal * 100).toFixed(1) + '%' : '—'
    const diff = maxVal > 0 ? val - maxVal : 0
    ;[lbl, val, pct, diff !== 0 ? diff : '—'].forEach((v, i) => {
      wsConc.getCell(rconc, i + 1).value = v
      Object.assign(wsConc.getCell(rconc, i + 1), { style: dataStyle(bg, false, i > 0 ? 'right' : 'left') })
      if (i === 1 || i === 3) wsConc.getCell(rconc, i + 1).numFmt = '"$"#,##0.00'
    })
    wsConc.getRow(rconc).height = 16; rconc++
  })

  // Conclusión final
  rconc += 2
  wsConc.mergeCells(`A${rconc}:H${rconc}`)
  wsConc.getCell(`A${rconc}`).value = 'XII. CONCLUSIÓN DEL AVALÚO'
  Object.assign(wsConc.getCell(`A${rconc}`), { style: hdrStyle(NAVY, WHITE, 13) })
  wsConc.getRow(rconc).height = 22; rconc++

  const concFields = [
    ['Tipo de Avalúo', form.tipoAvaluo || '—'],
    ['Enfoque Conclusivo', form.enfoqueConclusivo || (esRef ? 'Valor Referido Final' : 'Mercado')],
    ['Declaración del Valuador', form.declaraciones || '—'],
    ['Vigencia del Avalúo', form.vigenciaAvaluo || 'Seis Meses'],
    ['Fecha del Avalúo', form.fechaAvaluo || '—'],
  ]
  concFields.forEach(([lbl, val]) => {
    wsConc.mergeCells(`A${rconc}:C${rconc}`)
    wsConc.getCell(`A${rconc}`).value = lbl
    Object.assign(wsConc.getCell(`A${rconc}`), { style: dataStyle(LGRAY, true) })
    wsConc.mergeCells(`D${rconc}:H${rconc}`)
    wsConc.getCell(`D${rconc}`).value = val
    Object.assign(wsConc.getCell(`D${rconc}`), { style: { ...dataStyle(WHITE), alignment: { wrapText: true } } })
    wsConc.getRow(rconc).height = val.length > 80 ? 40 : 16; rconc++
  })

  rconc++
  wsConc.mergeCells(`A${rconc}:C${rconc}`)
  wsConc.getCell(`A${rconc}`).value = esRef ? 'VALOR REFERENCIADO:' : 'VALOR COMERCIAL:'
  Object.assign(wsConc.getCell(`A${rconc}`), { style: hdrStyle(NAVY, GOLD, 12) })
  wsConc.mergeCells(`D${rconc}:H${rconc}`)
  wsConc.getCell(`D${rconc}`).value = valFinal
  wsConc.getCell(`D${rconc}`).numFmt = '"$"#,##0.00'
  Object.assign(wsConc.getCell(`D${rconc}`), { style: goldStyle(14) })
  wsConc.getRow(rconc).height = 28; rconc++

  if (form.valorConclusivoLetras) {
    wsConc.mergeCells(`A${rconc}:H${rconc}`)
    wsConc.getCell(`A${rconc}`).value = `(${form.valorConclusivoLetras.toUpperCase()})`
    Object.assign(wsConc.getCell(`A${rconc}`), { style: { ...dataStyle(LGRAY, false, 'center'), alignment: { wrapText: true } } })
    wsConc.getRow(rconc).height = 20; rconc++
  }

  // Datos del valuador
  rconc += 2
  wsConc.mergeCells(`A${rconc}:H${rconc}`)
  wsConc.getCell(`A${rconc}`).value = 'DATOS DEL VALUADOR'
  Object.assign(wsConc.getCell(`A${rconc}`), { style: hdrStyle(BLUE, WHITE, 11) })
  wsConc.getRow(rconc).height = 18; rconc++

  ;[
    ['Nombre', form.peritoValuador || '—'],
    ['Maestría / Especialidad', form.maestria || '—'],
    ['Cédula Profesional', form.cedulaProfesional || '—'],
    ['Registro SHF', form.noRegSHF || '—'],
    ['Registro Estatal Peritos', form.regEstatalPeritos || '—'],
    ['Domicilio', 'Norte 3  No.54 Altos 1  Tel: 2722174550  Col. Centro  Orizaba, Veracruz.'],
  ].forEach(([lbl, val]) => {
    wsConc.mergeCells(`A${rconc}:C${rconc}`)
    wsConc.getCell(`A${rconc}`).value = lbl
    Object.assign(wsConc.getCell(`A${rconc}`), { style: dataStyle(LGRAY, true) })
    wsConc.mergeCells(`D${rconc}:H${rconc}`)
    wsConc.getCell(`D${rconc}`).value = val
    Object.assign(wsConc.getCell(`D${rconc}`), { style: dataStyle(WHITE) })
    wsConc.getRow(rconc).height = 16; rconc++
  })

  // ────────────────────────────────────────────────────────────
  // 10. DECLARACIONES Y ADVERTENCIAS
  // ────────────────────────────────────────────────────────────
  const wsDecl = wb.addWorksheet('Declaraciones')
  wsDecl.columns = [
    { width: 14 }, { width: 14 }, { width: 16 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 10 }, { width: 14 },
  ]
  let rdecl = addEncabezado(wsDecl, 'ANEXO — DECLARACIONES Y ADVERTENCIAS')

  const DECL_FIJA_XL = form.declaracionFija && form.declaracionFija.trim()
    ? form.declaracionFija.trim()
    : 'LAS DECLARACIONES DE HECHOS CONTENIDAS EN EL PRESENTE ESTUDIO SON VERDADERAS Y CORRECTAS. NO TENEMOS INTERÉS PRESENTE O FUTURO EN LA PROPIEDAD QUE ES OBJETO DE ESTE AVALÚO, NO TENEMOS INTERÉS PERSONAL O PARCIAL CON RESPECTO A LAS PARTES INVOLUCRADAS; ADEMÁS DECLARAMOS QUE NO PARTICIPAMOS EN EL CAPITAL O EN LOS ÓRGANOS ADMINISTRATIVOS DEL PROMOVENTE Y MANIFESTAMOS COMPLETA INDEPENDENCIA CON LA PROPIEDAD DE LOS BIENES. LOS EMOLUMENTOS RELATIVOS AL DESARROLLO DEL TRABAJO VALUATORIO, NO ESTÁN CONDICIONADOS AL REPORTE DE UN VALOR PREDETERMINADO O DIRIGIDO HACIA UN VALOR QUE FAVOREZCA LA CAUSA DE UN CLIENTE.'

  wsDecl.mergeCells(`A${rdecl}:H${rdecl + 5}`)
  wsDecl.getCell(`A${rdecl}`).value = DECL_FIJA_XL
  Object.assign(wsDecl.getCell(`A${rdecl}`), {
    style: {
      font: { size: 10, name: 'Arial', color: { argb: BLACK } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: LGRAY } },
      alignment: { wrapText: true, vertical: 'top', horizontal: 'justify' },
      border: {
        top:    { style: 'medium', color: { argb: NAVY } },
        bottom: { style: 'medium', color: { argb: NAVY } },
        left:   { style: 'medium', color: { argb: NAVY } },
        right:  { style: 'medium', color: { argb: NAVY } },
      }
    }
  })
  wsDecl.getRow(rdecl).height = 90; rdecl += 7

  // Declaraciones del usuario
  const declsXL = Array.isArray(form.declaracionesExtra)
    ? form.declaracionesExtra.filter(d => d && d.trim().length > 0)
    : []

  declsXL.forEach((decl, i) => {
    const numLineas = Math.ceil(decl.length / 120) + 1
    wsDecl.mergeCells(`A${rdecl}:H${rdecl + numLineas}`)
    wsDecl.getCell(`A${rdecl}`).value = decl.trim()
    Object.assign(wsDecl.getCell(`A${rdecl}`), {
      style: {
        font: { size: 10, name: 'Arial', color: { argb: BLACK } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } },
        alignment: { wrapText: true, vertical: 'top' },
        border: {
          top:    { style: 'hair', color: { argb: 'CCCCCC' } },
          bottom: { style: 'hair', color: { argb: 'CCCCCC' } },
          left:   { style: 'medium', color: { argb: NAVY } },
          right:  { style: 'medium', color: { argb: NAVY } },
        }
      }
    })
    wsDecl.getRow(rdecl).height = Math.max(40, numLineas * 16)
    rdecl += numLineas + 1
  })

  // ────────────────────────────────────────────────────────────
  // 11. VALOR REFERIDO (solo para avalúos referidos)
  // ────────────────────────────────────────────────────────────
  if (esRef) {
    const wsRef = wb.addWorksheet('Valor Referido')
    wsRef.columns = [
      { width: 32 }, { width: 24 }, { width: 20 }, { width: 20 },
    ]
    let rref = addEncabezado(wsRef, 'ANÁLISIS DEL VALOR REFERIDO — FACTOR INPC')

    const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    const inpcAct = n(form.inpcActual), inpcRef2 = n(form.inpcReferido)
    const factorRef2 = inpcAct > 0 && inpcRef2 > 0 ? inpcRef2 / inpcAct : null
    const valAct = n(form.valorActualConclusion || form.valorMercado || form.valorFisico)
    const valRefFinal2 = n(form.valorReferidoFinal) || (factorRef2 && valAct ? valAct * factorRef2 : 0)
    const labelAct = form.fechaAvaluo ? (() => { const m = form.fechaAvaluo.match(/^(\d{4})-(\d{2})/); return m ? `${MESES[parseInt(m[2])]} ${m[1]}` : form.fechaAvaluo })() : '—'
    const labelRef2 = form.mesReferido && form.anioReferido ? `${MESES[parseInt(form.mesReferido)] || ''} ${form.anioReferido}` : '—'

    const refFields = [
      ['Fecha del Avalúo Actual', labelAct],
      ['Avalúo Actual ($)', valAct > 0 ? valAct : '—'],
      [`INPC — ${labelAct}`, inpcAct > 0 ? inpcAct : '—'],
      ['Periodo Referido', labelRef2],
      [`INPC — ${labelRef2}`, inpcRef2 > 0 ? inpcRef2 : '—'],
      ['Factor INPC', factorRef2 ? factorRef2.toFixed(8) : '—'],
      ['Fórmula', factorRef2 && valAct > 0 ? `${valAct.toLocaleString('es-MX')} × ${factorRef2.toFixed(8)} = ${(valAct * factorRef2).toLocaleString('es-MX')}` : '—'],
    ]

    refFields.forEach(([lbl, val], i) => {
      wsRef.mergeCells(`A${rref}:B${rref}`)
      wsRef.getCell(`A${rref}`).value = lbl
      Object.assign(wsRef.getCell(`A${rref}`), { style: dataStyle(LGRAY, true) })
      wsRef.mergeCells(`C${rref}:D${rref}`)
      wsRef.getCell(`C${rref}`).value = val
      const isNum = typeof val === 'number'
      Object.assign(wsRef.getCell(`C${rref}`), { style: dataStyle(WHITE, false, isNum ? 'right' : 'left') })
      if (isNum && i === 1) wsRef.getCell(`C${rref}`).numFmt = '"$"#,##0.00'
      wsRef.getRow(rref).height = 16; rref++
    })

    rref += 2
    wsRef.mergeCells(`A${rref}:B${rref}`)
    wsRef.getCell(`A${rref}`).value = 'VALOR REFERENCIADO DEL INMUEBLE:'
    Object.assign(wsRef.getCell(`A${rref}`), { style: hdrStyle(NAVY, GOLD, 12) })
    wsRef.mergeCells(`C${rref}:D${rref}`)
    wsRef.getCell(`C${rref}`).value = valRefFinal2 > 0 ? valRefFinal2 : '—'
    if (valRefFinal2 > 0) wsRef.getCell(`C${rref}`).numFmt = '"$"#,##0.00'
    Object.assign(wsRef.getCell(`C${rref}`), { style: goldStyle(14) })
    wsRef.getRow(rref).height = 28; rref++

    if (form.valorConclusivoLetras) {
      wsRef.mergeCells(`A${rref}:D${rref}`)
      wsRef.getCell(`A${rref}`).value = `(${form.valorConclusivoLetras.toUpperCase()})`
      Object.assign(wsRef.getCell(`A${rref}`), { style: { ...dataStyle(LGRAY, false, 'center'), alignment: { wrapText: true } } })
      wsRef.getRow(rref).height = 18
    }
  }

  // ── Generar y descargar el archivo ───────────────────────────
  const folio = (form.folioInterno || 'avaluo').replace(/[^a-zA-Z0-9\-_]/g, '_')
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${folio}_avaluo.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}
