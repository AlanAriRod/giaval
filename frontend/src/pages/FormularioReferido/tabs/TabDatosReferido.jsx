// frontend/src/pages/FormularioReferido/tabs/TabDatosReferido.jsx
// Igual que TabDatos del Comercial pero con:
//   - Folio: CLAVE-ARG/ (no CLAVE-AG/)
//   - Campo "Fecha del Avalúo Referido"
//   - Campo "Nombre del Poseedor"
//   - Propósito fijo: Dictaminar el Valor Referido
//   - Enfoques limitados a Físico y Mercado (sin Rentas)
import { useState, useEffect } from 'react'
import { MapPin, Loader, Search } from 'lucide-react'
import styles from '../../FormularioComercial/Formulario.module.css'

// ── SelectOtro: select + campo libre para "Otro" ─────────────
function SelectOtro({ label, campo, value, opts, update, placeholder='Especifica…' }) {
  const esOtro = value && !opts.includes(value)
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <select className={styles.select}
        value={esOtro ? '__otro__' : (value||'')}
        onChange={e=>{
          if(e.target.value==='__otro__') update(campo,'')
          else update(campo,e.target.value)
        }}>
        <option value="">— Selecciona —</option>
        {opts.map(o=><option key={o}>{o}</option>)}
        <option value="__otro__">OTRO (especificar)</option>
      </select>
      {(esOtro || value==='')&&value!==undefined&&(
        <input className={styles.input} style={{marginTop:'.3rem'}}
          value={esOtro?value:''} onChange={e=>update(campo,e.target.value)}
          placeholder={placeholder}/>
      )}
    </div>
  )
}

const ESTADOS_MX = [
  '01 - Aguascalientes','02 - Baja California','03 - Baja California Sur',
  '04 - Campeche','05 - Chiapas','06 - Chihuahua','07 - Ciudad de México',
  '08 - Coahuila de Zaragoza','09 - Colima','10 - Durango','11 - Estado de México',
  '12 - Guanajuato','13 - Guerrero','14 - Hidalgo','15 - Jalisco',
  '16 - Michoacán de Ocampo','17 - Morelos','18 - Nayarit','19 - Nuevo León',
  '20 - Oaxaca','21 - Puebla','22 - Querétaro','23 - Quintana Roo',
  '24 - San Luis Potosí','25 - Sinaloa','26 - Sonora','27 - Tabasco',
  '28 - Tamaulipas','29 - Tlaxcala','30 - Veracruz de Ignacio de la Llave',
  '31 - Yucatán','32 - Zacatecas',
]


const MUNICIPIOS_VERACRUZ = [
   '001 Acajete','002 Acatlán','003 Acayucan','004 Actopan',
'005 Acula','006 Acultzingo','007 Agua Dulce',
'008 Álamo Temapache','009 Alpatláhuac','010 Alto Lucero de Gutiérrez Barrios',
'011 Altotonga','012 Alvarado','013 Amatitlán',
'014 Amatlán de los Reyes','015 Ángel R. Cabada',
'016 La Antigua','017 Apazapan','018 Aquila',
'019 Astacinga','020 Atlahuilco','021 Atoyac',
'022 Atzacan','023 Atzalan','024 Tlaltetela',
'025 Ayahualulco','026 Banderilla','027 Benito Juárez',
'028 Boca del Río','029 Calcahualco','030 Camerino Z. Mendoza',
'031 Carrillo Puerto','032 Catemaco',
'033 Cazones de Herrera','034 Cerro Azul','035 Citlaltépetl',
'036 Coacoatzintla','037 Coahuitlán','038 Coatepec',
'039 Coatzacoalcos','040 Coatzintla','041 Coetzala',
'042 Colipa','043 Comapa','044 Córdoba',
'045 Cosamaloapan de Carpio','046 Cosautlán de Carvajal',
'047 Coscomatepec','048 Cosoleacaque','049 Cotaxtla',
'050 Coxquihui','051 Coyutla','052 Cuichapa',
'053 Cuitláhuac','054 Chacaltianguis','055 Chalma',
'056 Chiconamel','057 Chiconquiaco','058 Chicontepec',
'059 Chinameca','060 Chinampa de Gorostiza',
'061 Las Choapas','062 Chocamán','063 Chontla',
'064 Chumatlán','065 Emiliano Zapata','066 Espinal',
'067 Filomeno Mata','068 Fortín','069 Gutiérrez Zamora',
'070 Hidalgotitlán','071 Huatusco','072 Huayacocotla',
'073 Hueyapan de Ocampo','074 Huiloapan de Cuauhtémoc',
'075 Ignacio de la Llave','076 Ilamatlán','077 Isla',
'078 Ixcatepec','079 Ixhuacán de los Reyes',
'080 Ixhuatlán del Café','081 Ixhuatlancillo',
'082 Ixhuatlán del Sureste','083 Ixhuatlán de Madero',
'084 Ixmatlahuacan','085 Ixtaczoquitlán',
'086 Jalacingo','087 Xalapa','088 Jalcomulco',
'089 Jáltipan','090 Jamapa','091 Jesús Carranza',
'092 Xico','093 Jilotepec',
'094 Juan Rodríguez Clara','095 Juchique de Ferrer',
'096 Landero y Coss','097 Lerdo de Tejada',
'098 Magdalena','099 Maltrata',
'100 Manlio Fabio Altamirano','101 Mariano Escobedo',
'102 Martínez de la Torre','103 Mecatlán',
'104 Mecayapan','105 Medellín de Bravo',
'106 Miahuatlán','107 Las Minas','108 Minatitlán',
'109 Misantla','110 Mixtla de Altamirano',
'111 Moloacán','112 Naolinco','113 Naranjal',
'114 Nautla','115 Nogales','116 Oluta',
'117 Omealca','118 Orizaba','119 Otatitlán',
'120 Oteapan','121 Ozuluama de Mascareñas',
'122 Pajapan','123 Pánuco','124 Papantla',
'125 Paso del Macho','126 Paso de Ovejas',
'127 La Perla','128 Perote','129 Platón Sánchez',
'130 Playa Vicente','131 Poza Rica de Hidalgo',
'132 Las Vigas de Ramírez','133 Pueblo Viejo',
'134 Puente Nacional','135 Rafael Delgado',
'136 Rafael Lucio','137 Los Reyes','138 Río Blanco',
'139 Saltabarranca','140 San Andrés Tenejapan',
'141 San Andrés Tuxtla','142 San Juan Evangelista',
'143 Santiago Tuxtla','144 Sayula de Alemán',
'145 Soconusco','146 Sochiapa',
'147 Soledad Atzompa','148 Soledad de Doblado',
'149 Soteapan','150 Tamalín','151 Tamiahua',
'152 Tampico Alto','153 Tancoco','154 Tantima',
'155 Tantoyuca','156 Tatahuicapan de Juárez',
'157 Tatatila','158 Castillo de Teayo',
'159 Tecolutla','160 Tehuipango','161 Tempoal',
'162 Tenampa','163 Tenochtitlán','164 Teocelo',
'165 Tepatlaxco','166 Tepetlán','167 Tepetzintla',
'168 Tequila','169 José Azueta','170 Texcatepec',
'171 Texhuacán','172 Texistepec','173 Tezonapa',
'174 Tierra Blanca','175 Tihuatlán','176 Tlacojalpan',
'177 Tlacolulan','178 Tlacotalpan',
'179 Tlacotepec de Mejía','180 Tlachichilco',
'181 Tlalixcoyan','182 Tlalnelhuayocan',
'183 Tlapacoyan','184 Tlaquilpa','185 Tlilapan',
'186 Tomatlán','187 Tonayán','188 Totutla',
'189 Tuxpan','190 Tuxtilla','191 Ursulo Galván',
'192 Vega de Alatorre','193 Veracruz',
'194 Villa Aldama','195 Xoxocotla','196 Yanga',
'197 Yecuatla','198 Zacualpan','199 Zaragoza',
'200 Zentla','201 Zongolica',
'202 Zontecomatlán de López y Fuentes',
'203 José Azueta','204 Agua Dulce','205 El Higo',
'206 Nanchital de Lázaro Cárdenas del Río',
'207 Tres Valles','208 Carlos A. Carrillo',
'209 Tatahuicapan de Juárez','210 Uxpanapa',
'211 San Rafael','212 Santiago Sochiapan',
]

const BIENES = ['Casa Habitación','Terreno con Construcción','Terreno',
  'Departamento','Local Comercial','Bodega','Otro']
const REGIMENES = ['Privada','Condominial','Ejidal','Comunal','Gobierno']

// Enfoques del Referido: sin Rentas
const ENFOQUES_DEF = [
  { key:'fisico',  label:'Físico (Comparables de terreno)', color:'#2563eb' },
  { key:'mercado', label:'Mercado (Comparables de casa)',   color:'#c9972a' },
]

export default function TabDatosReferido({ form, update }) {
  const [geoCargando, setGeoCargando] = useState(false)
  const [geoError,    setGeoError]    = useState('')
  const [geoOk,       setGeoOk]       = useState(false)
  const [mostrarManzLote, setMostrarManzLote] = useState(!!(form.manzana||form.lote))

  const esVeracruz = (form.entidadFederativa||'').includes('Veracruz')

  // Auto-normaliza entidadFederativa si viene del OCR sin prefijo
  const normalizarEstado = (val) => {
    if (!val) return val
    if (ESTADOS_MX.includes(val)) return val
    const match = ESTADOS_MX.find(opt => {
      const nombre = opt.includes(' - ') ? opt.split(' - ')[1] : opt
      return nombre.toLowerCase() === val.toLowerCase() ||
             val.toLowerCase().includes(nombre.toLowerCase())
    })
    return match || val
  }
  useEffect(()=>{
    if(form.entidadFederativa){
      const norm = normalizarEstado(form.entidadFederativa)
      if(norm !== form.entidadFederativa) update('entidadFederativa', norm)
    }
  },[form.entidadFederativa])

  const estadoNorm = normalizarEstado(form.entidadFederativa)

  const obtenerCoordenadas = async () => {
    if (!form.municipio && !form.calle) { setGeoError('Agrega al menos Calle y Municipio.'); return }
    setGeoCargando(true); setGeoError(''); setGeoOk(false)
    try {
      const token = localStorage.getItem('giaval_token')
      const r = await fetch('/api/ocr/coordenadas',{
        method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body: JSON.stringify({
          calle: form.calle||'', numeroExterior: form.numeroExterior||'',
          colonia: form.colonia||'', municipio: (form.municipio||'').replace(/^\d+\s*-\s*/,''),
          entidadFederativa: (form.entidadFederativa||'').replace(/^\d+\s*-\s*/,''),
          codigoPostal: form.codigoPostal||'',
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error||'Error al obtener coordenadas')
      update('latitud',data.latitud); update('longitud',data.longitud)
      if(data.altitud) update('altitud',data.altitud)
      setGeoOk(true); setTimeout(()=>setGeoOk(false),4000)
    } catch(err){ setGeoError(err.message||'Error al obtener coordenadas.')
    } finally { setGeoCargando(false) }
  }

  const abrirMaps = () => {
    const q = form.latitud&&form.longitud?`${form.latitud},${form.longitud}`
      :[form.calle,form.numeroExterior,form.colonia,form.municipio,'México'].filter(Boolean).join(' ')
    window.open(`https://maps.google.com/?q=${encodeURIComponent(q)}`, '_blank')
  }

  const toggleEnfoque = (key) => {
    const arr = form.enfoques||[]
    const activos = arr.includes(key) ? arr.filter(e=>e!==key) : [...arr,key]
    if(activos.length===0) return
    update('enfoques', activos)
  }

  return (
    <div>
      {/* Folio y fechas */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Folio del Avalúo Referido</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid3}>
            <div className={`${styles.field} ${styles.span2}`}>
              <label className={`${styles.label} ${styles.req}`}>Folio Interno</label>
              <input className={styles.input} value={form.folioInterno||''}
                onChange={e=>update('folioInterno',e.target.value)}
                placeholder="CLAVE-ARG/2604-056"/>
              <span className={styles.calcNote}>Patrón: CLAVE-ARG/YYMM-NNN</span>
            </div>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Fecha del Avalúo Actual</label>
              <input type="date" className={styles.input} value={form.fechaAvaluo||''}
                onChange={e=>update('fechaAvaluo',e.target.value)}/>
            </div>
            <div className={`${styles.field} ${styles.span2}`}>
              <label className={`${styles.label} ${styles.req}`}>Fecha del Avalúo Referido</label>
              <input className={styles.input} value={form.fechaAvaluoReferido||''}
                onChange={e=>update('fechaAvaluoReferido',e.target.value)}
                placeholder="Ej: Enero 2006, 2006-01-01"/>
              <span className={styles.calcNote}>Fecha a la que se retrotrae el valor</span>
            </div>

          </div>
        </div>
      </div>

      {/* Datos del perito */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Datos del Perito Valuador</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid3}>
            <div className={`${styles.field} ${styles.span3}`}>
              <label className={styles.label}>Perito Valuador</label>
              <input className={styles.input} value={form.peritoValuador||''} readOnly
                style={{background:'var(--bg-input)',color:'var(--text-muted)',cursor:'not-allowed'}}/>
            </div>
            <div className={`${styles.field} ${styles.span2}`}>
              <label className={styles.label}>Maestría / Especialidad</label>
              <input className={styles.input} value={form.maestria||''} readOnly
                style={{background:'var(--bg-input)',color:'var(--text-muted)',cursor:'not-allowed'}}/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Reg. Estatal de Peritos</label>
              <input className={styles.input} value={form.regEstatalPeritos||''}
                onChange={e=>update('regEstatalPeritos',e.target.value)} placeholder="Núm. registro"/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Cédula Profesional</label>
              <input className={styles.input} value={form.cedulaProfesional||''} readOnly
                style={{background:'var(--bg-input)',color:'var(--text-muted)',cursor:'not-allowed'}}/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Registro SHF</label>
              <input className={styles.input} value={form.noRegSHF||''} readOnly
                style={{background:'var(--bg-input)',color:'var(--text-muted)',cursor:'not-allowed'}}/>
            </div>
          </div>
        </div>
      </div>

      {/* Solicitante, Propietario y Poseedor */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Solicitante, Propietario y Poseedor</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid3}>
            <div className={`${styles.field} ${styles.span2}`}>
              <label className={`${styles.label} ${styles.req}`}>Nombre del Solicitante</label>
              <input className={styles.input} value={form.nombreSolicitante||''}
                onChange={e=>update('nombreSolicitante',e.target.value)}/>
            </div>

            <div className={`${styles.field} ${styles.span2}`}>
              <label className={`${styles.label} ${styles.req}`}>Nombre del Poseedor</label>
              <input className={styles.input} value={form.nombrePoseedor||''}
                onChange={e=>update('nombrePoseedor',e.target.value)}
                placeholder="Quien posee físicamente el inmueble"/>
            </div>
          </div>
        </div>
      </div>

      {/* Tipo de avalúo y enfoques */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Tipo de Avalúo y Enfoques</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid3}>
            <div className={styles.field}>
              <label className={styles.label}>Tipo de Avalúo</label>
              <input className={styles.input} value="Avalúo Referido" readOnly
                style={{background:'var(--bg-input)',color:'var(--text-muted)',cursor:'not-allowed'}}/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Propósito</label>
              <input className={styles.input} value="DICTAMINAR EL VALOR REFERIDO" readOnly
                style={{background:'var(--bg-input)',color:'var(--text-muted)',cursor:'not-allowed'}}/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Régimen de Propiedad</label>
              <select className={styles.select} value={form.regimenPropiedad||'Privada'}
                onChange={e=>update('regimenPropiedad',e.target.value)}>
                {REGIMENES.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Bien que se Valúa</label>
              <select className={styles.select} value={form.bienQueSeValua||'Casa Habitación'}
                onChange={e=>update('bienQueSeValua',e.target.value)}>
                {BIENES.map(b=><option key={b}>{b}</option>)}
              </select>
            </div>
            <div className={`${styles.field} ${styles.span2}`}>
              <label className={styles.label}>Objeto del Avalúo</label>
              <input className={styles.input} value={form.objetoAvaluo||''}
                onChange={e=>update('objetoAvaluo',e.target.value)}/>
            </div>
          </div>

          {/* Enfoques: solo Físico y Mercado */}
          <div style={{marginTop:'1.25rem'}}>
            <label className={styles.label} style={{display:'block',marginBottom:'.5rem',fontWeight:700}}>
              Enfoques a aplicar
            </label>
            <p style={{fontSize:'.76rem',color:'var(--text-muted)',marginBottom:'.75rem'}}>
              El Avalúo Referido no incluye el enfoque de Rentas.
            </p>
            <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap'}}>
              {ENFOQUES_DEF.map(({key,label,color})=>{
                const activo = (form.enfoques||[]).includes(key)
                const esUltimo = activo && (form.enfoques||[]).length===1
                return (
                  <button key={key} type="button"
                    onClick={()=>!esUltimo&&toggleEnfoque(key)}
                    style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.5rem 1rem',
                      borderRadius:'8px',cursor:esUltimo?'not-allowed':'pointer',
                      border:`2px solid ${activo?color:'var(--border)'}`,
                      background:activo?color+'14':'var(--bg-card)',
                      color:activo?color:'var(--text-secondary)',
                      fontWeight:activo?700:500,fontSize:'.84rem',transition:'all .15s',
                      opacity:esUltimo?.7:1}}>
                    <span style={{width:'14px',height:'14px',borderRadius:'3px',flexShrink:0,
                      background:activo?color:'transparent',
                      border:`2px solid ${activo?color:'var(--border)'}`,transition:'all .15s'}}/>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dirección */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Dirección del Inmueble</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid3} style={{marginBottom:'1rem'}}>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Código Postal</label>
              <input className={styles.input} value={form.codigoPostal||''}
                onChange={e=>update('codigoPostal',e.target.value)} maxLength={5} placeholder="94300"/>
            </div>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Entidad Federativa</label>
              <select className={styles.select} value={estadoNorm||form.entidadFederativa||''}
                onChange={e=>{
                  const nv=e.target.value; update('entidadFederativa',nv)
                  const eraVer=(form.entidadFederativa||'').includes('Veracruz')
                  const esVer=nv.includes('Veracruz')
                  if(eraVer&&!esVer) update('municipio','')
                }}>
                <option value="">— Selecciona —</option>
                {ESTADOS_MX.map(e=><option key={e}>{e}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Municipio / Alcaldía</label>
              {esVeracruz?(
                <select className={styles.select} value={form.municipio||''}
                  onChange={e=>update('municipio',e.target.value)}>
                  <option value="">— Selecciona —</option>
                  {MUNICIPIOS_VERACRUZ.map(m=><option key={m}>{m}</option>)}
                </select>
              ):(
                <input className={styles.input} value={form.municipio||''}
                  onChange={e=>update('municipio',e.target.value)}
                  placeholder={form.entidadFederativa?'Escribe el municipio…':'Selecciona primero el estado'}
                  disabled={!form.entidadFederativa}/>
              )}
            </div>
          </div>

          <div className={styles.grid3} style={{marginBottom:'1rem'}}>
            <div className={`${styles.field} ${styles.span2}`}>
              <label className={`${styles.label} ${styles.req}`}>Calle / Avenida</label>
              <input className={styles.input} value={form.calle||''} onChange={e=>update('calle',e.target.value)}/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Colonia / Fraccionamiento</label>
              <input className={styles.input} value={form.colonia||''} onChange={e=>update('colonia',e.target.value)}/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Núm. Exterior</label>
              <input className={styles.input} value={form.numeroExterior||''} onChange={e=>update('numeroExterior',e.target.value)}/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Núm. Interior</label>
              <input className={styles.input} value={form.numeroInterior||''} onChange={e=>update('numeroInterior',e.target.value)}/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>&nbsp;</label>
              <button type="button" onClick={()=>setMostrarManzLote(v=>!v)}
                style={{padding:'.55rem .9rem',borderRadius:'7px',cursor:'pointer',
                  border:mostrarManzLote?'1.5px solid #c9972a':'1.5px dashed var(--border)',
                  background:mostrarManzLote?'#fef3c7':'var(--bg-card)',
                  color:mostrarManzLote?'#92400e':'var(--text-muted)',
                  fontSize:'.82rem',fontWeight:600,display:'flex',alignItems:'center',gap:'.35rem'}}>
                {mostrarManzLote?'✓ Manzana y Lote':'+  Manzana y Lote'}
              </button>
            </div>
          </div>

          {mostrarManzLote&&(
            <div className={styles.grid3} style={{marginBottom:'1rem'}}>
              <div className={styles.field}><label className={styles.label}>Manzana</label>
                <input className={styles.input} value={form.manzana||''} onChange={e=>update('manzana',e.target.value)}/></div>
              <div className={styles.field}><label className={styles.label}>Lote</label>
                <input className={styles.input} value={form.lote||''} onChange={e=>update('lote',e.target.value)}/></div>
            </div>
          )}

          <div className={styles.grid3}>
            <div className={styles.field}><label className={styles.label}>Latitud</label>
              <input className={styles.input} value={form.latitud||''} onChange={e=>update('latitud',e.target.value)} placeholder="18.853500"/></div>
            <div className={styles.field}><label className={styles.label}>Longitud</label>
              <input className={styles.input} value={form.longitud||''} onChange={e=>update('longitud',e.target.value)} placeholder="-97.094600"/></div>
            <div className={styles.field}><label className={styles.label}>Altitud</label>
              <input className={styles.input} value={form.altitud||''} onChange={e=>update('altitud',e.target.value)} placeholder="1220 msnm"/></div>
          </div>

          <div style={{display:'flex',gap:'.6rem',flexWrap:'wrap',marginTop:'1rem',alignItems:'flex-start'}}>
            <div>
              <button className={styles.addRowBtn} onClick={obtenerCoordenadas} disabled={geoCargando}>
                {geoCargando?<><Loader size={14} style={{animation:'spin 1s linear infinite'}}/> Buscando…</>
                  :<><Search size={14}/> Obtener coordenadas con Gemini IA</>}
              </button>
              {geoError&&<div style={{marginTop:'.45rem',padding:'.45rem .8rem',background:'#fef2f2',
                border:'1px solid #fecaca',borderRadius:'6px',fontSize:'.77rem',color:'#dc2626',maxWidth:'420px'}}>
                ⚠ {geoError}</div>}
              {geoOk&&<div style={{marginTop:'.45rem',padding:'.45rem .8rem',background:'#f0fdf4',
                border:'1px solid #bbf7d0',borderRadius:'6px',fontSize:'.77rem',color:'#15803d'}}>
                ✓ Coordenadas guardadas: {form.latitud}, {form.longitud}{form.altitud?` | ${form.altitud}`:''}</div>}
            </div>
            <button className={styles.addRowBtn} onClick={abrirMaps}>
              <MapPin size={14}/> Verificar en Google Maps
            </button>
          </div>

          <div className={styles.field} style={{marginTop:'1rem'}}>
            <label className={styles.label}>Cuenta Predial</label>
            <input className={styles.input} value={form.cuentaPredial||''} onChange={e=>update('cuentaPredial',e.target.value)}/>
          </div>
        </div>
      </div>

      {/* ── Características Urbanas del Predio ── (idénticas al Comercial) */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Características Urbanas del Predio</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid3}>

            {/* Nivel de Infraestructura */}
            <div className={styles.field}>
              <label className={styles.label}>Nivel de Infraestructura</label>
              <select className={styles.select} value={form.nivelInfraestructura||''}
                onChange={e=>update('nivelInfraestructura',e.target.value)}>
                <option value="">— Selecciona —</option>
                {['I','II','III','IV','V'].map(o=>(
                  <option key={o} value={`NIVEL ${o}`}>NIVEL {o}</option>
                ))}
              </select>
            </div>

            {/* Agua Potable */}
            <SelectOtro label="Agua Potable" campo="aguaPotable" value={form.aguaPotable}
              opts={['RED PÚBLICA MUNICIPAL','POZO PROPIO','TOMA PROVISIONAL','SIN SERVICIO']} update={update}/>

            {/* Drenaje */}
            <SelectOtro label="Drenaje" campo="drenaje" value={form.drenaje}
              opts={['RED MUNICIPAL','FOSA SÉPTICA','SIN SERVICIO']} update={update}/>

            {/* Electrificación */}
            <SelectOtro label="Electrificación" campo="electrificacion" value={form.electrificacion}
              opts={['RED PÚBLICA','GENERADOR PROPIO','SIN SERVICIO']} update={update}/>

            {/* Alumbrado Público */}
            <SelectOtro label="Alumbrado Público" campo="alumbradoPublico" value={form.alumbradoPublico}
              opts={['RED PÚBLICA','PARCIAL','SIN SERVICIO']} update={update}/>

            {/* Telefonía */}
            <SelectOtro label="Telefonía" campo="telefono" value={form.telefono}
              opts={['RED PÚBLICA','TELEFONÍA CELULAR','SIN SERVICIO']} update={update}/>

            {/* Señalización */}
            <div className={styles.field}>
              <label className={styles.label}>Señalización</label>
              <select className={styles.select} value={form.senalizacion||''}
                onChange={e=>update('senalizacion',e.target.value)}>
                {['COMPLETA','INCOMPLETA','SIN SEÑALIZACIÓN'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>

            {/* Transporte Público */}
            <SelectOtro label="Transporte Público" campo="transportePublico" value={form.transportePublico}
              opts={['CAMIÓN URBANO','TAXI','COMBI','METRO/TREN','SIN SERVICIO']}
              update={update} placeholder="Indica tipo…"/>

            {/* Vigilancia */}
            <SelectOtro label="Vigilancia" campo="vigilancia" value={form.vigilancia}
              opts={['PÚBLICA MUNICIPAL','PRIVADA','MIXTA','SIN SERVICIO']} update={update}/>

            {/* Nivel de Equipamiento */}
            <div className={styles.field}>
              <label className={styles.label}>Nivel de Equipamiento</label>
              <input className={styles.input} value={form.nivelEquipamiento||''}
                onChange={e=>update('nivelEquipamiento',e.target.value)}
                placeholder="Ej: URBANO, PENDIENTE…"/>
            </div>

            {/* Clasificación de la Zona */}
            <div className={styles.field}>
              <label className={styles.label}>Clasificación de la Zona</label>
              <select className={styles.select} value={form.clasificacionZona||''}
                onChange={e=>update('clasificacionZona',e.target.value)}>
                <option value="">— Selecciona —</option>
                {[
                  'HABITACIONAL DE PRIMER ORDEN','HABITACIONAL DE SEGUNDO ORDEN',
                  'HABITACIONAL DE TERCER ORDEN','COMERCIAL','INDUSTRIAL','MIXTO',
                  'CAMPESTRE','RURAL',
                ].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>

            {/* Uso de Suelo */}
            <SelectOtro label="Uso de Suelo" campo="usoSuelo" value={form.usoSuelo}
              opts={['HABITACIONAL','COMERCIAL','INDUSTRIAL','MIXTO','AGRÍCOLA','SIN USO DEFINIDO']}
              update={update}/>

            {/* Ref. Proximidad Urbana */}
            <div className={styles.field}>
              <label className={styles.label}>Ref. Proximidad Urbana</label>
              <select className={styles.select} value={form.refProximidadUrbana||''}
                onChange={e=>update('refProximidadUrbana',e.target.value)}>
                {[
                  'ZONA CENTRAL','ZONA INTERMEDIA','ZONA PERIFÉRICA',
                  'ZONA CONURBADA','ZONA RURAL',
                ].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>

            {/* Vías de Acceso */}
            <div className={`${styles.field} ${styles.span3}`}>
              <label className={styles.label}>Vías de Acceso</label>
              <textarea className={styles.textarea} value={form.viasAcceso||''}
                onChange={e=>update('viasAcceso',e.target.value)}
                placeholder="Describe las vías de acceso principales"/>
            </div>

            {/* Construcciones Predominantes */}
            <div className={`${styles.field} ${styles.span3}`}>
              <label className={styles.label}>Construcciones Predominantes</label>
              <textarea className={styles.textarea} value={form.construccionesPredominantes||''}
                onChange={e=>update('construccionesPredominantes',e.target.value)}/>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}