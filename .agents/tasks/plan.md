# Implementation Plan — Módulo de Metas de Ahorro

Orden de dependencias: backend primero (DB → repo → validación → rutas → servidor), luego servicios cliente, luego módulo UI, finalmente integraciones en constants/HTML/CSS/app.

---

## Paso 1 — Migración SQL: tabla `metas_ahorro`

**Qué hacer:** Crear el archivo de migración `d:\Finanza\db\migrations\001_metas_ahorro.sql` con la DDL completa de la tabla y sus índices. No tocar `schema.sql` (es DDL destructiva de cero; las migraciones van en archivos separados).

**Contenido exacto a implementar:**

```sql
CREATE TABLE IF NOT EXISTS metas_ahorro (
    id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre           text    NOT NULL,
    monto_objetivo   numeric(12, 2) NOT NULL CHECK (monto_objetivo > 0),
    categoria        text    NOT NULL DEFAULT '',
    alcanzada        boolean NOT NULL DEFAULT false,
    fecha_alcanzada  date    NULL,
    creado_en        timestamptz NOT NULL DEFAULT now(),
    actualizado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS metas_ahorro_alcanzada_idx ON metas_ahorro (alcanzada);

-- Trigger para actualizado_en (reutiliza la función ya existente en schema.sql)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'metas_ahorro_actualizado_en'
    ) THEN
        CREATE TRIGGER metas_ahorro_actualizado_en
            BEFORE UPDATE ON metas_ahorro
            FOR EACH ROW
            EXECUTE FUNCTION fijar_actualizado_en();
    END IF;
END;
$$;
```

La función `fijar_actualizado_en()` ya existe en el servidor de producción (definida en `schema.sql`). El bloque `DO $$...$$` reemplaza `CREATE TRIGGER IF NOT EXISTS` (sintaxis no disponible en PostgreSQL <17) con una verificación segura en `pg_trigger`.

**Archivos:**
- Crear: `d:\Finanza\db\migrations\001_metas_ahorro.sql`

**Verificar:** Ejecutar el SQL contra la base de datos de desarrollo con `psql` y confirmar que la tabla `metas_ahorro` existe sin errores. En ausencia de conexión a DB, la verificación se aplaza al paso de integración final.

---

## Paso 2 — Repositorio servidor: funciones CRUD para `metas_ahorro`

**Qué hacer:** Agregar al final de `d:\Finanza\server\repositories.js` las cuatro funciones de acceso a la tabla `metas_ahorro`. Seguir el mismo patrón que las funciones de `movimientos`: helper `rowToMeta`, constante de columnas, cuatro funciones exportadas.

**Lógica a implementar:**

```
const META_COLUMNS = 'id, nombre, monto_objetivo, categoria, alcanzada, fecha_alcanzada, creado_en, actualizado_en';

const rowToMeta = (row) => ({
    id: row.id,
    nombre: row.nombre,
    montoObjetivo: Number(row.monto_objetivo),
    categoria: row.categoria ?? '',
    alcanzada: row.alcanzada,
    fechaAlcanzada: row.fecha_alcanzada ?? null,   // string 'YYYY-MM-DD' o null
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
});

export async function getMetas() {
    // SELECT META_COLUMNS FROM metas_ahorro ORDER BY creado_en DESC
    // retorna rows.map(rowToMeta)
}

export async function createMeta(input) {
    // INSERT INTO metas_ahorro (nombre, monto_objetivo, categoria)
    // VALUES ($1, $2, $3)
    // RETURNING META_COLUMNS
    // retorna rowToMeta(rows[0])
}

export async function updateMeta(id, changes) {
    // UPDATE metas_ahorro
    // SET nombre=$2, monto_objetivo=$3, categoria=$4, alcanzada=$5, fecha_alcanzada=$6
    // WHERE id=$1
    // RETURNING META_COLUMNS
    // Si !rows[0] → lanzar error 404 "Meta no encontrada: {id}"
    // retorna rowToMeta(rows[0])
}

export async function deleteMeta(id) {
    // DELETE FROM metas_ahorro WHERE id=$1 RETURNING id
    // Si !rows[0] → lanzar error 404 "Meta no encontrada: {id}"
    // retorna { id: rows[0].id }
}
```

Nombres de parámetros DB: `nombre`, `monto_objetivo`, `categoria`, `alcanzada`, `fecha_alcanzada`.  
Los campos `alcanzada` y `fecha_alcanzada` se incluyen en el `UPDATE` para permitir que el frontend marque una meta como alcanzada.

**Archivos:**
- Modificar: `d:\Finanza\server\repositories.js` (agregar sección al final)

**Verificar:** El servidor arranca sin errores de importación (`node server/index.js` o `npm start` desde `d:\Finanza\server`).

---

## Paso 3 — Validación servidor: `validateMetaInput`

**Qué hacer:** Agregar la función `validateMetaInput(body)` en `d:\Finanza\server\validation.js` exportada junto a las existentes. No modificar las funciones ya existentes (`httpError`, `validateMovementInput`, `validateName`).

**Lógica:**

```
export function validateMetaInput(body = {}) {
    const nombre = String(body.nombre ?? '').trim();
    if (!nombre) throw httpError(400, 'El nombre de la meta es obligatorio.');
    if (nombre.length > 80) throw httpError(400, 'El nombre es demasiado largo (máx. 80 caracteres).');

    const montoObjetivo = Number(body.montoObjetivo ?? body.monto_objetivo);
    if (!Number.isFinite(montoObjetivo) || montoObjetivo <= 0)
        throw httpError(400, 'El monto objetivo debe ser mayor que 0.');

    const categoria = String(body.categoria ?? '').trim();
    if (!categoria) throw httpError(400, 'La categoría es obligatoria.');

    // Campos opcionales para actualizaciones parciales (alcanzada/fecha_alcanzada)
    const alcanzada = body.alcanzada !== undefined ? Boolean(body.alcanzada) : undefined;
    const fechaAlcanzada = body.fechaAlcanzada ?? body.fecha_alcanzada ?? null;

    return { nombre, montoObjetivo, categoria, alcanzada, fechaAlcanzada };
}
```

Para el `PUT`, la ruta pasará el body completo que puede incluir `alcanzada` y `fechaAlcanzada`. La función los acepta opcionalmente pero no los obliga (permiten `undefined` para que `updateMeta` los trate con el valor actual de DB o el enviado).

**Archivos:**
- Modificar: `d:\Finanza\server\validation.js`

**Verificar:** Servidor arranca sin errores de importación.

---

## Paso 4 — Rutas servidor: `d:\Finanza\server\routes\metas.js`

**Qué hacer:** Crear el router Express `metas.js` siguiendo exactamente el patrón de `movements.js`. Cuatro rutas: GET `/`, POST `/`, PUT `/:id`, DELETE `/:id`.

**Lógica de cada ruta:**

- `GET /` → `res.json(await getMetas())`
- `POST /` → `res.status(201).json(await createMeta(validateMetaInput(req.body)))`
- `PUT /:id` → Llamar `validateMetaInput(req.body)` para validar, luego `updateMeta(req.params.id, validated)`. Retornar `res.json(result)`.
- `DELETE /:id` → `res.status(204).json(await deleteMeta(req.params.id))`

Todas las rutas con `try/catch` → `next(error)` igual que `movements.js`.

**Archivos:**
- Crear: `d:\Finanza\server\routes\metas.js`

**Verificar:** Servidor arranca sin errores.

---

## Paso 5 — Registrar el router en `server/index.js`

**Qué hacer:** Importar `metasRouter` y registrarlo con `app.use('/api/metas', metasRouter)` antes de la línea `app.use('/api', ...)` catch-all (igual que `movementsRouter`).

**Cambio exacto:**

```js
// Agregar el import junto a los otros imports de routes:
import metasRouter from "./routes/metas.js";

// Agregar la línea de registro ANTES de app.use("/api", catalogRouter):
app.use("/api/metas", metasRouter);
```

**Archivos:**
- Modificar: `d:\Finanza\server\index.js`

**Verificar:** `GET http://localhost:3000/api/metas` devuelve `[]` (array vacío) sin errores 404.

---

## Paso 6 — Servicio API cliente: métodos de metas en `apiDataService.js`

**Qué hacer:** Agregar los cuatro métodos de metas en `d:\Finanza\js\services\apiDataService.js` al final del objeto `apiDataService`. Agregar también el helper `toMeta` para normalizar IDs a string igual que los otros helpers.

**Lógica:**

```js
const toMeta = (meta) => ({
    ...meta,
    id: String(meta.id),
});

// Dentro del objeto apiDataService:
getMetas: async () => (await request('/metas')).map(toMeta),
createMeta: async (data) => toMeta(await request('/metas', { method: 'POST', body: JSON.stringify(data) })),
updateMeta: async (id, changes) =>
    toMeta(await request(`/metas/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(changes) })),
deleteMeta: (id) => request(`/metas/${encodeURIComponent(id)}`, { method: 'DELETE' }),
```

**Archivos:**
- Modificar: `d:\Finanza\js\services\apiDataService.js`

**Verificar:** El módulo se importa sin errores en el browser (no hay un test runner de frontend; verificar en la consola del browser que `window.finanza.dataService.getMetas` es una función).

---

## Paso 7 — Servicio mock cliente: métodos de metas en `mockDataService.js`

**Qué hacer:** Agregar estado local de metas y los cuatro métodos al objeto `mockDataService` en `d:\Finanza\js\services\mockDataService.js`. Las metas NO van en `MOCK_MOVEMENTS` ni en el estado global; viven sólo en este módulo.

**Lógica:**

```js
// Al inicio del módulo, junto a los otros datos:
let mockMetas = [];   // comienza vacío; el usuario las crea

// Dentro del objeto mockDataService:
async getMetas() {
    await wait();
    return clone(mockMetas);
},

async createMeta(data) {
    await wait();
    const meta = {
        id: nextId('meta', mockMetas),
        nombre: data.nombre,
        montoObjetivo: Number(data.montoObjetivo),
        categoria: data.categoria ?? '',
        alcanzada: false,
        fechaAlcanzada: null,
        creadoEn: nowIso(),
        actualizadoEn: nowIso(),
    };
    mockMetas.push(meta);
    return clone(meta);
},

async updateMeta(id, changes) {
    await wait();
    const index = mockMetas.findIndex((m) => m.id === id);
    if (index === -1) throw new Error(`Meta no encontrada: ${id}`);
    const updated = { ...mockMetas[index], ...changes, id, actualizadoEn: nowIso() };
    mockMetas[index] = updated;
    return clone(updated);
},

async deleteMeta(id) {
    await wait();
    const index = mockMetas.findIndex((m) => m.id === id);
    if (index === -1) throw new Error(`Meta no encontrada: ${id}`);
    mockMetas.splice(index, 1);
    return { id };
},
```

La función `nextId('meta', mockMetas)` ya existe en el módulo y funciona con cualquier prefijo.  
Al hacer `reset()` (si existe), resetear también `mockMetas = []`.

**Archivos:**
- Modificar: `d:\Finanza\js\services\mockDataService.js`

**Verificar:** En modo mock, crear y listar metas en la consola del browser funciona sin errores.

---

## Paso 8 — Constantes: nueva sección `metas` y nuevas acciones

**Qué hacer:** Modificar `d:\Finanza\js\constants.js` en dos lugares:

1. Agregar al final del array `SECTIONS`:
```js
{ id: 'metas', label: 'Metas', title: 'Metas de Ahorro', subtitle: 'Sigue el progreso hacia tus objetivos' }
```

2. Agregar a `APP_ACTIONS`:
```js
NEW_META: 'new-meta',
DELETE_META: 'delete-meta',
```

**Archivos:**
- Modificar: `d:\Finanza\js\constants.js`

**Verificar:** `SECTIONS.find(s => s.id === 'metas')` no es `undefined` en la consola del browser.

---

## Paso 9 — HTML: nav item y sección `section-metas`

**Qué hacer:** Modificar `d:\Finanza\index.html` en dos lugares:

**A) Nav item** — agregar al final de `<ul class="nav__list">` el ítem de Metas con un icono SVG de bandera/objetivo:

```html
<li class="nav__item">
    <a class="nav__link" href="#metas" data-section="metas">
        <svg class="nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 8v4l3 3"/>
        </svg>
        <span class="nav__label">Metas</span>
    </a>
</li>
```

**B) Sección** — agregar después del cierre de `</section>` de `section-categorias` y antes del `</main>`:

```html
<section class="section" id="section-metas" aria-labelledby="title-metas" hidden>
    <div class="section__head">
        <h2 class="section__title" id="title-metas">Metas de Ahorro</h2>
        <p class="section__desc">Sigue el progreso hacia tus objetivos de ahorro.</p>
    </div>
    <div class="metas-toolbar">
        <button class="btn btn--primary" type="button" data-action="new-meta">
            <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            <span>Nueva meta</span>
        </button>
    </div>
    <div class="metas-grid" id="metasGrid"></div>
</section>
```

El div `.metas-toolbar` contiene el botón que dispara `data-action="new-meta"` (interceptado por el listener global de `app.js`).

**Archivos:**
- Modificar: `d:\Finanza\index.html`

**Verificar:** Navegar a `#metas` en el browser muestra la sección sin JS errors. El botón "Nueva meta" aparece visible.

---

## Paso 10 — CSS: estilos del módulo de metas

**Qué hacer:** Agregar al **final** de `d:\Finanza\css\components.css` los estilos para las tarjetas de metas. Usar exclusivamente variables CSS existentes de `variables.css`.

**Estilos a agregar:**

```css
/* ================= Metas de Ahorro ================= */
.metas-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: var(--space-4);
}

.metas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
    gap: var(--space-4);
}

.metas-empty {
    grid-column: 1 / -1;
    text-align: center;
    color: var(--c-text-muted);
    padding: var(--space-7) var(--space-4);
}

.meta-card {
    /* hereda .card de global.css */
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
}

.meta-card__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
}

.meta-card__name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--c-text);
    margin: 0;
}

.meta-card__badge {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.15rem 0.55rem;
    border-radius: var(--radius-full);
    background: var(--c-primary-soft);
    color: var(--c-primary);
    white-space: nowrap;
    flex-shrink: 0;
}

.meta-card__badge--achieved {
    background: var(--c-income-soft);
    color: var(--c-income);
}

.meta-card__amounts {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--c-text-muted);
}

.meta-card__amounts strong {
    color: var(--c-text);
    font-weight: 600;
}

.meta-card__progress-bar {
    height: 0.55rem;
    background: var(--c-surface-2);
    border-radius: var(--radius-full);
    overflow: hidden;
}

.meta-progress-fill {
    height: 100%;
    border-radius: var(--radius-full);
    background: var(--c-accent);
    transition: width var(--transition-base);
    max-width: 100%;
}

.meta-progress-fill--achieved {
    background: var(--c-income);
}

.meta-card__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
}

.meta-card__percent {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--c-accent);
}

.meta-card__percent--achieved {
    color: var(--c-income);
}

.meta-card__categoria {
    font-size: 0.78rem;
    color: var(--c-text-muted);
}
```

**Archivos:**
- Modificar: `d:\Finanza\css\components.css` (agregar al final)

**Verificar:** Las tarjetas de metas se renderizan con el estilo correcto en el browser.

---

## Paso 11 — Módulo UI: `d:\Finanza\js\modules\metas.js`

**Qué hacer:** Crear el módulo completo de metas. Este es el paso más extenso. Seguir el patrón de `categories.js` (mount + render, listeners en la sección, renderizado con innerHTML).

**Estructura del módulo:**

### Estado local del módulo
```js
// Estado privado al módulo — nunca va al estado global
let metas = [];           // array de objetos meta
let notified = false;     // guard de inicialización (ver lógica de notificación)
```

### `mount()`
Registrar un listener delegado en `#section-metas` para el evento `app:action` con `detail.action === 'new-meta'` y otro para `detail.action === 'delete-meta'`. También escuchar el evento `app:data-ready` en `document` para cargar las metas desde el servicio una vez que los datos iniciales estén listos.

```js
export function mount() {
    const section = qs('#section-metas');
    if (!section) return;

    // Botón "Nueva meta" — delegar en document porque el botón está en la sección
    document.addEventListener('app:action', async (event) => {
        if (event.detail.action === APP_ACTIONS.NEW_META) {
            await openNewMetaModal();
        }
        if (event.detail.action === APP_ACTIONS.DELETE_META) {
            await handleDeleteMeta(event.detail.id);
        }
    });

    // Cargar metas cuando los datos estén listos
    document.addEventListener('app:data-ready', async () => {
        await loadMetas();
    });
}
```

### `loadMetas()`
Función interna async: llama `dataService.getMetas()`, guarda en `metas`, llama `checkGoals()` (ver abajo), re-renderiza.

### `checkGoals(state)` — lógica de notificación sin repetición
```
función checkGoals(state):
    ahorro = calculateTotals(state.movements).savings
    para cada meta en metas:
        si meta.alcanzada === false Y ahorro >= meta.montoObjetivo:
            showToast(`¡Meta "${meta.nombre}" alcanzada! Ahorraste ${formatCurrency(ahorro)}.`, 'success', 6000)
            dataService.updateMeta(meta.id, { alcanzada: true, fechaAlcanzada: todayISO() })
                .then(updated => {
                    // actualizar la meta en el array local
                    const i = metas.findIndex(m => m.id === meta.id);
                    if (i !== -1) metas[i] = updated;
                    renderMetasGrid();   // re-renderizar con el badge de "Alcanzada"
                });
            // NO re-checkear esta meta (alcanzada se actualizará async)
```

`checkGoals` recibe el objeto `state` (que tiene `state.movements`). Se llama desde `render()` pero **sólo en la primera llamada** (ver `render`).

### `render(state)`
```js
export function render(state) {
    if (!notified) {
        notified = true;
        checkGoals(state);
    }
    renderMetasGrid();
}
```

La razón de `notified`: `render` se llama cada vez que el estado global cambia (subscribe). La revisión de objetivos sólo debe ocurrir una vez al cargar, no cada vez que el usuario filtra movimientos. Si el usuario agrega ingresos nuevos que superen una meta, el toast no se repetirá en esa sesión (esto es intencional según el diseño).

### `renderMetasGrid()`
Función interna que escribe el HTML en `#metasGrid`:

```
si metas.length === 0:
    innerHTML = '<p class="metas-empty">Aún no tienes metas. Crea una con el botón "Nueva meta".</p>'
    retornar

para cada meta:
    pct = min(100, (ahorro_actual / meta.montoObjetivo) * 100)
    // Nota: ahorro_actual aquí es el del último render; se obtiene de calculateTotals(getState().movements).savings
    achievedClass = meta.alcanzada ? '--achieved' : ''
    badgeLabel = meta.alcanzada ? 'Alcanzada ✓' : `${formatPercent(pct, 0)}`
    
    HTML de tarjeta:
    <article class="meta-card card" data-meta-id="${meta.id}">
        <div class="meta-card__header">
            <h3 class="meta-card__name">${escapeHtml(meta.nombre)}</h3>
            <span class="meta-card__badge meta-card__badge${achievedClass}">${badgeLabel}</span>
        </div>
        <div class="meta-card__amounts">
            <span>Ahorro actual: <strong>${formatCurrency(ahorro_actual)}</strong></span>
            <span>Objetivo: <strong>${formatCurrency(meta.montoObjetivo)}</strong></span>
        </div>
        <div class="meta-card__progress-bar" role="progressbar"
             aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"
             aria-label="Progreso hacia ${escapeHtml(meta.nombre)}">
            <div class="meta-progress-fill meta-progress-fill${achievedClass}"
                 style="width: ${pct.toFixed(1)}%"></div>
        </div>
        <div class="meta-card__footer">
            <span class="meta-card__percent meta-card__percent${achievedClass}">${formatPercent(pct, 1)}</span>
            <span class="meta-card__categoria">${escapeHtml(meta.categoria)}</span>
            <button class="btn btn--icon btn--danger" type="button"
                    data-action="delete-meta" data-id="${meta.id}"
                    aria-label="Eliminar meta ${escapeHtml(meta.nombre)}">
                <!-- SVG de papelera igual al de movements.js -->
            </button>
        </div>
    </article>
```

El `ahorro_actual` para el render se obtiene llamando `calculateTotals(getState().movements).savings` dentro de `renderMetasGrid()`. Siempre se usa `state.movements` sin filtros (todos los movimientos).

### `openNewMetaModal()`
Función interna async. Usa `openModal` de `modal.js`:

```
título: 'Nueva meta de ahorro'
bodyHTML: form con tres campos usando field() de forms.js:
  - nombre: input text (name="nombre", maxlength="80", placeholder="Ej. Vacaciones")
  - montoObjetivo: input number (name="montoObjetivo", min="0.01", step="0.01", placeholder="Ej. 5000")
  - categoria: input text (name="categoria", maxlength="40", placeholder="Ej. Viajes")
submitLabel: 'Crear meta'
onSubmit: async (overlay) => {
    const form = overlay.querySelector('.modal__form');
    const nombre = form.querySelector('[name="nombre"]').value.trim();
    const montoObjetivo = parseFloat(form.querySelector('[name="montoObjetivo"]').value);
    const categoria = form.querySelector('[name="categoria"]').value.trim();

    // Validación client-side básica (el servidor también valida)
    const errors = {};
    if (!nombre) errors.nombre = 'El nombre es obligatorio.';
    if (!montoObjetivo || montoObjetivo <= 0) errors.montoObjetivo = 'Ingresa un monto mayor que 0.';
    if (!categoria) errors.categoria = 'La categoría es obligatoria.';
    if (Object.keys(errors).length > 0) {
        setFieldErrors(overlay, errors);
        return false;   // evita cerrar el modal
    }

    const meta = await dataService.createMeta({ nombre, montoObjetivo, categoria });
    metas.push(meta);
    renderMetasGrid();
    showToast(`Meta "${nombre}" creada.`, 'success');
}
```

### `handleDeleteMeta(id)`
Función interna async:

```
meta = metas.find(m => m.id === id)
si !meta → retornar

usar openModal con:
  título: 'Eliminar meta'
  bodyHTML: `<p>¿Eliminar la meta "<strong>${nombre}</strong>"? Esta acción no se puede deshacer.</p>`
  submitLabel: 'Eliminar'
  submitVariant: 'danger'
  onSubmit: async () => {
      await dataService.deleteMeta(id);
      metas = metas.filter(m => m.id !== id);
      renderMetasGrid();
      showToast('Meta eliminada.', 'success');
  }
```

**Imports necesarios en el módulo:**
```js
import { APP_ACTIONS } from '../constants.js';
import { dataService } from '../services/dataService.js';
import { calculateTotals } from '../domain/calculations.js';
import { getState } from '../state.js';
import { formatCurrency, formatPercent } from '../utils/currency.js';
import { todayISO } from '../utils/dates.js';
import { escapeHtml, qs } from '../utils/dom.js';
import { showToast } from '../components/toast.js';
import { openModal } from '../components/modal.js';
import { field } from '../components/forms.js';
import { setFieldErrors } from '../components/modal.js';
```

**Nota sobre `setFieldErrors`:** ya está exportada desde `modal.js` (verificado en el archivo).

**Archivos:**
- Crear: `d:\Finanza\js\modules\metas.js`

**Verificar:** En el browser, navegar a `#metas` → la sección carga sin errores JS. Al hacer clic en "Nueva meta" se abre el modal. Al crear una meta aparece la tarjeta en la grilla.

---

## Paso 12 — Integración en `app.js`

**Qué hacer:** Modificar `d:\Finanza\js\app.js` para conectar el módulo de metas. Tres cambios:

**A) Import:**
```js
import * as metasModule from './modules/metas.js';
```

**B) `mountModules()`** — agregar al final:
```js
metasModule.mount();
```

**C) `renderApp()`** — agregar llamada a `metasModule.render(state)`:

Verificar el patrón exacto de los otros módulos:
- `dashboardModule.render(state, filtered)` — recibe state Y filtered
- `analyticsModule.render(state, filtered)` — recibe state Y filtered
- `categoriesModule.render(state, filtered)` — recibe state Y filtered

`metasModule.render(state)` recibe **sólo `state`** (sin `filtered`) porque el ahorro se calcula sobre `state.movements` sin filtros. Agregar al final de `renderApp()`:

```js
metasModule.render(state);
```

No hay guarda de sección activa para el render: todos los módulos renderizan en cada cambio de estado (patrón verificado en el código actual). `render` en el módulo de metas es barata excepto por el `checkGoals` que sólo corre una vez gracias al flag `notified`.

**Archivos:**
- Modificar: `d:\Finanza\js\app.js`

**Verificar:** La aplicación completa carga en el browser sin errores de consola. La sección Metas aparece en la nav y funciona con el flujo completo: crear meta → tarjeta aparece → ahorro mostrado correctamente.

---

## Resumen del orden de ejecución

| # | Archivo | Tipo |
|---|---------|------|
| 1 | `db/migrations/001_metas_ahorro.sql` | Crear |
| 2 | `server/repositories.js` | Modificar (agregar al final) |
| 3 | `server/validation.js` | Modificar (agregar al final) |
| 4 | `server/routes/metas.js` | Crear |
| 5 | `server/index.js` | Modificar (import + use) |
| 6 | `js/services/apiDataService.js` | Modificar (agregar helper + 4 métodos) |
| 7 | `js/services/mockDataService.js` | Modificar (agregar estado local + 4 métodos) |
| 8 | `js/constants.js` | Modificar (SECTIONS + APP_ACTIONS) |
| 9 | `index.html` | Modificar (nav item + section) |
| 10 | `css/components.css` | Modificar (agregar al final) |
| 11 | `js/modules/metas.js` | Crear |
| 12 | `js/app.js` | Modificar (import + mount + render) |

Los pasos 1–5 son backend independiente. Los pasos 6–7 son servicios cliente independientes entre sí pero dependen de que el contrato de datos (pasos 2–5) esté definido. Los pasos 8–10 son paralelos entre sí. El paso 11 depende de todos los anteriores (servicios, constantes, HTML, CSS). El paso 12 depende del paso 11.
