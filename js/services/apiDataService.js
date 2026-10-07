import { config } from "../config.js";

/**
 * Implementación de la capa de datos contra el backend/API.
 * El frontend NUNCA conecta directamente a PostgreSQL: siempre pasa por aquí.
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

export const apiDataService = {
    getMovements: () => request("/movements"),
    getCategories: () => request("/categories"),
    getSubcategories: (categoryId = null) =>
        request(categoryId ? `/subcategories?categoryId=${encodeURIComponent(categoryId)}` : "/subcategories"),
    getPaymentMethods: () => request("/payment-methods"),

    createMovement: (input) => request("/movements", { method: "POST", body: JSON.stringify(input) }),
    createMovements: (inputs) => request("/movements/bulk", { method: "POST", body: JSON.stringify({ movements: inputs }) }),
    updateMovement: (id, changes) =>
        request(`/movements/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(changes) }),
    deleteMovement: (id) => request(`/movements/${encodeURIComponent(id)}`, { method: "DELETE" }),

    createCategory: (input) => request("/categories", { method: "POST", body: JSON.stringify(input) }),
    createSubcategory: (input) => request("/subcategories", { method: "POST", body: JSON.stringify(input) }),
    createPaymentMethod: (input) => request("/payment-methods", { method: "POST", body: JSON.stringify(input) }),
};
