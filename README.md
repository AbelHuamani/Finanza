# Finanza

Aplicación web personal para registrar **ingresos**, **gastos**, ver tu **balance** y controlar tu **ahorro**. Sin frameworks, 100% HTML + CSS + JavaScript (ES Modules). Pensada para móvil y escritorio, con tema claro/oscuro automático.

## Características

- Dashboard con KPIs calculados (ingresos, gastos, balance, ahorro y % de ahorro).
- Gráficos SVG nativos: ingresos vs gastos, gastos por categoría, evolución mensual y evolución del ahorro.
- Registro de ingresos y gastos individuales y **gastos masivos** (varias filas en una operación).
- Edición y eliminación de movimientos con confirmación.
- Tabla de movimientos ordenable y paginada.
- Filtros por período (hoy, semana, mes, año, rango personalizado), tipo, categoría, método de pago y búsqueda.
- Sección de análisis con observaciones generadas a partir de tus datos.
- Gestión de categorías y subcategorías.
- El **balance y el ahorro nunca se almacenan**: siempre se calculan.
- Moneda sol peruano (S/), fechas `DD/MM/YYYY`, temas claro/oscuro y `prefers-reduced-motion`.

## Arquitectura

```
Finanza/
├─ index.html                 Shell SPA (secciones + contenedores)
├─ css/                       tokens, layout, componentes, responsive
├─ js/
│  ├─ app.js                  Orquestación (navegación, render, actions)
│  ├─ actions.js              Acciones: dataService + estado
│  ├─ state.js                Única fuente de verdad (+ subscribe)
│  ├─ constants.js            Secciones, tipos, filtros, tamaños de tabla
│  ├─ config.js               dataMode: "mock" | "api"
│  ├─ domain/                 Cálculos, filtros y validaciones puras
│  ├─ components/             Modal, toast, gráficos SVG, helpers de forms
│  ├─ modules/                Dashboard, movimientos, análisis, categorías,
│  │                          ingreso y gasto (individual/masivo)
│  ├─ services/
│  │  ├─ dataService.js       Selector: mock o API según config.js
│  │  ├─ mockDataService.js   Datos ficticios en memoria (fase actual)
│  │  └─ apiDataService.js    Cliente HTTP hacia el backend
│  └─ data/mockData.js        ÚNICA fuente de datos ficticios (144 movimientos)
├─ db/                        schema.sql, seed.sql, queries.sql (PostgreSQL)
└─ server/                    Backend: Express + pg (Node ≥ 18)
```

***La UI nunca importa `mockData.js` ni toca PostgreSQL directamente.*** Todo pasa por `services/dataService.js`.

## Ejecutar (capa de datos mock — fase actual)

Los ES Modules requieren un servidor HTTP (no sirve abrir el archivo con doble clic):

```powershell
cd Finanza
python -m http.server 5500
```

Abre `http://localhost:5500`. Verás en la consola:
`[finanza] Listo -> 144 movimientos, 12 categorías, 2 métodos de pago.`

### Exposiciones de desarrollo

- Consola: `window.finanza.state.getState()`, `.setState(...)`, `.subscribe(fn)` y `window.finanza.dataService`.

## Activar PostgreSQL (fase final, opcional)

1. Crea la base de datos y aplica esquema + semilla:

   ```powershell
   createdb finanza
   psql -d finanza -f db/schema.sql
   psql -d finanza -f db/seed.sql
   ```

2. Instala y arranca el backend:

   ```powershell
   cd server
   Copy-Item .env.example .env   # edita DATABASE_URL si es necesario
   npm install
   npm start
   ```

3. Entra a la app con la API activa (sirve frontend + API en el mismo origen):

   ```
   http://localhost:3000/?data=api
   ```

Sin `?data=api` la app vuelve a los datos mock. `localhost:3000` es servido por Express; si prefieres el servidor de Python, usa CORS configurado (el backend lo habilita).

## Endpoints de la API

| Método | Ruta                            | Descripción                  |
| ------ | ------------------------------- | ---------------------------- |
| GET    | `/api/health`                   | Estado del servidor          |
| GET    | `/api/movements`                | Lista movimientos            |
| POST   | `/api/movements`                | Crea un movimiento           |
| POST   | `/api/movements/bulk`           | Crea varios movimientos      |
| PUT    | `/api/movements/:id`            | Actualiza un movimiento      |
| DELETE | `/api/movements/:id`            | Elimina un movimiento        |
| GET    | `/api/categories`               | Lista categorías             |
| POST   | `/api/categories`               | Crea una categoría           |
| GET    | `/api/subcategories`            | Lista subcategorías          |
| POST   | `/api/subcategories`            | Crea una subcategoría        |
| GET    | `/api/payment-methods`          | Lista métodos de pago        |
| POST   | `/api/payment-methods`          | Crea un método               |

`GET /api/subcategories?categoryId=cat-food` filtra por categoría.

## Verificación automatizada

```powershell
# Herramienta: C:\Users\huama\AppData\Local\Temp\opencode\finanza-check
node check.js      # datos mock: conteos, totales, CRUD, filtros, validación
node gen-seed.js   # regenera db/seed.sql desde js/data/mockData.js
```