# GIAVAL Frontend — React + Vite

Sistema de Avalúos Inmobiliarios · Residencia Profesional ISC 2026

## Estructura del Proyecto

```
giaval-frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Barra de navegación autenticada
│   │   ├── Navbar.module.css
│   │   └── ProtectedRoute.jsx  # Guard de rutas privadas
│   ├── context/
│   │   └── AuthContext.jsx     # Estado global de autenticación
│   ├── data/
│   │   └── mockData.js         # Datos simulados (reemplazar con API calls)
│   ├── pages/
│   │   ├── Landing.jsx          # Pantalla 1: index/home
│   │   ├── Landing.module.css
│   │   ├── Login.jsx            # Pantalla 3: inicio de sesión
│   │   ├── Register.jsx         # Pantalla 2: registro de usuario
│   │   ├── AuthForm.module.css  # Estilos compartidos Login/Register
│   │   ├── Dashboard.jsx        # Pantalla 4: tabla de valuaciones
│   │   ├── Dashboard.module.css
│   │   ├── ValuacionDetail.jsx  # Pantallas 5+6: detalle + historial
│   │   ├── ValuacionDetail.module.css
│   │   ├── NuevaValuacion.jsx   # Pantalla: formulario nuevo avalúo
│   │   └── NuevaValuacion.module.css
│   ├── styles/
│   │   └── globals.css          # Variables CSS y estilos base
│   ├── App.jsx                  # Router principal
│   └── main.jsx                 # Entry point
├── index.html
├── package.json
└── vite.config.js
```

## Instalación y Arranque

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev
# → http://localhost:5173

# Build para producción
npm run build

# Preview del build
npm run preview
```

## Rutas de la Aplicación

| Ruta               | Componente       | Acceso      | Descripción                        |
|--------------------|-----------------|-------------|------------------------------------|
| `/`                | Landing          | Público     | Landing page con CTAs              |
| `/login`           | Login            | Público     | Inicio de sesión                   |
| `/registro`        | Register         | Público     | Registro de nuevo usuario          |
| `/dashboard`       | Dashboard        | Protegida   | Tabla de valuaciones               |
| `/valuacion/nueva` | NuevaValuacion   | Protegida   | Formulario de nuevo avalúo         |
| `/valuacion/:id`   | ValuacionDetail  | Protegida   | Detalle + historial de cambios     |

## Reglas de Negocio Implementadas

- **Username automático**: `<Inicial>.<Apellido><NN>` ej: `J.Espinoza01`
- **Comparables válidos**: solo no-remate y no-vencidos
- **Historial de cambios**: visible en detalle del avalúo
- **Guard de rutas**: redirige a `/login` si no hay sesión activa
- **Valor conclusivo**: muestra `valorReferido` (Referido) o `valorMercado` (Comercial)

## Conexión con el Backend (cuando esté listo)

Reemplazar las llamadas en `src/data/mockData.js` con llamadas `fetch` al API:

```js
// Ejemplo: obtener avalúos
const response = await fetch('/api/avaluos', {
  headers: { Authorization: `Bearer ${token}` }
})
const data = await response.json()
```

El proxy en `vite.config.js` ya redirige `/api/*` → `http://localhost:3000`.

## Paleta de Colores

| Variable          | Valor     | Uso                    |
|-------------------|-----------|------------------------|
| `--navy-900`      | `#0f172a` | Header, fondos oscuros |
| `--gold-500`      | `#c9972a` | CTAs primarios, accent |
| `--slate-100`     | `#f1f5f9` | Fondo general          |
| `--white`         | `#ffffff` | Cards, formularios     |

## Dependencias

- React 18
- React Router DOM 6
- Lucide React (iconos)
- Vite 5 (bundler)
