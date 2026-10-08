import { dataService } from '../services/dataService.js';
import { qs } from '../utils/dom.js';

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
                : notificaciones.map(n => `
                    <li class="notif-panel__item${n.leida ? ' notif-panel__item--read' : ''}">
                        <span class="notif-panel__icon" aria-hidden="true">🎉</span>
                        <div class="notif-panel__body">
                            <p class="notif-panel__msg">${escapeText(n.mensaje)}</p>
                            <time class="notif-panel__time">${formatTime(n.creadoEn)}</time>
                        </div>
                        ${!n.leida ? '<span class="notif-panel__dot" aria-label="No leída"></span>' : ''}
                    </li>`).join('')
            }
        </ul>`;

    panel.querySelector('.notif-panel__close')?.addEventListener('click', closePanel);
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
