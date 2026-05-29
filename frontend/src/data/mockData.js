// ─────────────────────────────────────────────
//  GIAVAL – Mock Data Store
//  Simula la BD hasta tener el backend listo
// ─────────────────────────────────────────────

export const TIPOS_AVALUO = {
  comercial:   { label: 'Comercial',   color: '#92400e', bg: '#fef3c7' },
  residencial: { label: 'Residencial', color: '#065f46', bg: '#d1fae5' },
  industrial:  { label: 'Industrial',  color: '#3730a3', bg: '#e0e7ff' },
  referido:    { label: 'Referido',    color: '#9d174d', bg: '#fce7f3' },
}

export const TIPOS_INMUEBLE = ['Casa', 'Terreno', 'Departamento', 'Local', 'Oficina', 'Nave Industrial']

const HISTORIAL_BASE = [
  { id: 1, cambio: 'Registro inicial del avalúo',         usuario: 'J.Espinoza01', fecha: '2025-01-15', hora: '08:30' },
  { id: 2, cambio: 'Cambio de tipo de avalúo a Comercial', usuario: 'C.Méndez02',  fecha: '2025-02-10', hora: '11:05' },
  { id: 3, cambio: 'Corrección de superficie total (m²)',  usuario: 'A.Ríos03',    fecha: '2025-02-15', hora: '14:15' },
  { id: 4, cambio: 'Actualización de valor de mercado',    usuario: 'C.Méndez02',  fecha: '2025-02-17', hora: '09:32' },
]

let avaluos = [
  {
    id: 'AV-001',
    fecha: '2025-01-15',
    tipoAvaluo: 'comercial',
    ubicacion: 'Av. Reforma 123, CDMX',
    tipoInmueble: 'Oficina',
    valorTerreno: 2500000,
    valorConstruccion: 1800000,
    valorMercado: 4300000,
    estado: 'final',
    notas: '',
    cliente: 'Grupo Inmobiliario Reforma SA',
    valuador: 'J.Espinoza01',
    imagen: null,
    historial: HISTORIAL_BASE,
    descripcion: 'Oficina corporativa de 320 m² en zona prime. Acabados de alta gama, estacionamiento incluido.',
    superficieTerreno: 180,
    superficieConstruccion: 320,
    anoConstruccion: 2018,
    niveles: 12,
    colindanciaNorte: 'Av. Reforma',
    colindanciaSur: 'Calle Lieja',
    colindanciaOriente: 'Paseo Castellana',
    colindanciaPoniente: 'Edificio Torre Mayor',
  },
  {
    id: 'AV-002',
    fecha: '2025-01-22',
    tipoAvaluo: 'residencial',
    ubicacion: 'Col. Polanco, CDMX',
    tipoInmueble: 'Casa Habitación',
    valorTerreno: 3200000,
    valorConstruccion: 2100000,
    valorMercado: 5300000,
    estado: 'preliminar',
    notas: 'Proceso detenido: falta fotografía de fachada posterior. El cliente indicó que la enviará la siguiente semana.',
    cliente: 'Familia Rodríguez Hernández',
    valuador: 'A.Ríos03',
    imagen: null,
    historial: [HISTORIAL_BASE[0]],
    descripcion: 'Casa habitación de 2 plantas en Polanco. 4 recámaras, 3 baños, jardín y alberca.',
    superficieTerreno: 450,
    superficieConstruccion: 380,
    anoConstruccion: 2005,
    niveles: 2,
    colindanciaNorte: 'Calle Horacio',
    colindanciaSur: 'Calle Virgilio',
    colindanciaOriente: 'Calle Newton',
    colindanciaPoniente: 'Predio particular',
  },
  {
    id: 'AV-003',
    fecha: '2025-02-03',
    tipoAvaluo: 'industrial',
    ubicacion: 'Zona Industrial Vallejo, CDMX',
    tipoInmueble: 'Nave Industrial',
    valorTerreno: 5800000,
    valorConstruccion: 3200000,
    valorMercado: 9000000,
    estado: 'en_proceso',
    notas: 'Pendiente: escritura pública aún en trámite notarial. Se retoma cuando el cliente presente el documento original.',
    cliente: 'Manufactura del Valle SA de CV',
    valuador: 'J.Espinoza01',
    imagen: null,
    historial: HISTORIAL_BASE.slice(0, 2),
    descripcion: 'Nave industrial de 1,800 m² con andén de carga, oficinas administrativas y planta de fuerza.',
    superficieTerreno: 2500,
    superficieConstruccion: 1800,
    anoConstruccion: 1998,
    niveles: 1,
    colindanciaNorte: 'Av. de los Cien Metros',
    colindanciaSur: 'Privada Industrial',
    colindanciaOriente: 'Empresa Transportes del Norte',
    colindanciaPoniente: 'Calle 7',
  },
  {
    id: 'AV-004',
    fecha: '2025-02-10',
    tipoAvaluo: 'residencial',
    ubicacion: 'Av. Insurgentes Sur 450, CDMX',
    tipoInmueble: 'Departamento',
    valorTerreno: 1100000,
    valorConstruccion: 950000,
    valorMercado: 2050000,
    estado: 'borrador',
    notas: '',
    cliente: 'Patricia Quitl González',
    valuador: 'C.Méndez02',
    imagen: null,
    historial: [HISTORIAL_BASE[0]],
    descripcion: 'Departamento en piso 8, 2 recámaras, 2 baños, balcón con vista a Insurgentes.',
    superficieTerreno: 0,
    superficieConstruccion: 95,
    anoConstruccion: 2015,
    niveles: 1,
    colindanciaNorte: 'Departamento 801',
    colindanciaSur: 'Departamento 803',
    colindanciaOriente: 'Pasillo',
    colindanciaPoniente: 'Av. Insurgentes',
  },
  {
    id: 'AV-005',
    fecha: '2025-02-18',
    tipoAvaluo: 'referido',
    ubicacion: 'Norte 3 No.54, Orizaba, Ver.',
    tipoInmueble: 'Casa',
    valorTerreno: 480000,
    valorConstruccion: 320000,
    valorReferido: 650000,
    estado: 'final',
    notas: '',
    cliente: 'GIAVAL Avalúos Demo',
    valuador: 'J.Espinoza01',
    imagen: null,
    historial: HISTORIAL_BASE,
    descripcion: 'Casa habitacional en el centro de Orizaba. 3 recámaras, 2 baños, patio.',
    superficieTerreno: 200,
    superficieConstruccion: 160,
    anoConstruccion: 1985,
    niveles: 1,
    colindanciaNorte: 'Calle Norte 3',
    colindanciaSur: 'Predio del Sr. Méndez',
    colindanciaOriente: 'Predio particular',
    colindanciaPoniente: 'Callejón s/n',
  },
]

// CRUD simulado
export const getAvaluos = () => [...avaluos]

export const getAvaluoById = (id) => avaluos.find(a => a.id === id) || null

export const updateNota = (id, nota) => {
  avaluos = avaluos.map(a => a.id === id ? { ...a, notas: nota } : a)
}

export const createAvaluo = (data) => {
  const nextNum = avaluos.length + 1
  const newId = `AV-${String(nextNum).padStart(3, '0')}`
  const nuevo = {
    ...data,
    id: newId,
    fecha: new Date().toISOString().split('T')[0],
    estado: 'borrador',
    notas: '',
    historial: [{
      id: 1,
      cambio: 'Registro inicial del avalúo',
      usuario: data.valuador || 'Sistema',
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toTimeString().slice(0,5),
    }],
  }
  avaluos = [nuevo, ...avaluos]
  return nuevo
}

export const formatCurrency = (value) => {
  if (!value && value !== 0) return '—'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
