import { config } from "../config.js";

/**
 * Implementación de la capa de datos contra el backend/API.
 * El frontend NUNCA conecta directamente a PostgreSQL: siempre pasa por aquí.
 *
 * Los id llegan de PostgreSQL como números; aquí se normalizan a texto
 * para que todo el frontend (desplegables, filtros, validaciones y
 * botones editar/eliminar) compare siempre texto con texto, igual que
 * en el modo mock.
 */

async function request(path, options = {}) {
    const response = await fetch(`${config.apiBaseUrl}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });

    if (!response.ok) {
        let message = `Error ${response.status}`;
        try {
            const body = await response.json();
            message = body?.error ?? message;
        } catch {
            /* respuesta sin JSON */
        }
        throw new Error(message);
    }

    if (response.status === 204) return null;
    return response.json();
}

const text = (value) => (value === null || value === undefined ? null : String(value));

const toMovement = (movement) => ({
    ...movement,
    id: String(movement.id),
    categoryId: text(movement.categoryId),
    subcategoryId: text(movement.subcategoryId),
    paymentMethod: text(movement.paymentMethod),
});

const toCategory = (category) => ({ ...category, id: String(category.id) });

const toSubcategory = (subcategory) => ({
    ...subcategory,
    id: String(subcategory.id),
    categoryId: String(subcategory.categoryId),
});

const toPaymentMethod = (method) => ({ ...method, id: String(method.id) });

const toMeta = (meta) => ({
    ...meta,
    id: String(meta.id),
    montoObjetivo: Number(meta.montoObjetivo),
    alcanzada: Boolean(meta.alcanzada),
    activa: Boolean(meta.activa),
});

export const apiDataService = {
    getMovements: async () => (await request("/movements")).map(toMovement),
    getCategories: async () => (await request("/categories")).map(toCategory),
    getSubcategories: async (categoryId = null) =>
        (
            await request(categoryId ? `/subcategories?categoryId=${encodeURIComponent(categoryId)}` : "/subcategories")
        ).map(toSubcategory),
    getPaymentMethods: async () => (await request("/payment-methods")).map(toPaymentMethod),

    createMovement: async (input) =>
        toMovement(await request("/movements", { method: "POST", body: JSON.stringify(input) })),
    createMovements: async (inputs) =>
        (await request("/movements/bulk", { method: "POST", body: JSON.stringify({ movements: inputs }) })).map(
            toMovement,
        ),
    updateMovement: async (id, changes) =>
        toMovement(await request(`/movements/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(changes) })),
    deleteMovement: (id) => request(`/movements/${encodeURIComponent(id)}`, { method: "DELETE" }),

    createCategory: async (input) =>
        toCategory(await request("/categories", { method: "POST", body: JSON.stringify(input) })),
    createSubcategory: async (input) =>
        toSubcategory(await request("/subcategories", { method: "POST", body: JSON.stringify(input) })),
    createPaymentMethod: async (input) =>
        toPaymentMethod(await request("/payment-methods", { method: "POST", body: JSON.stringify(input) })),

    getMetas: async () => (await request('/metas')).map(toMeta),
    createMeta: async (input) => toMeta(await request('/metas', { method: 'POST', body: JSON.stringify(input) })),
    updateMeta: async (id, changes) => toMeta(await request(`/metas/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(changes) })),
    deleteMeta: (id) => request(`/metas/${encodeURIComponent(id)}`, { method: 'DELETE' }),

    /**
     * Marca la meta como alcanzada e inserta la notificación atómicamente.
     * Devuelve { meta, notificacion }.
     */
    alcanzarMeta: async (id) => {
        const result = await request(`/metas/${encodeURIComponent(id)}/alcanzar`, { method: 'PUT' });
        return {
            meta: toMeta(result.meta),
            notificacion: result.notificacion
                ? { ...result.notificacion, id: String(result.notificacion.id), metaId: String(result.notificacion.metaId) }
                : null,
        };
    },

    getNotificaciones: async () => {
        const list = await request('/notificaciones');
        return list.map(n => ({ ...n, id: String(n.id), metaId: String(n.metaId) }));
    },
    createNotificacion: async ({ metaId, mensaje }) => {
        const n = await request('/notificaciones', { method: 'POST', body: JSON.stringify({ metaId: Number(metaId), mensaje }) });
        return { ...n, id: String(n.id), metaId: String(n.metaId) };
    },
    markNotificacionesLeidas: () => request('/notificaciones/leer', { method: 'PATCH' }),
};
