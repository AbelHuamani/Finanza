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
};
