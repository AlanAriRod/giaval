// FormularioComercial/index.jsx — v5
// Cambios:
// - Botón Guardar flotante (esquina inf. derecha) además del botón en topBar
// - Botón Exportar en topBar con menú PDF/Excel
// - TabDatos actualizado con lista de 212 municipios de Veracruz
// - Importa FloatingNav para scroll ↑↓
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Save, FileText, Map, Home, Building2,
  BarChart2, DollarSign, CheckCircle, Camera, CheckCircle2,
  Download, FileSpreadsheet, FileText as FilePdf, X,
} from 'lucide-react'
import Navbar      from '../../components/Navbar'
import FloatingNav from '../../components/FloatingNav'
import { useAuth } from '../../context/AuthContext'

import TabPortada           from './tabs/TabPortada'
import TabDatos             from './tabs/TabDatos'
import TabCaracTerreno      from './tabs/TabCaracTerreno'
import TabDescripInmueble   from './tabs/TabDescripInmueble'
import TabComparableCasa    from './tabs/TabComparableCasa'
import TabComparableTerreno from './tabs/TabComparableTerreno'
import TabMercadoRentas     from './tabs/TabMercadoRentas'
import TabIngresos          from './tabs/TabIngresos'
import TabCostos            from './tabs/TabCostos'
import TabConclusion        from './tabs/TabConclusion'
import TabFotos             from './tabs/TabFotos'
import LectorDocumento      from '../../components/LectorDocumento'
import styles from './Formulario.module.css'

const TABS_BASE = [
  { key:'portada',    label:'Portada',           Icon: FileText              },
  { key:'datos',      label:'Datos Generales',   Icon: Building2             },
  { key:'terreno',    label:'Carac. Terreno',    Icon: Map                   },
  { key:'inmueble',   label:'Descrip. Inmueble', Icon: Home                  },
  { key:'compCasa',   label:'Comp. Casa',        Icon: BarChart2, enfoque:'mercado' },
  { key:'compTerr',   label:'Comp. Terreno',     Icon: BarChart2, enfoque:'fisico'  },
  { key:'rentas',     label:'Mercado Rentas',    Icon: DollarSign,enfoque:'rentas'  },
  { key:'ingresos',   label:'Ingresos',          Icon: DollarSign,enfoque:'rentas'  },
  { key:'costos',     label:'Costos',            Icon: DollarSign,enfoque:'fisico'  },
  { key:'conclusion', label:'Conclusión',        Icon: CheckCircle           },
  { key:'fotos',      label:'Fotos y Docs',       Icon: Camera                },
]

const FORM_VACIO = {
  titulo: '', folioInterno: '', fechaAvaluo: '',
  peritoValuador:    'Mtro. Arq. José Luis Espinosa Quitl',
  maestria:          'Maestría en Valuación Inmobiliaria, Industrial y de Bienes Nacionales',
  cedulaProfesional: '11788863', noRegSHF: '1844807', regEstatalPeritos: '',
  nombreSolicitante: '', nombrePropietario: '',
  tipoAvaluo:'Avalúo Comercial', bienQueSeValua:'Casa Habitación', bienOtro:'',
  regimenPropiedad:'Privada', objetoAvaluo:'Conocer el Valor Comercial',
  proposito:'Conocer el Valor Comercial', propositoOtro:'',
  enfoques:['mercado'],
  calle:'', numeroExterior:'', numeroInterior:'', manzana:'', lote:'', colonia:'',
  municipio:'', codigoPostal:'', entidadFederativa:'', longitud:'', latitud:'', altitud:'', cuentaPredial:'',
  nivelInfraestructura:'NIVEL 3', aguaPotable:'RED DE DISTRIBUCIÓN CON SERVICIO AL INMUEBLE',
  drenaje:'CON CONEXIÓN AL INMUEBLE', electrificacion:'RED AÉREA', alumbradoPublico:'RED AÉREA',
  telefono:'RED AÉREA', senalizacion:'EXISTE', transportePublico:'', vigilancia:'MUNICIPAL',
  nivelEquipamiento:'URBANO', clasificacionZona:'HABITACIONAL DE SEGUNDO ORDEN',
  refProximidadUrbana:'CENTRICA', construccionesPredominantes:'', viasAcceso:'',
  colindanciaGeneral:'', notarioNombre:'', notarioCiudad:'', fechaEscritura:'',
  numeroEscritura:'', numeroNotario:'', medidasSegun:'Escritura Pública',
  medNorte:'', colindNorte:'', medSur:'', colindSur:'',
  medOriente:'', colindOriente:'', medPoniente:'', colindPoniente:'',
  medidas:[], areaTerreno:'', areaConstruccion:'', indiviso:100,
  areaConstruccionHabitable:'', areaConstruccionHabitableSubtitulo:'', areaTerrenoSubtitulo:'',
  topografia:'Terreno plano de forma irregular', numeroFrente:'1 (UNO)', usoSuelo:'Habitacional',
  servidumbre:'', observacionesPredio:'', imgMacro:null, imgMicro:null,
  usoActual:'', tiposConstruccion:'Casa Habitación', calidadClasificacion:'BUENO', numNiveles:2,
  edadAproximada:'', vidaTotal:60, numRecamaras:3, numCocina:1, numBanosCompletos:2,
  numMediosBanos:0, estacionamientos:1, elevador:'NO TIENE',
  estadoConservacion:'BUENO', calidadProyecto:'BUENO PARA EL TIPO PROYECTO',
  descripcionInmueble:'',
  espaciosHabitacion:[],  // campos dinámicos de habitaciones/espacios
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
  comparablesCasa: Array(4).fill(null).map((_,i)=>({
    no:i+1,ciudad:'',colonia:'',telefono:'',informante:'',url:'',
    caracteristicas:'',oferta:'',supConst:'',
    factores:{neg:1,ubic:1,sup:1,calid:1,edoCons:1,zona:1},fotos:[],
  })),
  factoresCasaCustom:[],terrenoExcedente:'',enNRTerreno:'',
  comparablesTerreno: Array(4).fill(null).map((_,i)=>({
    no:i+1,ciudad:'',colonia:'',telefono:'',informante:'',url:'',
    caracteristicas:'',oferta:'',supM2:'',
    factores:{neg:0.95,zona:1,ubica:1,frente:1,sup:1,forma:1},fotos:[],
  })),
  factoresTerrenoCustom:[],
  comparablesRentas: Array(4).fill(null).map((_,i)=>({
    no:i+1,ciudad:'',colonia:'',telefono:'',informante:'',url:'',
    caracteristicas:'',oferta:'',supM2:'',
    factores:{neg:1,ubic:1,sup:1,calid:1,edoCons:1},
  })),
  factoresRentasCustom:[],
  ingresos:{
    porcVacios:'0',porcPredial:'0',porcAgua:'0',porcConsManto:'0',
    porcAdmon:'0',porcEnergElec:'0',porcSeguros:'0',porcISR:'0',porcOtros:'0',descripOtros:'',
    scoreEdad:null,scoreVidaUtil:null,scoreConservacion:null,scoreProyecto:null,
    scoreRelSup:null,scoreUsoInmueble:null,scoreClasifZona:null,tasaManual:'',
    tiposRenta:[{id:1,tipo:'R-1',destino:'',supM2:'',valorM2:''}],
    multiplicadorAnual:'15',
  },
  fraccionesTerreno:[{sup:'',valorUnit:'',coeficiente:'',motivo:'NINGUNO',motivoOtro:''}],
  construcciones:[{tipo:'T-1',descripcion:'',area:'',crn:'',factorDemeritoEdad:'',factorDemeritoCalidad:''}],
  instalaciones:[],
  valorMercado:'',valorFisico:'',valorRentas:'',
  enfoqueConclusivo:'mercado', valorConclusivoLetras:'',
  declaraciones:'SE CONCLUYE CON EL VALOR COMPARATIVO DE MERCADO',
  vigenciaAvaluo:'Seis Meses',
  incluyeExcedenteTerreno: false,
  fotoPrincipal:null,
  fotos:[],
  documentosAnexos:[],
}

export default function FormularioComercial() {
  const navigate        = useNavigate()
  const { id }          = useParams()
  const { authFetch, usuario }   = useAuth()
  const tabBarRef       = useRef(null)

  const [activeTab,  setActiveTab]  = useState('portada')
  const [form,       setForm]       = useState(FORM_VACIO)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [avaluoId,   setAvaluoId]   = useState(id || null)
  const [exportMenu, setExportMenu] = useState(false)  // dropdown PDF/Excel
  const [estadoAvaluo, setEstadoAvaluo] = useState('borrador')
  const [savingEstado, setSavingEstado] = useState(false)
  const [isDirty,     setIsDirty]     = useState(false)
  const [mostrarLector, setMostrarLector] = useState(false)

  useEffect(() => {
    if (!id) return
    authFetch(`/api/avaluos/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.datos_formulario) setForm({...FORM_VACIO,...data.datos_formulario,titulo:data.titulo})
        if (data.estado) setEstadoAvaluo(data.estado)
        setAvaluoId(data.id)
      }).catch(()=>{})
  }, [id, authFetch])

  const update = useCallback((field, value) => {
    setForm(f=>({...f,[field]:value}))
    setIsDirty(true)
  }, [])

  const updateNested = useCallback((field,idx,key,value) =>
    setForm(f=>({...f,[field]:f[field].map((row,i)=>i===idx?{...row,[key]:value}:row)})), [])

  const updateDeep = useCallback((field,idx,subField,key,value) =>
    setForm(f=>({...f,[field]:f[field].map((row,i)=>
      i===idx?{...row,[subField]:{...row[subField],[key]:value}}:row)})), [])

  const scrollTabs = (dir) => {
    if (tabBarRef.current) tabBarRef.current.scrollBy({left:dir*160,behavior:'smooth'})
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const bienFinal = form.bienQueSeValua==='Otro'?(form.bienOtro||'Otro'):form.bienQueSeValua
      // toNum: convierte cualquier valor a número o null (evita '' en columnas numéricas)
      const toNum = (v,isInt=false) => {
        const n = isInt ? parseInt(v) : parseFloat(v)
        return (v===''||v===null||v===undefined||isNaN(n)) ? null : n
      }
      // Calcular valor conclusivo según el enfoque elegido
      const calcValorConclusion = () => {
        const enf = form.enfoqueConclusivo||'mercado'
        if (enf==='mercado') return parseFloat(form.valorMercado)||null
        if (enf==='fisico')  return parseFloat(form.valorFisico)||null
        if (enf==='rentas')  return parseFloat(form.valorRentas)||null
        return Math.max(parseFloat(form.valorMercado)||0,parseFloat(form.valorFisico)||0,parseFloat(form.valorRentas)||0)||null
      }
      const payload = {
        titulo:             form.titulo||`Avalúo ${new Date().toLocaleDateString('es-MX')}`,
        tipo_avaluo:        'comercial',
        nombre_solicitante: form.nombreSolicitante,
        nombre_propietario: form.nombrePropietario,
        calle:              form.calle, numero:form.numeroExterior,
        colonia:            form.colonia, municipio:form.municipio,
        codigo_postal:      form.codigoPostal, entidad_federativa:form.entidadFederativa,
        longitud:           toNum(form.longitud), latitud:toNum(form.latitud),
        altitud:            toNum(form.altitud),
        cuenta_predial:     form.cuentaPredial||null,
        bien_que_se_valua:  bienFinal||null, tipo_inmueble:form.tiposConstruccion||null,
        regimen_propiedad:  form.regimenPropiedad||null, uso_suelo:form.usoSuelo||null,
        area_terreno:       toNum(form.areaTerreno),
        area_construccion:  toNum(form.areaConstruccion),
        indiviso:           toNum(form.indiviso)||100,
        num_niveles:        toNum(form.numNiveles,true),
        edad_aproximada:    toNum(form.edadAproximada,true),
        vida_total:         toNum(form.vidaTotal,true),
        num_recamaras:      toNum(form.numRecamaras,true),
        num_banos:          toNum(form.numBanosCompletos,true),
        estacionamientos:   toNum(form.estacionamientos,true),
        estado_conservacion:form.estadoConservacion,
        valor_mercado:      toNum(form.valorMercado),
        valor_fisico:       toNum(form.valorFisico),
        valor_rentas:       toNum(form.valorRentas),
        fecha_avaluo:       form.fechaAvaluo||null,
        valor_conclusivo:    calcValorConclusion(),
        vigencia_meses:     form.vigenciaAvaluo==='Tres Meses'?3:form.vigenciaAvaluo==='Doce Meses'?12:6,
        datos_formulario:   form,
      }
      let r
      if (avaluoId) {
        r = await authFetch(`/api/avaluos/${avaluoId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      } else {
        r = await authFetch('/api/avaluos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      }
      const data = await r.json()
      if (!r.ok) throw new Error(data.message||'Error al guardar')
      if (!avaluoId && data.avaluo?.id) {
        setAvaluoId(data.avaluo.id)
        window.history.replaceState(null,'',`/valuacion/comercial/${data.avaluo.id}`)
        if (data.avaluo.folio_interno) update('folioInterno',data.avaluo.folio_interno)
      }
      setSaved(true)
      setTimeout(()=>setSaved(false),2500)
    } catch(err) {
      alert(`Error al guardar: ${err.message}`)
    } finally { setSaving(false) }
  }

  // ── IA: aplicar campos extraídos por OCR al formulario ──────────
  const aplicarCamposIA = (campos) => {
    setForm(f => ({ ...f, ...campos }))
  }

  // ── Cambiar estado del avalúo (solo admin) ─────────────────────
  const cambiarEstado = async (nuevoEstado) => {
    if (!avaluoId) { alert('Guarda el avalúo primero.'); return }
    setSavingEstado(true)
    try {
      const r = await authFetch(`/api/avaluos/${avaluoId}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (r.ok) setEstadoAvaluo(nuevoEstado)
      else { const d = await r.json(); alert(d.error || 'Error al cambiar estado') }
    } catch(e) { console.error(e) }
    finally { setSavingEstado(false) }
  }

  // ── Exportar ─────────────────────────────────────────────────
  const handleExport = async (tipo) => {
    setExportMenu(false)
    try {
      if (tipo === 'pdf') {
        const { exportarPDF } = await import('../../utils/exportAvaluo')
        await exportarPDF(form, { folioInterno: form.folioInterno || avaluoId })
      } else {
        const { exportarExcel } = await import('../../utils/exportAvaluo')
        await exportarExcel(form, { folioInterno: form.folioInterno || avaluoId })
      }
    } catch(err) {
      alert(`Error al exportar: ${err.message}\n\nVerifica que tengas instaladas las dependencias:\nnpm install jspdf jspdf-autotable xlsx`)
    }
  }

  const tabsVisibles = TABS_BASE.filter(t => !t.enfoque || form.enfoques.includes(t.enfoque))
  useEffect(() => {
    const claves = tabsVisibles.map(t=>t.key)
    if (!claves.includes(activeTab)) setActiveTab('portada')
  }, [form.enfoques]) // eslint-disable-line

  const tabProps = { form, update, updateNested, updateDeep }

  const renderTab = () => {
    switch(activeTab) {
      case 'portada':    return <TabPortada           {...tabProps}/>
      case 'datos':      return <TabDatos             {...tabProps}/>
      case 'terreno':    return <TabCaracTerreno      {...tabProps}/>
      case 'inmueble':   return <TabDescripInmueble   {...tabProps}/>
      case 'compCasa':   return <TabComparableCasa    {...tabProps}/>
      case 'compTerr':   return <TabComparableTerreno {...tabProps}/>
      case 'rentas':     return <TabMercadoRentas     {...tabProps}/>
      case 'ingresos':   return <TabIngresos          {...tabProps}/>
      case 'costos':     return <TabCostos            {...tabProps}/>
      case 'conclusion': return <TabConclusion        {...tabProps} avaluoId={avaluoId} estadoAvaluo={estadoAvaluo}/>
      case 'fotos':      return <TabFotos             {...tabProps}/>
      default:           return null
    }
  }

  return (
    <div className={styles.page}>
      <Navbar/>
      <main className={styles.main}>

        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={()=>{
            if(isDirty && !window.confirm('¿Regresar al Dashboard?\nLos cambios no guardados se perderán.')) return
            navigate('/dashboard')
          }}>
            <ArrowLeft size={15}/> Dashboard
          </button>
          <div className={styles.titleBlock}>
            <input className={styles.titleInput} value={form.titulo}
              onChange={e=>update('titulo',e.target.value)}
              placeholder="Escribe el nombre / título del avalúo…"/>
            <p className={styles.folioSub}>
              {avaluoId?`Folio: ${form.folioInterno||'Asignado al guardar'}`:'Nuevo avalúo — el folio se genera al guardar'}
            </p>
          </div>

          {/* Botón Leer documento con IA */}
          <button
            onClick={() => setMostrarLector(true)}
            style={{display:'inline-flex',alignItems:'center',gap:'.4rem',
              padding:'.45rem .85rem',borderRadius:'7px',cursor:'pointer',
              border:'1.5px solid #c9972a',background:'rgba(201,151,42,.08)',
              color:'#c9972a',fontSize:'.82rem',fontWeight:700,
              whiteSpace:'nowrap',transition:'all .15s'}}
            title="Leer un documento (escritura, predial, plano, INE) y auto-llenar el formulario">
            📎 Leer documento
          </button>

          {/* Botón Exportar con menú desplegable */}
          <div style={{position:'relative'}}>
            <button
              onClick={()=>setExportMenu(v=>!v)}
              style={{display:'inline-flex',alignItems:'center',gap:'.4rem',
                padding:'.45rem .85rem',borderRadius:'7px',cursor:'pointer',
                border:'1.5px solid var(--border)',background:'var(--bg-card)',
                color:'var(--text-secondary)',fontSize:'.82rem',fontWeight:600,
                transition:'all .15s'}}>
              <Download size={14}/> Exportar
            </button>
            {exportMenu&&(
              <>
                {/* Overlay para cerrar */}
                <div style={{position:'fixed',inset:0,zIndex:100}} onClick={()=>setExportMenu(false)}/>
                <div style={{position:'absolute',top:'110%',right:0,zIndex:101,
                  background:'var(--bg-card)',border:'1px solid var(--border)',
                  borderRadius:'8px',boxShadow:'0 4px 16px rgba(0,0,0,.15)',
                  minWidth:'160px',overflow:'hidden'}}>
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

          {/* Botón Guardar en topBar */}
          <button
            className={`${styles.saveBtn} ${saved?styles.saveBtnOk:''}`}
            onClick={handleSave} disabled={saving}>
            {saved?<><CheckCircle2 size={15}/> ¡Guardado!</>:<><Save size={15}/> {saving?'Guardando…':'Guardar'}</>}
          </button>
        </div>

        {/* Tab bar con flechas */}
        <div className={styles.tabBarWrap}>
          <button className={styles.tabArrow} onClick={()=>scrollTabs(-1)} title="Tabs anteriores">‹</button>
          <div className={styles.tabBar} ref={tabBarRef}>
            {tabsVisibles.map(({key,label,Icon})=>(
              <button key={key}
                className={`${styles.tabBtn} ${activeTab===key?styles.tabActive:''}`}
                onClick={()=>setActiveTab(key)}>
                <Icon size={13}/> {label}
              </button>
            ))}
          </div>
          <button className={styles.tabArrow} onClick={()=>scrollTabs(1)} title="Tabs siguientes">›</button>
        </div>

        <div className={styles.tabContent}>
          {renderTab()}
        </div>
      </main>

      {/* ── MODAL LECTOR DE DOCUMENTOS ── */}
      {mostrarLector && (
        <LectorDocumento
          onAplicar={(campos) => {
            aplicarCamposIA(campos)
            setMostrarLector(false)
          }}
          onCerrar={() => setMostrarLector(false)}
        />
      )}

      {/* ── BOTÓN GUARDAR FLOTANTE (siempre visible) ── */}
      <FloatingNav
        extraButton={
          <button
            onClick={handleSave}
            disabled={saving}
            title={saved?'¡Guardado!':'Guardar avalúo'}
            style={{
              display:'inline-flex',alignItems:'center',gap:'.45rem',
              padding:'.55rem 1rem',borderRadius:'9999px',cursor:'pointer',
              background: saved?'#16a34a':'#1e3a5f',
              border:'none',color:'#fff',fontSize:'.82rem',fontWeight:700,
              boxShadow:'0 4px 12px rgba(30,58,95,.35)',transition:'all .2s',
              whiteSpace:'nowrap',opacity:saving?.7:1,
            }}>
            {saved
              ? <><CheckCircle2 size={14}/> ¡Guardado!</>
              : <><Save size={14}/> {saving?'Guardando…':'Guardar'}</>}
          </button>
        }
      />
    </div>
  )
}