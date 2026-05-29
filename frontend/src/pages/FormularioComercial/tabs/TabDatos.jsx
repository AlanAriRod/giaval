// TabDatos.jsx — v5
// CAMBIOS v5:
// 1. obtenerCoordenadas usa Gemini IA (más preciso que Nominatim)
// 2. Estado seleccionado manualmente NO borra el municipio (solo limpia si cambia manualmente)
// 3. Altitud extraída junto con coordenadas
// CAMBIOS respecto al archivo original del usuario:
// 1. obtenerCoordenadas usa Gemini IA — más preciso que Nominatim
// 2. Botones de Enfoques actualizados al estilo pill con color (igual que en otras sesiones)
// 3. Se mantiene TODA la estructura, secciones y campos del archivo original
import { useState, useEffect } from 'react'
import { MapPin, Loader, Search } from 'lucide-react'
import styles from '../Formulario.module.css'

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

const TIPOS_INMUEBLE = [
  'Casa Habitación','Departamento','Terreno','Local Comercial',
  'Oficina','Nave Industrial','Bodega','Edificio','Predio Rústico',
  'Fraccionamiento','Otro',
]
const PROPOSITOS_COMERCIAL = [
  'ORIGINACIÓN DE CRÉDITO','CONOCER EL VALOR COMERCIAL','CONOCER EL VALOR',
]
const PROPOSITOS_REFERIDO = ['DICTAMINAR EL VALOR REFERIDO']
const REGIMENES = ['PRIVADA INDIVIDUAL','FEDERAL','MUNICIPAL','EJIDAL','CONDOMINIAL']
const NIVEL_INFRA_OPTS   = ['1','2','3','4','5']
const AGUA_OPTS          = [
  'NO SE CUENTA CON EL SERVICIO',
  'RED DE DISTRIBUCIÓN CON SERVICIO AL INMUEBLE',
  'SE TIENE FACTIBILIDAD (NO SE CUENTA CON SERVICIO)',
  'OTRO',
]
const DRENAJE_OPTS = [
  'NO SE CUENTA CON EL SERVICIO',
  'CON CONEXIÓN AL INMUEBLE',
  'SE TIENE FACTIBILIDAD (NO SE CUENTA CON SERVICIO)',
  'OTRO',
]
const RED_OPTS          = ['RED AÉREA','RED SUBTERRÁNEA','OTRO']
const SENALIZACION_OPTS = ['EXISTE','NO EXISTE']
const TRANSPORTE_OPTS   = ['URBANO','SUBURBANO','NO EXISTE','OTRO']
const VIGILANCIA_OPTS   = ['MUNICIPAL','PRIVADA','OTRO']
const CLASIFICACION_OPTS= [
  'HABITACIONAL DE PRIMER ORDEN','HABITACIONAL DE SEGUNDO ORDEN',
  'HABITACIONAL DE TERCER ORDEN','COMERCIAL','INDUSTRIAL','MIXTO',
]
const USO_SUELO_OPTS  = ['HABITACIONAL','COMERCIAL','MIXTO (HABITACIONAL – COMERCIAL)','OTRO']
const PROXIMIDAD_OPTS = ['CENTRICA','INTERMEDIA','PERIFERICA']

// Enfoques con el estilo pill+color de las demás pestañas
const ENFOQUES_DEF = [
  { key:'mercado', label:'Mercado (Comparables de casa)',    desc:'Activa: Comp. Casa',        color:'#c9972a' },
  { key:'fisico',  label:'Físico (Comparables de terreno)', desc:'Activa: Comp. Terreno y Costos', color:'#2563eb' },
  { key:'rentas',  label:'Rentas (Capitalización)',         desc:'Activa: Mercado Rentas',     color:'#16a34a' },
]

const FOLIO_PATTERN = /^CLAVE-AG\/\d{4}-\d{2}$/

function SelectOtro({ label, campo, value, opts, update, placeholder = '' }) {
  const ultimaOpcion = opts[opts.length - 1]
  const esOtro = value && value !== ultimaOpcion && !opts.slice(0, -1).includes(value)
  const selectVal = esOtro ? ultimaOpcion : (value || '')
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <select className={styles.select} value={selectVal}
        onChange={e => update(campo, e.target.value)}>
        <option value="">— Selecciona —</option>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
      {(selectVal === ultimaOpcion || esOtro) && (
        <input className={styles.input}
          value={esOtro ? value : ''}
          onChange={e => update(campo, e.target.value)}
          placeholder={placeholder || `Especifica ${label.toLowerCase()}…`}
          style={{ marginTop: '.4rem' }} />
      )}
    </div>
  )
}

export default function TabDatos({ form, update }) {
  const [buscandoCP,          setBuscandoCP]         = useState(false)
  // FIX: estados para Nominatim — sin alert(), error inline
  const [geoCargando,         setGeoCargando]         = useState(false)
  const [geoError,            setGeoError]            = useState('')
  const [geoOk,               setGeoOk]               = useState(false)
  const [mostrarManzLote,     setMostrarManzLote]     = useState(!!(form.manzana || form.lote))
  const [folioError,          setFolioError]          = useState('')

  // Normaliza el estado del OCR para que coincida con las opciones del select
  // OCR devuelve "Veracruz de Ignacio de la Llave", select tiene "30 - Veracruz de Ignacio de la Llave"
  const normalizarEstado = (val) => {
    if (!val) return val
    if (ESTADOS_MX.includes(val)) return val  // ya tiene formato correcto
    // Buscar la opción que contiene el nombre
    const match = ESTADOS_MX.find(opt => {
      const nombre = opt.includes(' - ') ? opt.split(' - ')[1] : opt
      return nombre.toLowerCase() === val.toLowerCase() ||
             nombre.toLowerCase().includes(val.toLowerCase()) ||
             val.toLowerCase().includes(nombre.toLowerCase())
    })
    return match || val
  }

  // Si el valor del form no coincide con ninguna opción, intentar normalizarlo
  const estadoNormalizado = normalizarEstado(form.entidadFederativa)

  // Auto-normaliza el estado cuando viene del OCR (sin el formato "XX - Nombre")
  // Esto asegura que el select muestre el valor correctamente
  useEffect(() => {
    if (form.entidadFederativa) {
      const normalizado = normalizarEstado(form.entidadFederativa)
      if (normalizado !== form.entidadFederativa) {
        update('entidadFederativa', normalizado)
      }
    }
  }, [form.entidadFederativa]) // eslint-disable-line
  const esVeracruz = (estadoNormalizado || form.entidadFederativa)?.includes('Veracruz')

  const buscarCP = async (cp) => {
    update('codigoPostal', cp)
    if (cp.length !== 5) return
    setBuscandoCP(true)
    try {
      const r = await fetch(`https://api.zippopotam.us/mx/${cp}`)
      if (!r.ok) return
      const data = await r.json()
      const lugar = data.places?.[0]
      if (lugar) {
        update('municipio',         lugar['place name'] || '')
        update('entidadFederativa', lugar['state']      || '')
        if (!form.colonia) update('colonia', lugar['place name'] || '')
      }
    } catch { /* sin internet */ }
    finally { setBuscandoCP(false) }
  }

  // Obtiene coordenadas con Gemini IA (más preciso que Nominatim)
  const obtenerCoordenadas = async () => {
    if (!form.municipio && !form.calle) {
      setGeoError('Agrega al menos Calle y Municipio antes de buscar coordenadas.')
      return
    }
    setGeoCargando(true)
    setGeoError('')
    setGeoOk(false)
    try {
      const token = localStorage.getItem('giaval_token')
      const r = await fetch('/api/ocr/coordenadas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          calle:             form.calle             || '',
          numeroExterior:    form.numeroExterior     || '',
          colonia:           form.colonia            || '',
          municipio:         form.municipio          || '',
          entidadFederativa: (form.entidadFederativa||'').replace(/^\d+\s*-\s*/,''),
          codigoPostal:      form.codigoPostal       || '',
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Error al obtener coordenadas')
      update('latitud',  data.latitud)
      update('longitud', data.longitud)
      if (data.altitud) update('altitud', data.altitud)
      setGeoOk(true)
      setGeoError('')
      setTimeout(() => setGeoOk(false), 4000)
    } catch (err) {
      setGeoError(err.message || 'Error al obtener coordenadas con Gemini. Ingrésalas manualmente desde Google Maps.')
    } finally {
      setGeoCargando(false)
    }
  }

  const abrirMaps = () => {
    const q = form.latitud && form.longitud
      ? `${form.latitud},${form.longitud}`
      : [form.calle, form.numeroExterior, form.colonia,
         form.municipio, form.entidadFederativa, 'México'].filter(Boolean).join(' ')
    window.open(`https://maps.google.com/?q=${encodeURIComponent(q)}`, '_blank')
  }

  const handleFolio = (val) => {
    update('folioInterno', val)
    setFolioError(val && !FOLIO_PATTERN.test(val)
      ? 'Formato: CLAVE-AG/YYMM-NN  (ej: CLAVE-AG/2602-04)' : '')
  }

  const toggleEnfoque = (key) => {
    const activos = form.enfoques.includes(key)
      ? form.enfoques.filter(e => e !== key)
      : [...form.enfoques, key]
    if (activos.length === 0) return
    update('enfoques', activos)
  }

  const direccionCompleta = [
    form.calle, form.numeroExterior,
    form.numeroInterior  ? `Int. ${form.numeroInterior}`  : '',
    mostrarManzLote && form.manzana ? `Mza. ${form.manzana}` : '',
    mostrarManzLote && form.lote    ? `Lote ${form.lote}`    : '',
    form.colonia, form.municipio, form.entidadFederativa,
  ].filter(Boolean).join(', ')

  return (
    <div>

      {/* FOLIO */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Folio del Avalúo</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid3}>
            <div className={`${styles.field} ${styles.span2}`}>
              <label className={`${styles.label} ${styles.req}`}>Folio Interno</label>
              <input className={styles.input}
                value={form.folioInterno}
                onChange={e => handleFolio(e.target.value)}
                placeholder="CLAVE-AG/2602-04" />
              {folioError
                ? <span style={{ fontSize: '.74rem', color: '#dc2626' }}>{folioError}</span>
                : <span className={styles.calcNote}>Patrón: CLAVE-AG/YYMM-NN</span>}
            </div>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Fecha del Avalúo</label>
              <input type="date" className={styles.input}
                value={form.fechaAvaluo}
                onChange={e => update('fechaAvaluo', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* DATOS DEL PERITO */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Datos del Perito Valuador</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>Perito Valuador</label>
              <input className={`${styles.input} ${styles.inputLocked}`} value={form.peritoValuador} readOnly />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Maestría / Posgrado</label>
              <input className={`${styles.input} ${styles.inputLocked}`} value={form.maestria} readOnly />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Cédula Profesional</label>
              <input className={`${styles.input} ${styles.inputLocked}`} value={form.cedulaProfesional} readOnly />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>No. Reg. SHF</label>
              <input className={`${styles.input} ${styles.inputLocked}`} value={form.noRegSHF} readOnly />
            </div>
            <div className={`${styles.field} ${styles.span2}`}>
              <label className={`${styles.label} ${styles.req}`}>Reg. Estatal de Peritos</label>
              <input className={styles.input}
                value={form.regEstatalPeritos}
                onChange={e => update('regEstatalPeritos', e.target.value)}
                placeholder="Número de registro estatal" />
            </div>
          </div>
        </div>
      </div>

      {/* SOLICITANTE / PROPIETARIO */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Solicitante y Propietario</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Nombre del Solicitante</label>
              <input className={styles.input} value={form.nombreSolicitante}
                onChange={e => update('nombreSolicitante', e.target.value)}
                placeholder="Nombre completo o razón social" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Nombre del Propietario</label>
              <input className={styles.input} value={form.nombrePropietario}
                onChange={e => update('nombrePropietario', e.target.value)}
                placeholder="Nombre completo o razón social" />
            </div>
          </div>
        </div>
      </div>

      {/* TIPO DE AVALÚO + ENFOQUES */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Tipo de Avalúo y Enfoques</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid3}>
            <div className={styles.field}>
              <label className={styles.label}>Tipo de Avalúo</label>
              <select className={styles.select} value={form.tipoAvaluo||'Avalúo Comercial'}
                onChange={e=>update('tipoAvaluo',e.target.value)}>
                <option value="Avalúo Comercial">Avalúo Comercial</option>
                <option value="Avalúo Referido">Avalúo Referido</option>
                <option value="Avalúo Catastral">Avalúo Catastral</option>
                <option value="Avalúo Hipotecario">Avalúo Hipotecario</option>
                <option value="Otro">Otro (especificar)</option>
              </select>
              {form.tipoAvaluo==='Otro'&&(
                <input className={styles.input} style={{marginTop:'.4rem'}}
                  value={form.tipoAvaluoOtro||''}
                  onChange={e=>update('tipoAvaluoOtro',e.target.value)}
                  placeholder="Especifica el tipo de avalúo…"/>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Propósito del Avalúo</label>
              <select className={styles.select} value={form.proposito}
                onChange={e => update('proposito', e.target.value)}>
                <optgroup label="Avalúo Comercial">
                  {PROPOSITOS_COMERCIAL.map(p => <option key={p}>{p}</option>)}
                </optgroup>
                <optgroup label="Avalúo Referido">
                  {PROPOSITOS_REFERIDO.map(p => <option key={p}>{p}</option>)}
                </optgroup>
                <option value="OTRO">OTRO</option>
              </select>
              {form.proposito === 'OTRO' && (
                <input className={styles.input} style={{ marginTop: '.4rem' }}
                  value={form.propositoOtro || ''}
                  onChange={e => update('propositoOtro', e.target.value)}
                  placeholder="Especifica el propósito…" />
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Régimen de Propiedad</label>
              <select className={styles.select} value={form.regimenPropiedad}
                onChange={e => update('regimenPropiedad', e.target.value)}>
                {REGIMENES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Bien que se Valúa</label>
              <select className={styles.select} value={form.bienQueSeValua}
                onChange={e => update('bienQueSeValua', e.target.value)}>
                {TIPOS_INMUEBLE.map(t => <option key={t}>{t}</option>)}
              </select>
              {form.bienQueSeValua === 'Otro' && (
                <input className={styles.input} style={{ marginTop: '.4rem' }}
                  value={form.bienOtro || ''}
                  onChange={e => update('bienOtro', e.target.value)}
                  placeholder="Describe el tipo de inmueble" />
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Objeto del Avalúo</label>
              <input className={styles.input} value={form.objetoAvaluo}
                onChange={e => update('objetoAvaluo', e.target.value)} />
            </div>
          </div>

          {/* Selector de enfoques — estilo pill+color */}
          <div style={{ marginTop: '1.25rem' }}>
            <label className={styles.label} style={{ display: 'block', marginBottom: '.5rem', fontWeight: 700 }}>
              Enfoques a aplicar
            </label>
            <p style={{ fontSize: '.76rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
              Mínimo uno. Las pestañas correspondientes aparecen automáticamente.
            </p>
            <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
              {ENFOQUES_DEF.map(({ key, label, desc, color }) => {
                const activo   = form.enfoques.includes(key)
                const esUltimo = activo && form.enfoques.length === 1
                return (
                  <button key={key} type="button"
                    onClick={() => !esUltimo && toggleEnfoque(key)}
                    title={esUltimo ? 'Debe haber al menos un enfoque activo' : ''}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      padding: '.6rem 1rem', borderRadius: '9px', textAlign: 'left',
                      border:     `2px solid ${activo ? color : 'var(--border)'}`,
                      background: activo ? color + '14' : 'var(--bg-card)',
                      cursor: esUltimo ? 'not-allowed' : 'pointer',
                      minWidth: '210px', transition: 'all .18s',
                      opacity: esUltimo ? .7 : 1,
                    }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '.5rem',
                      fontWeight: 700, fontSize: '.86rem',
                      color: activo ? color : 'var(--text-secondary)',
                    }}>
                      <span style={{
                        width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                        border:     `2px solid ${activo ? color : 'var(--border)'}`,
                        background: activo ? color : 'transparent',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.6rem', color: '#fff', transition: 'all .15s',
                      }}>{activo ? '✓' : ''}</span>
                      {label}
                    </div>
                    <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', margin: '.2rem 0 0 1.45rem' }}>
                      {desc}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* DIRECCIÓN */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Dirección del Inmueble</span>
        </div>
        <div className={styles.sectBody}>

          <div className={styles.grid3} style={{ marginBottom: '1rem' }}>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Código Postal</label>
              <div className={styles.inputGroup}>
                <input className={styles.input} value={form.codigoPostal}
                  onChange={e => buscarCP(e.target.value)} maxLength={5} placeholder="Ej: 94300" />
                {buscandoCP && (
                  <div className={styles.iconBtn} style={{ pointerEvents: 'none' }}>
                    <Loader size={15} />
                  </div>
                )}
              </div>
              <span className={styles.calcNote}>Autocompletado por CP</span>
            </div>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Entidad Federativa</label>
              <select className={styles.select} value={estadoNormalizado || form.entidadFederativa || ""}
                onChange={e => {
                  const nuevoEstado = e.target.value
                  update('entidadFederativa', nuevoEstado)
                  // Solo borrar municipio si el usuario cambia manualmente el estado
                  // Y el municipio actual no corresponde al nuevo estado seleccionado
                  // (No borrar si viene de OCR o si el municipio ya estaba llenado)
                  if (!form.municipio) {
                    update('municipio', '')
                  }
                  // Si cambia de Veracruz a otro estado, limpiar el municipio
                  // porque el select de Veracruz usa valores específicos
                  const eraVeracruz = form.entidadFederativa?.includes('Veracruz')
                  const esVeracruzNuevo = nuevoEstado?.includes('Veracruz')
                  if (eraVeracruz && !esVeracruzNuevo) {
                    update('municipio', '')
                  }
                }}>
                <option value="">— Selecciona —</option>
                {ESTADOS_MX.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={`${styles.label} ${styles.req}`}>Municipio / Alcaldía</label>
              {esVeracruz ? (
                <select className={styles.select} value={form.municipio}
                  onChange={e => update('municipio', e.target.value)}>
                  <option value="">— Selecciona municipio —</option>
                  {MUNICIPIOS_VERACRUZ.map(m => <option key={m}>{m}</option>)}
                </select>
              ) : (
                <input className={styles.input} value={form.municipio}
                  onChange={e => update('municipio', e.target.value)}
                  placeholder={form.entidadFederativa ? 'Escribe el municipio…' : 'Selecciona primero el estado'}
                  disabled={!form.entidadFederativa} />
              )}
            </div>
          </div>

          <div className={styles.grid3} style={{ marginBottom: '1rem' }}>
            <div className={`${styles.field} ${styles.span2}`}>
              <label className={`${styles.label} ${styles.req}`}>Calle / Avenida</label>
              <input className={styles.input} value={form.calle}
                onChange={e => update('calle', e.target.value)} placeholder="Ej: Av. Colón" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Colonia / Fraccionamiento</label>
              <input className={styles.input} value={form.colonia}
                onChange={e => update('colonia', e.target.value)} placeholder="Ej: Centro" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Núm. Exterior</label>
              <input className={styles.input} value={form.numeroExterior}
                onChange={e => update('numeroExterior', e.target.value)} placeholder="Ej: 120" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Núm. Interior</label>
              <input className={styles.input} value={form.numeroInterior}
                onChange={e => update('numeroInterior', e.target.value)} placeholder="Ej: 3B" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>&nbsp;</label>
              <button type="button"
                onClick={() => setMostrarManzLote(v => !v)}
                style={{
                  padding: '.55rem .9rem', borderRadius: '7px', cursor: 'pointer',
                  border:     mostrarManzLote ? '1.5px solid #c9972a' : '1.5px dashed var(--border)',
                  background: mostrarManzLote ? '#fef3c7' : 'var(--bg-card)',
                  color:      mostrarManzLote ? '#92400e' : 'var(--text-muted)',
                  fontSize: '.82rem', fontWeight: 600, transition: 'all .15s',
                  display: 'flex', alignItems: 'center', gap: '.35rem',
                }}>
                {mostrarManzLote ? '✓ Manzana y Lote incluidos' : '+ ¿Incluir Manzana y Lote?'}
              </button>
            </div>
          </div>

          {mostrarManzLote && (
            <div className={styles.grid3} style={{ marginBottom: '1rem' }}>
              <div className={styles.field}>
                <label className={styles.label}>Manzana</label>
                <input className={styles.input} value={form.manzana}
                  onChange={e => update('manzana', e.target.value)} placeholder="Ej: MZA. 12" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Lote</label>
                <input className={styles.input} value={form.lote}
                  onChange={e => update('lote', e.target.value)} placeholder="Ej: LOTE 5" />
              </div>
            </div>
          )}

          <div className={styles.grid3}>
            <div className={styles.field}>
              <label className={styles.label}>Latitud</label>
              <input className={styles.input} value={form.latitud}
                onChange={e => update('latitud', e.target.value)} placeholder="18.853500" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Longitud</label>
              <input className={styles.input} value={form.longitud}
                onChange={e => update('longitud', e.target.value)} placeholder="-97.094600" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Altitud</label>
              <input className={styles.input} value={form.altitud}
                onChange={e => update('altitud', e.target.value)} placeholder="Ej: 1220 msnm" />
            </div>
          </div>

          {/* FIX: Nominatim sin alert() */}
          <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginTop: '1rem', alignItems: 'flex-start' }}>
            <div>
              <button className={styles.addRowBtn}
                onClick={obtenerCoordenadas} disabled={geoCargando}>
                {geoCargando
                  ? <><Loader size={14} style={{animation:'spin 1s linear infinite'}}/> Buscando…</>
                  : <><Search size={14}/> Obtener coordenadas con Gemini IA</>}
              </button>
              {/* Error inline */}
              {geoError && (
                <div style={{ marginTop: '.45rem', padding: '.45rem .8rem', background: '#fef2f2',
                  border: '1px solid #fecaca', borderRadius: '6px', fontSize: '.77rem', color: '#dc2626',
                  maxWidth: '420px', lineHeight: 1.45 }}>
                  ⚠ {geoError}
                </div>
              )}
              {/* Éxito inline */}
              {geoOk && (
                <div style={{ marginTop: '.45rem', padding: '.45rem .8rem', background: '#f0fdf4',
                  border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '.77rem', color: '#15803d' }}>
                  ✓ Coordenadas: {form.latitud}, {form.longitud}{form.altitud ? ` | Alt: ${form.altitud}` : ''}
                </div>
              )}
            </div>
            <button className={styles.addRowBtn} onClick={abrirMaps}>
              <MapPin size={14} /> Verificar en Google Maps
            </button>
          </div>

          {direccionCompleta && (
            <div style={{
              marginTop: '1rem', padding: '.75rem', background: 'var(--bg-input)',
              borderRadius: '8px', border: '1px solid var(--border)',
              fontSize: '.82rem', color: 'var(--text-secondary)',
            }}>
              <strong>Dirección completa:</strong> {direccionCompleta}
            </div>
          )}

          <div className={styles.field} style={{ marginTop: '1rem' }}>
            <label className={styles.label}>Cuenta Predial</label>
            <input className={styles.input} value={form.cuentaPredial}
              onChange={e => update('cuentaPredial', e.target.value)}
              placeholder="Número de cuenta predial" />
          </div>
        </div>
      </div>

      {/* CARACTERÍSTICAS URBANAS */}
      <div className={styles.section}>
        <div className={`${styles.sectHeader} ${styles.sectHeaderOpen}`}>
          <span className={styles.sectTitle}>Características Urbanas del Predio</span>
        </div>
        <div className={styles.sectBody}>
          <div className={styles.grid3}>
            <div className={styles.field}>
              <label className={styles.label}>Nivel de Infraestructura</label>
              <select className={styles.select} value={form.nivelInfraestructura}
                onChange={e => update('nivelInfraestructura', e.target.value)}>
                <option value="">— Selecciona —</option>
                {NIVEL_INFRA_OPTS.map(o => (
                  <option key={o} value={`NIVEL ${o}`}>NIVEL {o}</option>
                ))}
              </select>
            </div>
            <SelectOtro label="Agua Potable"     campo="aguaPotable"      value={form.aguaPotable}      opts={AGUA_OPTS}      update={update} />
            <SelectOtro label="Drenaje"           campo="drenaje"          value={form.drenaje}          opts={DRENAJE_OPTS}   update={update} />
            <SelectOtro label="Electrificación"   campo="electrificacion"  value={form.electrificacion}  opts={RED_OPTS}       update={update} />
            <SelectOtro label="Alumbrado Público" campo="alumbradoPublico" value={form.alumbradoPublico} opts={RED_OPTS}       update={update} />
            <SelectOtro label="Telefonía"         campo="telefono"         value={form.telefono}         opts={RED_OPTS}       update={update} />
            <div className={styles.field}>
              <label className={styles.label}>Señalización</label>
              <select className={styles.select} value={form.senalizacion}
                onChange={e => update('senalizacion', e.target.value)}>
                {SENALIZACION_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <SelectOtro label="Transporte Público" campo="transportePublico" value={form.transportePublico} opts={TRANSPORTE_OPTS} update={update} placeholder="Indica tipo…" />
            <SelectOtro label="Vigilancia"          campo="vigilancia"        value={form.vigilancia}        opts={VIGILANCIA_OPTS} update={update} />
            <div className={styles.field}>
              <label className={styles.label}>Nivel de Equipamiento</label>
              <input className={styles.input} value={form.nivelEquipamiento}
                onChange={e => update('nivelEquipamiento', e.target.value)}
                placeholder="Ej: URBANO, PENDIENTE…" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Clasificación de la Zona</label>
              <select className={styles.select} value={form.clasificacionZona}
                onChange={e => update('clasificacionZona', e.target.value)}>
                <option value="">— Selecciona —</option>
                {CLASIFICACION_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <SelectOtro label="Uso de Suelo" campo="usoSuelo" value={form.usoSuelo} opts={USO_SUELO_OPTS} update={update} />
            <div className={styles.field}>
              <label className={styles.label}>Ref. Proximidad Urbana</label>
              <select className={styles.select} value={form.refProximidadUrbana}
                onChange={e => update('refProximidadUrbana', e.target.value)}>
                {PROXIMIDAD_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className={`${styles.field} ${styles.span3}`}>
              <label className={styles.label}>Vías de Acceso</label>
              <textarea className={styles.textarea} value={form.viasAcceso}
                onChange={e => update('viasAcceso', e.target.value)}
                placeholder="Describe las vías de acceso principales" />
            </div>
            <div className={`${styles.field} ${styles.span3}`}>
              <label className={styles.label}>Construcciones Predominantes</label>
              <textarea className={styles.textarea} value={form.construccionesPredominantes}
                onChange={e => update('construccionesPredominantes', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}