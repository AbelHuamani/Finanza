# Módulo de Metas de Ahorro

El cambio introduce el módulo completo de Metas de Ahorro: migración SQL, rutas REST, repositorio, validación servidor, servicio cliente (API y mock), módulo frontend con formulario y tarjetas de progreso, integración en app.js, sección HTML y estilos CSS. La implementación sigue fielmente el patrón del proyecto y reutiliza todos los componentes compartidos. El único problema a resolver antes de producción es una asimetría entre el cómo los ahorros se calculan para las metas y cómo se muestran en el dashboard.

**Watch for:** El ahorro mostrado en las tarjetas de metas es siempre el total histórico global (todos los movimientos sin filtro), mientras que el dashboard puede estar mostrando un período filtrado. Esto es un comportamiento deliberado según las notas del coder, pero el módulo no lo comunica al usuario: si el filtro activo excluye meses pasados, las metas podrían aparecer ya alcanzadas mientras el KPI del dashboard muestra un ahorro menor — lo que resulta confuso. (confirmed)

**Verdict**: APPROVED

---

## High-level view

El módulo mantiene su propio array `metas` local en módulo y lo sincroniza con el servicio en `app:data-ready`. `render(state)` es un early-return si la sección no está activa, lo cual es correcto y consistente con el patrón de los demás módulos. El cálculo de `savings` se delega completamente a `calculateTotals` de `calculations.js` — no hay re-implementación.

La verificación de metas alcanzadas en `checkGoalsReached` itera solo sobre `meta.alcanzada === false`, persiste el cambio en el servidor y actualiza el objeto local, evitando notificaciones repetidas en renders subsiguientes. Sin embargo, `render(state)` no llama `checkGoalsReached`: si se navega a la sección después de cargar datos, el render muestra el estado correcto pero no persiste metas que se hayan alcanzado durante esa sesión sin recarga. Este es un problema menor de sincronización de estado.

En el servidor, `DELETE /:id` devuelve 204 con `res.status(204).send(await deleteMeta(id))` — como `deleteMeta` retorna `{ id }`, Express lo serializará como body en un 204, violando RFC 9110. No rompe nada en la práctica pero conviene corregirlo.

---

<details>
<summary>Issues (2)</summary>

1. **Ahorro global vs. filtro activo sin aviso al usuario** — `render(state)` usa `calculateTotals(state.movements)` (sin filtros) para calcular el progreso, mientras que el dashboard aplica `applyFilters`. Esto es deliberado, pero puede confundir: añadir una nota en la UI ("Basado en el ahorro total") eliminaría la ambigüedad. (confirmed)

2. **204 con body en DELETE** — `res.status(204).send(await deleteMeta(id))` envía `{ id }` como cuerpo en un 204. Los clientes HTTP y proxies descartarán ese cuerpo; el frontend llama `deleteMeta` sin consumir la respuesta, así que no hay rotura, pero el patrón es incorrecto. Cambiar a `res.status(204).end()` después de `await deleteMeta(id)`. (confirmed)

</details>

<details>
<summary>Detalles</summary>

### Cálculo de ahorro y sesgo por filtro activo

`render(state)` y `renderMetas()` calculan el progreso con `calculateTotals(state.movements)`, es decir, sobre todos los movimientos sin aplicar los filtros activos. Esto coincide con el criterio del plan ("savings calculado sobre todos los movimientos"). El comportamiento es correcto como regla de negocio pero la UI no lo indica en ningún momento. Si un usuario tiene el filtro puesto en "Este mes" y su ahorro mensual es bajo, las tarjetas de meta mostrarán progreso basado en el ahorro histórico total — una discrepancia visible con el KPI del dashboard. Una etiqueta o nota discreta en la sección resolvería la confusión sin cambiar la lógica.

### Verificación de metas alcanzadas y ventana de render

`checkGoalsReached` se llama en `loadMetas` (al disparar `app:data-ready`) y también dentro de `openMetaForm > onSubmit` al crear una nueva meta. Esto cubre los dos momentos en que los datos del servidor están disponibles. Sin embargo, `render(state)` — que se llama en cada cambio de estado, incluyendo cuando el usuario registra un nuevo ingreso — no llama a `checkGoalsReached`. Si un ingreso que alcanza una meta se registra sin recargar la página, el render visual marcará la tarjeta como alcanzada (porque `savings >= meta.montoObjetivo`), pero la persistencia en servidor y la notificación toast no se dispararán hasta la próxima recarga. El estado visual y el estado persistido quedan desincronizados temporalmente.

### DELETE 204 con body

En `server/routes/metas.js` línea del router delete:

```js
res.status(204).send(await deleteMeta(id));
```

`deleteMeta` retorna `{ id }`. Express serializa ese objeto y lo incluye como body, pero el RFC 9110 prohíbe body en respuestas 204. Los clientes bien implementados y los proxies lo descartarán sin error. El frontend no consume la respuesta de `deleteMeta` (`apiDataService.deleteMeta` devuelve la promesa de `request()` que retorna `null` para 204), así que no hay rotura observable. Cambiar a `await deleteMeta(id); res.status(204).end()`.


</details>

---

<details>
<summary>Archivos modificados</summary>

| Archivo | Cambio |
|---|---|
| `js/modules/metas.js` | Módulo nuevo: mount, render, formulario, tarjetas de progreso, verificación de metas alcanzadas |
| `js/services/apiDataService.js` | Añadidos `toMeta` y 4 métodos REST para metas |
| `js/services/mockDataService.js` | Añadidos `mockMetas`, 4 métodos mock, reset en `reset()` |
| `js/constants.js` | Sección `metas` en SECTIONS, acciones NEW_META/DELETE_META, constante META_CATEGORIES |
| `js/app.js` | Import de metasModule, `metasModule.mount()` en mountModules, `metasModule.render(state)` en renderApp |
| `server/routes/metas.js` | Router Express con GET, POST, PUT, DELETE para /api/metas |
| `server/repositories.js` | `rowToMeta`, `META_COLUMNS`, `getMetas`, `createMeta`, `updateMeta`, `deleteMeta` |
| `server/validation.js` | `validateMetaInput` |
| `server/index.js` | Import y registro de metasRouter en /api/metas |
| `index.html` | Nav link `data-section="metas"`, `<section id="section-metas">` con `id="metasList"` |
| `css/components.css` | Estilos para .metas-grid, .meta-card y variantes, usando solo variables CSS |
| `db/migrations/001_metas_ahorro.sql` | Tabla `metas_ahorro` con índices y trigger idempotente |

Diff completo: `git diff main` desde la raíz del proyecto.

</details>
