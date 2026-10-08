import { APP_ACTIONS, META_CATEGORIES } from '../constants.js';
import { getState } from '../state.js';
import { dataService } from '../services/dataService.js';
import { calculateTotals } from '../domain/calculations.js';
import { openModal, setFieldErrors } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { registerNotification, initNotifications } from '../components/notifications.js';
import { field } from '../components/forms.js';
import { formatCurrency } from '../utils/currency.js';
import { escapeHtml, qs } from '../utils/dom.js';

const TROPHY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M6 9a6 6 0 0 0 12 0"/><path d="M12 15v4"/><path d="M8 19h8"/></svg>';
const TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>';

let metas = [];
// Último valor de ahorro conocido para detectar cambios reales
let lastSavings = null;

export function mount() {
    document.addEventListener('app:action', (event) => {
        const { action, id } = event.detail;
        if (action === APP_ACTIONS.NEW_META) return openMetaForm();
        if (action === APP_ACTIONS.DELETE_META) {
            const meta = metas.find(m => m.id === id);
            if (meta) openDeleteMetaConfirm(meta);
        }
    });

    document.addEventListener('app:data-ready', async () => {
        await loadMetas();
    });
}

async function loadMetas() {
    try {
        metas = await dataService.getMetas();
        const { movements } = getState();
        const { savings } = calculateTotals(movements);
        lastSavings = savings;

        // 1. Metas aún no alcanzadas que ya superaron el objetivo → marcarlas
        await checkGoalsReached(savings);

        // 2. Metas ya alcanzadas → garantizar que exista su notificación en la DB
        //    y recargar el array de notificaciones para reflejar el estado real
        await syncNotificacionesForReachedGoals();

        renderMetas();
    } catch (error) {
        console.error('[finanza] Error al cargar metas:', error);
    }
}

/**
 * Para cada meta ya alcanzada, llama al endpoint /alcanzar (idempotente).
 * El backend garantiza que exista la notificación. Al final recarga las
 * notificaciones del servidor para que el badge sea exacto.
 */
async function syncNotificacionesForReachedGoals() {
    const reached = metas.filter(m => m.alcanzada);
    if (!reached.length) return;
    try {
        for (const meta of reached) {
            const { notificacion } = await dataService.alcanzarMeta(meta.id);
            if (notificacion) registerNotification(notificacion);
        }
        // Recargar notificaciones completas desde el servidor para estado exacto
        await initNotifications();
    } catch (error) {
        console.error('[finanza] Error al sincronizar notificaciones:', error);
    }
}

async function checkGoalsReached(savings) {
    for (const meta of metas) {
        if (!meta.alcanzada && savings >= meta.montoObjetivo) {
            await markGoalReached(meta, savings);
        }
    }
}

async function markGoalReached(meta, savings) {
    try {
        // Una sola llamada al backend: actualiza meta + crea notificación atómicamente
        const { meta: updatedMeta, notificacion } = await dataService.alcanzarMeta(meta.id);
        // Actualizar estado local
        meta.alcanzada = updatedMeta.alcanzada;
        meta.fechaAlcanzada = updatedMeta.fechaAlcanzada;
        // Registrar notificación en el panel (sin llamada HTTP extra)
        if (notificacion) registerNotification(notificacion);
        showToast(
            `🎉 ¡Meta alcanzada! Ya puedes cumplir tu objetivo: ${meta.nombre}.`,
            'success',
            8000
        );
    } catch (error) {
        console.error('[finanza] Error al marcar meta como alcanzada:', error);
    }
}

export function render(state) {
    const { movements } = state;
    const { savings } = calculateTotals(movements);

    // Verificar metas en tiempo real cuando el ahorro cambia (desde cualquier sección)
    // Solo actuar si las metas ya cargaron (metas.length puede ser 0 si no hay metas,
    // usamos lastSavings !== null como señal de que loadMetas() ya corrió)
    if (lastSavings !== null && savings !== lastSavings && metas.length > 0) {
        checkGoalsReached(savings);
    }

    // Siempre actualizar lastSavings una vez que loadMetas() inicializó el módulo
    if (lastSavings !== null) {
        lastSavings = savings;
    }

    // Re-renderizar tarjetas solo si la sección está activa
    if (state.activeSection === 'metas') {
        renderMetasWithSavings(savings);
    }
}

function renderMetas() {
    const { movements } = getState();
    const { savings } = calculateTotals(movements);
    renderMetasWithSavings(savings);
}

function renderMetasWithSavings(savings) {
    const container = qs('#metasList');
    if (!container) return;

    if (!metas.length) {
        container.innerHTML = `<div class="empty-state"><p>No tienes metas de ahorro todavía.<br>Crea tu primera meta con el botón + Agregar meta.</p></div>`;
        return;
    }

    container.innerHTML = metas.map(meta => metaCardHtml(meta, savings)).join('');
}

function metaCardHtml(meta, savings) {
    const progress = Math.min(100, meta.montoObjetivo > 0 ? (savings / meta.montoObjetivo) * 100 : 0);
    const faltante = Math.max(0, meta.montoObjetivo - savings);
    const reached = meta.alcanzada || savings >= meta.montoObjetivo;
    const progressColor = reached ? 'var(--c-income)' : 'var(--c-accent)';

    return `<article class="card meta-card${reached ? ' meta-card--reached' : ''}" data-meta-id="${escapeHtml(meta.id)}">
        <div class="meta-card__header">
            <div class="meta-card__title-row">
                <span class="meta-card__icon">${TROPHY_ICON}</span>
                <h3 class="meta-card__name">${escapeHtml(meta.nombre)}</h3>
            </div>
            ${meta.categoria ? `<span class="meta-card__badge">${escapeHtml(meta.categoria)}</span>` : ''}
            <button class="btn btn--icon btn--ghost btn--danger meta-card__delete" type="button"
                data-action="${APP_ACTIONS.DELETE_META}" data-movement-id="${escapeHtml(meta.id)}"
                aria-label="Eliminar meta ${escapeHtml(meta.nombre)}">${TRASH_ICON}</button>
        </div>
        <div class="meta-card__amounts">
            <span class="meta-card__current">${formatCurrency(Math.min(savings, meta.montoObjetivo))}</span>
            <span class="meta-card__separator">/</span>
            <span class="meta-card__goal">${formatCurrency(meta.montoObjetivo)}</span>
        </div>
        <div class="meta-progress-bar" role="progressbar" aria-valuenow="${Math.round(progress)}" aria-valuemin="0" aria-valuemax="100" aria-label="Progreso ${Math.round(progress)}%">
            <div class="meta-progress-fill" style="width:${progress}%;background:${progressColor};"></div>
        </div>
        <div class="meta-card__footer">
            <span class="meta-card__percent">${Math.round(progress)}%</span>
            ${reached
                ? '<span class="meta-card__status meta-card__status--reached">✅ ¡Meta alcanzada!</span>'
                : `<span class="meta-card__status">Faltan ${formatCurrency(faltante)}</span>`
            }
        </div>
        ${meta.descripcion ? `<p class="meta-card__desc">${escapeHtml(meta.descripcion)}</p>` : ''}
    </article>`;
}

function openMetaForm() {
    const categoryOptions = META_CATEGORIES.map(c =>
        `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
    ).join('');

    const body = `<div class="form-grid">
        ${field({ label: 'Nombre de la meta', name: 'nombre', control: '<input id="field-nombre" data-field="nombre" name="nombre" type="text" maxlength="120" placeholder="Ej. Comprar iPhone" />' })}
        ${field({ label: 'Monto objetivo (S/)', name: 'montoObjetivo', control: '<input id="field-montoObjetivo" data-field="montoObjetivo" name="montoObjetivo" type="number" step="0.01" min="0.01" inputmode="decimal" placeholder="0.00" />' })}
        ${field({ label: 'Categoría', name: 'categoria', control: `<select id="field-categoria" data-field="categoria" name="categoria"><option value="">Selecciona una categoría</option>${categoryOptions}</select>` })}
        ${field({ label: 'Descripción (opcional)', name: 'descripcion', control: '<input id="field-descripcion" data-field="descripcion" name="descripcion" type="text" maxlength="200" placeholder="Detalles adicionales..." />' })}
    </div>`;

    openModal({
        title: 'Nueva meta de ahorro',
        bodyHTML: body,
        submitLabel: 'Crear meta',
        size: 'md',
        onSubmit: async (overlay) => {
            const value = (name) => overlay.querySelector(`[data-field="${name}"]`)?.value ?? '';
            const nombre = value('nombre').trim();
            const montoObjetivo = Number(value('montoObjetivo'));
            const categoria = value('categoria');
            const descripcion = value('descripcion').trim();

            const errors = {};
            if (!nombre) errors.nombre = 'El nombre es obligatorio.';
            if (!montoObjetivo || montoObjetivo <= 0) errors.montoObjetivo = 'El monto debe ser mayor que 0.';
            if (!categoria) errors.categoria = 'Selecciona una categoría.';

            if (Object.keys(errors).length) {
                setFieldErrors(overlay, errors);
                return false;
            }

            const nuevaMeta = await dataService.createMeta({ nombre, montoObjetivo, categoria, descripcion });
            metas.push(nuevaMeta);

            const { movements } = getState();
            const { savings } = calculateTotals(movements);
            if (savings >= nuevaMeta.montoObjetivo && !nuevaMeta.alcanzada) {
                await markGoalReached(nuevaMeta, savings);
            }

            renderMetas();
            showToast(`Meta "${nombre}" creada correctamente.`);
            return true;
        },
    });
}

function openDeleteMetaConfirm(meta) {
    openModal({
        title: 'Eliminar meta',
        bodyHTML: `<p class="confirm-text">¿Seguro que deseas eliminar esta meta?</p>
            <p class="confirm-detail">${escapeHtml(meta.nombre)} · ${formatCurrency(meta.montoObjetivo)}</p>`,
        submitLabel: 'Eliminar',
        submitVariant: 'danger',
        size: 'sm',
        onSubmit: async () => {
            await dataService.deleteMeta(meta.id);
            metas = metas.filter(m => m.id !== meta.id);
            renderMetas();
            showToast('Meta eliminada.', 'info');
            return true;
        },
    });
}
