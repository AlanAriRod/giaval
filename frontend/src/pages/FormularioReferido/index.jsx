// frontend/src/pages/FormularioReferido/index.jsx
// Avalúo Referido — calca del Comercial con diferencias específicas:
//   - Folio: CLAVE-ARG/XXXX-XXX
//   - Campo: Fecha del Avalúo Referido + Nombre del Poseedor
//   - Sin pestaña Mercado de Rentas (solo Terreno y Casa)
//   - Tab nuevo: Valor Referido (INPC, factor, cálculo)
//   - Propósito fijo: Dictaminar el Valor Referido
//   - Conclusión: Valor Actual → Factor INPC → Valor Referido

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Save, Download, CheckCircle2,
  Home, FileText, Map, Building, BarChart2,
  DollarSign, TrendingDown, Camera, ClipboardList,
  FileSpreadsheet,
} from 'lucide-react'
// FilePdf no existe en lucide-react — usamos FileText con color rojo
const FilePdf = (props) => <FileText {...props} />
import Navbar      from '../../components/Navbar'
import FloatingNav from '../../components/FloatingNav'
import { useAuth } from '../../context/AuthContext'
import LectorDocumento from '../../components/LectorDocumento'

// Tabs compartidos con el Comercial (reutilizados directamente)
import TabPortada           from '../FormularioComercial/tabs/TabPortada'
import TabCaracTerreno      from '../FormularioComercial/tabs/TabCaracTerreno'
import TabDescripInmueble   from '../FormularioComercial/tabs/TabDescripInmueble'
import TabComparableTerreno from '../FormularioComercial/tabs/TabComparableTerreno'
import TabComparableCasa    from '../FormularioComercial/tabs/TabComparableCasa'
import TabCostos            from '../FormularioComercial/tabs/TabCostos'
import TabFotos             from '../FormularioComercial/tabs/TabFotos'

// Tabs propios del Referido
import TabDatosReferido    from './tabs/TabDatosReferido'
import TabValorReferido    from './tabs/TabValorReferido'
import TabConclusionReferido from './tabs/TabConclusionReferido'

import styles from '../FormularioComercial/Formulario.module.css'

// ── FORM_VACIO Referido ──────────────────────────────────────────
const FORM_VACIO = {
  titulo: '', folioInterno: '', fechaAvaluo: '',
  fechaAvaluoReferido: '',       // NUEVO: fecha a la que se retrotrae
  peritoValuador:    'Mtro. Arq. José Luis Espinosa Quitl',
  maestria:          'Maestría en Valuación Inmobiliaria, Industrial y de Bienes Nacionales',
  cedulaProfesional: '11788863', noRegSHF: '1844807', regEstatalPeritos: '',
  nombreSolicitante: '', nombrePropietario: '',
  nombrePoseedor: '',            // NUEVO: poseedor del inmueble
  tipoAvaluo:'Avalúo Referido', bienQueSeValua:'Casa Habitación', bienOtro:'',
  regimenPropiedad:'Privada', objetoAvaluo:'Dictaminar el Valor Referido',
  proposito:'DICTAMINAR EL VALOR REFERIDO',
  enfoques:['fisico'],           // Referido: Físico y/o Mercado (sin Rentas)

  // Dirección
  calle:'', numeroExterior:'', numeroInterior:'', manzana:'', lote:'', colonia:'',
  municipio:'', codigoPostal:'', entidadFederativa:'', longitud:'', latitud:'', altitud:'', cuentaPredial:'',

  // Características urbanas
  nivelInfraestructura:'NIVEL 3', aguaPotable:'RED DE DISTRIBUCIÓN CON SERVICIO AL INMUEBLE',
  drenaje:'CON CONEXIÓN AL INMUEBLE', electrificacion:'RED AÉREA', alumbradoPublico:'RED AÉREA',
  telefono:'RED AÉREA', senalizacion:'EXISTE', transportePublico:'', vigilancia:'MUNICIPAL',
  nivelEquipamiento:'URBANO', clasificacionZona:'HABITACIONAL DE SEGUNDO ORDEN',
  refProximidadUrbana:'CENTRICA', construccionesPredominantes:'', viasAcceso:'',

  // Escritura / notaría
  colindanciaGeneral:'', notarioNombre:'', notarioCiudad:'', fechaEscritura:'',
  numeroEscritura:'', numeroNotario:'', medidasSegun:'Escritura Pública',
  medNorte:'', colindNorte:'', medSur:'', colindSur:'',
  medOriente:'', colindOriente:'', medPoniente:'', colindPoniente:'',
  medidas:[],

  // Terreno / construcción
  areaTerreno:'', areaConstruccion:'', indiviso:100,
  areaConstruccionHabitable:'', areaConstruccionHabitableSubtitulo:'', areaTerrenoSubtitulo:'',
  topografia:'Terreno plano de forma irregular', numeroFrente:'1 (UNO)', usoSuelo:'Habitacional',
  servidumbre:'', observacionesPredio:'', imgMacro:null, imgMicro:null,

  // Descripción del inmueble
  descripcionInmueble:'',
  usoActual:'', tiposConstruccion:'Casa Habitación', calidadClasificacion:'BUENO', numNiveles:2,
  edadAproximada:'', vidaTotal:60, numRecamaras:3, numCocina:1, numBanosCompletos:2,
  numMediosBanos:0, estacionamientos:1, elevador:'NO TIENE',
  estadoConservacion:'BUENO', calidadProyecto:'BUENO PARA EL TIPO PROYECTO',
  estructura:'SE PRESUME CIMENTACION DE PIEDRA BRAZA Y/O ZAPATAS DE CONCRETO',
  acabados:[
    {espacio:'Estancia',        piso:'LOSETA DE CERAMICA',muro:'CORRIDA DE YESO PINTURA VINILICA',plafon:'CORRIDA DE YESO PINTURA VINILICA'},
    {espacio:'Cocina',          piso:'LOSETA DE CERAMICA',muro:'FORRADO EN PARTE CON AZULEJO',    plafon:'CORRIDA DE YESO PINTURA VINILICA'},
    {espacio:'Comedor',         piso:'LOSETA DE CERAMICA',muro:'CORRIDA DE YESO PINTURA VINILICA',plafon:'CORRIDA DE YESO PINTURA VINILICA'},
    {espacio:'Recámaras',       piso:'LOSETA DE CERAMICA',muro:'CORRIDA DE YESO PINTURA VINILICA',plafon:'CORRIDA DE YESO PINTURA VINILICA'},
    {espacio:'Baños',           piso:'LOSETA DE CERAMICA',muro:'FORRADO EN AREA HUMEDA CON LOSETA CERAMICA',plafon:'CORRIDA DE YESO PINTURA VINILICA'},
    {espacio:'Cochera',         piso:'CONCRETO',          muro:'CORRIDA DE YESO PINTURA VINILICA',plafon:'NO APLICA'},
    {espacio:'Área de Servicio',piso:'LOSETA DE CERAMICA',muro:'CORRIDA DE YESO PINTURA VINILICA',plafon:'NO APLICA'},
    {espacio:'Fachada',         piso:'BANQUETA FIRME DE CONCRETO',muro:'MURO CON PROTECCIONES DE HERRERIA',plafon:'NO APLICA'},
  ],
  hidraulico:'', electrico:'', carpinteria:'', herreria:'',

  // Comparables (Terreno y Casa — sin Rentas)
  comparablesCasa: Array(4).fill(null).map((_,i)=>({
    no:i+1,ciudad:'',colonia:'',telefono:'',informante:'',url:'',
    caracteristicas:'',oferta:'',supConst:'',
    factores:{neg:1,ubic:1,sup:1,calid:1,edoCons:1,zona:1},fotos:[],
  })),
  factoresCasaCustom:[], terrenoExcedente:'', enNRTerreno:'',
  comparablesTerreno: Array(4).fill(null).map((_,i)=>({
    no:i+1,ciudad:'',colonia:'',telefono:'',informante:'',url:'',
    caracteristicas:'',oferta:'',supM2:'',
    factores:{neg:0.95,zona:1,ubica:1,frente:1,sup:1,forma:1},fotos:[],
  })),
  factoresTerrenoCustom:[],

  // Costos / Físico
  fraccionesTerreno:[{sup:'',valorUnit:'',coeficiente:'',motivo:'NINGUNO',motivoOtro:''}],
  construcciones:[{tipo:'T-1',descripcion:'',area:'',crn:'',factorDemeritoEdad:'',factorDemeritoCalidad:''}],
  instalaciones:[],

  // Valor Referido — NUEVOS campos exclusivos
  inpcActual:'',          // INPC del mes del avalúo actual
  inpcReferido:'',        // INPC del periodo al que se retrotrae
  factorReferido:'',      // = inpcReferido / inpcActual (calculado)
  valorActualConclusion:'', // valor del enfoque conclusivo actual ($)
  valorReferidoFinal:'',  // = valorActualConclusion * factorReferido
  declaracionesReferido:
    'SE CONCLUYE CON EL VALOR REFERIDO DEL INMUEBLE CALCULADO MEDIANTE EL FACTOR DEL ÍNDICE NACIONAL DE PRECIOS AL CONSUMIDOR (INPC) PUBLICADO POR EL INEGI.',

  // Conclusión
  valorMercado:'', valorFisico:'',
  enfoqueConclusivo:'fisico',
  valorConclusivoLetras:'',
  declaraciones:'SE CONCLUYE CON EL VALOR FÍSICO DEL INMUEBLE',
  vigenciaAvaluo:'Seis Meses',
  fotos:[],
}

// ── Tabs del Referido ────────────────────────────────────────────
const TABS_BASE = [
  { key:'portada',    label:'Portada',         Icon: Home         },
  { key:'datos',      label:'Datos',            Icon: FileText     },
  { key:'terreno',    label:'Carac. Terreno',   Icon: Map          },
  { key:'descrip',    label:'Descripción',      Icon: Building     },
  { key:'compTerreno',label:'Comp. Terreno',    Icon: BarChart2    },
  { key:'costos',     label:'Costos',           Icon: DollarSign   },
  { key:'compCasa',   label:'Comp. Casa',       Icon: BarChart2    },
  { key:'conclusion', label:'Conclusión',       Icon: ClipboardList},
  { key:'valorRef',   label:'Valor Referido',   Icon: TrendingDown },
  { key:'fotos',      label:'Fotos',            Icon: Camera       },
]

// ── Componente principal ─────────────────────────────────────────
export default function FormularioReferido() {
  const navigate      = useNavigate()
  const { id }        = useParams()
  const { authFetch, usuario } = useAuth()
  const tabBarRef     = useRef(null)

  const [activeTab,     setActiveTab]     = useState('portada')
  const [form,          setForm]          = useState(FORM_VACIO)
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [avaluoId,      setAvaluoId]      = useState(id || null)
  const [exportMenu,    setExportMenu]    = useState(false)
  const [estadoAvaluo, setEstadoAvaluo] = useState('borrador')
  const [savingEstado, setSavingEstado] = useState(false)
  const [isDirty,      setIsDirty]      = useState(false)
  const [mostrarLector, setMostrarLector] = useState(false)

  // Cargar avalúo existente
  useEffect(() => {
    if (!id) return
    authFetch(`/api/avaluos/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.datos_formulario) setForm({...FORM_VACIO,...data.datos_formulario,titulo:data.titulo})
        if (data.estado) setEstadoAvaluo(data.estado)
      })
      .catch(console.error)
  }, [id, authFetch])

  // Update helpers
  const update = useCallback((field, value) => {
    setForm(f=>({...f,[field]:value}))
    setIsDirty(true)
  }, [])
  const updateNested = useCallback((field,idx,key,value) =>
    setForm(f=>({...f,[field]:f[field].map((row,i)=>i===idx?{...row,[key]:value}:row)})), [])
  const updateDeep = useCallback((field,idx,subField,key,value) =>
    setForm(f=>({...f,[field]:f[field].map((row,i)=>
      i===idx?{...row,[subField]:{...row[subField],[key]:value}}:row)})), [])

  // Guardar
  const handleSave = async () => {
    setSaving(true); setSaved(false)
    try {
      const payload = {
        titulo:             form.titulo || `Referido — ${form.nombrePropietario||form.nombrePoseedor||'Sin nombre'}`,
        tipo_avaluo:        'referido',
        folio_interno:      form.folioInterno||null,
        nombre_propietario: form.nombrePropietario||form.nombrePoseedor||null,
        nombre_solicitante: form.nombreSolicitante||null,
        direccion_completa: [form.calle,form.numeroExterior,form.colonia,form.municipio].filter(Boolean).join(', ')||null,
        colonia:            form.colonia, municipio:form.municipio,
        codigo_postal:      form.codigoPostal, entidad_federativa:form.entidadFederativa,
        area_terreno:       parseFloat(form.areaTerreno)||null,
        area_construccion:  parseFloat(form.areaConstruccion)||null,
        fecha_avaluo:       form.fechaAvaluo||null,
        valor_conclusivo:   parseFloat(form.valorReferidoFinal||form.valorFisico||form.valorMercado)||null,
        datos_formulario:   form,
      }
      let r
      if (avaluoId)
        r = await authFetch(`/api/avaluos/${avaluoId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      else
        r = await authFetch('/api/avaluos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      const data = await r.json()
      if (!avaluoId && data.avaluo?.id) {
        setAvaluoId(data.avaluo.id)
        window.history.replaceState(null,'',`/valuacion/referido/${data.avaluo.id}`)
      }
      setSaved(true); setIsDirty(false); setTimeout(()=>setSaved(false),3000)
    } catch(e){ console.error(e) }
    finally { setSaving(false) }
  }

  // Exportar
  const handleExport = async (tipo) => {
    setExportMenu(false)
    try {
      if (tipo==='pdf') {
        const { exportarPDF } = await import('../../utils/exportAvaluo')
        await exportarPDF(form,'referido')
      } else {
        const { exportarExcel } = await import('../../utils/exportAvaluo')
        await exportarExcel(form,'referido')
      }
    } catch(e){ console.error(e) }
  }

  const aplicarCamposIA = (campos) => setForm(f=>({...f,...campos}))

  // Scroll tabs
  const scrollTabs = (dir) => tabBarRef.current?.scrollBy({left:dir*200,behavior:'smooth'})

  // Mostrar solo los tabs que corresponden a los enfoques seleccionados
  const tabsVisibles = TABS_BASE.filter(tab => {
    if (tab.key === 'compCasa')                  return (form.enfoques||[]).includes('mercado')
    if (tab.key === 'compTerreno' || tab.key === 'costos') return (form.enfoques||[]).includes('fisico')
    return true
  })

  const tabProps = { form, update, updateNested, updateDeep, avaluoId }

  const renderTab = () => {
    switch(activeTab){
      case 'portada':    return <TabPortada          {...tabProps} hideVigencia={true} showFechaReferida={true}/>
      case 'datos':      return <TabDatosReferido    {...tabProps}/>
      case 'terreno':    return <TabCaracTerreno     {...tabProps} hideEscritura={true}/>
      case 'descrip':    return <TabDescripInmueble  {...tabProps}/>
      case 'compTerreno':return <TabComparableTerreno{...tabProps}/>
      case 'costos':     return <TabCostos           {...tabProps}/>
      case 'compCasa':   return <TabComparableCasa   {...tabProps}/>
      case 'valorRef':   return <TabValorReferido    {...tabProps}/>
      case 'conclusion': return <TabConclusionReferido{...tabProps}/>
      case 'fotos':      return <TabFotos            {...tabProps}/>
      default:           return null
    }
  }

  return (
    <div className={styles.page}>
      <Navbar/>
      <main className={styles.main}>

        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={()=>navigate('/dashboard')}>
            <ArrowLeft size={15}/> Dashboard
          </button>
          <div className={styles.titleBlock}>
            <input className={styles.titleInput} value={form.titulo}
              onChange={e=>update('titulo',e.target.value)}
              placeholder="Nombre / título del avalúo referido…"/>
            <p className={styles.folioSub}>
              {avaluoId?`Folio: ${form.folioInterno||'Asignado al guardar'}`:'Nuevo avalúo referido — el folio se genera al guardar'}
            </p>
          </div>

          {/* Leer documento */}
          <button onClick={()=>setMostrarLector(true)}
            style={{display:'inline-flex',alignItems:'center',gap:'.4rem',
              padding:'.45rem .85rem',borderRadius:'7px',cursor:'pointer',
              border:'1.5px solid #c9972a',background:'rgba(201,151,42,.08)',
              color:'#c9972a',fontSize:'.82rem',fontWeight:700,whiteSpace:'nowrap'}}>
            📎 Leer documento
          </button>

          {/* Exportar */}
          <div style={{position:'relative'}}>
            <button onClick={()=>setExportMenu(v=>!v)}
              style={{display:'inline-flex',alignItems:'center',gap:'.4rem',
                padding:'.45rem .85rem',borderRadius:'7px',cursor:'pointer',
                border:'1.5px solid var(--border)',background:'var(--bg-card)',
                color:'var(--text-secondary)',fontSize:'.82rem',fontWeight:600}}>
              <Download size={14}/> Exportar
            </button>
            {exportMenu&&(
              <>
                <div style={{position:'fixed',inset:0,zIndex:100}} onClick={()=>setExportMenu(false)}/>
                <div style={{position:'absolute',top:'110%',right:0,zIndex:101,
                  background:'var(--bg-card)',border:'1px solid var(--border)',
                  borderRadius:'8px',boxShadow:'0 4px 16px rgba(0,0,0,.15)',minWidth:'160px',overflow:'hidden'}}>
                  <button onClick={()=>handleExport('pdf')}
                    style={{width:'100%',padding:'.65rem 1rem',display:'flex',alignItems:'center',gap:'.5rem',
                      background:'none',border:'none',cursor:'pointer',fontSize:'.84rem',fontWeight:600,
                      color:'var(--text-primary)',borderBottom:'1px solid var(--border)'}}>
                    <FilePdf size={15} style={{color:'#dc2626'}}/> Exportar PDF
                  </button>
                  <button onClick={()=>handleExport('excel')}
                    style={{width:'100%',padding:'.65rem 1rem',display:'flex',alignItems:'center',gap:'.5rem',
                      background:'none',border:'none',cursor:'pointer',fontSize:'.84rem',fontWeight:600,
                      color:'var(--text-primary)'}}>
                    <FileSpreadsheet size={15} style={{color:'#16a34a'}}/> Exportar Excel
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Estado del avalúo — solo admin */}
          {usuario?.rol === 'admin' && (
            <div style={{display:'flex',alignItems:'center',gap:'.4rem'}}>
              <select value={estadoAvaluo} onChange={e=>setEstadoAvaluo(e.target.value)}
                style={{padding:'.4rem .6rem',borderRadius:'7px',fontSize:'.8rem',fontWeight:600,
                  border:`1.5px solid ${estadoAvaluo==='final'?'#16a34a':'var(--border)'}`,
                  background:estadoAvaluo==='final'?'rgba(22,163,74,.08)':'var(--bg-card)',
                  color:estadoAvaluo==='final'?'#16a34a':'var(--text-secondary)',cursor:'pointer'}}>
                <option value="borrador">📝 Borrador</option>
                <option value="en_proceso">🔄 En proceso</option>
                <option value="preliminar">📋 Preliminar</option>
                <option value="final">✅ Final</option>
              </select>
              <button onClick={()=>cambiarEstado(estadoAvaluo)} disabled={savingEstado||!avaluoId}
                style={{padding:'.4rem .7rem',borderRadius:'7px',fontSize:'.78rem',fontWeight:700,
                  border:'1px solid var(--border)',background:'var(--bg-card)',
                  color:'var(--text-secondary)',cursor:'pointer'}}>
                {savingEstado?'…':'Actualizar'}
              </button>
            </div>
          )}

          {/* Guardar */}
          <button className={`${styles.saveBtn} ${saved?styles.saveBtnOk:''}`}
            onClick={handleSave} disabled={saving}>
            {saved?<><CheckCircle2 size={15}/> ¡Guardado!</>:<><Save size={15}/> {saving?'Guardando…':'Guardar'}</>}
          </button>
        </div>

        {/* Tab bar */}
        <div className={styles.tabBarWrap}>
          <button className={styles.tabArrow} onClick={()=>scrollTabs(-1)}>‹</button>
          <div className={styles.tabBar} ref={tabBarRef}>
            {tabsVisibles.map(({key,label,Icon})=>(
              <button key={key}
                className={`${styles.tabBtn} ${activeTab===key?styles.tabActive:''}`}
                onClick={()=>setActiveTab(key)}>
                <Icon size={13}/> {label}
              </button>
            ))}
          </div>
          <button className={styles.tabArrow} onClick={()=>scrollTabs(1)}>›</button>
        </div>

        <div className={styles.tabContent}>{renderTab()}</div>
      </main>

      {mostrarLector&&(
        <LectorDocumento
          onAplicar={(campos)=>{aplicarCamposIA(campos);setMostrarLector(false)}}
          onCerrar={()=>setMostrarLector(false)}
        />
      )}

      <FloatingNav
        extraButton={
          <button onClick={handleSave} disabled={saving}
            style={{display:'inline-flex',alignItems:'center',gap:'.45rem',
              padding:'.55rem 1rem',borderRadius:'9999px',cursor:'pointer',
              background:saved?'#16a34a':'#1e3a5f',border:'none',color:'#fff',
              fontSize:'.82rem',fontWeight:700,boxShadow:'0 4px 12px rgba(30,58,95,.35)',
              whiteSpace:'nowrap',opacity:saving?.7:1}}>
            {saved?<><CheckCircle2 size={14}/> ¡Guardado!</>:<><Save size={14}/> {saving?'Guardando…':'Guardar'}</>}
          </button>
        }
      />
    </div>
  )
}