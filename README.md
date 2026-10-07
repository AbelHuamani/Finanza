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
│  ├─ config.js               dataMode: "api" (por defecto) | "mock"
│  ├─ domain/                 Cálculos, filtros y validaciones puras
│  ├─ components/             Modal, toast, gráficos SVG, helpers de forms
│  ├─ modules/                Dashboard, movimientos, análisis, categorías,
│  │                          ingreso y gasto (individual/masivo)
│  ├─ services/
│  │  ├─ dataService.js       Selector: mock o API según config.js
│  │  ├─ mockDataService.js   Datos ficticios en memoria (demo, ?data=mock)
│  │  └─ apiDataService.js    Cliente HTTP hacia el backend
│  └─ data/mockData.js        Datos ficticios solo para el modo demo
├─ db/                        schema.sql (esquema en español), queries.sql
└─ server/                    Backend: Express + pg (Node ≥ 18)
```

***La UI nunca importa `mockData.js` ni toca PostgreSQL directamente.*** Todo pasa por `services/dataService.js`.

## Ejecutar (vinculado a PostgreSQL)

1. Ejecuta `db/schema.sql` **una sola vez** en tu base de datos
   (solo estructura, todo en español: copiar y pegar completo en
   psql, pgAdmin o DBeaver). Los datos se insertan manualmente;
   al final del archivo hay ejemplos de `INSERT`.

2. Arranca el backend (sirve frontend + API en el mismo origen):

   ```powershell
   cd server
   npm install      # solo la primera vez
   npm start
   ```

3. Abre `http://localhost:3000`. La app usa **PostgreSQL por defecto**;
   la conexión está en `server/.env` (`DATABASE_URL`).

### Modo demo (datos ficticios, sin base de datos)

`http://localhost:3000/?data=mock`

### Exposiciones de desarrollo

- Consola: `window.finanza.state.getState()`, `.setState(...)`, `.subscribe(fn)` y `window.finanza.dataService`.

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

`GET /api/subcategories?categoryId=1` filtra por categoría.

## Datos

`db/schema.sql` solo crea la estructura; las inserciones se hacen
manualmente (hay ejemplos de `INSERT` al final del archivo). Los valores
de `tipo` son `'INGRESO' | 'GASTO'`; el backend los traduce al contrato
en inglés/camelCase que consume el frontend.

## Verificación automatizada

```powershell
# Herramienta: C:\Users\huama\AppData\Local\Temp\opencode\finanza-check
node check.js      # datos mock: conteos, totales, CRUD, filtros, validación
```