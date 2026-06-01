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

  const NAVY=[30,58,95],GOLD=[201,151,42],LGRAY=[241,245,249],
        MGRAY=[226,232,240],DGRAY=[100,116,139],WHITE=[255,255,255],
        BLACK=[15,23,42],RED=[220,38,38],GREEN=[22,163,74],BLUE=[37,99,235]

  // ── Helpers ──────────────────────────────────────────────────────
  const addPage = () => {
    doc.addPage(); pageNum++
    doc.setFillColor(...NAVY); doc.rect(0,0,PW,12,'F')
    doc.setTextColor(...GOLD); doc.setFont('helvetica','bold'); doc.setFontSize(7)
    doc.text('GIAVAL — AVALÚO COMERCIAL', MG, 5)
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
  doc.text('GIAVAL — AVALÚO COMERCIAL', MG,5)
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
  doc.text((form.tipoAvaluo||'AVALÚO COMERCIAL').toUpperCase(),PW/2,y+6.5,{align:'center'})
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
  if(fotoFachada){
    try{ doc.addImage(fotoFachada, 'JPEG', MG, y, CW, 52, undefined, 'FAST'); y+=54 }
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
  //  DECLARACIONES PROFESIONALES
  // ═══════════════════════════════════════════
  addPage()
  secTit('Declaraciones Profesionales y Advertencias')
  const declTexto=[
    '1. El valuador declara haber realizado una inspección ocular directa del inmueble en la fecha indicada.',
    '2. El presente dictamen no constituye un estudio estructural ni sustituye peritajes especializados.',
    '3. Los honorarios profesionales son independientes del resultado del avalúo.',
    '4. La información documental proporcionada fue considerada auténtica; el valuador no certifica su autenticidad.',
    '5. El valor determinado corresponde exclusivamente a las condiciones de mercado observadas en la fecha de inspección.',
    '6. La vigencia del avalúo es de '+(form.vigenciaAvaluo||'seis meses')+' a partir de la fecha de emisión.',
    '7. El valuador declara no tener conflicto de interés con las partes involucradas en la operación.',
  ]
  declTexto.forEach(t=>{
    checkY(8)
    const lines=doc.splitTextToSize(t,CW)
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...BLACK)
    doc.text(lines,MG,y); y+=lines.length*4.5+3
  })

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
        addPage()
        doc.setFillColor(...LGRAY); doc.rect(MG,y,CW,8,'F')
        doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...NAVY)
        doc.text(`ANEXO ${i+1} — ${(d.tipo||'Imagen').toUpperCase()}`, MG+2, y+4)
        doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...DGRAY)
        doc.text(d.nombre||'', MG+2, y+8); y+=13
        try{
          const maxH=200
          doc.addImage(d.data, 'JPEG', MG, y, CW, maxH, undefined, 'FAST')
          y+=maxH+5
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

  const esReferido = (form.tipoAvaluo||'').toLowerCase() === 'referido'

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
    ? (n(form.valorReferidoFinal) || n(form.valorMercado) || 0)
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

  // Firma
  checkY(32); y+=8
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.4); doc.line(MG+CW/4,y,MG+CW*3/4,y); y+=4
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...NAVY)
  doc.text(form.peritoValuador||'Perito Valuador',PW/2,y,{align:'center'}); y+=4
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...DGRAY)
  doc.text(form.maestria||'',PW/2,y,{align:'center'}); y+=4
  doc.text(`Cédula: ${form.cedulaProfesional||'—'}   Reg. SHF: ${form.noRegSHF||'—'}`,PW/2,y,{align:'center'})
  if(form.regEstatalPeritos){ y+=4; doc.text(`Reg. Estatal: ${form.regEstatalPeritos}`,PW/2,y,{align:'center'}) }

  // *** FIX v5: portada también usa valorReferidoFinal ***
  const valConclPortada = esReferido
    ? (n(form.valorReferidoFinal) || n(form.valorMercado) || 0)
    : (n(form.valorMercado) || n(form.valorFisico) || n(form.valorRentas))
  if(valConclPortada>0){
    doc.setPage(1)
    const pyBox=248
    doc.setFillColor(...GOLD); doc.rect(MG,pyBox,CW,22,'F')
    doc.setTextColor(...NAVY); doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text('VALOR CONCLUSIVO DEL INMUEBLE:',PW/2,pyBox+5,{align:'center'})
    doc.setFontSize(16); doc.text(fmtM(valConclPortada),PW/2,pyBox+14,{align:'center'})
    if(form.valorConclusivoLetras){
      doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(50,40,20)
      const letBrief=doc.splitTextToSize(form.valorConclusivoLetras.toUpperCase(),CW-4)
      doc.text(letBrief[0]||'',PW/2,pyBox+20,{align:'center'})
    }
  }

  // Pie de página en todas las hojas
  const total=doc.getNumberOfPages()
  for(let i=1;i<=total;i++){
    doc.setPage(i)
    doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(...DGRAY)
    doc.setDrawColor(...MGRAY); doc.setLineWidth(0.2); doc.line(MG,278,MG+CW,278)
    doc.text(`Página ${i} de ${total}`,PW/2,282,{align:'center'})
    doc.text(form.folioInterno||'',MG,282)
    doc.text(form.peritoValuador||'',PW-MG,282,{align:'right'})
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
export async function exportarExcel(form, avaluoMeta={}) {
  const XLSX = await import('xlsx')
  const wb   = XLSX.utils.book_new()

  const TH = (t) => ({v:t,t:'s',s:{font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1E3A5F'}}}})
  const TG = (t) => ({v:t,t:'s',s:{font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'C9972A'}}}})
  const H1 = (t) => [{v:t,t:'s',s:{font:{bold:true,sz:13},fill:{fgColor:{rgb:'1E3A5F'}},alignment:{horizontal:'center'}}}]
  const H2 = (t) => [{v:t,t:'s',s:{font:{bold:true,sz:10},fill:{fgColor:{rgb:'C9972A'}}}}]
  const mkSheet = (rows,name) => {
    const ws=XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb,ws,name.substring(0,31))
    return ws
  }

  const ws1=mkSheet([
    H1('GIAVAL — AVALÚO COMERCIAL'),
    [],H2('DATOS DEL AVALÚO'),
    ['Folio:', form.folioInterno||''],['Fecha:', form.fechaAvaluo||''],
    ['Tipo de Avalúo:', form.tipoAvaluo||''],['Propósito:', form.proposito||''],
    ['Vigencia:', form.vigenciaAvaluo||''],['Solicitante:', form.nombreSolicitante||''],
    ['Propietario:', form.nombrePropietario||''],['Bien Valuado:', form.bienQueSeValua||''],
    ['Régimen:', form.regimenPropiedad||''],
    [],H2('PERITO VALUADOR'),
    ['Nombre:', form.peritoValuador||''],['Maestría:', form.maestria||''],
    ['Cédula Profesional:', form.cedulaProfesional||''],['Reg. SHF:', form.noRegSHF||''],
    ['Reg. Estatal:', form.regEstatalPeritos||''],
    [],H2('DIRECCIÓN DEL INMUEBLE'),
    ['Calle:', form.calle||''],['Núm. Exterior:', form.numeroExterior||''],
    ['Núm. Interior:', form.numeroInterior||''],['Colonia:', form.colonia||''],
    ['Manzana:', form.manzana||''],['Lote:', form.lote||''],
    ['Código Postal:', form.codigoPostal||''],['Municipio:', form.municipio||''],
    ['Estado:', form.entidadFederativa||''],['Cuenta Predial:', form.cuentaPredial||''],
    ['Latitud:', form.latitud||''],['Longitud:', form.longitud||''],['Altitud:', form.altitud||''],
    [],H2('CARACTERÍSTICAS URBANAS'),
    ['Nivel Infraestructura:', form.nivelInfraestructura||''],
    ['Agua Potable:', form.aguaPotable||''],['Drenaje:', form.drenaje||''],
    ['Electrificación:', form.electrificacion||''],['Alumbrado:', form.alumbradoPublico||''],
    ['Telefonía:', form.telefono||''],['Señalización:', form.senalizacion||''],
    ['Transporte Público:', form.transportePublico||''],['Vigilancia:', form.vigilancia||''],
    ['Nivel Equipamiento:', form.nivelEquipamiento||''],
    ['Clasificación Zona:', form.clasificacionZona||''],['Uso de Suelo:', form.usoSuelo||''],
    ['Proximidad Urbana:', form.refProximidadUrbana||''],
    ['Vías de Acceso:', form.viasAcceso||''],
    ['Construcc. Predominantes:', form.construccionesPredominantes||''],
    [],H2('MEDIDAS Y COLINDANCIAS'),
    ['Área Terreno (m²):', form.areaTerreno||''],
    ['Área Constr. Habitable (m²):', form.areaConstruccionHabitable||''],
    ['Indiviso (%):', form.indiviso||''],['Topografía:', form.topografia||''],
    ['Núm. de Frentes:', form.numeroFrente||''],['Servidumbres:', form.servidumbre||''],
    [],H2('DATOS DE LA ESCRITURA'),
    ['Notario:', form.notarioNombre||''],['Núm. Notaría:', form.numeroNotario||''],
    ['Ciudad Notario:', form.notarioCiudad||''],['Núm. Escritura:', form.numeroEscritura||''],
    ['Fecha Escritura:', form.fechaEscritura||''],
    [],H2('DESCRIPCIÓN DEL INMUEBLE'),
    ['Tipo Construcción:', form.tiposConstruccion||''],['Calidad:', form.calidadClasificacion||''],
    ['Nº de Niveles:', form.numNiveles!=null?String(form.numNiveles):''],
    ['Edad Aprox. (años):', form.edadAproximada||''],['Vida Total (años):', form.vidaTotal||''],
    ['Vida Remanente:', (form.vidaTotal&&form.edadAproximada)?String(n(form.vidaTotal)-n(form.edadAproximada)):''],
    ['Estado Conservación:', form.estadoConservacion||''],
    ['Calidad del Proyecto:', form.calidadProyecto||''],['Uso Actual:', form.usoActual||''],
    ['Recámaras:', form.numRecamaras||''],['Baños Completos:', form.numBanosCompletos||''],
    ['Medios Baños:', form.numMediosBanos||''],['Estacionamientos:', form.estacionamientos||''],
    ['Elevador:', form.elevador||''],['Cocinas:', form.numCocina||''],
    ['Estructura:', form.estructura||''],['Hidráulica:', form.hidraulico||''],
    ['Eléctrica:', form.electrico||''],['Carpintería:', form.carpinteria||''],
    ['Herrería:', form.herreria||''],
    [],H2('VALORES DEL AVALÚO'),
    ['Valor de Mercado:', n(form.valorMercado)||''],
    ['Valor Físico:', n(form.valorFisico)||''],
    ['Valor por Rentas:', n(form.valorRentas)||''],
    ['Valor Referido Final:', n(form.valorReferidoFinal)||''],
    ['Enfoque Conclusivo:', form.enfoqueConclusivo||''],
    ['Declaración:', form.declaraciones||''],
    ['Valor en Letras:', form.valorConclusivoLetras||''],
    ['Vigencia:', form.vigenciaAvaluo||''],
  ],'01-Datos Generales')
  ws1['!cols']=[{wch:35},{wch:75}]

  if(form.medidas?.length){
    const ws2=mkSheet([
      H1('MEDIDAS Y COLINDANCIAS'),
      [`Según: ${form.medidasSegun||'Escritura Pública'}`],[],
      [TH('Orientación'),TH('Distancia (m)'),TH('Colindante')],
      ...form.medidas.map(m=>[
        m.orientacion==='Otro'?(m.orientacionOtro||'Otro'):m.orientacion,
        m.distancia||'—', m.colindante||'—',
      ]),
    ],'02-Medidas')
    ws2['!cols']=[{wch:18},{wch:16},{wch:60}]
  }

  if(form.acabados?.length){
    const ws3=mkSheet([
      H1('TABLA DE ACABADOS POR ESPACIO'),[],
      [TH('Espacio'),TH('Piso'),TH('Muro'),TH('Plafón')],
      ...form.acabados.map(a=>[a.espacio||'',a.piso||'',a.muro||'',a.plafon||'']),
    ],'03-Acabados')
    ws3['!cols']=[{wch:22},{wch:42},{wch:42},{wch:42}]
  }

  if(form.comparablesCasa?.length){
    const customF=form.factoresCasaCustom||[]
    const baseKeys=['neg','ubic','sup','calid','edoCons','zona']
    const todos=[...baseKeys.map(k=>({key:k,label:k.toUpperCase()})),...customF.map(f=>({key:f.key,label:f.label}))]
    const enNRCasa=calcEnNR(form.comparablesCasa,customF,'casa')
    const areaCH=n(form.areaConstruccionHabitable||form.areaConstruccion)
    const ws4=mkSheet([
      H1('ENFOQUE DE MERCADO — COMPARABLES CASA'),[],
      [TH('#'),TH('Ciudad'),TH('Colonia'),TH('Oferta ($)'),TH('Sup.Const. m²'),TH('$/m² Base'),
        ...todos.map(f=>TH(f.label)),TH('FRe'),TH('$/m² Hom.')],
      ...form.comparablesCasa.filter(c=>c.oferta).map((c,i)=>{
        const fre=todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
        const base=c.oferta&&c.supConst?parseFloat(c.oferta)/parseFloat(c.supConst):0
        return [i+1,c.ciudad||'',c.colonia||'',n(c.oferta),n(c.supConst),
          parseFloat(base.toFixed(2)),...todos.map(f=>parseFloat((parseFloat(c.factores?.[f.key]||1)).toFixed(4))),
          parseFloat(fre.toFixed(4)),parseFloat((base*fre).toFixed(2))]
      }),
      [],[TG('EN N.R. $/m²'),enNRCasa||0,'',TG('ÁREA HAB. m²'),areaCH||0],
      [TG('T-1 VALOR TOTAL'),enNRCasa&&areaCH?parseFloat((enNRCasa*areaCH).toFixed(2)):0],
    ],'04-Comp. Casa')
    ws4['!cols']=[{wch:5},{wch:14},{wch:14},{wch:15},{wch:12},{wch:12},...todos.map(()=>({wch:9})),{wch:10},{wch:14}]
  }

  if(form.comparablesTerreno?.length){
    const customF=form.factoresTerrenoCustom||[]
    const baseKeys=['neg','zona','ubica','frente','sup','forma']
    const todos=[...baseKeys.map(k=>({key:k,label:k.toUpperCase()})),...customF.map(f=>({key:f.key,label:f.label}))]
    const enNRTerr=calcEnNR(form.comparablesTerreno,customF,'terreno')
    const areaT=n(form.areaTerreno)
    const ws5=mkSheet([
      H1('ENFOQUE FÍSICO — COMPARABLES TERRENO'),[],
      [TH('#'),TH('Ciudad'),TH('Colonia'),TH('Oferta ($)'),TH('Sup. m²'),TH('$/m² Base'),
        ...todos.map(f=>TH(f.label)),TH('FRe'),TH('$/m² Hom.')],
      ...form.comparablesTerreno.filter(c=>c.oferta).map((c,i)=>{
        const fre=todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
        const base=c.oferta&&c.supM2?parseFloat(c.oferta)/parseFloat(c.supM2):0
        return [i+1,c.ciudad||'',c.colonia||'',n(c.oferta),n(c.supM2),
          parseFloat(base.toFixed(2)),...todos.map(f=>parseFloat((parseFloat(c.factores?.[f.key]||1)).toFixed(4))),
          parseFloat(fre.toFixed(4)),parseFloat((base*fre).toFixed(2))]
      }),
      [],[TG('EN N.R. $/m²'),enNRTerr||0,'',TG('ÁREA TERRENO m²'),areaT||0],
      [TG('VALOR TERRENO'),enNRTerr&&areaT?parseFloat((enNRTerr*areaT).toFixed(2)):0],
    ],'05-Comp. Terreno')
    ws5['!cols']=[{wch:5},{wch:14},{wch:14},{wch:15},{wch:12},{wch:12},...todos.map(()=>({wch:9})),{wch:10},{wch:14}]
  }

  if(form.comparablesRentas?.length){
    const customF=form.factoresRentasCustom||[]
    const baseKeys=['neg','ubic','sup','calid','edoCons']
    const todos=[...baseKeys.map(k=>({key:k,label:k.toUpperCase()})),...customF.map(f=>({key:f.key,label:f.label}))]
    const ws6=mkSheet([
      H1('MERCADO DE RENTAS — COMPARABLES'),[],
      [TH('#'),TH('Ciudad'),TH('Colonia'),TH('Renta/mes ($)'),TH('Sup. m²'),TH('$/m²/mes'),
        ...todos.map(f=>TH(f.label)),TH('FRe'),TH('$/m² Hom.')],
      ...form.comparablesRentas.filter(c=>c.oferta).map((c,i)=>{
        const fre=todos.reduce((a,f)=>a*(parseFloat(c.factores?.[f.key])||1),1)
        const base=c.oferta&&c.supM2?parseFloat(c.oferta)/parseFloat(c.supM2):0
        return [i+1,c.ciudad||'',c.colonia||'',n(c.oferta),n(c.supM2),
          parseFloat(base.toFixed(2)),...todos.map(f=>parseFloat((parseFloat(c.factores?.[f.key]||1)).toFixed(4))),
          parseFloat(fre.toFixed(4)),parseFloat((base*fre).toFixed(2))]
      }),
    ],'06-Mercado Rentas')
    ws6['!cols']=[{wch:5},{wch:14},{wch:14},{wch:15},{wch:12},{wch:12},...todos.map(()=>({wch:9})),{wch:10},{wch:14}]
  }

  const costRows=[H1('COSTOS — ENFOQUE FÍSICO')]
  const enNRTerr=calcEnNR(form.comparablesTerreno,form.factoresTerrenoCustom,'terreno')
  const indiv=n(form.indiviso)/100||1
  let totalTerr=0,totalCons=0,totalInst=0
  if(form.fraccionesTerreno?.length){
    costRows.push([],H2('a) VALOR DEL TERRENO'))
    costRows.push([TH('Sup. m²'),TH('V.U. $/m²'),TH('Coeficiente'),TH('Motivo'),TH('V.U. Result.'),TH('Valor Parcial')])
    form.fraccionesTerreno.forEach(f=>{
      const sup=n(f.sup)||n(form.areaTerreno)
      const vu=n(f.valorUnit)||enNRTerr||0
      const coef=n(f.coeficiente)||indiv
      const motivo=f.motivo==='OTRO'?(f.motivoOtro||'Otro'):(f.motivo||'NINGUNO')
      const parcial=sup*vu*coef; totalTerr+=parcial
      costRows.push([sup,vu,coef,motivo,vu,parcial])
    })
    costRows.push([TG('TOTAL TERRENO'),totalTerr])
  }
  if(form.construcciones?.length){
    costRows.push([],H2('b) VALOR DE CONSTRUCCIÓN'))
    costRows.push([TH('Tipo'),TH('Descripción'),TH('Área'),TH('CRN'),TH('Dem.Edad'),TH('Dem.Cal'),TH('Fre'),TH('CNR.Unit.'),TH('Valor Total')])
    form.construcciones.forEach(c=>{
      const area=n(c.area)||n(form.areaConstruccionHabitable)
      const crn=n(c.crn),edad=n(c.factorDemeritoEdad),cal=n(c.factorDemeritoCalidad)
      const fre=edad*cal,cnrU=fre>0?fre*crn:crn,vt=area*cnrU; totalCons+=vt
      costRows.push([c.tipo||'',c.descripcion||'',area,crn,edad,cal,fre>0?fre:0,cnrU>0?cnrU:0,vt>0?vt:0])
    })
    if(form.notasConstruccion) costRows.push([TH('NOTAS:'),form.notasConstruccion])
    costRows.push([TG('SUBTOTAL CONSTRUCCIÓN'),totalCons])
  }
  if(form.instalaciones?.length){
    costRows.push([],H2('c) INSTALACIONES ESPECIALES — I-ESPEC'))
    costRows.push([TH('p/c'),TH('Descripción'),TH('Unidad'),TH('Cantidad'),TH('Edad'),TH('V.R.N.'),TH('F.Cons'),TH('F.Edad'),TH('F.Otro'),TH('FRe'),TH('V.N.R.'),TH('V.Parcial')])
    form.instalaciones.forEach((x,i)=>{
      const fc=n(x.factorCons)||1,fe=n(x.factorEdad)||1,fo=n(x.factorOtro)||1
      const fre=fc*fe*fo,vnr=n(x.vrn)*fre,parcial=n(x.cantidad)*vnr; totalInst+=parcial
      costRows.push([i+1,x.descripcion||'',x.unidad||'',n(x.cantidad),n(x.edad),n(x.vrn),fc,fe,fo,fre,vnr,parcial])
    })
    costRows.push([TG('SUBTOTAL I-ESPEC'),totalInst])
  }
  const totalFisico=totalTerr+totalCons+totalInst
  if(totalFisico>0){
    costRows.push([],[TG('VALOR FÍSICO TOTAL'),totalFisico])
    costRows.push([TH('Terreno'),totalTerr,TH('Construcción'),totalCons,TH('I-Espec'),totalInst])
  }
  if(costRows.length>1){
    const ws7=mkSheet(costRows,'07-Costos')
    ws7['!cols']=[{wch:12},{wch:25},{wch:12},{wch:12},{wch:10},{wch:10},{wch:10},{wch:12},{wch:14}]
  }

  if(form.ingresos){
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
    const ws8=mkSheet([
      H1('ENFOQUE DE INGRESOS — CAPITALIZACIÓN DE RENTAS'),[],
      H2('TIPOS DE RENTA'),
      [TH('Tipo'),TH('Destino'),TH('Sup. m²'),TH('$/m²/mes'),TH('Renta Mensual')],
      ...(ing.tiposRenta||[]).map(t=>[t.tipo||'',t.destino||'',n(t.supM2),n(t.valorM2),n(t.supM2)*n(t.valorM2)]),
      [TG('RENTA BRUTA MENSUAL'),rentaBruta],[],
      H2('DEDUCCIONES'),
      [TH('Concepto'),TH('% Deducción')],
      ...deducKeys.map((k,i)=>[deducLabels[i],n(ing[k])]),
      [TG('TOTAL DEDUCCIONES'),totalDeducc],[],
      H2('CASCADA DE RENTA'),
      ['Renta Bruta Mensual',rentaBruta],['Total Deducciones (importe)',deduccImp],
      ['Renta Neta Mensual',rentaNetaMens],[`Renta Neta Anual (× ${mult} meses)`,rentaNetaAnual],
      [`Tasa de Capitalización`,tasa],
      [TG('VALOR POR CAPITALIZACIÓN'),valorRentas||n(form.valorRentas)],
    ],'08-Ingresos')
    ws8['!cols']=[{wch:40},{wch:20},{wch:15},{wch:15},{wch:18}]
  }

  // Hoja 9: Conclusión — FIX v5: incluye valorReferidoFinal
  const esRef = (form.tipoAvaluo||'').toLowerCase()==='referido'
  const valConclExcel = esRef
    ? (n(form.valorReferidoFinal)||n(form.valorMercado)||0)
    : (n(form.valorMercado)||n(form.valorFisico)||n(form.valorRentas))
  const ws9=mkSheet([
    H1('CONCLUSIÓN DEL AVALÚO'),[],
    H2('CUADRO COMPARATIVO DE ENFOQUES'),
    [TH('Enfoque'),TH('Valor ($)'),TH('% Relativo')],
    ...[
      ['Valor de Mercado',n(form.valorMercado)],
      ['Valor Físico',n(form.valorFisico)],
      ['Valor por Capitalización de Rentas',n(form.valorRentas)],
      ['Valor Referido Final',n(form.valorReferidoFinal)],
    ].filter(([,v])=>v>0).map(([l,v])=>{
      const maxV=Math.max(n(form.valorMercado),n(form.valorFisico),n(form.valorRentas),n(form.valorReferidoFinal))
      return [l,v,parseFloat((v/maxV*100).toFixed(1))]
    }),
    [],H2('CONCLUSIÓN'),
    ['Tipo de Avalúo:', form.tipoAvaluo||''],
    ['Enfoque Conclusivo:', esRef?'Valor Referido Final':(form.enfoqueConclusivo||'')],
    ['Valor Conclusivo ($):', valConclExcel],
    ['Valor en Letras:', form.valorConclusivoLetras||''],
    ['Declaración:', form.declaraciones||''],
    ['Vigencia:', form.vigenciaAvaluo||''],
    ['Fecha:', form.fechaAvaluo||''],
    [],H2('PERITO VALUADOR'),
    ['Nombre:', form.peritoValuador||''],['Maestría:', form.maestria||''],
    ['Cédula:', form.cedulaProfesional||''],['Reg. SHF:', form.noRegSHF||''],
    ['Reg. Estatal:', form.regEstatalPeritos||''],
  ],'09-Conclusión')
  ws9['!cols']=[{wch:38},{wch:22},{wch:15}]

  const folio=(form.folioInterno||'avaluo').replace(/[^a-zA-Z0-9\-_]/g,'_')
  XLSX.writeFile(wb,`${folio}_avaluo.xlsx`)
}