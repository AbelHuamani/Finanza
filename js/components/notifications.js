import { dataService } from '../services/dataService.js';
import { qs } from '../utils/dom.js';
import { NOTIFICATION_TYPES } from '../constants.js';
import { navigate } from '../app.js';
import { showToast } from './toast.js';

/**
 * Sistema de notificaciones de metas alcanzadas.
 *
 * - El botón campana vive en .topbar__actions (index.html).
 * - El panel se inyecta dinámicamente junto al botón.
 * - Las notificaciones se persisten en la DB (modo API) o localStorage (modo mock).
 * - No duplica la lógica de evaluación de metas: solo recibe eventos de metas.js.
 */

let notificaciones = [];
let panelOpen = false;
let initialized = false;

// ─── API pública ──────────────────────────────────────────────────────────────

export async function initNotifications() {
    try {
        notificaciones = await dataService.getNotificaciones();
    } catch (e) {
        console.error('[finanza] Error al cargar notificaciones:', e);
        notificaciones = [];
    }
    renderBadge();
    if (!initialized) {
        setupPanel();
        initialized = true;
    }
}

/**
 * Registrar una notificación que ya fue creada por el backend (viene de alcanzarMeta).
 * No hace llamada HTTP — solo actualiza el array local y el badge.
 */
export function registerNotification(notif) {
    if (!notif) return;
    const key = String(notif.metaId);
    const idx = notificaciones.findIndex(n => String(n.metaId) === key);
    if (idx !== -1) {
        notificaciones[idx] = notif;
    } else {
        notificaciones.unshift(notif);
    }
    renderBadge();
    if (panelOpen) renderPanelContent();
}

/**
 * Crear y registrar una notificación cuando una meta se alcanza.
 * Llamado desde metas.js en markGoalReached().
 * @deprecated Usar alcanzarMeta() + registerNotification() en su lugar.
 */
export async function notifyGoalReached(metaId, metaNombre, savingsFormatted) {
    const mensaje = `¡Meta alcanzada! Has cumplido la meta: "${metaNombre}".`;
    try {
        const notif = await dataService.createNotificacion({ metaId, mensaje });
        registerNotification(notif);
    } catch (e) {
        console.error('[finanza] Error al crear notificación:', e);
    }
}

// ─── Badge (contador) ─────────────────────────────────────────────────────────

function unreadCount() {
    return notificaciones.filter(n => !n.leida).length;
}

function renderBadge() {
    const btn = qs('#notificationsBtn');
    if (!btn) return;
    const count = unreadCount();
    let badge = btn.querySelector('.notif-badge');
    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notif-badge';
            badge.setAttribute('aria-hidden', 'true');
            btn.appendChild(badge);
        }
        badge.textContent = count > 99 ? '99+' : String(count);
        btn.setAttribute('aria-label', `Notificaciones (${count} sin leer)`);
    } else {
        badge?.remove();
        btn.setAttribute('aria-label', 'Notificaciones');
    }
}

// ─── Panel ────────────────────────────────────────────────────────────────────

function setupPanel() {
    const btn = qs('#notificationsBtn');
    if (!btn) return;

    // Click en el botón campana
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel();
    });

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panelOpen) closePanel();
    });

    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!panelOpen) return;
        const panel = qs('#notificationsPanel');
        if (panel && !panel.contains(e.target) && e.target !== btn) closePanel();
    });
}

function togglePanel() {
    panelOpen ? closePanel() : openPanel();
}

function openPanel() {
    panelOpen = true;
    const btn = qs('#notificationsBtn');
    btn?.setAttribute('aria-expanded', 'true');

    let panel = qs('#notificationsPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'notificationsPanel';
        panel.className = 'notif-panel';
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-label', 'Panel de notificaciones');
        // Insertar junto al botón (dentro del topbar)
        btn?.parentElement?.appendChild(panel);
    }
    panel.hidden = false;
    renderPanelContent();
    markAllRead();
}

function closePanel() {
    panelOpen = false;
    const btn = qs('#notificationsBtn');
    btn?.setAttribute('aria-expanded', 'false');
    const panel = qs('#notificationsPanel');
    if (panel) panel.hidden = true;
}

function renderPanelContent() {
    const panel = qs('#notificationsPanel');
    if (!panel) return;

    const isEmpty = notificaciones.length === 0;

    panel.innerHTML = `
        <div class="notif-panel__header">
            <span class="notif-panel__title">Notificaciones</span>
            <button class="notif-panel__close btn btn--icon btn--ghost" type="button" aria-label="Cerrar notificaciones">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
        </div>
        <ul class="notif-panel__list" role="list">
            ${isEmpty
                ? '<li class="notif-panel__empty">No tienes notificaciones.</li>'
                : notificaciones.map(n => renderNotificationItem(n)).join('')
            }
        </ul>`;

    panel.querySelector('.notif-panel__close')?.addEventListener('click', closePanel);

    // Attach event listeners for action buttons
    panel.querySelectorAll('[data-notif-action]').forEach(btn => {
        btn.addEventListener('click', handleNotificationAction);
    });
}

function renderNotificationItem(notif) {
    const icon = getNotificationIcon(notif.tipo);
    const actionButtons = getActionButtons(notif);

    return `
        <li class="notif-panel__item${notif.leida ? ' notif-panel__item--read' : ''}" data-notif-id="${escapeText(notif.id)}">
            <span class="notif-panel__icon" aria-hidden="true">${icon}</span>
            <div class="notif-panel__body">
                <p class="notif-panel__msg">${escapeText(notif.mensaje)}</p>
                <time class="notif-panel__time">${formatTime(notif.creadoEn)}</time>
                ${actionButtons}
            </div>
            ${!notif.leida ? '<span class="notif-panel__dot" aria-label="No leída"></span>' : ''}
        </li>
    `;
}

function getNotificationIcon(tipo) {
    switch (tipo) {
        case NOTIFICATION_TYPES.META_ALCANZADA:
            return '🎉';
        case NOTIFICATION_TYPES.OPORTUNIDAD_DISPONIBLE:
            return '💡';
        case NOTIFICATION_TYPES.PROGRESO_PARCIAL:
            return '📊';
        case NOTIFICATION_TYPES.META_RECLAMADA:
            return '✅';
        default:
            return '🔔';
    }
}

function getActionButtons(notif) {
    const buttons = [];

    if (notif.tipo === NOTIFICATION_TYPES.META_ALCANZADA) {
        buttons.push(`<button type="button" class="btn btn--small btn--primary" data-notif-action="claim" data-meta-id="${escapeText(notif.metaId)}">Reclamar</button>`);
    }

    if (notif.tipo === NOTIFICATION_TYPES.OPORTUNIDAD_DISPONIBLE) {
        buttons.push(`<button type="button" class="btn btn--small btn--primary" data-notif-action="accept" data-meta-id="${escapeText(notif.metaId)}">Aceptar meta</button>`);
    }

    if (buttons.length === 0) return '';

    return `<div class="notif-panel__actions">${buttons.join('')}</div>`;
}

async function handleNotificationAction(event) {
    const btn = event.target.closest('[data-notif-action]');
    if (!btn) return;

    const action = btn.dataset.notifAction;
    const metaId = btn.dataset.metaId;

    if (action === 'claim') {
        // Reclamar meta: navegar a movimientos con parámetros para abrir modal automáticamente
        closePanel();
        navigate('movimientos', { params: { modal: 'gasto', metaId } });
    } else if (action === 'accept') {
        // Aceptar meta: priorizarla
        try {
            await dataService.updateMeta(metaId, { prioridad: 'URGENTE' });
            showToast('Meta priorizada correctamente.');
            closePanel();
            // Recargar metas
            document.dispatchEvent(new CustomEvent('app:data-ready'));
        } catch (error) {
            console.error('[finanza] Error al priorizar meta:', error);
            showToast('Error al priorizar meta.', 'error');
        }
    }
}

async function markAllRead() {
    const unread = notificaciones.filter(n => !n.leida);
    if (!unread.length) return;
    try {
        await dataService.markNotificacionesLeidas();
        notificaciones = notificaciones.map(n => ({ ...n, leida: true }));
        renderBadge();
        if (panelOpen) renderPanelContent();
    } catch (e) {
        console.error('[finanza] Error al marcar notificaciones como leídas:', e);
    }
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function escapeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('es-PE', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return iso; }
}
